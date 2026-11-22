import { Router } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Service } from '../models/index.js';

const router = Router();

const categories = [
  'Photography & Videography',
  'Wedding Venues',
  'Decoration & Florist',
  'Catering Services',
  'Makeup & Styling',
  'Wedding Fashion',
] as const;

const serviceInputSchema = z.object({
  serviceName: z.string().trim().min(3).max(120),
  category: z.enum(categories),
  description: z.string().trim().min(20).max(3000),
  price: z.coerce.number().min(0),
  location: z.string().trim().min(2).max(120),
  images: z
    .array(z.object({ url: z.string().url(), alt: z.string().optional() }))
    .min(1)
    .max(8),
  isActive: z.boolean().optional(),
});

function queryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

router.get('/categories', (_req, res) => {
  res.json({ categories });
});

router.get('/vendor/mine', requireAuth, requireRole('vendor'), async (req, res, next) => {
  try {
    const services = await Service.find({ vendorId: req.user!._id }).sort({ createdAt: -1 }).lean();
    res.json({ services });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const search = queryString(req.query.q);
    const category = queryString(req.query.category);
    const location = queryString(req.query.location);
    const sort = queryString(req.query.sort) || 'newest';
    const page = Math.max(Number(queryString(req.query.page) || 1), 1);
    const limit = Math.min(Number(queryString(req.query.limit) || 12), 48);
    const filter: Record<string, unknown> = { status: 'approved', isActive: true };

    if (search) {
      filter.$or = [
        { serviceName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }
    if (category && category !== 'all') filter.category = category;
    if (location && location !== 'all') filter.location = { $regex: location, $options: 'i' };

    const sortMap: Record<string, Record<string, 1 | -1>> = {
      priceAsc: { price: 1 },
      priceDesc: { price: -1 },
      newest: { createdAt: -1 },
    };
    const [services, total] = await Promise.all([
      Service.find(filter)
        .populate('vendorId', 'name image businessName subscriptionPlan')
        .sort(sortMap[sort] || sortMap.newest)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Service.countDocuments(filter),
    ]);

    res.json({
      services,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      res.status(404).json({ message: 'This wedding service could not be found.' });
      return;
    }

    const service = await Service.findOne({
      _id: req.params.id,
      status: 'approved',
      isActive: true,
    })
      .populate('vendorId', 'name image businessName subscriptionPlan')
      .lean();

    if (!service) {
      res.status(404).json({ message: 'This wedding service is not available.' });
      return;
    }
    res.json({ service });
  } catch (error) {
    next(error);
  }
});

router.post('/', requireAuth, requireRole('vendor'), async (req, res, next) => {
  try {
    const data = serviceInputSchema.parse(req.body);
    const vendor = req.user!;
    const activeCount = await Service.countDocuments({
      vendorId: vendor._id,
      isActive: true,
      status: { $ne: 'rejected' },
    });

    if (vendor.subscriptionPlan !== 'premium' && activeCount >= 3) {
      res.status(403).json({
        message: 'Free vendors can have up to 3 active services. Upgrade to Premium to continue.',
      });
      return;
    }

    const service = await Service.create({ ...data, vendorId: vendor._id });
    res.status(201).json({ service, message: 'Service submitted for admin review.' });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id', requireAuth, requireRole('vendor'), async (req, res, next) => {
  try {
    const data = serviceInputSchema.partial().parse(req.body);
    const contentFields = ['serviceName', 'category', 'description', 'price', 'location', 'images'];
    const contentChanged = contentFields.some((field) => field in data);
    const service = await Service.findOneAndUpdate(
      { _id: req.params.id, vendorId: req.user!._id },
      { ...data, ...(contentChanged ? { status: 'pending' } : {}) },
      { new: true, runValidators: true }
    );

    if (!service) {
      res.status(404).json({ message: 'Service not found or you do not own it.' });
      return;
    }
    res.json({ service, message: 'Service updated and sent for review.' });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', requireAuth, requireRole('vendor'), async (req, res, next) => {
  try {
    const result = await Service.deleteOne({ _id: req.params.id, vendorId: req.user!._id });
    if (!result.deletedCount) {
      res.status(404).json({ message: 'Service not found.' });
      return;
    }
    res.json({ message: 'Service deleted.' });
  } catch (error) {
    next(error);
  }
});

export default router;
