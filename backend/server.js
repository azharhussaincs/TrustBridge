const app = require('./src/app');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');

dotenv.config();

const PORT = process.env.PORT || 5000;
const prisma = new PrismaClient();

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Store connected users
const connectedUsers = new Map();

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`🔌 New client connected: ${socket.id}`);

  // Register user
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
      
      // Deliver offline messages
      const unreadMessages = await prisma.message.findMany({
        where: {
          receiverId: userId,
          read: false
        },
        orderBy: { createdAt: 'asc' }
      });
      
      if (unreadMessages.length > 0) {
        console.log(`📨 Delivering ${unreadMessages.length} offline messages to user ${userId}`);
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

  // Handle private messages
  socket.on('private-message', async (data) => {
    try {
      const { senderId, receiverId, content, isEncrypted, fileId } = data;
      
      console.log(`📩 Message from ${senderId} to ${receiverId}: ${content.substring(0, 50)}`);
      
      // Save message to database
      const message = await prisma.message.create({
        data: {
          senderId,
          receiverId,
          content,
          isEncrypted: isEncrypted || true,
          fileId: fileId || null  // Store file ID if present
        }
      });
      
      // Check if receiver is online
      const receiverSocketId = connectedUsers.get(receiverId);
      
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new-message', message);
        console.log(`✅ Message delivered to online user ${receiverId}`);
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

  // Handle typing indicators
  socket.on('typing', (data) => {
    const { senderId, receiverId, isTyping } = data;
    const receiverSocketId = connectedUsers.get(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit('user-typing', { senderId, isTyping });
    }
  });

  // Handle message read receipts
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

  // Handle get unread count
  socket.on('get-unread-count', async (userId) => {
    try {
      const count = await prisma.message.count({
        where: {
          receiverId: userId,
          read: false
        }
      });
      socket.emit('unread-count', { count });
    } catch (error) {
      console.error('❌ Error getting unread count:', error.message);
    }
  });

  // Handle disconnection
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

// Make io available to routes
app.set('io', io);

// Start server
server.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 TrustBridge Server Started');
  console.log('='.repeat(50));
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`🔐 Encryption: AES-GCM`);
  console.log(`🛡️  Security: Zero Trust Architecture`);
  console.log(`💬 WebSocket: Enabled`);
  console.log(`📨 Offline Message Delivery: Enabled`);
  console.log('='.repeat(50));
  console.log('✅ Ready for connections');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received. Closing server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = { server, io, connectedUsers };
