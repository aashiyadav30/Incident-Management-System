import mongoose from 'mongoose';

/**
 * DESIGN DECISION: Why MongoDB for signals?
 *
 * Signals are append-only, schema-flexible, and write-heavy.
 * We never JOIN signals — we fetch them by incident_id or component_id.
 * MongoDB's document model is a natural fit; no migrations needed when
 * signal payloads evolve.
 *
 * We keep MongoDB for raw/audit data and PostgreSQL for structured
 * operational data (incidents, RCA). This is a common SRE pattern —
 * "hot path" raw events in document store, business entities in relational.
 */

export async function connectMongo(): Promise<void> {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ims';

  // Mongoose connection event hooks — critical for production observability
  mongoose.connection.on('connected', () => {
    console.log('[MongoDB] Connection established');
  });

  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Connection error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected. Mongoose will auto-reconnect.');
  });

  await mongoose.connect(uri, {
    // Connection pool size — tune based on expected worker concurrency.
    // Each worker process can hold up to 10 connections to Mongo.
    maxPoolSize: 10,

    // How long to wait for a connection from the pool before erroring.
    // Prevents indefinite hangs during DB pressure.
    serverSelectionTimeoutMS: 5000,

    // Socket timeout — if a query takes longer than 45s, abort it.
    socketTimeoutMS: 45000,
  });
}