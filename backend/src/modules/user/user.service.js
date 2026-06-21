const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { COMMUNICATION_RULES } = require('../../config/constants');

const prisma = new PrismaClient();

class UserService {
  async getUsers(filters = {}) {
    try {
      const { role, teamId } = filters;
      const where = {};
      if (role) where.role = role;
      if (teamId) where.teamId = teamId;
      
      // Remove the include statement - just get users
      const users = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
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
          email: true,
          name: true,
          role: true,
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
      const { email, password, name, role, teamId } = userData;
      
      const allowedRoles = COMMUNICATION_RULES[creatorRole]?.canAddUsers || [];
      if (!allowedRoles.includes(role)) {
        throw new Error(`You don't have permission to create a ${role}`);
      }
      
      const existingUser = await prisma.user.findUnique({
        where: { email }
      });
      
      if (existingUser) {
        throw new Error('User already exists');
      }
      
      const hashedPassword = await bcrypt.hash(password || 'default123', 10);
      
      return await prisma.user.create({
        data: {
          email,
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
      return await prisma.user.delete({
        where: { id }
      });
    } catch (error) {
      console.error('Error in deleteUser:', error);
      throw error;
    }
  }
  
  async getUsersByRole(role) {
    try {
      return await prisma.user.findMany({
        where: { role },
        select: {
          id: true,
          email: true,
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
          email: true,
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
}

module.exports = new UserService();
