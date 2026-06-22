const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const cryptoRoutes = require('./modules/crypto/crypto.routes');
const messageRoutes = require('./modules/messaging/message.routes');
const fileRoutes = require('./modules/file-transfer/file.routes');

const app = express();

// CORS configuration - Allow all origins (for development)
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: '✅ Server is running',
    timestamp: new Date().toISOString(),
    encryption: 'AES-GCM',
    security: 'Zero Trust Architecture',
    version: '1.0.0'
  });
});

// ====================
// MODULE ROUTES
// ====================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

module.exports = app;
