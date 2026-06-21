const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('./file.controller');
const authMiddleware = require('../auth/auth.middleware');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  }
});

// All routes require authentication
router.use(authMiddleware.authenticate);

// Upload file
router.post('/upload', upload.single('file'), fileController.uploadFile);

// Download file
router.get('/download/:fileId', fileController.downloadFile);

// Get all files for user
router.get('/', fileController.getFiles);

// Delete file
router.delete('/:fileId', fileController.deleteFile);

module.exports = router;
