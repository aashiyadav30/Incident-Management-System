import { Incident } from '@prisma/client';
import { IAlertStrategy } from './AlertStrategy.interface';

export class P0AlertStrategy implements IAlertStrategy {
  async execute(incident: Incident): Promise<void> {
    console.error(`
╔══════════════════════════════════════════════════════╗
║  🚨  P0 CRITICAL INCIDENT — IMMEDIATE ACTION NEEDED  ║
╠══════════════════════════════════════════════════════╣
║  ID:        ${incident.id.substring(0, 8)}...
║  Component: ${incident.component_id}
║  Title:     ${incident.title}
║  Created:   ${incident.created_at.toISOString()}
╠══════════════════════════════════════════════════════╣
║  → [PagerDuty]  Triggering CRITICAL alert            ║
║  → [Slack]      Posting to #incidents (P0 channel)   ║
║  → [SMS]        Paging on-call engineer              ║
║  → [Email]      Notifying VP Engineering             ║
╚══════════════════════════════════════════════════════╝
    `.trim());
  }
}