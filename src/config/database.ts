import mongoose from 'mongoose';
import { env } from './env.js';

let connectionPromise: Promise<void> | null = null;

export async function connectDatabase(): Promise<void> {
  if (!env.mongodbUri) {
    console.warn('MONGODB_URI is not set. API will run without a database connection.');
    return;
  }

  if (mongoose.connection.readyState === 1) return;
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose
    .connect(env.mongodbUri, {
      // MONGODB_DB is useful when the URI does not already contain a database name.
      ...(env.mongodbDb ? { dbName: env.mongodbDb } : {}),
    })
    .then(() => {
      console.log('MongoDB connected');
    })
    .catch((error) => {
      connectionPromise = null;
      throw error;
    });

  return connectionPromise;
}
