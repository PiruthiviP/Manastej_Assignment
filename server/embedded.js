const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const config = require('./config');
const { app, server } = require('./index');
const { seedDatabase } = require('./seed');

/**
 * Embedded Development Server
 * 
 * Provides a zero-dependency local dev environment using an in-memory MongoDB instance.
 * Allows running and testing the complete full-stack app immediately without needing
 * a system-wide mongod service or Docker daemon running.
 */
async function startEmbeddedServer() {
  console.log('[Dev] Starting in-memory MongoDB instance...');
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  process.env.MONGO_URI = uri;
  config.MONGO_URI = uri;

  console.log(`[Dev] In-memory MongoDB running at: ${uri}`);
  console.log(`[Dev] Connecting main server to in-memory MongoDB...`);
  await mongoose.connect(uri);

  console.log('[Dev] Populating initial candidate dataset...');
  await seedDatabase();

  server.listen(config.PORT, () => {
    console.log(`\n============================================================`);
    console.log(`Candidate Sync Server running on http://localhost:${config.PORT}`);
    console.log(`CORS Client Origin: ${config.CLIENT_URL}`);
    console.log(`Storage: In-Memory MongoDB (12 candidates seeded)`);
    console.log(`============================================================\n`);
  });

  const cleanup = async () => {
    console.log('\n[Dev] Stopping embedded server and MongoDB...');
    await mongoose.disconnect();
    await mongod.stop();
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

startEmbeddedServer().catch((err) => {
  console.error('[Dev] Error starting embedded server:', err);
  process.exit(1);
});
