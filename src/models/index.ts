import mongoose, { type Model } from 'mongoose';
import type { ServiceImage, ServiceRecord, UserRecord } from '../types/models.js';

const imageSchema = new mongoose.Schema<ServiceImage>(
  {
    url: { type: String, required: true },
    alt: { type: String, default: 'Wedding service' },
  },
  { _id: false }
);

export const userSchema = new mongoose.Schema<UserRecord>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    emailVerified: { type: Boolean, default: false },
    image: { type: String, default: '' },
    role: { type: String, enum: ['customer', 'vendor', 'admin'], default: 'customer' },
    businessName: { type: String, default: '' },
    isBlocked: { type: Boolean, default: false },
    subscriptionPlan: { type: String, enum: ['free', 'premium'], default: 'free' },
    subscriptionExpiresAt: { type: Date, default: null },
  },
  // Better Auth's MongoDB adapter uses the singular `user` collection by
  // default. This model is only a typed query layer over that same collection.
  { timestamps: true, collection: 'user' }
);

export const serviceSchema = new mongoose.Schema<ServiceRecord>(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    serviceName: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 3000 },
    price: { type: Number, required: true, min: 0 },
    location: { type: String, required: true, trim: true, index: true },
    images: { type: [imageSchema], default: [] },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const User =
  (mongoose.models.User as Model<UserRecord> | undefined) ||
  mongoose.model<UserRecord>('User', userSchema);
export const Service =
  (mongoose.models.Service as Model<ServiceRecord> | undefined) ||
  mongoose.model<ServiceRecord>('Service', serviceSchema);
