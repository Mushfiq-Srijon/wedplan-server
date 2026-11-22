import dotenv from 'dotenv';

dotenv.config();

const requiredInProduction = ['MONGODB_URI', 'JWT_SECRET'];

if (process.env.NODE_ENV === 'production') {
  const missing = requiredInProduction.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing production environment variables: ${missing.join(', ')}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  mongodbUri: process.env.MONGODB_URI || '',
  mongodbDb: process.env.MONGODB_DB || '',
  jwtSecret: process.env.JWT_SECRET || 'development-only-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  cookieName: process.env.COOKIE_NAME || 'wedplan_token',
  betterAuthSecret: process.env.BETTER_AUTH_SECRET || '',
  betterAuthUrl: process.env.BETTER_AUTH_URL || 'http://localhost:5000',
  siteUrl: process.env.SITE_URL || process.env.CLIENT_URL || 'http://localhost:3000',
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  googleRedirectUri:
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/callback/google',
  imgbbApiKey: process.env.IMGBB_API_KEY || '',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY || '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  stripePremiumPriceId: process.env.STRIPE_PREMIUM_PRICE_ID || '',
};
