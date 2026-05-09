import { IIncidentState, InvalidTransitionError } from './IIncidentState';
import { ClosedState } from './ClosedState';

export class ResolvedState implements IIncidentState {
  readonly name = 'RESOLVED';

  acknowledge(): IIncidentState {
    throw new InvalidTransitionError(
      this.name,
      'INVESTIGATING',
      'already past investigation stage'
    );
  }

  resolve(): IIncidentState {
    throw new InvalidTransitionError(
      this.name,
      'RESOLVED',
      'already resolved'
    );
  }

  close(hasRca: boolean): IIncidentState {
    if (!hasRca) {
      throw new InvalidTransitionError(
        this.name,
        'CLOSED',
        'RCA must be submitted before closing'
      );
    }

    return new ClosedState();
  }
}