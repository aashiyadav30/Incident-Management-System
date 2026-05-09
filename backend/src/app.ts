import 'dotenv/config';
import express, { Application, Request, Response, NextFunction } from 'express';
import cors    from 'cors';
import helmet  from 'helmet';
import morgan  from 'morgan';

import { connectRedis }  from './config/redis';
import { connectMongo }  from './config/mongo';
import { prisma, disconnectDB } from './config/db';

import { globalLimiter }   from './api/middleware/rateLimiter';
import { signalRouter }    from './api/routes/signals.routes';
import { incidentRouter }  from './api/routes/incidents.routes';
import { healthRouter }    from './api/routes/health.routes';
import { MetricsService }  from './services/metrics.service';

const app: Application = express();
const PORT = process.env.PORT || 3000;

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(helmet());
app.use(cors({
  origin:  process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
}));
app.use(express.json({ limit: '10kb' }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(globalLimiter);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/health',         healthRouter);
app.use('/api/signals',    signalRouter);
app.use('/api/incidents',  incidentRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[UnhandledError]', err);
  res.status(500).json({
    success: false,
    error:   'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? undefined : err.message,
  });
});

// ─── Bootstrap ────────────────────────────────────────────────────────────────

let metricsInterval: NodeJS.Timeout;

async function bootstrap(): Promise<void> {
  try {
    await connectRedis();
    await connectMongo();
    await prisma.$connect();
    console.log('[PostgreSQL] Prisma connected');

    // Start 5-second throughput metrics logger
    metricsInterval = MetricsService.startPeriodicLogger();

    app.listen(PORT, () => {
      console.log(
        `[App] Server running → http://localhost:${PORT}  [${process.env.NODE_ENV || 'development'}]`
      );
      console.log('[App] Routes:');
      console.log('       GET  /health');
      console.log('       POST /api/signals');
      console.log('       GET  /api/incidents');
      console.log('       GET  /api/incidents/:id');
      console.log('       PATCH /api/incidents/:id/status');
      console.log('       POST  /api/incidents/:id/rca');
    });
  } catch (err) {
    console.error('[App] Startup failed:', err);
    process.exit(1);
  }
}

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  console.log(`[App] ${signal} — shutting down`);
  clearInterval(metricsInterval);
  await disconnectDB();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

bootstrap();