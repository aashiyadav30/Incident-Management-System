import { Incident } from '@prisma/client';
import { IAlertStrategy } from './AlertStrategy.interface';

export class P1AlertStrategy implements IAlertStrategy {
  async execute(incident: Incident): Promise<void> {
    console.warn(`
┌──────────────────────────────────────────────────────┐
│  ⚠️  P1 HIGH INCIDENT OPENED                          │
├──────────────────────────────────────────────────────┤
│  ID:        ${incident.id.substring(0, 8)}...
│  Component: ${incident.component_id}
│  Title:     ${incident.title}
│  Created:   ${incident.created_at.toISOString()}
├──────────────────────────────────────────────────────┤
│  → [PagerDuty]  Triggering HIGH alert                │
│  → [Slack]      Posting to #incidents                │
└──────────────────────────────────────────────────────┘
    `.trim());
  }
}