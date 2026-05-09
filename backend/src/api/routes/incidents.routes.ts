import { Router } from 'express';
import { IncidentController, UpdateStatusSchema, SubmitRcaSchema } from '../../controllers/incident.controller';
import { validate }       from '../middleware/validate';
import { asyncHandler }   from '../middleware/asyncHandler';

/**
 * incidents.routes.ts
 *
 * REST resource: /api/incidents
 *
 * GET    /                → list all (filterable)
 * GET    /:id             → single incident + signals
 * PATCH  /:id/status      → state machine transition
 * POST   /:id/rca         → submit RCA
 */
const router = Router();

router.get(
  '/',
  asyncHandler(IncidentController.getAll)
);

router.get(
  '/:id',
  asyncHandler(IncidentController.getById)
);

router.patch(
  '/:id/status',
  validate(UpdateStatusSchema),
  asyncHandler(IncidentController.updateStatus)
);

router.post(
  '/:id/rca',
  validate(SubmitRcaSchema),
  asyncHandler(IncidentController.submitRca)
);

export { router as incidentRouter };