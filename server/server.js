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

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});

// Save io instance to app
app.set('io', io);

// Connect to MongoDB
connectDB();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500, // 500 requests per 15 mins
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

// Root endpoint for browser navigation
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'TalkPilot AI Server API',
    message: 'Backend server is running smoothly. Visit /api/health for detailed status.',
    callingMode: process.env.CALLING_MODE || 'mock',
    clientUrl: process.env.CLIENT_URL || 'http://localhost:3000'
  });
});

// Health check endpoint
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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` TalkPilot AI Server running on port ${PORT}`);
  console.log(` Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(` Calling Mode: ${process.env.CALLING_MODE || 'mock'}`);
  console.log(`=======================================================`);
});
