const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { protect } = require('../middleware/auth');
const User = require('../models/Users');

const router = express.Router();
const MIME_EXTENSION_MAP = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp'
};

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
const profilePicsDir = path.join(__dirname, '../uploads/profiles');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(profilePicsDir)) {
  fs.mkdirSync(profilePicsDir, { recursive: true });
}

// Configure multer storage for menu images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = MIME_EXTENSION_MAP[file.mimetype];
    cb(null, `menu-${uniqueSuffix}${ext}`);
  }
});

// Configure multer storage for profile pictures
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePicsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = MIME_EXTENSION_MAP[file.mimetype];
    cb(null, `profile-${uniqueSuffix}${ext}`);
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
  const normalizedExt = path.extname(file.originalname || '').toLowerCase();

  if (allowedTypes.includes(file.mimetype) && allowedExtensions.includes(normalizedExt)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'), false);
  }
};

// Configure multer for menu images
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Configure multer for profile pictures
const profileUpload = multer({
  storage: profileStorage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit for profile pics
  }
});

// Upload endpoint
router.post('/', protect, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Construct the URL for the uploaded file
    const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
    const imageUrl = `${baseUrl}/uploads/${req.file.filename}`;

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        filename: req.file.filename,
        url: imageUrl
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading file'
    });
  }
});

// Profile picture upload endpoint
router.post('/profile-picture', protect, profileUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Construct the URL for the uploaded file
    const baseUrl = process.env.API_URL || `http://localhost:${process.env.PORT || 5000}`;
    const imageUrl = `${baseUrl}/uploads/profiles/${req.file.filename}`;

    // Update user's profile picture in database
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: imageUrl },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: {
        filename: req.file.filename,
        url: imageUrl
      }
    });
  } catch (error) {
    console.error('Profile picture upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading profile picture'
    });
  }
});

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 5MB'
      });
    }
  }

  res.status(400).json({
    success: false,
    message: error.message || 'Error uploading file'
  });
});

module.exports = router;
