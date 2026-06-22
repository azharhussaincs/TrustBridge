const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const encryptionService = require('../crypto/encryption');

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

const FILE_SHARING_RULES = {
  'ADMIN': {
    canShareWith: ['ADMIN', 'SUPER_USER', 'TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'],
    description: 'Can share files with everyone (System Admin)'
  },
  'SUPER_USER': {
    canShareWith: ['TEAM_LEAD', 'TEAM_MANAGER'],
    description: 'Can share files with Team Leads and Team Managers'
  },
  'TEAM_LEAD': {
    canShareWith: ['SUPER_USER', 'TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'],
    description: 'Can share files with Super User, other Team Leads, own Team Managers, and own Team Members'
  },
  'TEAM_MANAGER': {
    canShareWith: ['SUPER_USER', 'TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'],
    description: 'Can share files with Super User, Team Lead, other Team Managers, and Team Members'
  },
  'TEAM_MEMBER': {
    canShareWith: ['SUPER_USER', 'TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'],
    description: 'Can share files with Super User, Team Lead, Team Manager, and other Team Members'
  }
};

class FileService {
  constructor() {
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
  }

  canShareFile(senderRole, receiverRole, senderTeamId, receiverTeamId) {
    const allowedRoles = FILE_SHARING_RULES[senderRole]?.canShareWith || [];
    
    if (!allowedRoles.includes(receiverRole)) {
      return { allowed: false, reason: `You cannot share files with ${receiverRole}` };
    }
    
    if (senderRole === 'TEAM_LEAD') {
      if (receiverRole === 'TEAM_MANAGER' || receiverRole === 'TEAM_MEMBER') {
        if (senderTeamId !== receiverTeamId) {
          return { allowed: false, reason: 'You can only share files with your own team members' };
        }
      }
    }
    
    if (senderRole === 'TEAM_MANAGER') {
      if (receiverRole === 'TEAM_MEMBER') {
        if (senderTeamId !== receiverTeamId) {
          return { allowed: false, reason: 'You can only share files with your own team members' };
        }
      }
    }
    
    return { allowed: true };
  }

  async saveFile(fileData, senderId, receiverId, isEncrypted = true) {
    try {
      const { filename, buffer, mimeType, size } = fileData;
      
      const uniqueFilename = `${Date.now()}-${filename}`;
      const filePath = path.join(UPLOAD_DIR, uniqueFilename);
      
      let savedBuffer = buffer;
      let iv = null;
      let authTag = null;
      
      if (isEncrypted) {
        const result = encryptionService.encryptFile(buffer);
        savedBuffer = result.encryptedData;
        iv = result.iv;
        authTag = result.authTag;
      }
      
      await fs.writeFile(filePath, savedBuffer);
      
      if (iv && authTag) {
        await fs.writeFile(`${filePath}.iv`, iv);
        await fs.writeFile(`${filePath}.tag`, authTag);
      }
      
      const file = await prisma.file.create({
        data: {
          filename,
          path: filePath,
          size,
          mimeType,
          isEncrypted,
          senderId,
          receiverId
        }
      });
      
      return file;
    } catch (error) {
      console.error('Error saving file:', error);
      throw error;
    }
  }

  async getFile(fileId, userId) {
    try {
      const file = await prisma.file.findUnique({
        where: { id: fileId }
      });
      
      if (!file) {
        throw new Error('File not found');
      }
      
      if (file.senderId !== userId && file.receiverId !== userId) {
        throw new Error('Unauthorized access');
      }
      
      const encryptedData = await fs.readFile(file.path);
      
      let decryptedData = encryptedData;
      
      if (file.isEncrypted) {
        const iv = await fs.readFile(`${file.path}.iv`);
        const authTag = await fs.readFile(`${file.path}.tag`);
        decryptedData = encryptionService.decryptFile(encryptedData, iv, authTag);
      }
      
      return {
        file,
        data: decryptedData
      };
    } catch (error) {
      console.error('Error getting file:', error);
      throw error;
    }
  }

  async getFilesForUser(userId) {
    try {
      return await prisma.file.findMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    } catch (error) {
      console.error('Error getting files for user:', error);
      throw error;
    }
  }

  async deleteFile(fileId, userId) {
    try {
      const file = await prisma.file.findUnique({
        where: { id: fileId }
      });
      
      if (!file) {
        throw new Error('File not found');
      }
      
      if (file.senderId !== userId && file.receiverId !== userId) {
        throw new Error('Unauthorized access');
      }
      
      await fs.unlink(file.path).catch(() => {});
      await fs.unlink(`${file.path}.iv`).catch(() => {});
      await fs.unlink(`${file.path}.tag`).catch(() => {});
      
      await prisma.file.delete({
        where: { id: fileId }
      });
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  getSharingRules(role) {
    return FILE_SHARING_RULES[role] || { canShareWith: [], description: 'No permissions' };
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

module.exports = new FileService();
