import { Incident } from '@prisma/client';
import { IAlertStrategy } from './AlertStrategy.interface';

export class P2AlertStrategy implements IAlertStrategy {
  async execute(incident: Incident): Promise<void> {
    console.log(`
[Alert][P2] Moderate incident opened
  ID:        ${incident.id.substring(0, 8)}...
  Component: ${incident.component_id}
  Title:     ${incident.title}
  → [Slack]  Posting to #alerts
    `.trim());
  }
}