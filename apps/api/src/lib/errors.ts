/**
 * Custom error classes for the API.
 *
 * Provides a hierarchy of error classes that extend ApiError,
 * each with a predefined HTTP status code and error code.
 * All errors can include optional details for client consumption.
 */

export class ApiError extends Error {
  /**
   * Creates a new API error.
   *
   * @param status - HTTP status code (e.g., 400, 404, 500)
   * @param code - Machine-readable error code (e.g., 'NOT_FOUND', 'VALIDATION_ERROR')
   * @param message - Human-readable error message
   * @param details - Optional additional error details for the client
   */
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * 404 Not Found error.
 * Used when a requested resource does not exist.
 */
export class NotFoundError extends ApiError {
  constructor(message = "Resource not found", details?: unknown) {
    super(404, "NOT_FOUND", message, details);
    this.name = "NotFoundError";
  }
}

/**
 * 401 Unauthorized error.
 * Used when authentication is required but not provided or invalid.
 */
export class UnauthorizedError extends ApiError {
  constructor(message = "Unauthorized", details?: unknown) {
    super(401, "UNAUTHORIZED", message, details);
    this.name = "UnauthorizedError";
  }
}

/**
 * 403 Forbidden error.
 * Used when the user is authenticated but lacks permission to access the resource.
 */
export class ForbiddenError extends ApiError {
  constructor(message = "Forbidden", details?: unknown) {
    super(403, "FORBIDDEN", message, details);
    this.name = "ForbiddenError";
  }
}

/**
 * 400 Validation Error.
 * Used when request validation fails (e.g., Zod schema validation).
 */
export class ValidationError extends ApiError {
  constructor(message = "Validation failed", details?: unknown) {
    super(400, "VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
  }
}

/**
 * 409 Conflict error.
 * Used when the request conflicts with existing resources (e.g., duplicate entry).
 */
export class ConflictError extends ApiError {
  constructor(message = "Resource already exists", details?: unknown) {
    super(409, "CONFLICT", message, details);
    this.name = "ConflictError";
  }
}

/**
 * 429 Rate Limit error.
 * Used when the client has exceeded the rate limit.
 */
export class RateLimitError extends ApiError {
  constructor(message = "Rate limit exceeded", details?: unknown) {
    super(429, "RATE_LIMIT_EXCEEDED", message, details);
    this.name = "RateLimitError";
  }
}
