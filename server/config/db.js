const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Node.js SRV record DNS resolution on Windows / certain ISPs
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Silent fallback in environments where custom DNS servers cannot be set
}

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

  let uri = process.env.MONGO_URI || process.env.MONGODB_URI;

  if (uri && uri.startsWith('mongodb+srv://')) {
    // Ensure database name is explicitly specified so collections aren't dumped into default 'test' db
    const baseWithoutQuery = uri.split('?')[0];
    if (baseWithoutQuery.endsWith('.mongodb.net') || baseWithoutQuery.endsWith('.mongodb.net/')) {
      const cleanBase = baseWithoutQuery.replace(/\/+$/, '');
      const queryString = uri.includes('?') ? uri.substring(uri.indexOf('?')) : '?retryWrites=true&w=majority';
      uri = `${cleanBase}/talkpilot${queryString}`;
    }
  }

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
      cached.promise = mongoose.connect(uri, opts)
        .then((mongooseInstance) => {
          console.log('MongoDB Connected Successfully (Cloud/Atlas)');
          return mongooseInstance;
        })
        .catch(async (err) => {
          cached.promise = null;
          if (process.env.NODE_ENV === 'production') {
            throw err;
          }
          console.warn(`\n[MongoDB Atlas Warning] Connection blocked: ${err.message}`);
          console.warn('-> Your current IP address is not whitelisted in MongoDB Atlas Network Access.');
          console.warn('-> In MongoDB Atlas -> Network Access, add 0.0.0.0/0 (or your current IP).');
          console.warn('-> Falling back to local MongoMemoryServer for development...\n');
          const { MongoMemoryServer } = require('mongodb-memory-server');
          const mongoMemoryServer = await MongoMemoryServer.create();
          const memUri = mongoMemoryServer.getUri();
          return mongoose.connect(memUri, opts);
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
