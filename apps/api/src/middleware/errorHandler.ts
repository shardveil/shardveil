import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
import type { ErrorHandler } from "hono";
import { ZodError } from "zod";

import { logger } from "../config/logger";
import { ApiError } from "../lib/errors";

/**
 * Global error handler middleware for Hono.
 *
 * Catches all errors and returns a consistent JSON response shape:
 * - ApiError: Returns the error code, message, and optional details
 * - ZodError: Returns 400 with field-level validation errors
 * - PrismaClientKnownRequestError: Maps specific Prisma errors (P2002, P2025) to appropriate HTTP status codes
 * - Other errors: Returns 500 with a generic message (full stack is logged server-side, not leaked to client)
 *
 * Every response includes a requestId for client-side error reporting and server-side log tracing.
 *
 * Usage:
 * app.onError(errorHandler)
 */
export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get("requestId") ?? "unknown";

  // Handle custom API errors
  if (err instanceof ApiError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          ...(err.details !== undefined ? { details: err.details } : {}),
          requestId,
        },
      },
      err.status as any,
    );
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: err.flatten().fieldErrors,
          requestId,
        },
      },
      400,
    );
  }

  // Handle Prisma-specific errors
  if (err instanceof PrismaClientKnownRequestError) {
    // P2002: Unique constraint violation
    if (err.code === "P2002") {
      return c.json(
        {
          error: {
            code: "CONFLICT",
            message: "Resource already exists",
            requestId,
          },
        },
        409,
      );
    }

    // P2025: Record not found (used by update/delete operations)
    if (err.code === "P2025") {
      return c.json(
        {
          error: {
            code: "NOT_FOUND",
            message: "Resource not found",
            requestId,
          },
        },
        404,
      );
    }
  }

  // Handle all other errors
  // Log full error details server-side for debugging
  logger.error(
    {
      requestId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    },
    "Unhandled error",
  );

  // Return generic 500 response to client without leaking stack trace
  return c.json(
    {
      error: {
        code: "INTERNAL",
        message: "Something went wrong",
        requestId,
      },
    },
    500,
  );
};
