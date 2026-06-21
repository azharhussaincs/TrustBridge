const fileService = require('./file.service');

class FileController {
  async uploadFile(req, res) {
    try {
      const { receiverId } = req.body;
      const senderId = req.user.id;
      const senderRole = req.user.role;
      const senderTeamId = req.user.teamId;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }
      
      // Check if user can share files with receiver
      // This would need to check receiver's role and team
      
      const file = await fileService.saveFile(
        {
          filename: req.file.originalname,
          buffer: req.file.buffer,
          mimeType: req.file.mimetype,
          size: req.file.size
        },
        senderId,
        receiverId
      );
      
      res.json({
        success: true,
        message: 'File uploaded successfully',
        data: file
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  async downloadFile(req, res) {
    try {
      const { fileId } = req.params;
      const userId = req.user.id;
      
      const { file, data } = await fileService.getFile(fileId, userId);
      
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
      res.send(data);
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
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
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = new FileController();
