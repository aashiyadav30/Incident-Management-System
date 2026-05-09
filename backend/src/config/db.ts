import { PrismaClient } from '@prisma/client';

/**
 * DESIGN DECISION: Singleton Prisma Client
 *
 * Prisma manages its own connection pool internally.
 * Creating multiple PrismaClient instances = multiple pools = wasted
 * connections and potential "too many clients" errors in PostgreSQL.
 *
 * The globalThis trick prevents duplicate instances during hot-reloading
 * in development (ts-node-dev creates new module scopes on each reload,
 * but globalThis persists across them).
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      // In development: log all queries for debugging
      // In production: only log warnings and errors
      process.env.NODE_ENV === 'development' ? 'query' : 'warn',
      'warn',
      'error',
    ],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Gracefully disconnect Prisma on process exit.
 * Called from app.ts shutdown handler.
 */
export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  console.log('[PostgreSQL] Prisma client disconnected');
}