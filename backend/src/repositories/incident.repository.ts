import { Incident, IncidentStatus, Severity } from '@prisma/client';
import { prisma } from '../config/db';

/**
 * incident.repository.ts
 *
 * All PostgreSQL I/O for incidents lives here.
 * IncidentService calls this. Nothing else does.
 */

export interface CreateIncidentInput {
  component_id: string;
  severity:     Severity;
  title:        string;
  signal_ids:   string[];
}

export interface UpdateStatusInput {
  status:       IncidentStatus;
  resolved_at?: Date;
  closed_at?:   Date;
  mttr_seconds?: number;
}

export class IncidentRepository {

  /**
   * Create a new incident.
   * Called by IncidentService only when debounce check confirms
   * no existing incident for this component.
   */
  static async create(data: CreateIncidentInput): Promise<Incident> {
    return prisma.incident.create({
      data: {
        component_id: data.component_id,
        severity:     data.severity,
        title:        data.title,
        status:       'OPEN',
        signal_ids:   data.signal_ids,
      },
    });
  }

  /**
   * Append a signal ID to an existing incident's signal_ids array.
   * PostgreSQL array operation — atomic push without reading the full array.
   */
  static async appendSignalId(
    incidentId: string,
    signalId: string
  ): Promise<void> {
    await prisma.incident.update({
      where: { id: incidentId },
      data: {
        signal_ids: { push: signalId },
        updated_at: new Date(),       // Prisma handles this via @updatedAt but explicit is safer
      },
    });
  }

  /**
   * Update incident status + relevant timestamps.
   * Called after a valid state machine transition.
   */
  static async updateStatus(
    incidentId: string,
    data: UpdateStatusInput
  ): Promise<Incident> {
    return prisma.incident.update({
      where: { id: incidentId },
      data,
    });
  }

  /**
   * Fetch a single incident with its RCA.
   * Used by the incident detail page and the state machine service.
   */
  static async findById(
    incidentId: string
  ): Promise<(Incident & { rca: { id: string } | null }) | null> {
    return prisma.incident.findUnique({
      where: { id: incidentId },
      include: { rca: { select: { id: true } } },
    });
  }

  /**
   * Fetch all incidents for the dashboard.
   * Sorted: severity asc (P0 first) + created_at desc (newest first).
   * Includes whether each incident has an RCA.
   */
  static async findAll(filters?: {
    status?: IncidentStatus;
    severity?: Severity;
  }): Promise<Incident[]> {
    return prisma.incident.findMany({
      where: {
        ...(filters?.status   && { status:   filters.status }),
        ...(filters?.severity && { severity: filters.severity }),
      },
      orderBy: [
        { severity:   'asc'  },   // P0 < P1 < P2 alphabetically
        { created_at: 'desc' },
      ],
      include: { rca: { select: { id: true } } },
    });
  }

  /**
   * Submit an RCA for an incident.
   * Uses a transaction: RCA create + incident status update happen atomically.
   * If either fails, both are rolled back.
   */
  static async submitRca(
    incidentId: string,
    rcaData: {
      root_cause:         string;
      fix_applied:        string;
      prevention_steps:   string;
      impact_start_time:  Date;
      impact_end_time:    Date;
      submitted_by?:      string;
    }
  ): Promise<void> {
    await prisma.$transaction([
      prisma.rCA.create({
        data: {
          incident_id:       incidentId,
          root_cause:        rcaData.root_cause,
          fix_applied:       rcaData.fix_applied,
          prevention_steps:  rcaData.prevention_steps,
          impact_start_time: rcaData.impact_start_time,
          impact_end_time:   rcaData.impact_end_time,
          submitted_by:      rcaData.submitted_by,
        },
      }),
    ]);
  }
}