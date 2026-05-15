import { randomUUID } from 'node:crypto';
import type { MiddlewareHandler } from 'hono';
import { logger } from '../config/logger';

/**
 * Hono middleware that adds structured request/response logging to every request.
 *
 * Responsibilities:
 * - Generate and attach a unique request ID (UUID v4) to the request context
 * - Log request start: method, path, IP address, request ID
 * - Log request end: HTTP status code, duration in milliseconds
 * - Log errors with full stack trace if an error occurs
 *
 * Usage:
 * app.use(loggerMiddleware)
 *
 * The request ID is available in the Hono context via c.get('requestId')
 * and automatically included in all logs for tracing across the request lifecycle.
 */

export const loggerMiddleware: MiddlewareHandler = async (c, next) => {
  const requestId = randomUUID();
  const startTime = Date.now();

  // Store request ID in context for downstream handlers
  c.set('requestId', requestId);

  // Get client IP (handles forwarded headers in case of reverse proxy)
  const ip =
    c.req.header('x-forwarded-for')?.split(',')[0] ||
    c.req.header('x-real-ip') ||
    'unknown';

  const method = c.req.method;
  const path = c.req.path;

  // Log request start
  logger.info(
    {
      requestId,
      method,
      path,
      ip,
    },
    'Request started',
  );

  try {
    // Process the request
    await next();

    // Log request end
    const durationMs = Date.now() - startTime;
    const status = c.res.status;

    logger.info(
      {
        requestId,
        method,
        path,
        status,
        durationMs,
      },
      'Request completed',
    );
  } catch (error) {
    // Log error with full stack trace
    const durationMs = Date.now() - startTime;

    const errorLog = {
      requestId,
      method,
      path,
      durationMs,
      error: error instanceof Error ? error.message : String(error),
    };

    if (error instanceof Error && error.stack) {
      logger.error(
        {
          ...errorLog,
          stack: error.stack,
        },
        'Request failed with error',
      );
    } else {
      logger.error(errorLog, 'Request failed');
    }

    throw error;
  }
};
