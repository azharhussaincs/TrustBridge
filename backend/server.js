const app = require('./src/app');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const prisma = require('./src/config/database');
const { canUsersChat } = require('./src/services/permission.service');
const groupService = require('./src/modules/group/group.service');

dotenv.config();

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '127.0.0.1';

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true
  }
});

const connectedUsers = new Map();

function isUserSocketOnline(userId) {
  const room = io.sockets.adapter.rooms.get(userId);
  return Boolean(room && room.size > 0);
}

async function joinUserGroupRooms(socket) {
  const groupIds = await groupService.getUserGroupIds(socket.userId);
  for (const groupId of groupIds) {
    socket.join(`group:${groupId}`);
  }
}

async function registerSocketUser(socket, { deliverOffline = true } = {}) {
  const userId = socket.userId;
  if (!userId) return;

  socket.join(userId);
  connectedUsers.set(userId, socket.id);
  await joinUserGroupRooms(socket);

  await prisma.user.update({
    where: { id: userId },
    data: { isOnline: true, lastSeen: new Date() },
  });

  io.emit('user-online', { userId, online: true });

  if (!deliverOffline) return;

  const unreadMessages = await prisma.message.findMany({
    where: { receiverId: userId, read: false },
    orderBy: { createdAt: 'asc' },
  });

  if (unreadMessages.length > 0) {
    console.log(`📨 Delivering ${unreadMessages.length} offline messages to ${userId}`);
    for (const msg of unreadMessages) {
      socket.emit('new-message', msg);
    }
  }
}

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) {
      return next(new Error('User not found'));
    }
    socket.userId = user.id;
    socket.user = user;
    next();
  } catch (error) {
    next(new Error('Invalid or expired token'));
  }
});

io.on('connection', async (socket) => {
  console.log(`🔌 New client connected: ${socket.id} (user ${socket.userId})`);

  try {
    await registerSocketUser(socket);
    console.log(`👤 User ${socket.userId} is online`);
    console.log(`📊 Total connected users: ${connectedUsers.size}`);
  } catch (error) {
    console.error('❌ Error registering user on connect:', error.message);
  }

  socket.on('register-user', async (userId) => {
    if (!userId || userId !== socket.userId) {
      socket.emit('user-error', { message: 'Unauthorized user registration' });
      return;
    }
    try {
      await registerSocketUser(socket, { deliverOffline: false });
    } catch (error) {
      console.error('❌ Error registering user:', error.message);
    }
  });

  socket.on('join-group-rooms', async () => {
    try {
      await joinUserGroupRooms(socket);
    } catch (error) {
      console.error('❌ Error joining group rooms:', error.message);
    }
  });

  socket.on('group-message', async (data) => {
    try {
      const { groupId, content, fileId } = data;
      if (!groupId || !content) {
        socket.emit('group-message-error', { error: 'Group and content are required' });
        return;
      }

      const message = await groupService.createMessage(
        groupId,
        socket.userId,
        content,
        fileId || null
      );

      io.to(`group:${groupId}`).emit('new-group-message', message);
      socket.emit('group-message-sent', message);
    } catch (error) {
      socket.emit('group-message-error', { error: error.message });
    }
  });

  socket.on('private-message', async (data) => {
    try {
      const { senderId, receiverId, content, isEncrypted, fileId } = data;

      if (senderId !== socket.userId) {
        socket.emit('message-error', { error: 'Unauthorized sender' });
        return;
      }
      
      const sender = socket.user;
      const receiver = await prisma.user.findUnique({ where: { id: receiverId } });

      if (!sender) {
        socket.emit('message-error', { error: 'Sender not found' });
        return;
      }

      if (!receiver) {
        socket.emit('message-error', { error: 'Receiver not found' });
        return;
      }

      if (!canUsersChat(sender, receiver)) {
        socket.emit('message-error', { error: 'You are not allowed to message this user' });
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
      
      if (isUserSocketOnline(receiverId)) {
        io.to(receiverId).emit('new-message', message);
      } else {
        console.log(`💾 Message saved for offline user ${receiverId}`);
        socket.emit('message-saved', {
          messageId: message.id,
          receiverId,
          status: 'delivered-when-online',
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
    if (senderId !== socket.userId) return;
    if (isUserSocketOnline(receiverId)) {
      io.to(receiverId).emit('user-typing', { senderId, isTyping });
    }
  });

  socket.on('mark-read', async (data) => {
    try {
      const { messageId, senderId, receiverId } = data;
      if (receiverId !== socket.userId) return;
      await prisma.message.update({
        where: { id: messageId },
        data: { read: true, readAt: new Date() }
      });
      if (isUserSocketOnline(senderId)) {
        io.to(senderId).emit('message-read', { messageId, receiverId });
      }
    } catch (error) {
      console.error('❌ Error marking message as read:', error.message);
    }
  });

  socket.on('get-unread-count', async (userId) => {
    if (userId !== socket.userId) return;
    try {
      const unread = await prisma.message.findMany({
        where: { receiverId: userId, read: false },
        select: { senderId: true }
      });
      const bySender = {};
      unread.forEach((msg) => {
        bySender[msg.senderId] = (bySender[msg.senderId] || 0) + 1;
      });
      socket.emit('unread-count', { count: unread.length, bySender });
    } catch (error) {
      console.error('❌ Error getting unread count:', error.message);
    }
  });

  socket.on('disconnect', async () => {
    const userId = socket.userId;
    if (connectedUsers.get(userId) === socket.id) {
      connectedUsers.delete(userId);
    }

    if (!userId) return;

    try {
      if (!isUserSocketOnline(userId)) {
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: false, lastSeen: new Date() },
        });
        console.log(`👋 User ${userId} disconnected`);
        console.log(`📊 Total connected users: ${connectedUsers.size}`);
        io.emit('user-offline', { userId, online: false });
      }
    } catch (error) {
      console.log(`⚠️ User ${userId} not found when disconnecting`);
    }
  });

  socket.on('error', (error) => {
    console.error(`❌ Socket error: ${error.message}`);
  });
});

app.set('io', io);

server.listen(PORT, HOST, () => {
  console.log('='.repeat(50));
  console.log('🚀 TrustBridge Server Started');
  console.log('='.repeat(50));
  console.log(`📡 Server running on: http://${HOST}:${PORT}`);
  console.log(`🔐 Encryption: AES-GCM`);
  console.log(`🛡️  Security: Zero Trust Architecture`);
  console.log(`💬 WebSocket: Enabled`);
  console.log(`📨 Offline Message Delivery: Enabled`);
  console.log(`🌐 Bind: ${HOST} (API not exposed on LAN; use frontend :3000)`);
  console.log('='.repeat(50));
  console.log('✅ Ready for connections');
});

module.exports = { server, io, connectedUsers };
