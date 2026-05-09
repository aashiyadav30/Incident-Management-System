import { SignalModel, ISignal } from '../models/signal.model';
import { SignalDocument } from '../types/signal.types';

/**
 * signal.repository.ts
 *
 * Repository pattern: all MongoDB I/O for signals lives here.
 *
 * DESIGN: Services call repositories. Controllers call services.
 * Neither the controller nor the worker ever imports SignalModel directly.
 *
 * WHY? If we ever swap MongoDB for a different store, only this
 * file changes. The service layer is completely insulated.
 *
 * All methods are static — SignalRepository is a stateless utility class,
 * not something that needs to be instantiated or injected.
 */
export class SignalRepository {

  /**
   * Persist a raw signal document.
   * Called by the worker immediately upon job pickup — before any
   * debounce or incident logic. Raw signals are ALWAYS stored.
   *
   * Returns the saved document (includes the assigned _id).
   */
  static async create(data: SignalDocument): Promise<ISignal> {
    const signal = new SignalModel(data);
    return signal.save();
  }

  /**
   * Backfill the incident_id on a signal after the worker
   * determines which incident this signal belongs to.
   *
   * Uses updateOne instead of findById + save to avoid
   * a read-modify-write cycle. More efficient under load.
   */
  static async linkToIncident(
    signalId: string,
    incidentId: string
  ): Promise<void> {
    await SignalModel.updateOne(
      { _id: signalId },
      { $set: { incident_id: incidentId } }
    );
  }

  /**
   * Fetch all signals linked to a given incident.
   * Used by the incident detail page.
   * Sorted by timestamp ascending — chronological event timeline.
   */
  static async findByIncidentId(incidentId: string): Promise<ISignal[]> {
    return SignalModel
      .find({ incident_id: incidentId })
      .sort({ timestamp: 1 })
      .lean(); // .lean() returns plain JS objects, not Mongoose Documents
               // ~40% faster for read-only queries — no need for .save()
  }

  /**
   * Fetch recent signals for a component — used for debugging/dashboard.
   * Capped at 50 to prevent unbounded result sets.
   */
  static async findByComponentId(
    componentId: string,
    limit = 50
  ): Promise<ISignal[]> {
    return SignalModel
      .find({ component_id: componentId.toUpperCase() })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }
}