#!/bin/bash

echo "🔧 FIXING TrustBridge for Multi-Router Environment"
echo "===================================================="

# Step 1: Update Backend
echo "📡 Updating Backend..."
cd backend

# Update server.js to listen on all interfaces
cat > server.js << 'ENDSSERVER'
const app = require('./src/app');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);
  socket.on('register-user', async (userId) => {
    if (userId) {
      connectedUsers.set(userId, socket.id);
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true, lastSeen: new Date() }
      });
      console.log(`👤 User ${userId} is online`);
      console.log(`📊 Total connected users: ${connectedUsers.size}`);
      io.emit('user-online', { userId, online: true });
      
      const unreadMessages = await prisma.message.findMany({
        where: { receiverId: userId, read: false },
        orderBy: { createdAt: 'asc' }
      });
      
      if (unreadMessages.length > 0) {
        console.log(`📨 Delivering ${unreadMessages.length} offline messages`);
        for (const msg of unreadMessages) {
          socket.emit('new-message', msg);
          await prisma.message.update({
            where: { id: msg.id },
            data: { read: true, readAt: new Date() }
          });
        }
      }
    }
  });

  socket.on('private-message', async (data) => {
    try {
      const { senderId, receiverId, content, isEncrypted, fileId } = data;
      const message = await prisma.message.create({
        data: {
          senderId,
          receiverId,
          content,
          isEncrypted: isEncrypted || true,
          fileId: fileId || null
        }
      });
      
      const receiverSocketId = connectedUsers.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new-message', message);
        await prisma.message.update({
          where: { id: message.id },
          data: { read: true, readAt: new Date() }
        });
      } else {
        console.log(`💾 Message saved for offline user ${receiverId}`);
        socket.emit('message-saved', { 
          messageId: message.id, 
          receiverId, 
          status: 'delivered-when-online' 
        });
      }
      socket.emit('message-sent', message);
    } catch (error) {
      console.error('❌ Error sending message:', error.message);
      socket.emit('message-error', { error: error.message });
    }
  });

  socket.on('typing', (data) => {
    const { senderId, receiverId, isTyping } = data;
    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user-typing', { senderId, isTyping });
    }
  });

  socket.on('mark-read', async (data) => {
    try {
      const { messageId, senderId, receiverId } = data;
      await prisma.message.update({
        where: { id: messageId },
        data: { read: true, readAt: new Date() }
      });
      const senderSocketId = connectedUsers.get(senderId);
      if (senderSocketId) {
        io.to(senderSocketId).emit('message-read', { messageId, receiverId });
      }
    } catch (error) {
      console.error('❌ Error marking message as read:', error.message);
    }
  });

  socket.on('get-unread-count', async (userId) => {
    try {
      const count = await prisma.message.count({
        where: { receiverId: userId, read: false }
      });
      socket.emit('unread-count', { count });
    } catch (error) {
      console.error('❌ Error getting unread count:', error.message);
    }
  });

  socket.on('disconnect', async () => {
    let userId = null;
    for (const [id, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        userId = id;
        connectedUsers.delete(id);
        break;
      }
    }
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: false, lastSeen: new Date() }
      });
      console.log(`👋 User ${userId} disconnected`);
      console.log(`📊 Total connected users: ${connectedUsers.size}`);
      io.emit('user-offline', { userId, online: false });
    }
  });

  socket.on('error', (error) => {
    console.error(`❌ Socket error: ${error.message}`);
  });
});

app.set('io', io);

server.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('🚀 TrustBridge Server Started');
  console.log('='.repeat(50));
  console.log(`📡 Server running on: http://0.0.0.0:${PORT}`);
  console.log(`🔐 Encryption: AES-GCM`);
  console.log(`🛡️  Security: Zero Trust Architecture`);
  console.log(`💬 WebSocket: Enabled`);
  console.log(`📨 Offline Message Delivery: Enabled`);
  console.log(`🌐 Listening on ALL network interfaces`);
  console.log('='.repeat(50));
  console.log('✅ Ready for connections');
});

module.exports = { server, io, connectedUsers };
ENDSSERVER

# Update app.js with CORS
cat > src/app.js << 'ENDSCORS'
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const authRoutes = require('./modules/auth/auth.routes');
const userRoutes = require('./modules/user/user.routes');
const cryptoRoutes = require('./modules/crypto/crypto.routes');
const messageRoutes = require('./modules/messaging/message.routes');
const fileRoutes = require('./modules/file-transfer/file.routes');

const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
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
ENDSCORS

echo "✅ Backend updated"

# Step 2: Get Server IP
SERVER_IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | grep -v docker | head -1 | awk '{print $2}' | cut -d/ -f1)

# Step 3: Update Frontend
cd ../frontend

cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://$SERVER_IP:5000/api
NEXT_PUBLIC_WEBSOCKET_URL=http://$SERVER_IP:5000
