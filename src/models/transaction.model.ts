import mongoose, { type Model } from 'mongoose';
import type { TransactionRecord } from '../types/models.js';

const transactionSchema = new mongoose.Schema<TransactionRecord>(
  {
    vendorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    plan: { type: String, enum: ['premium'], default: 'premium', required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, lowercase: true },
    stripeSessionId: { type: String, required: true, unique: true },
    stripeSubscriptionId: { type: String, default: '' },
    status: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled'], default: 'pending' },
  },
  { timestamps: true }
);

export const Transaction =
  (mongoose.models.Transaction as Model<TransactionRecord> | undefined) ||
  mongoose.model<TransactionRecord>('Transaction', transactionSchema);
