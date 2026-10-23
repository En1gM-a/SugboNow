// Errors that map to an HTTP response. Anything else becomes a 500.

export interface ErrorDetail {
  path: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, details?: ErrorDetail[]) =>
  new AppError(400, "invalid_request", message, details);

export const unauthorized = () => new AppError(401, "unauthorized", "Sign in required.");

export const forbidden = (message: string) => new AppError(403, "forbidden", message);

export const notFound = (message = "Not found.") => new AppError(404, "not_found", message);

export const conflict = (message: string) => new AppError(409, "conflict", message);
