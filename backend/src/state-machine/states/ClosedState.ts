import { IIncidentState, InvalidTransitionError } from './IIncidentState';

export class ClosedState implements IIncidentState {
  readonly name = 'CLOSED';

  acknowledge(): IIncidentState {
    throw new InvalidTransitionError(
      this.name,
      'INVESTIGATING',
      'incident is closed'
    );
  }

  resolve(): IIncidentState {
    throw new InvalidTransitionError(
      this.name,
      'RESOLVED',
      'incident is closed'
    );
  }

  close(): IIncidentState {
    throw new InvalidTransitionError(
      this.name,
      'CLOSED',
      'incident is already closed'
    );
  }
}