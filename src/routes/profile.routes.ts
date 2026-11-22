import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { User } from '../models/index.js';

const router = Router();
const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  image: z.string().url().optional().or(z.literal('')),
  businessName: z.string().trim().max(120).optional(),
});

router.patch('/me', requireAuth, async (req, res, next) => {
  try {
    const data = profileSchema.parse(req.body);
    const updates = req.user!.role === 'vendor' ? data : { name: data.name, image: data.image };
    const user = await User.findByIdAndUpdate(req.user!._id, updates, {
      new: true,
      runValidators: true,
    });
    res.json({ user, message: 'Profile updated successfully.' });
  } catch (error) {
    next(error);
  }
});

export default router;
