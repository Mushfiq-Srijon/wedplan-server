import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Service, User } from '../models/index.js';

const router = Router();

const statusSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']),
  isActive: z.boolean().optional(),
});

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

router.use(requireAuth, requireRole('admin'));

router.get('/users', async (req, res, next) => {
  try {
    const search = queryString(req.query.search);
    const role = queryString(req.query.role);
    const filter: Record<string, unknown> = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role && role !== 'all') filter.role = role;

    const users = await User.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ users });
  } catch (error) {
    next(error);
  }
});

router.patch('/users/:id/block', async (req, res, next) => {
  try {
    const isBlocked = z.object({ isBlocked: z.boolean() }).parse(req.body).isBlocked;
    if (req.params.id === req.user!._id.toString()) {
      res.status(400).json({ message: 'You cannot block your own admin account.' });
      return;
    }

    const user = await User.findByIdAndUpdate(req.params.id, { isBlocked }, { new: true });
    if (!user) {
      res.status(404).json({ message: 'User not found.' });
      return;
    }
    res.json({ user, message: isBlocked ? 'User blocked.' : 'User unblocked.' });
  } catch (error) {
    next(error);
  }
});

router.get('/services', async (req, res, next) => {
  try {
    const status = queryString(req.query.status);
    const search = queryString(req.query.search);
    const filter: Record<string, unknown> = status && status !== 'all' ? { status } : {};
    if (search) {
      filter.$or = [
        { serviceName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
      ];
    }
    const services = await Service.find(filter)
      .populate('vendorId', 'name email businessName')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ services });
  } catch (error) {
    next(error);
  }
});

router.patch('/services/:id/status', async (req, res, next) => {
  try {
    const data = statusSchema.parse(req.body);
    const service = await Service.findByIdAndUpdate(
      req.params.id,
      { status: data.status, ...(data.isActive === undefined ? {} : { isActive: data.isActive }) },
      { new: true }
    );
    if (!service) {
      res.status(404).json({ message: 'Service not found.' });
      return;
    }
    res.json({ service, message: `Service marked ${data.status}.` });
  } catch (error) {
    next(error);
  }
});

router.delete('/services/:id', async (req, res, next) => {
  try {
    const result = await Service.deleteOne({ _id: req.params.id });
    if (!result.deletedCount) {
      res.status(404).json({ message: 'Service not found.' });
      return;
    }
    res.json({ message: 'Service removed.' });
  } catch (error) {
    next(error);
  }
});

export default router;
