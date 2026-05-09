import { IIncidentState, InvalidTransitionError } from './IIncidentState';
import { ResolvedState } from './ResolvedState';

export class InvestigatingState implements IIncidentState {
  readonly name = 'INVESTIGATING';

  acknowledge(): IIncidentState {
    throw new InvalidTransitionError(
      this.name,
      'INVESTIGATING',
      'already being investigated'
    );
  }

  resolve(): IIncidentState {
    return new ResolvedState();
  }

  close(): IIncidentState {
    throw new InvalidTransitionError(
      this.name,
      'CLOSED',
      'must resolve before closing'
    );
  }
}