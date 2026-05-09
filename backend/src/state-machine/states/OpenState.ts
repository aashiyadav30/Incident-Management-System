import { IIncidentState, InvalidTransitionError } from './IIncidentState';
import { InvestigatingState } from './InvestigatingState';

export class OpenState implements IIncidentState {
  readonly name = 'OPEN';

  acknowledge(): IIncidentState {
    return new InvestigatingState();
  }

  resolve(): IIncidentState {
    throw new InvalidTransitionError(
      this.name,
      'RESOLVED',
      'must acknowledge before resolving'
    );
  }

  close(): IIncidentState {
    throw new InvalidTransitionError(
      this.name,
      'CLOSED',
      'must acknowledge and resolve before closing'
    );
  }
}