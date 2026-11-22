import { auth, connectAuthDatabase } from '../auth/better-auth.js';
import { connectDatabase } from '../config/database.js';
import { env } from '../config/env.js';
import { User } from '../models/index.js';

async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!env.mongodbUri) throw new Error('MONGODB_URI is required to seed an admin account.');
  if (!email || !password || password.length < 8) {
    throw new Error('ADMIN_EMAIL and an ADMIN_PASSWORD of at least 8 characters are required.');
  }

  await Promise.all([connectDatabase(), connectAuthDatabase()]);

  // Better Auth creates the user and credential account. The role is assigned
  // only after that operation, so public registration can never create admins.
  const existingUser = await User.findOne({ email });
  if (!existingUser) {
    await auth.api.signUpEmail({
      body: {
        name: 'WedPlan Admin',
        email,
        password,
        role: 'customer',
      },
      headers: new Headers(),
    });
  }

  await User.findOneAndUpdate(
    { email },
    {
      name: 'WedPlan Admin',
      email,
      role: 'admin',
      isBlocked: false,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  console.log(`Admin account ready for ${email}`);
  process.exit(0);
}

seedAdmin().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
