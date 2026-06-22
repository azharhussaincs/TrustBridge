const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('./file.controller');
const authMiddleware = require('../auth/auth.middleware');

// Configure multer for memory storage - No size limit, all file types
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  // No file filter - accept all file types
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB default, can be changed
  }
});

// All routes require authentication
router.use(authMiddleware.authenticate);

// Get sharing rules for current user
router.get('/rules', fileController.getSharingRules);

// Upload file - with error handling for multer
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'FILE_TOO_LARGE') {
        return res.status(400).json({
          success: false,
          message: 'File too large. Maximum size is 50MB.'
        });
      }
      return res.status(400).json({
        success: false,
        message: err.message
      });
    } else if (err) {
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
    next();
  });
}, fileController.uploadFile);

// Download file
router.get('/download/:fileId', fileController.downloadFile);

// Get all files for user
router.get('/', fileController.getFiles);

// Delete file
router.delete('/:fileId', fileController.deleteFile);

module.exports = router;
