export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
    // Restore prototype chain — required when extending built-in classes in TypeScript
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Invalid request data') {
    super(400, 'VALIDATION_ERROR', message);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ExternalApiError extends AppError {
  constructor(message = 'External service is unavailable') {
    super(502, 'EXTERNAL_API_ERROR', message);
  }
}
