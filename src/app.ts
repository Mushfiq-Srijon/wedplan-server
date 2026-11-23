import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import mongoose from 'mongoose';
import { toNodeHandler } from 'better-auth/node';
import { auth, connectAuthDatabase } from './auth/better-auth.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import { errorHandler, notFound } from './middleware/errors.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import paymentRoutes, { stripeWebhook } from './routes/payment.routes.js';
import profileRoutes from './routes/profile.routes.js';
import serviceRoutes from './routes/service.routes.js';
import uploadRoutes from './routes/upload.routes.js';

const app = express();
const helmetMiddleware = (helmet as unknown as () => RequestHandler)();
let initializationPromise: Promise<void> | null = null;

function initializeDatabases(): Promise<void> {
  if (process.env.NODE_ENV === 'test') return Promise.resolve();
  if (!initializationPromise) {
    initializationPromise = Promise.all([connectDatabase(), connectAuthDatabase()])
      .then(() => undefined)
      .catch((error) => {
        initializationPromise = null;
        throw error;
      });
  }
  return initializationPromise;
}

app.use(helmetMiddleware);
app.use(cors({ origin: env.clientUrl, credentials: true }));

// Vercel can load the exported Express app directly instead of executing the
// standalone server bootstrap, so initialize both database clients lazily per
// warm serverless instance as well as during local startup.
app.use(async (_req, _res, next) => {
  try {
    await initializeDatabases();
    next();
  } catch (error) {
    next(error);
  }
});

// Stripe signs the exact raw request body, so this route must run before JSON parsing.
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

// Keep authentication endpoints rate-limited because they are attractive targets for abuse.
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 80 }));
app.use('/api/auth', authRoutes);
app.all('/api/auth/*', toNodeHandler(auth));

app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'wedplan-server',
    database: mongoose.connection.readyState === 1,
  });
});

app.use(notFound);
app.use(errorHandler);

export default app;
