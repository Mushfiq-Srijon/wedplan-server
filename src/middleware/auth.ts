import type { NextFunction, RequestHandler } from 'express';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { fromNodeHeaders } from 'better-auth/node';
import mongoose from 'mongoose';
import { auth } from '../auth/better-auth.js';
import { env } from '../config/env.js';
import { User } from '../models/index.js';
import type { UserDocument, UserRole } from '../types/models.js';

export function signUser(user: UserDocument): string {
  return jwt.sign({ sub: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn'],
  });
}

function setJwtCookie(response: Parameters<RequestHandler>[1], token: string): void {
  response.cookie(env.cookieName, token, {
    httpOnly: true,
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    secure: env.nodeEnv === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

async function findUserFromBetterAuthSession(request: Parameters<RequestHandler>[0]) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(request.headers),
  });

  if (!session) {
    return null;
  }

  // Better Auth IDs are persisted by the Mongo adapter as ObjectIds. The
  // email fallback also keeps existing data readable if the adapter is later
  // configured with a string-based ID strategy.
  // Better Auth normally uses Mongo ObjectIds with this adapter, but keeping
  // the email fallback safe allows existing string-based auth IDs to work too.
  const userById = mongoose.isValidObjectId(session.user.id)
    ? await User.findById(session.user.id)
    : null;

  return userById || (await User.findOne({ email: session.user.email }));
}

export const requireAuth: RequestHandler = async (req, res, next) => {
  const token =
    req.cookies?.[env.cookieName] || req.headers.authorization?.replace(/^Bearer\s+/i, '');

  // JWT remains the transport accepted by protected Express APIs. Better Auth
  // sessions are also accepted so the browser can authenticate immediately
  // after sign-in and then receive this JWT bridge cookie.
  if (token) {
    try {
      const payload = jwt.verify(token, env.jwtSecret);
      if (typeof payload !== 'string' && payload.sub) {
        const user = await User.findById(payload.sub);
        if (user) {
          if (user.isBlocked) {
            res.status(403).json({ message: 'Your account is blocked.' });
            return;
          }

          req.user = user;
          next();
          return;
        }
      }
    } catch {
      // Fall through to the Better Auth session. This supports a clean auth
      // migration when an old JWT cookie exists beside a new session cookie.
    }
  }

  try {
    const user = await findUserFromBetterAuthSession(req);
    if (!user) {
      res.status(401).json({ message: 'Authentication required.' });
      return;
    }
    if (user.isBlocked) {
      res.status(403).json({ message: 'Your account is blocked.' });
      return;
    }

    req.user = user;
    // Seed the JWT bridge after a successful Better Auth session lookup.
    setJwtCookie(res, signUser(user));
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired authentication session.' });
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req, res, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      res.status(403).json({ message: 'You do not have permission for this action.' });
      return;
    }
    next();
  };
}
