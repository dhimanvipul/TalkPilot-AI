const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Dynamic CORS configuration for Vercel, localhost, and custom domains
const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  if (process.env.NODE_ENV !== 'production') return true;
  if (origin.endsWith('.vercel.app')) return true;
  if (process.env.CLIENT_URL && origin === process.env.CLIENT_URL) return true;
  if (origin.includes('localhost') || origin.includes('127.0.0.1')) return true;
  return false;
};

// Initialize Socket.IO with WebSocket + polling support for Vercel Fluid Compute
const io = new Server(server, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  cors: {
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Save io instance to app
app.set('io', io);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// URL normalization: ensure /api prefix is present for all non-socket routes handled by Express
app.use((req, res, next) => {
  if (!req.url.startsWith('/api') && !req.url.startsWith('/socket.io')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Ensure MongoDB connection is active on serverless requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('[DB Middleware] Database connection error:', err.message);
    res.status(503).json({
      success: false,
      message: 'Database temporarily unavailable. Please verify MONGO_URI in Vercel settings.'
    });
  }
});

// Rate limiting (adjusted for serverless environment)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', limiter);

const telephonyProvider = require('./services/telephony/telephonyProvider');

// Socket.IO connection event handling
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client connected: ${socket.id}`);

  socket.on('join:user', (data) => {
    let userId = null;
    let email = null;
    if (typeof data === 'object' && data !== null) {
      userId = data.userId;
      email = data.email;
    } else {
      userId = data;
    }

    if (userId) {
      socket.join(`user:${userId}`);
      console.log(`[Socket.IO] Socket ${socket.id} joined user room: user:${userId}`);
    }

    if (email) {
      const emailRoom = `user:email:${email.toLowerCase().trim()}`;
      socket.join(emailRoom);
      console.log(`[Socket.IO] Socket ${socket.id} joined email room: ${emailRoom}`);
    }
  });

  socket.on('join:call', (callId) => {
    if (callId) {
      socket.join(`call:${callId}`);
      console.log(`[Socket.IO] Socket ${socket.id} joined call room: call:${callId}`);
    }
  });

  socket.on('leave:call', (callId) => {
    if (callId) {
      socket.leave(`call:${callId}`);
      console.log(`[Socket.IO] Socket ${socket.id} left call room: call:${callId}`);
    }
  });

  // Real-time call actions over sockets
  socket.on('call:accept', async ({ callId }) => {
    try {
      console.log(`[Socket.IO] Received call:accept for callId=${callId}`);
      await telephonyProvider.acceptCall(callId, io);
    } catch (err) {
      console.error('[Socket.IO] Error in call:accept:', err);
    }
  });

  socket.on('call:decline', async ({ callId, reason }) => {
    try {
      console.log(`[Socket.IO] Received call:decline for callId=${callId}`);
      await telephonyProvider.declineCall(callId, io, reason);
    } catch (err) {
      console.error('[Socket.IO] Error in call:decline:', err);
    }
  });

  socket.on('call:message', async ({ callId, text }) => {
    try {
      console.log(`[Socket.IO] Received call:message for callId=${callId}: "${text}"`);
      await telephonyProvider.handleCustomerMessage(callId, text, io);
    } catch (err) {
      console.error('[Socket.IO] Error in call:message:', err);
    }
  });

  socket.on('call:end', async ({ callId }) => {
    try {
      console.log(`[Socket.IO] Received call:end for callId=${callId}`);
      await telephonyProvider.endCall(callId, io);
    } catch (err) {
      console.error('[Socket.IO] Error in call:end:', err);
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
  });
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/agents', require('./routes/agentRoutes'));
app.use('/api/contacts', require('./routes/contactRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/api/calls', require('./routes/callRoutes'));
app.use('/api/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));
app.use('/api/tts', require('./routes/ttsRoutes'));
app.use('/api/settings', require('./routes/settingsRoutes'));

// Root endpoint for browser navigation & health checks
app.get('/api', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'TalkPilot AI Server API',
    message: 'Backend server is running smoothly on Vercel.',
    callingMode: process.env.CALLING_MODE || 'mock',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000'
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'TalkPilot AI',
    callingMode: process.env.CALLING_MODE || 'mock',
    timestamp: new Date()
  });
});

// Global error handler
app.use(errorHandler);

// Only listen directly when not running in a serverless environment (e.g. Vercel)
if (process.env.VERCEL !== '1' && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(` TalkPilot AI Server running on port ${PORT}`);
    console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(` Calling Mode: ${process.env.CALLING_MODE || 'mock'}`);
    console.log(`=======================================================`);
  });
}

server.app = app;
server.io = io;
module.exports = server;
