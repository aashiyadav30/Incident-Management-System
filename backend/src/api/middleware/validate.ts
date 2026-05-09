import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

/**
 * validate.ts
 *
 * Generic Zod validation middleware factory.
 *
 * DESIGN: Instead of writing per-route validation logic,
 * we create ONE reusable middleware factory that accepts any Zod schema.
 * This keeps controllers clean and makes validation composable.
 *
 * Usage:
 *   router.post('/signals', validate(SignalSchema), signalController.ingest);
 *
 * On success:  req.body is now the *parsed and coerced* Zod output.
 *              (e.g. timestamp string → validated ISO format)
 * On failure:  returns 400 with structured field-level errors.
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      // ZodError.flatten() gives us a clean { fieldErrors, formErrors } shape
      // much better than raw ZodError for API consumers
      const { fieldErrors, formErrors } = (result.error as ZodError).flatten();

      res.status(400).json({
        error: 'Validation failed',
        fieldErrors,
        formErrors,
      });
      return;
    }

    // Replace req.body with the *validated + coerced* data.
    // Downstream handlers can trust this is correct shape and types.
    req.body = result.data;
    next();
  };
}