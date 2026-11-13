require('dotenv').config();

const app = require('./app');
const { connectDatabase, disconnectDatabase } = require('./config/database');

const port = Number(process.env.PORT) || 4000;
let httpServer;

const validateProductionEnvironment = () => {
  if (process.env.NODE_ENV !== 'production') return;
  const missing = ['MONGODB_URI', 'CLIENT_URL', 'JWT_SECRET', 'JWT_EXPIRES_IN'].filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Missing required production environment variables: ${missing.join(', ')}`);
};

const shutdown = async (signal) => {
  console.info(`${signal} received. Shutting down gracefully.`);

  if (httpServer) {
    await new Promise((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
  }

  await disconnectDatabase();
  process.exit(0);
};

const startServer = async () => {
  validateProductionEnvironment();
  httpServer = app.listen(port, () => {
    console.info(`PlacementX API listening on port ${port}.`);
  });

  httpServer.on('error', (error) => {
    console.error('HTTP server error:', error.message);
    process.exit(1);
  });

  process.once('SIGINT', () => shutdown('SIGINT').catch(handleShutdownError));
  process.once('SIGTERM', () => shutdown('SIGTERM').catch(handleShutdownError));

  try {
    await connectDatabase();
  } catch (error) {
  console.error('MongoDB Connection Error:', {
    name: error.name,
    message: error.message,
    code: error.code,
    cause: error.cause?.message,
    reason: error.reason?.type
  });

};

const handleShutdownError = (error) => {
  console.error('Graceful shutdown failed:', error.message);
  process.exit(1);
};

if (require.main === module) {
  startServer();
}

module.exports = { startServer };
