import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { Booking } from '../models/booking.model.js';
import { Service, User } from '../models/index.js';
import { Transaction } from '../models/transaction.model.js';

const router = Router();

router.get('/overview', requireAuth, async (req, res, next) => {
  try {
    const user = req.user!;

    if (user.role === 'vendor') {
      const [totalServices, activeServices, pendingBookings, acceptedBookings] = await Promise.all([
        Service.countDocuments({ vendorId: user._id }),
        Service.countDocuments({ vendorId: user._id, status: 'approved', isActive: true }),
        Booking.countDocuments({ vendorId: user._id, status: 'pending' }),
        Booking.countDocuments({ vendorId: user._id, status: 'accepted' }),
      ]);
      res.json({
        role: user.role,
        stats: {
          totalServices,
          activeServices,
          pendingBookings,
          acceptedBookings,
          subscriptionPlan: user.subscriptionPlan,
        },
      });
      return;
    }

    if (user.role === 'customer') {
      const [totalBookings, pendingBookings, acceptedBookings, rejectedBookings] =
        await Promise.all([
          Booking.countDocuments({ customerId: user._id }),
          Booking.countDocuments({ customerId: user._id, status: 'pending' }),
          Booking.countDocuments({ customerId: user._id, status: 'accepted' }),
          Booking.countDocuments({ customerId: user._id, status: 'rejected' }),
        ]);
      res.json({
        role: user.role,
        stats: { totalBookings, pendingBookings, acceptedBookings, rejectedBookings },
      });
      return;
    }

    const [
      totalUsers,
      totalVendors,
      totalCustomers,
      totalServices,
      pendingServices,
      totalTransactions,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'vendor' }),
      User.countDocuments({ role: 'customer' }),
      Service.countDocuments(),
      Service.countDocuments({ status: 'pending' }),
      Transaction.countDocuments(),
    ]);
    res.json({
      role: user.role,
      stats: {
        totalUsers,
        totalVendors,
        totalCustomers,
        totalServices,
        pendingServices,
        totalTransactions,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
