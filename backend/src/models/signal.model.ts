import mongoose, { Schema, Document, Model } from 'mongoose';
import { SignalDocument } from '../types/signal.types';

/**
 * signal.model.ts
 *
 * Mongoose schema for raw signal storage.
 *
 * DESIGN DECISIONS:
 *
 * 1. No strict mode off — we keep strict: true (Mongoose default).
 *    Extra fields in the payload are silently stripped.
 *    This prevents callers from polluting the signals collection
 *    with arbitrary data.
 *
 * 2. We add indexes here, NOT in application code.
 *    Mongoose syncs them on connection. In production you'd
 *    set { autoIndex: false } and manage indexes via migrations.
 *
 * 3. incident_id starts as null.
 *    The worker backfills it after the incident is created/found.
 *    This creates a soft reference between Mongo and Postgres —
 *    intentionally loose (no foreign key) because we're crossing DB boundaries.
 *
 * 4. timestamps: false — we manage ingested_at manually so we can
 *    distinguish between the *event time* (timestamp) and the
 *    *receipt time* (ingested_at). Mongo's auto timestamps would
 *    only give us one createdAt.
 */

export interface ISignal extends SignalDocument, Document {}

const SignalSchema = new Schema<ISignal>(
  {
    component_id: {
      type: String,
      required: true,
      index: true,     // Fast lookup: "give me all signals for CACHE_CLUSTER_01"
      trim: true,
      uppercase: true, // Normalize: "cache_cluster_01" → "CACHE_CLUSTER_01"
    },

    severity: {
      type: String,
      enum: ['P0', 'P1', 'P2'],
      required: true,
      index: true,
    },

    message: {
      type: String,
      required: true,
      maxlength: 2000, // Prevent oversized signal messages
    },

    // The time the event actually occurred (caller-provided)
    timestamp: {
      type: Date,
      required: true,
    },

    // The time OUR system received and stored it (server-set)
    ingested_at: {
      type: Date,
      required: true,
      default: () => new Date(),
    },

    // Set by worker after incident is created or found in Postgres
    incident_id: {
      type: String,
      default: null,
      index: true,     // Fast lookup: "give me all signals for incident X"
    },
  },
  {
    timestamps: false,  // Managed manually (see note above)
    versionKey: false,  // Removes __v field — we don't use optimistic locking here
    collection: 'signals',
  }
);

// ─── Compound Index ───────────────────────────────────────────────────────────

/**
 * Compound index for the most common query pattern:
 * "Give me all signals for component X between time A and B"
 * Used by the incident detail page to show the signal timeline.
 */
SignalSchema.index({ component_id: 1, timestamp: -1 });

// ─── Model ────────────────────────────────────────────────────────────────────

export const SignalModel: Model<ISignal> =
  mongoose.models.Signal || mongoose.model<ISignal>('Signal', SignalSchema);