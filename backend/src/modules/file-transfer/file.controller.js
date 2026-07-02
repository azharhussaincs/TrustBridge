const fileService = require('./file.service');
const prisma = require('../../config/database');

class FileController {
  async uploadFile(req, res) {
    try {
      const { receiverId, isEncrypted } = req.body;
      const senderId = req.user.id;
      const senderRole = req.user.role;
      const senderTeamId = req.user.teamId;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      if (!receiverId) {
        return res.status(400).json({
          success: false,
          message: 'Receiver ID is required'
        });
      }
      
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId }
      });
      
      if (!receiver) {
        return res.status(404).json({
          success: false,
          message: 'Receiver not found'
        });
      }
      
      const permission = fileService.canShareFile(
        senderRole,
        receiver.role,
        senderTeamId,
        receiver.teamId
      );
      
      if (!permission.allowed) {
        return res.status(403).json({
          success: false,
          message: permission.reason
        });
      }
      
      const file = await fileService.saveFile(
        {
          filename: req.file.originalname,
          tempPath: req.file.path,
          mimeType: req.file.mimetype,
          size: req.file.size
        },
        senderId,
        receiverId,
        isEncrypted !== 'false'
      );
      
      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: file
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Upload failed'
      });
    }
  }

  async downloadFile(req, res) {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;

      await fileService.streamFileToResponse(fileId, userId, res);
    } catch (error) {
      console.error('Download error:', error);
      if (!res.headersSent) {
        res.status(400).json({
          success: false,
          message: error.message
        });
      }
    }
  }

  async getFiles(req, res) {
    try {
      const userId = req.user.id;
      const files = await fileService.getFilesForUser(userId);
      res.json({
        success: true,
        data: files
      });
    } catch (error) {
      console.error('Get files error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async deleteFile(req, res) {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;
      
      await fileService.deleteFile(fileId, userId);
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } catch (error) {
      console.error('Delete file error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async getSharingRules(req, res) {
    try {
      const rules = fileService.getSharingRules(req.user.role);
      res.json({
        success: true,
        data: rules
      });
    } catch (error) {
      console.error('Get sharing rules error:', error);
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new FileController();
