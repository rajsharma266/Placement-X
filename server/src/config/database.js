const mongoose = require('mongoose');

const createConnectionManager = (client, getUri = () => process.env.MONGODB_URI || process.env.MONGODB_URL) => {
  let connectionPromise;

  const connectDatabase = () => {
    if (client.connection.readyState === 1) return Promise.resolve(client.connection);
    if (connectionPromise) return connectionPromise;

    const mongoUri = getUri();
    if (!mongoUri) return Promise.reject(new Error('A MongoDB connection URI is required.'));

    connectionPromise = client.connect(mongoUri, { serverSelectionTimeoutMS: 10000 })
      .then(() => {
        if (client === mongoose) console.info('MongoDB connected.');
        return client.connection;
      })
      .catch((error) => {
        connectionPromise = undefined;
        throw error;
      });
    return connectionPromise;
  };

  const disconnectDatabase = async () => {
    connectionPromise = undefined;
    if (client.connection.readyState !== 0) {
      await client.disconnect();
      if (client === mongoose) console.info('MongoDB disconnected.');
    }
  };

  return { connectDatabase, disconnectDatabase };
};

module.exports = { ...createConnectionManager(mongoose), createConnectionManager };
