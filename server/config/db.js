const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoMemoryServer = null;

const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/talkpilot';
  try {
    console.log(`Connecting to MongoDB at: ${uri}`);
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000
    });
    console.log('MongoDB Connected Successfully (Standard DB)');
  } catch (err) {
    console.warn(`Standard MongoDB connection failed (${err.message}). Starting MongoMemoryServer fallback...`);
    try {
      mongoMemoryServer = await MongoMemoryServer.create();
      const memUri = mongoMemoryServer.getUri();
      console.log(`MongoMemoryServer started at: ${memUri}`);
      await mongoose.connect(memUri);
      console.log('MongoDB Connected Successfully (In-Memory DB Fallback)');
    } catch (memErr) {
      console.error('Failed to start MongoMemoryServer:', memErr);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
