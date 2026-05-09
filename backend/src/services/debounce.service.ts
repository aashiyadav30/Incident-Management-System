import { redisClient } from '../config/redis';

/**
 * debounce.service.ts
 *
 * Prevents duplicate incident creation for the same component
 * within a sliding time window.
 *
 * ─── Algorithm ────────────────────────────────────────────────────────────────
 *
 *  KEY:   debounce:{COMPONENT_ID}
 *  VALUE: incident_id (PostgreSQL UUID)
 *  TTL:   DEBOUNCE_TTL_SECONDS (default 10s), sliding — reset on each hit
 *
 *  On each signal for component X:
 *
 *    1. GET debounce:X
 *       → exists?  Return incident_id. Caller links signal, skips creation.
 *       → missing? Caller creates incident, then calls set(X, incident_id).
 *
 *    2. extend(X) is called on every hit (existing or new) to slide the window.
 *       "10 seconds of silence" = no new incident. As long as signals keep
 *       arriving, the window stays open.
 *
 * ─── Why not a Lua script? ────────────────────────────────────────────────────
 *
 *  For get+extend, a Lua script would be atomic. But we don't need atomicity
 *  here — the worst case of a race on extend() is the TTL is set twice with
 *  the same value. No correctness issue. Keep it simple.
 *
 *  The only place atomicity matters is SET NX EX (handled by IncidentService
 *  via trySet), which IS atomic as a single Redis command.
 *
 * ─── Why sliding window, not fixed window? ───────────────────────────────────
 *
 *  Fixed: Window expires at T+10 regardless of signal activity.
 *    Problem: if 100 signals arrive at T+9, a new incident opens at T+10
 *    even though the component is still thrashing.
 *
 *  Sliding: Each signal resets the TTL. Window closes 10s after the LAST signal.
 *    The incident stays open as long as the component is noisy.
 *    Much better for real incident management.
 */

const TTL = parseInt(process.env.DEBOUNCE_TTL_SECONDS || '10', 10);
const KEY_PREFIX = 'debounce:';

export class DebounceService {

  /**
   * Check if a debounce key exists for this component.
   * Returns the incident_id if found, null if not.
   */
  static async get(componentId: string): Promise<string | null> {
    return redisClient.get(`${KEY_PREFIX}${componentId}`);
  }

  /**
   * Atomically set the debounce key ONLY IF it doesn't exist.
   * Uses SET NX EX — single atomic Redis command.
   *
   * Returns true  → key was set (this worker won, create the incident)
   * Returns false → key already existed (another worker beat us, skip creation)
   *
   * This is the critical mutual exclusion point.
   */
  static async trySet(componentId: string, incidentId: string): Promise<boolean> {
    // SET key value NX EX ttl
    // NX = only set if Not eXists
    // Returns 'OK' on success, null if key already existed
    const result = await redisClient.set(
  `${KEY_PREFIX}${componentId}`,
  incidentId,
  'EX',
  TTL,
  'NX'
);
    return result === 'OK';
  }


  /**
   * Slide the window — reset TTL on an existing key.
   * Called on EVERY signal hit (new or duplicate).
   * This implements the sliding window behavior.
   */
  static async extend(componentId: string): Promise<void> {
    await redisClient.expire(`${KEY_PREFIX}${componentId}`, TTL);
  }

  /**
   * Manually clear a debounce key.
   * Used when an incident is explicitly closed — we want fresh
   * incidents to open if the component errors again after resolution.
   */
  static async clear(componentId: string): Promise<void> {
    await redisClient.del(`${KEY_PREFIX}${componentId}`);
  }

  /**
   * Debug helper — returns TTL remaining on a component's debounce key.
   * -1 = key exists, no TTL (shouldn't happen)
   * -2 = key does not exist
   *  N = seconds remaining
   */
  static async ttlRemaining(componentId: string): Promise<number> {
    return redisClient.ttl(`${KEY_PREFIX}${componentId}`);
  }
}