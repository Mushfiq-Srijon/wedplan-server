import type { UserDocument } from '../types/models.js';

declare global {
  namespace Express {
    interface Request {
      user?: UserDocument;
    }
  }
}

export {};
