import rateLimit from 'express-rate-limit';

/**
 * rateLimiter.ts
 *
 * DESIGN: Two tiers of rate limiting.
 *
 * Tier 1 — globalLimiter:
 *   Applied to ALL routes. Coarse protection against bots and scrapers.
 *   1000 req/min per IP is generous enough for legitimate API consumers
 *   but stops naive flooding.
 *
 * Tier 2 — signalIngestLimiter:
 *   Applied specifically to POST /signals.
 *   Tighter window. Signal producers should batch where possible;
 *   100 req/min per IP is still 1.6 signals/second — enough for real use.
 *
 * WHY NOT Redis-backed rate limiting here?
 *   For a single-node deployment (internship scope), in-memory is fine.
 *   In a multi-node deployment, you'd swap the store to:
 *   `new RedisStore({ client: redisClient })` from `rate-limit-redis`.
 *   That's a one-line change — the limiter interface stays identical.
 *
 * PRODUCTION NOTE:
 *   If behind a reverse proxy (nginx, AWS ALB), set:
 *   app.set('trust proxy', 1)
 *   so req.ip reflects the real client IP, not the proxy IP.
 */

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 1000,
  standardHeaders: true, // Return RateLimit-* headers (RFC 6585)
  legacyHeaders: false,  // Disable deprecated X-RateLimit-* headers
  message: {
    error: 'Too many requests',
    retryAfter: '60 seconds',
  },
});

export const signalIngestLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS  || '60000'),
  max:      parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by component_id if present, otherwise fall back to IP.
    // This prevents a single noisy component from starving others.
    return (req.body?.component_id as string) || req.ip || 'unknown';
  },
  message: {
    error: 'Signal rate limit exceeded for this component',
    retryAfter: '60 seconds',
    hint: 'Consider batching signals or increasing the debounce window',
  },
});