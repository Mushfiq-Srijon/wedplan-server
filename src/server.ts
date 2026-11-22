import { connectAuthDatabase } from './auth/better-auth.js';
import { connectDatabase } from './config/database.js';
import { env } from './config/env.js';
import app from './app.js';

Promise.all([connectDatabase(), connectAuthDatabase()])
  .then(() => {
    app.listen(env.port, () => {
      console.log(`WedPlan API listening on port ${env.port}`);
    });
  })
  .catch((error) => {
    console.error('Unable to start server', error);
    process.exit(1);
  });
