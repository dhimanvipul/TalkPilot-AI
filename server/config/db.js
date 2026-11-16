const mongoose = require('mongoose');

// Global cache across serverless function invocations
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // If connection already established and ready, return cached instance
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (!cached.promise) {
    const opts = {
      maxPoolSize: 10,
      minPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4
    };

    if (uri) {
      console.log(`Connecting to MongoDB Atlas / Remote Cluster...`);
      cached.promise = mongoose.connect(uri, opts).then((mongooseInstance) => {
        console.log('MongoDB Connected Successfully (Cloud/Atlas)');
        return mongooseInstance;
      });
    } else {
      // Local fallback for offline/development environment
      if (process.env.NODE_ENV === 'production') {
        throw new Error('MONGO_URI is required in production environment.');
      }

      console.warn('MONGO_URI not specified. Starting MongoMemoryServer for development...');
      try {
        const { MongoMemoryServer } = require('mongodb-memory-server');
        const mongoMemoryServer = await MongoMemoryServer.create();
        const memUri = mongoMemoryServer.getUri();
        console.log(`MongoMemoryServer started at: ${memUri}`);
        cached.promise = mongoose.connect(memUri, opts).then((mongooseInstance) => {
          console.log('MongoDB Connected Successfully (In-Memory Fallback)');
          return mongooseInstance;
        });
      } catch (memErr) {
        console.error('Failed to start MongoMemoryServer fallback:', memErr);
        throw memErr;
      }
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
};

module.exports = connectDB;
