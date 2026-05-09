import { Incident, IncidentStatus, Severity } from '@prisma/client';
import { IncidentRepository } from '../repositories/incident.repository';
import { IncidentStateMachine } from '../state-machine/IncidentStateMachine';
import { DebounceService } from './debounce.service';
import { InvalidTransitionError } from '../state-machine/states/IIncidentState';
/**
 * incident.service.ts
 *
 * Business logic for incident management.
 * Orchestrates: DebounceService, IncidentRepository, IncidentStateMachine.
 *
 * DESIGN:
 *   - Worker calls createOrLink() for every processed signal
 *   - HTTP controllers call transition methods for lifecycle changes
 *   - Repository handles all DB I/O
 *   - StateMachine enforces transition rules
 *   - This service coordinates all of the above
 */
export class IncidentService {

  /**
   * createOrLink — called by the worker for every signal.
   *
   * The core debounce + incident logic:
   *
   *   1. Check Redis for existing debounce key
   *   2a. Key exists → append signalId, extend TTL, return existing incident
   *   2b. Key missing → race to create:
   *       - trySet returns false → another worker won, fetch theirs
   *       - trySet returns true  → we won, create the incident
   *   3. Return { incidentId, isNew }
   *
   * RACE CONDITION HANDLING:
   *   Between step 1 (GET) and step 2b (SET NX), another worker could
   *   have created the incident. trySet handles this atomically —
   *   only ONE worker can set NX successfully.
   *
   *   If we lose the race, we fall back to GET to retrieve the winner's
   *   incident_id and link our signal to it.
   */
  static async createOrLink(signal: {
    signalId:    string;
    component_id: string;
    severity:    Severity;
    message:     string;
  }): Promise<{ incidentId: string; isNew: boolean }> {

    const { signalId, component_id, severity, message } = signal;

    // ── Step 1: Check debounce key ────────────────────────────────────────────
    const existingId = await DebounceService.get(component_id);

    if (existingId) {
      // ── Step 2a: Debounce hit ─────────────────────────────────────────────
      await Promise.all([
        IncidentRepository.appendSignalId(existingId, signalId),
        DebounceService.extend(component_id),             // Slide the window
      ]);

      console.log(
        `[IncidentService] Signal linked to existing incident ${existingId.substring(0, 8)}...`
      );

      return { incidentId: existingId, isNew: false };
    }

    // ── Step 2b: No debounce key — try to create ──────────────────────────────
    // Generate a title from the signal message (truncated)
    const title = `[${severity}] ${component_id}: ${message.substring(0, 80)}`;

    // Attempt atomic set — only ONE worker wins this across all instances
    const tempPlaceholder = `pending-${Date.now()}`;
    const won = await DebounceService.trySet(component_id, tempPlaceholder);

    if (!won) {
      // Another worker beat us — wait briefly then fetch their incident_id
      // Brief delay gives the winning worker time to write to Postgres
      await new Promise(r => setTimeout(r, 100));
      const winnerId = await DebounceService.get(component_id);

      if (winnerId && !winnerId.startsWith('pending-')) {
        await IncidentRepository.appendSignalId(winnerId, signalId);
        return { incidentId: winnerId, isNew: false };
      }
    }

    // ── We won the race: create the incident ─────────────────────────────────
    const incident = await IncidentRepository.create({
      component_id,
      severity,
      title,
      signal_ids: [signalId],
    });

    // Replace the placeholder with the real incident UUID
    // Use a regular SET (not NX) to overwrite the placeholder
    await DebounceService.trySet(component_id, incident.id);
    // Also do a plain SET to overwrite placeholder regardless of NX
    const { redisClient } = await import('../config/redis');
    const ttl = parseInt(process.env.DEBOUNCE_TTL_SECONDS || '10', 10);
    await redisClient.set(
      `debounce:${component_id}`,
      incident.id,
      'EX',
      ttl
    );

    console.log(
      `[IncidentService] New incident created: ${incident.id.substring(0, 8)}... for ${component_id}`
    );

    return { incidentId: incident.id, isNew: true };
  }

  // ─── Lifecycle Transitions ────────────────────────────────────────────────

  /**
   * Each transition method:
   *   1. Fetches incident from DB
   *   2. Rehydrates state machine from current status
   *   3. Calls transition on machine (throws InvalidTransitionError if invalid)
   *   4. Persists new status + timestamps
   */

  static async acknowledge(incidentId: string): Promise<Incident> {
    const incident = await IncidentRepository.findById(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    const machine  = new IncidentStateMachine(incident.status);
    const newStatus = machine.acknowledge();  // throws if invalid

    return IncidentRepository.updateStatus(incidentId, { status: newStatus });
  }

  static async resolve(incidentId: string): Promise<Incident> {
    const incident = await IncidentRepository.findById(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    const machine   = new IncidentStateMachine(incident.status);
    const newStatus = machine.resolve();

    return IncidentRepository.updateStatus(incidentId, {
      status:      newStatus,
      resolved_at: new Date(),
    });
  }

  static async close(incidentId: string): Promise<Incident> {
    const incident = await IncidentRepository.findById(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    // State machine enforces RCA requirement
    const hasRca  = incident.rca !== null;
    const machine = new IncidentStateMachine(incident.status);
    const newStatus = machine.close(hasRca);    // throws if no RCA

    const now          = new Date();
    const mttr_seconds = Math.floor(
      (now.getTime() - incident.created_at.getTime()) / 1000
    );

    // Clear debounce key — component can open fresh incidents now
    await DebounceService.clear(incident.component_id);

    return IncidentRepository.updateStatus(incidentId, {
      status:       newStatus,
      closed_at:    now,
      mttr_seconds,
    });
  }

  // ─── RCA Submission ───────────────────────────────────────────────────────

  static async submitRca(
    incidentId: string,
    rcaData: {
      root_cause:         string;
      fix_applied:        string;
      prevention_steps:   string;
      impact_start_time:  Date;
      impact_end_time:    Date;
      submitted_by?:      string;
    }
  ): Promise<void> {
    const incident = await IncidentRepository.findById(incidentId);
    if (!incident) throw new Error(`Incident ${incidentId} not found`);

    if (incident.status !== 'RESOLVED') {
      throw new InvalidTransitionError(
        incident.status, 'RCA_SUBMITTED',
        'RCA can only be submitted for RESOLVED incidents'
      );
    }

    await IncidentRepository.submitRca(incidentId, rcaData);
    console.log(`[IncidentService] RCA submitted for incident ${incidentId.substring(0, 8)}...`);
  }

  // ─── Queries (for controllers) ────────────────────────────────────────────

  static async getAll(filters?: {
    status?:   IncidentStatus;
    severity?: Severity;
  }) {
    return IncidentRepository.findAll(filters);
  }

  static async getById(incidentId: string) {
    return IncidentRepository.findById(incidentId);
  }
}