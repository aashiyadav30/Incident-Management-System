import { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * asyncHandler.ts
 *
 * Wraps an async route handler so unhandled promise rejections
 * are automatically forwarded to Express's error middleware.
 *
 * WITHOUT this:
 *   router.get('/', async (req, res, next) => {
 *     try {
 *       const data = await someService();
 *       res.json(data);
 *     } catch (err) {
 *       next(err);   // ← must remember this in every handler
 *     }
 *   });
 *
 * WITH this:
 *   router.get('/', asyncHandler(async (req, res) => {
 *     const data = await someService();
 *     res.json(data);    // throw anything → automatically hits error middleware
 *   }));
 *
 * DESIGN: This is a well-known Express pattern. It keeps controllers
 * focused on logic, not error plumbing.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}