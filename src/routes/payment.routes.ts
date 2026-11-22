import { Router, type RequestHandler } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { env } from '../config/env.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { Transaction } from '../models/transaction.model.js';
import { User } from '../models/index.js';

const router = Router();

function stripeClient(): Stripe | null {
  return env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;
}

router.post(
  '/create-checkout-session',
  requireAuth,
  requireRole('vendor'),
  async (req, res, next) => {
    try {
      const stripe = stripeClient();
      if (!stripe || !env.stripePremiumPriceId) {
        res.status(503).json({ message: 'Stripe Premium billing is not configured.' });
        return;
      }
      if (req.user!.subscriptionPlan === 'premium') {
        res.status(409).json({ message: 'Your account is already Premium.' });
        return;
      }

      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price: env.stripePremiumPriceId, quantity: 1 }],
        customer_email: req.user!.email,
        success_url: `${env.siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${env.siteUrl}/payment/cancel`,
        metadata: { userId: req.user!._id.toString(), plan: 'premium' },
        subscription_data: { metadata: { userId: req.user!._id.toString(), plan: 'premium' } },
      });

      res.json({ url: session.url });
    } catch (error) {
      next(error);
    }
  }
);

router.get('/status', requireAuth, requireRole('vendor'), async (req, res) => {
  res.json({ plan: req.user!.subscriptionPlan, expiresAt: req.user!.subscriptionExpiresAt });
});

router.get('/transactions', requireAuth, requireRole('admin'), async (_req, res, next) => {
  try {
    const transactions = await Transaction.find()
      .populate('vendorId', 'name email businessName')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ transactions });
  } catch (error) {
    next(error);
  }
});

/**
 * Stripe must receive the unparsed request body so its signature can be verified.
 * Mount this handler before express.json() in server.ts.
 */
export const stripeWebhook: RequestHandler = async (req, res) => {
  const stripe = stripeClient();
  const signature = req.headers['stripe-signature'];

  if (!stripe || !env.stripeWebhookSecret || typeof signature !== 'string') {
    res.status(503).send('Stripe webhook is not configured.');
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, signature, env.stripeWebhookSecret);
  } catch (error) {
    console.error('Stripe webhook signature verification failed', error);
    res.status(400).send('Invalid webhook signature.');
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await activatePremium(stripe, event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.deleted':
        await deactivatePremium(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.updated':
        await syncSubscription(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
        await markInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await markPaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        break;
    }
    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed', error);
    res.status(500).send('Webhook processing failed.');
  }
};

async function activatePremium(stripe: Stripe, session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const subscriptionId = typeof session.subscription === 'string' ? session.subscription : '';
  let expiresAt = new Date(Date.now() + 31 * 24 * 60 * 60 * 1000);
  if (subscriptionId) {
    const subscription = (await stripe.subscriptions.retrieve(
      subscriptionId
    )) as Stripe.Subscription;
    const periodEnd = subscription.items.data[0]?.current_period_end;
    if (periodEnd) expiresAt = new Date(periodEnd * 1000);
  }

  await User.findByIdAndUpdate(userId, {
    subscriptionPlan: 'premium',
    subscriptionExpiresAt: expiresAt,
  });
  await Transaction.findOneAndUpdate(
    { stripeSessionId: session.id },
    {
      vendorId: userId,
      plan: 'premium',
      amount: session.amount_total || 0,
      currency: session.currency || 'usd',
      stripeSessionId: session.id,
      stripeSubscriptionId: subscriptionId,
      status: 'paid',
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function deactivatePremium(subscription: Stripe.Subscription): Promise<void> {
  const transaction = await Transaction.findOne({ stripeSubscriptionId: subscription.id });
  if (!transaction) return;
  await User.findByIdAndUpdate(transaction.vendorId, {
    subscriptionPlan: 'free',
    subscriptionExpiresAt: null,
  });
  await Transaction.findByIdAndUpdate(transaction._id, { status: 'cancelled' });
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const transaction = await Transaction.findOne({ stripeSubscriptionId: subscription.id });
  const userId = transaction?.vendorId || subscription.metadata?.userId;
  if (!userId) return;

  const periodEnd = subscription.items.data[0]?.current_period_end;
  const isActive = ['active', 'trialing'].includes(subscription.status);
  await User.findByIdAndUpdate(userId, {
    subscriptionPlan: isActive ? 'premium' : 'free',
    subscriptionExpiresAt: isActive && periodEnd ? new Date(periodEnd * 1000) : null,
  });
}

async function markInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  const subscription = (
    invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
  ).subscription;
  const subscriptionId = typeof subscription === 'string' ? subscription : '';
  if (!subscriptionId) return;
  await Transaction.findOneAndUpdate({ stripeSubscriptionId: subscriptionId }, { status: 'paid' });
}

async function markPaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const subscription = (
    invoice as Stripe.Invoice & { subscription?: string | Stripe.Subscription | null }
  ).subscription;
  const subscriptionId = typeof subscription === 'string' ? subscription : '';
  if (!subscriptionId) return;
  const transaction = await Transaction.findOne({ stripeSubscriptionId: subscriptionId });
  if (!transaction) return;
  await Transaction.findByIdAndUpdate(transaction._id, { status: 'failed' });
}

export default router;
