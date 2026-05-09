import { Incident } from '@prisma/client';

/**
 * AlertStrategy.interface.ts
 *
 * CONTRACT: Every alert strategy must implement this interface.
 *
 * DESIGN — Strategy Pattern:
 *   The worker doesn't know or care which severity it's handling.
 *   It calls alertStrategy.execute(incident) and the correct
 *   implementation fires. New severity levels = new class, no
 *   changes to the worker or incident service.
 *
 *   In production, execute() would:
 *     P0 → PagerDuty critical + Slack #incidents + SMS on-call
 *     P1 → PagerDuty high + Slack #incidents
 *     P2 → Slack #alerts only
 *
 *   Here we simulate with structured console output.
 */
export interface IAlertStrategy {
  execute(incident: Incident): Promise<void>;
}