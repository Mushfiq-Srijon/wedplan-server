import { Router } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';
import type { UserDocument } from '../types/models.js';

const router = Router();

const signUpPasswordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters.')
  .regex(/[A-Z]/, 'Password must include at least one uppercase letter.')
  .regex(/[a-z]/, 'Password must include at least one lowercase letter.');

function safeUser(user: UserDocument) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    image: user.image,
    role: user.role,
    businessName: user.businessName,
    subscriptionPlan: user.subscriptionPlan,
    subscriptionExpiresAt: user.subscriptionExpiresAt,
  };
}

// Better Auth owns registration, but the assignment-specific password rules
// must still be enforced before its handler receives the request.
router.post('/sign-up/email', (req, _res, next) => {
  try {
    signUpPasswordSchema.parse(req.body?.password);
    next();
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie(env.cookieName);
  res.json({ message: 'You have been signed out.' });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: safeUser(req.user!) });
});

export default router;
