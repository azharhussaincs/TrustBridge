const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const encryptionService = require('../crypto/encryption');

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Role-based file sharing permissions - SRS Compliant
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
    
    // Team Lead can only share with own team members (except Super User and other Team Leads)
    if (senderRole === 'TEAM_LEAD') {
      if (receiverRole === 'TEAM_MANAGER' || receiverRole === 'TEAM_MEMBER') {
        if (senderTeamId !== receiverTeamId) {
          return { allowed: false, reason: 'You can only share files with your own team members' };
        }
      }
    }
    
    // Team Manager can only share with own team members
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
      
      // Generate unique filename with timestamp
      const uniqueFilename = `${Date.now()}-${filename}`;
      const filePath = path.join(UPLOAD_DIR, uniqueFilename);
      
      let savedBuffer = buffer;
      let iv = null;
      let authTag = null;
      
      // Encrypt the file if required
      if (isEncrypted) {
        const result = encryptionService.encryptFile(buffer);
        savedBuffer = result.encryptedData;
        iv = result.iv;
        authTag = result.authTag;
      }
      
      // Save encrypted file to disk
      await fs.writeFile(filePath, savedBuffer);
      
      // Save IV and auth tag if encrypted
      if (iv && authTag) {
        await fs.writeFile(`${filePath}.iv`, iv);
        await fs.writeFile(`${filePath}.tag`, authTag);
      }
      
      // Save file metadata to database
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
        where: { id: fileId },
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } },
          receiver: { select: { id: true, name: true, email: true, role: true } }
        }
      });
      
      if (!file) {
        throw new Error('File not found');
      }
      
      // Check if user is authorized to access this file
      if (file.senderId !== userId && file.receiverId !== userId) {
        throw new Error('Unauthorized access');
      }
      
      // Read encrypted file
      const encryptedData = await fs.readFile(file.path);
      
      let decryptedData = encryptedData;
      
      // Decrypt if file was encrypted
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
        include: {
          sender: { select: { id: true, name: true, email: true, role: true } },
          receiver: { select: { id: true, name: true, email: true, role: true } }
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
      
      // Check if user is authorized to delete this file
      if (file.senderId !== userId && file.receiverId !== userId) {
        throw new Error('Unauthorized access');
      }
      
      // Delete physical files
      await fs.unlink(file.path).catch(() => {});
      await fs.unlink(`${file.path}.iv`).catch(() => {});
      await fs.unlink(`${file.path}.tag`).catch(() => {});
      
      // Delete from database
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
