const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const cryptoRoutes = require('./modules/crypto/crypto.routes');
const messageRoutes = require('./modules/messaging/message.routes');
const fileRoutes = require('./modules/file-transfer/file.routes');
const groupRoutes = require('./modules/group/group.routes');

const app = express();

app.set('trust proxy', 1);

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`📡 [${new Date().toISOString()}] ${req.method} ${req.path} from ${req.ip}`);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({
    status: '✅ Server is running',
    timestamp: new Date().toISOString(),
    encryption: 'AES-GCM',
    security: 'Zero Trust Architecture',
    version: '1.0.0'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/crypto', cryptoRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/groups', groupRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path
  });
});

app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

module.exports = app;
