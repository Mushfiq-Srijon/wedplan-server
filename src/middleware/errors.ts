import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

function fieldLabel(path: PropertyKey[]): string {
  if (path.length === 0) return 'Input';

  return path
    .map((part) =>
      typeof part === 'string'
        ? part.replace(/([A-Z])/g, ' $1').replace(/^./, (character) => character.toUpperCase())
        : `item ${String(part)}`
    )
    .join(' ');
}

export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const field = fieldLabel(issue.path);
      const details = issue as unknown as {
        code?: string;
        minimum?: number;
        maximum?: number;
        origin?: string;
      };

      if (details.code === 'too_small' && typeof details.minimum === 'number') {
        if (details.origin === 'string')
          return `${field} must be at least ${details.minimum} characters.`;
        if (details.origin === 'array')
          return `${field} must contain at least ${details.minimum} items.`;
        return `${field} must be at least ${details.minimum}.`;
      }
      if (details.code === 'too_big' && typeof details.maximum === 'number') {
        if (details.origin === 'string')
          return `${field} must be ${details.maximum} characters or fewer.`;
        if (details.origin === 'array')
          return `${field} must contain ${details.maximum} items or fewer.`;
        return `${field} must be ${details.maximum} or less.`;
      }
      if (details.code === 'invalid_format') return `${field} has an invalid format.`;
      if (details.code === 'invalid_type') return `${field} is required.`;

      return `${field}: ${issue.message}`;
    })
    .join(' ');
}

export const notFound: RequestHandler = (req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  console.error(error);

  if (error instanceof ZodError) {
    res.status(400).json({ message: formatZodError(error) });
    return;
  }

  if (error?.code === 11000) {
    res.status(409).json({ message: 'An account with that email already exists.' });
    return;
  }
  if (error?.name === 'ValidationError') {
    res.status(400).json({ message: error.message });
    return;
  }

  res.status(error?.status || 500).json({ message: error?.message || 'Something went wrong.' });
};
