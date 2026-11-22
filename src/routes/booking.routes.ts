import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Booking } from '../models/booking.model.js';
import { Service } from '../models/index.js';

const router = Router();

const createBookingSchema = z.object({
  serviceId: z.string().min(1),
  eventDate: z.coerce.date(),
  eventLocation: z.string().trim().min(2).max(180),
  message: z.string().trim().max(1200).default(''),
});

const statusSchema = z.object({ status: z.enum(['accepted', 'rejected']) });

router.post('/', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    const data = createBookingSchema.parse(req.body);
    const service = await Service.findOne({
      _id: data.serviceId,
      status: 'approved',
      isActive: true,
    });

    if (!service) {
      res.status(404).json({ message: 'This service is no longer available for booking.' });
      return;
    }
    if (service.vendorId.toString() === req.user!._id.toString()) {
      res.status(403).json({ message: 'You cannot book your own service.' });
      return;
    }
    if (data.eventDate < new Date()) {
      res.status(400).json({ message: 'Choose an upcoming event date.' });
      return;
    }

    const duplicate = await Booking.exists({
      serviceId: service._id,
      customerId: req.user!._id,
      eventDate: data.eventDate,
      status: { $in: ['pending', 'accepted'] },
    });
    if (duplicate) {
      res.status(409).json({ message: 'You already have an active request for this date.' });
      return;
    }

    const booking = await Booking.create({
      ...data,
      vendorId: service.vendorId,
      customerId: req.user!._id,
    });
    res.status(201).json({ booking, message: 'Your booking request has been sent.' });
  } catch (error) {
    next(error);
  }
});

router.get('/customer', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    const bookings = await Booking.find({ customerId: req.user!._id })
      .populate('serviceId', 'serviceName images category price location')
      .populate('vendorId', 'name image businessName')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
});

router.get('/vendor', requireAuth, requireRole('vendor'), async (req, res, next) => {
  try {
    const bookings = await Booking.find({ vendorId: req.user!._id })
      .populate('serviceId', 'serviceName images category price location')
      .populate('customerId', 'name email image')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ bookings });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/cancel', requireAuth, requireRole('customer'), async (req, res, next) => {
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, customerId: req.user!._id, status: 'pending' },
      { status: 'cancelled' },
      { new: true }
    );
    if (!booking) {
      res.status(404).json({ message: 'Only your pending bookings can be cancelled.' });
      return;
    }
    res.json({ booking, message: 'Booking request cancelled.' });
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', requireAuth, requireRole('vendor'), async (req, res, next) => {
  try {
    const { status } = statusSchema.parse(req.body);
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, vendorId: req.user!._id, status: 'pending' },
      { status },
      { new: true }
    );
    if (!booking) {
      res.status(404).json({ message: 'Only pending requests for your services can be updated.' });
      return;
    }
    res.json({ booking, message: `Booking request ${status}.` });
  } catch (error) {
    next(error);
  }
});

export default router;
