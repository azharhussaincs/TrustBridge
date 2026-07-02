const express = require('express');
const router = express.Router();
const multer = require('multer');
const fileController = require('./file.controller');
const authMiddleware = require('../auth/auth.middleware');

// Configure multer for memory storage — all file types; optional cap via MAX_FILE_SIZE env only
const storage = multer.memoryStorage();
const parsedMaxFileSize = parseInt(process.env.MAX_FILE_SIZE, 10);
const maxFileSize =
  Number.isFinite(parsedMaxFileSize) && parsedMaxFileSize > 0
    ? parsedMaxFileSize
    : null;

const upload = multer({
  storage,
  ...(maxFileSize ? { limits: { fileSize: maxFileSize } } : {}),
});

function formatMaxFileSize(bytes) {
  if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(0)} GB`;
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(0)} MB`;
  return `${bytes} bytes`;
}

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
          message: maxFileSize
            ? `File too large. Maximum size is ${formatMaxFileSize(maxFileSize)}.`
            : 'File too large.',
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
