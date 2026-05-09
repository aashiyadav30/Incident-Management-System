export interface IIncidentState {
  name: string;

  acknowledge(): IIncidentState;

  resolve(): IIncidentState;

  close(hasRca: boolean): IIncidentState;
}

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string, reason?: string) {
    super(
      `Invalid transition: ${from} → ${to}${
        reason ? `. Reason: ${reason}` : ''
      }`
    );

    this.name = 'InvalidTransitionError';
  }
}