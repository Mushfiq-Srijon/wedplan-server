import { betterAuth } from 'better-auth';
import { mongodbAdapter } from '@better-auth/mongo-adapter';
import { MongoClient } from 'mongodb';
import { env } from '../config/env.js';

// Better Auth uses a native MongoDB client so its user, session, account, and
// verification collections remain separate from the business collections.
const mongoClient = new MongoClient(env.mongodbUri || 'mongodb://127.0.0.1:27017');
const authDatabase = mongoClient.db(env.mongodbDb || 'wedplan');
let authConnectionPromise: Promise<void> | null = null;

export const auth = betterAuth({
  appName: 'WedPlan',
  baseURL: env.betterAuthUrl,
  basePath: '/api/auth',
  secret: env.betterAuthSecret || env.jwtSecret,
  trustedOrigins: [env.clientUrl],
  // The client and API are deployed on different Vercel origins. OAuth state
  // and session cookies therefore need cross-origin-safe production attributes
  // so the browser sends them back to the API during Google's redirect.
  advanced: {
    useSecureCookies: env.nodeEnv === 'production',
    defaultCookieAttributes: {
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
      secure: env.nodeEnv === 'production',
    },
  },
  database: mongodbAdapter(authDatabase, {
    // This keeps local standalone MongoDB instances usable. Atlas replica sets
    // can enable adapter transactions later if the deployment needs them.
    client: mongoClient,
    transaction: false,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: true,
  },
  user: {
    // These fields are stored on Better Auth's user document, not in a second
    // application-owned users collection.
    additionalFields: {
      role: {
        type: 'string',
        required: true,
        defaultValue: 'customer',
        input: true,
      },
      isBlocked: {
        type: 'boolean',
        required: true,
        defaultValue: false,
        input: false,
      },
      businessName: {
        type: 'string',
        required: false,
        defaultValue: '',
      },
      subscriptionPlan: {
        type: 'string',
        required: true,
        defaultValue: 'free',
        input: false,
      },
      subscriptionExpiresAt: {
        type: 'date',
        required: false,
        input: false,
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // Public registration may choose customer or vendor, but never admin.
        // Admin accounts are created by the protected seed script instead.
        before: async (user) => ({
          data: {
            ...user,
            role: user.role === 'vendor' ? 'vendor' : 'customer',
          },
        }),
      },
    },
  },
  socialProviders:
    env.googleClientId && env.googleClientSecret
      ? {
          google: {
            clientId: env.googleClientId,
            clientSecret: env.googleClientSecret,
          },
        }
      : undefined,
});

export async function connectAuthDatabase(): Promise<void> {
  if (!env.mongodbUri) {
    return;
  }

  if (authConnectionPromise) return authConnectionPromise;

  authConnectionPromise = mongoClient
    .connect()
    .then(() => undefined)
    .catch((error) => {
      authConnectionPromise = null;
      throw error;
    });

  return authConnectionPromise;
}
