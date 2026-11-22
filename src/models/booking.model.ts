import mongoose, { type Model } from 'mongoose';
import type { BookingRecord } from '../types/models.js';

const bookingSchema = new mongoose.Schema<BookingRecord>(
  {
    serviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Service',
      required: true,
      index: true,
    },
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    eventDate: { type: Date, required: true, index: true },
    eventLocation: { type: String, required: true, trim: true, maxlength: 180 },
    message: { type: String, default: '', trim: true, maxlength: 1200 },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled'],
      default: 'pending',
      index: true,
    },
  },
  { timestamps: true }
);

export const Booking =
  (mongoose.models.Booking as Model<BookingRecord> | undefined) ||
  mongoose.model<BookingRecord>('Booking', bookingSchema);
