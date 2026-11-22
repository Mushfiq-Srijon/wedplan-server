import mongoose from 'mongoose';
import { env } from './env.js';

export async function connectDatabase(): Promise<void> {
  if (!env.mongodbUri) {
    console.warn('MONGODB_URI is not set. API will run without a database connection.');
    return;
  }

  await mongoose.connect(env.mongodbUri, {
    // MONGODB_DB is useful when the URI does not already contain a database name.
    ...(env.mongodbDb ? { dbName: env.mongodbDb } : {}),
  });
  console.log('MongoDB connected');
}
