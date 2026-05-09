import { IncidentStatus } from '@prisma/client';

import {
  IIncidentState,
  InvalidTransitionError,
} from './states/IIncidentState';

import { OpenState } from './states/OpenState';
import { InvestigatingState } from './states/InvestigatingState';
import { ResolvedState } from './states/ResolvedState';
import { ClosedState } from './states/ClosedState';

/**
 * IncidentStateMachine.ts
 *
 * Orchestrates state transitions for a single incident.
 * Holds the current state object and delegates transition calls to it.
 *
 * DESIGN:
 *   - Constructed with the CURRENT status from DB (rehydration).
 *   - Caller calls transition methods (acknowledge, resolve, close).
 *   - Machine returns the new status string to persist to DB.
 *   - Machine never touches the DB directly — that's IncidentService's job.
 *
 * USAGE in IncidentService:
 *   const machine = new IncidentStateMachine(incident.status);
 *   const newStatus = machine.acknowledge();
 *   await incidentRepo.updateStatus(incident.id, newStatus);
 */
export class IncidentStateMachine {
  private state: IIncidentState;

  constructor(currentStatus: IncidentStatus) {
    // Rehydrate state object from the DB enum value
    this.state = IncidentStateMachine.fromStatus(currentStatus);
  }

  // ─── Transitions ────────────────────────────────────────────────────────────

  acknowledge(): IncidentStatus {
    this.state = this.state.acknowledge();
    return this.state.name as IncidentStatus;
  }

  resolve(): IncidentStatus {
    this.state = this.state.resolve();
    return this.state.name as IncidentStatus;
  }

  /**
   * Close requires RCA to exist.
   * The service checks DB for RCA record and passes the boolean here.
   * Machine enforces the rule — service enforces the check.
   */
  close(hasRca: boolean): IncidentStatus {
    this.state = this.state.close(hasRca);
    return this.state.name as IncidentStatus;
  }

  // ─── Introspection ──────────────────────────────────────────────────────────

  getCurrentStatus(): IncidentStatus {
    return this.state.name as IncidentStatus;
  }

  /**
   * Returns which transitions are valid from the current state.
   * Used by the frontend to conditionally enable/disable action buttons.
   */
  getAvailableTransitions(): string[] {
    const transitions: string[] = [];
    if (this.state.name === 'OPEN')          transitions.push('acknowledge');
    if (this.state.name === 'INVESTIGATING') transitions.push('resolve');
    if (this.state.name === 'RESOLVED')      transitions.push('close');
    return transitions;
  }

  // ─── Factory ─────────────────────────────────────────────────────────────────

  private static fromStatus(status: IncidentStatus): IIncidentState {
    const map: Record<IncidentStatus, IIncidentState> = {
      OPEN:          new OpenState(),
      INVESTIGATING: new InvestigatingState(),
      RESOLVED:      new ResolvedState(),
      CLOSED:        new ClosedState(),
    };
    const state = map[status];
    if (!state) throw new Error(`Unknown incident status: ${status}`);
    return state;
  }
}