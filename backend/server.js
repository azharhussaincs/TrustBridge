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
      try {
        // Check if user exists before updating
        const existingUser = await prisma.user.findUnique({
          where: { id: userId }
        });
        
        if (!existingUser) {
          console.log(`⚠️ User ${userId} not found in database`);
          socket.emit('user-error', { message: 'User not found' });
          return;
        }
        
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
      } catch (error) {
        console.error('❌ Error registering user:', error.message);
      }
    }
  });

  socket.on('private-message', async (data) => {
    try {
      const { senderId, receiverId, content, isEncrypted, fileId } = data;
      
      // Check if sender exists
      const sender = await prisma.user.findUnique({
        where: { id: senderId }
      });
      
      if (!sender) {
        socket.emit('message-error', { error: 'Sender not found' });
        return;
      }
      
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
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: false, lastSeen: new Date() }
        });
        console.log(`👋 User ${userId} disconnected`);
        console.log(`📊 Total connected users: ${connectedUsers.size}`);
        io.emit('user-offline', { userId, online: false });
      } catch (error) {
        console.log(`⚠️ User ${userId} not found when disconnecting`);
      }
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
