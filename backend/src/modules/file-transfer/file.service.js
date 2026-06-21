const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');
const encryptionService = require('../crypto/encryption');

const prisma = new PrismaClient();
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

class FileService {
  constructor() {
    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
  }

  async saveFile(fileData, senderId, receiverId) {
    try {
      const { filename, buffer, mimeType, size } = fileData;
      
      // Generate unique filename
      const uniqueFilename = `${Date.now()}-${filename}`;
      const filePath = path.join(UPLOAD_DIR, uniqueFilename);
      
      // Encrypt the file
      const { encryptedData, iv, authTag } = encryptionService.encryptFile(buffer);
      
      // Save encrypted file to disk
      await fs.writeFile(filePath, encryptedData);
      
      // Save file metadata to database
      const file = await prisma.file.create({
        data: {
          filename,
          path: filePath,
          size,
          mimeType,
          isEncrypted: true,
          senderId,
          receiverId
        }
      });
      
      // Save IV and auth tag separately (in a real system, these would be stored securely)
      await fs.writeFile(`${filePath}.iv`, iv);
      await fs.writeFile(`${filePath}.tag`, authTag);
      
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
          sender: { select: { id: true, name: true, email: true } },
          receiver: { select: { id: true, name: true, email: true } }
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
      const iv = await fs.readFile(`${file.path}.iv`);
      const authTag = await fs.readFile(`${file.path}.tag`);
      
      // Decrypt file
      const decryptedData = encryptionService.decryptFile(encryptedData, iv, authTag);
      
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
          sender: { select: { id: true, name: true, email: true } },
          receiver: { select: { id: true, name: true, email: true } }
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

  canShareFile(senderRole, receiverRole, senderTeamId, receiverTeamId) {
    // Get communication rules from constants
    const { COMMUNICATION_RULES } = require('../../config/constants');
    const allowedRoles = COMMUNICATION_RULES[senderRole]?.canCommunicateWith || [];
    
    // Check if receiver role is allowed
    if (!allowedRoles.includes(receiverRole)) {
      return false;
    }
    
    // Team Lead can only share with own team members
    if (senderRole === 'TEAM_LEAD') {
      if (receiverRole === 'TEAM_MANAGER' || receiverRole === 'TEAM_MEMBER') {
        return senderTeamId === receiverTeamId;
      }
    }
    
    // Team Manager can only share with own team members
    if (senderRole === 'TEAM_MANAGER') {
      if (receiverRole === 'TEAM_MEMBER') {
        return senderTeamId === receiverTeamId;
      }
    }
    
    return true;
  }
}

module.exports = new FileService();
