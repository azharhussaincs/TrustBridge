const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { COMMUNICATION_RULES } = require('../../config/constants');

const prisma = new PrismaClient();

// Role-based user creation permissions
const CREATION_RULES = {
  'ADMIN': {
    canCreate: ['SUPER_USER', 'TEAM_LEAD'],
    description: 'Admin can only create Super User and Team Lead'
  },
  'TEAM_LEAD': {
    canCreate: ['TEAM_MANAGER', 'TEAM_MEMBER'],
    description: 'Team Lead can only create Team Managers and Team Members'
  },
  'SUPER_USER': {
    canCreate: [],
    description: 'Super User cannot create any users'
  },
  'TEAM_MANAGER': {
    canCreate: [],
    description: 'Team Manager cannot create any users'
  },
  'TEAM_MEMBER': {
    canCreate: [],
    description: 'Team Member cannot create any users'
  }
};

class UserService {
  async getUsers(filters = {}) {
    try {
      const { role, teamId } = filters;
      const where = {};
      if (role) where.role = role;
      if (teamId) where.teamId = teamId;
      
      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          teamId: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true
        }
      });
      
      return users;
    } catch (error) {
      console.error('Error in getUsers:', error);
      throw error;
    }
  }
  
  async getUserById(id) {
    try {
      return await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          teamId: true,
          isOnline: true,
          lastSeen: true,
          createdAt: true
        }
      });
    } catch (error) {
      console.error('Error in getUserById:', error);
      throw error;
    }
  }
  
  async createUser(userData, creatorRole) {
    try {
      const { username, password, name, role, teamId } = userData;
      
      const allowedRoles = CREATION_RULES[creatorRole]?.canCreate || [];
      if (!allowedRoles.includes(role)) {
        throw new Error(`You don't have permission to create a ${role}`);
      }
      
      const existingUser = await prisma.user.findUnique({
        where: { username }
      });
      
      if (existingUser) {
        throw new Error('User already exists');
      }
      
      const hashedPassword = await bcrypt.hash(password || 'default123', 10);
      
      return await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          name,
          role,
          teamId
        }
      });
    } catch (error) {
      console.error('Error in createUser:', error);
      throw error;
    }
  }
  
  async updateUser(id, userData) {
    try {
      return await prisma.user.update({
        where: { id },
        data: userData
      });
    } catch (error) {
      console.error('Error in updateUser:', error);
      throw error;
    }
  }
  
  async deleteUser(id) {
    try {
      // Delete messages
      await prisma.message.deleteMany({
        where: {
          OR: [
            { senderId: id },
            { receiverId: id }
          ]
        }
      });
      
      // Delete files
      await prisma.file.deleteMany({
        where: {
          OR: [
            { senderId: id },
            { receiverId: id }
          ]
        }
      });
      
      // Delete user
      return await prisma.user.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw new Error('Cannot delete user. Please try again.');
    }
  }
  
  async getUsersByRole(role) {
    try {
      return await prisma.user.findMany({
        where: { role },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          isOnline: true,
          lastSeen: true
        }
      });
    } catch (error) {
      console.error('Error in getUsersByRole:', error);
      throw error;
    }
  }
  
  async getTeamMembers(teamId) {
    try {
      return await prisma.user.findMany({
        where: { teamId },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          isOnline: true,
          lastSeen: true
        }
      });
    } catch (error) {
      console.error('Error in getTeamMembers:', error);
      throw error;
    }
  }
  
  canCommunicate(senderRole, receiverRole) {
    const allowed = COMMUNICATION_RULES[senderRole]?.canCommunicateWith || [];
    return allowed.includes(receiverRole);
  }
  
  getCreationRules(role) {
    return CREATION_RULES[role] || { canCreate: [], description: 'No permissions' };
  }

  // NEW: Reset user password
  async resetPassword(userId, newPassword) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw new Error('User not found');
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      return await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });
    } catch (error) {
      console.error('Error in resetPassword:', error);
      throw error;
    }
  }
}

module.exports = new UserService();
