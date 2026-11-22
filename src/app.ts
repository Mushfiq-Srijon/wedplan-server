import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './auth/better-auth.js';
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

app.use(helmetMiddleware);
app.use(cors({ origin: env.clientUrl, credentials: true }));

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
  res.json({ ok: true, service: 'wedplan-server', database: Boolean(env.mongodbUri) });
});

app.use(notFound);
app.use(errorHandler);

export default app;
