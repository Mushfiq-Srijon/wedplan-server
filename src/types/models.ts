import type { HydratedDocument, Types } from 'mongoose';

export type UserRole = 'customer' | 'vendor' | 'admin';
export type SubscriptionPlan = 'free' | 'premium';

export interface UserRecord {
  name: string;
  email: string;
  emailVerified: boolean;
  image: string;
  role: UserRole;
  businessName: string;
  isBlocked: boolean;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpiresAt: Date | null;
}

export type UserDocument = HydratedDocument<UserRecord>;

export interface ServiceImage {
  url: string;
  alt?: string;
}

export interface ServiceRecord {
  vendorId: Types.ObjectId;
  serviceName: string;
  category: string;
  description: string;
  price: number;
  location: string;
  images: ServiceImage[];
  status: 'pending' | 'approved' | 'rejected';
  isActive: boolean;
}

export type BookingStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface BookingRecord {
  serviceId: Types.ObjectId;
  vendorId: Types.ObjectId;
  customerId: Types.ObjectId;
  eventDate: Date;
  eventLocation: string;
  message: string;
  status: BookingStatus;
}

export type TransactionStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export interface TransactionRecord {
  vendorId: Types.ObjectId;
  plan: 'premium';
  amount: number;
  currency: string;
  stripeSessionId: string;
  stripeSubscriptionId: string;
  status: TransactionStatus;
}
