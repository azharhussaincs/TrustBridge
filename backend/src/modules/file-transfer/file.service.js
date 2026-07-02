const fs = require('fs').promises;
const path = require('path');
const { createReadStream } = require('fs');
const encryptionService = require('../crypto/encryption');

const prisma = require('../../config/database');
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

const FILE_SHARING_RULES = {
  'ADMIN': {
    canShareWith: ['ADMIN', 'SUPER_USER', 'TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'],
    description: 'Can share files with everyone (System Admin)'
  },
  'SUPER_USER': {
    canShareWith: ['TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'],
    description: 'Can share files with Team Leads, Team Managers, and Team Members'
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
    canShareWith: ['TEAM_LEAD', 'TEAM_MANAGER', 'TEAM_MEMBER'],
    description: 'Can share files with Team Lead, Team Manager, and other Team Members'
  }
};

class FileService {
  constructor() {
    this.ensureUploadDir();
  }

  async ensureUploadDir() {
    try {
      await fs.mkdir(UPLOAD_DIR, { recursive: true });
      await fs.mkdir(path.join(UPLOAD_DIR, '.tmp'), { recursive: true });
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
    const { filename, buffer, tempPath, mimeType, size } = fileData;
    const uniqueFilename = `${Date.now()}-${filename}`;
    const filePath = path.join(UPLOAD_DIR, uniqueFilename);

    try {
      if (tempPath) {
        if (isEncrypted) {
          const result = await encryptionService.encryptFileFromPath(tempPath, filePath);
          await fs.writeFile(`${filePath}.iv`, result.iv);
          await fs.writeFile(`${filePath}.tag`, result.authTag);
        } else {
          await fs.copyFile(tempPath, filePath);
        }
      } else if (buffer) {
        let savedBuffer = buffer;
        if (isEncrypted) {
          const result = encryptionService.encryptFile(buffer);
          savedBuffer = result.encryptedData;
          await fs.writeFile(`${filePath}.iv`, result.iv);
          await fs.writeFile(`${filePath}.tag`, result.authTag);
        }
        await fs.writeFile(filePath, savedBuffer);
      } else {
        throw new Error('No file data provided');
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
      await fs.unlink(filePath).catch(() => {});
      await fs.unlink(`${filePath}.iv`).catch(() => {});
      await fs.unlink(`${filePath}.tag`).catch(() => {});
      throw error;
    } finally {
      if (tempPath) {
        await fs.unlink(tempPath).catch(() => {});
      }
    }
  }

  async streamFileToResponse(fileId, userId, res) {
    const file = await prisma.file.findUnique({
      where: { id: fileId }
    });

    if (!file) {
      throw new Error('File not found');
    }

    if (file.senderId !== userId && file.receiverId !== userId) {
      throw new Error('Unauthorized access');
    }

    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    if (file.size) {
      res.setHeader('Content-Length', file.size);
    }

    if (file.isEncrypted) {
      const iv = await fs.readFile(`${file.path}.iv`);
      const authTag = await fs.readFile(`${file.path}.tag`);
      await encryptionService.decryptFileToStream(file.path, iv, authTag, res);
      return;
    }

    await new Promise((resolve, reject) => {
      const stream = createReadStream(file.path);
      stream.on('error', reject);
      res.on('finish', resolve);
      res.on('error', reject);
      stream.pipe(res);
    });
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
