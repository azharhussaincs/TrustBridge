const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const fileController = require('./file.controller');
const authMiddleware = require('../auth/auth.middleware');

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const TEMP_DIR = path.join(UPLOAD_DIR, '.tmp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Disk storage — streams to disk; no file type or size limits
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (_req, file, cb) => {
    const safeName = file.originalname.replace(/[^\w.\-()+\s]/g, '_');
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`);
  },
});

const upload = multer({ storage });

// All routes require authentication
const router = express.Router();
router.use(authMiddleware.authenticate);

// Get sharing rules for current user
router.get('/rules', fileController.getSharingRules);

// Upload file - with error handling for multer
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    if (err) {
      return res.status(500).json({
        success: false,
        message: err.message,
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
