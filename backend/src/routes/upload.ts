import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { FileUploadValidator } from '../services/fileUploadValidation';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { protect, restrictTo } from '../middleware/auth';

const router = express.Router();

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage with security measures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Validate upload directory
    const validation = FileUploadValidator.validateUploadDirectory(uploadDir);
    if (!validation.isValid) {
      return cb(new AppError(validation.error || 'Invalid upload directory', 400), '');
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    try {
      // Generate secure filename
      const secureFilename = FileUploadValidator.generateSecureFilename(file.originalname);
      cb(null, secureFilename);
    } catch (error) {
      cb(new AppError('Failed to generate secure filename', 500), '');
    }
  },
});

// Enhanced file filter with security checks
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  try {
    // Validate file type
    const typeValidation = FileUploadValidator.validateFileType(file.mimetype, file.originalname);
    if (!typeValidation.isValid) {
      return cb(new AppError(typeValidation.error || 'Invalid file type', 400));
    }

    // Validate file size (basic check - detailed check will happen after upload)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return cb(new AppError('File size exceeds 10MB limit', 400));
    }

    // Validate file name
    const nameValidation = FileUploadValidator.validateFileName(file.originalname);
    if (!nameValidation.isValid) {
      return cb(new AppError(nameValidation.error || 'Invalid file name', 400));
    }

    cb(null, true);
  } catch (error) {
    cb(new AppError('File validation failed', 500));
  }
};

// Configure multer with security settings
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1, // Only one file per request
    fields: 10, // Limit number of fields
    parts: 11 // Limit total number of parts
  },
  fileFilter,
  preservePath: false // Don't preserve original path
});

// Enhanced upload endpoint with security validation
router.post('/', protect, upload.single('file'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      return next(new AppError('No file uploaded', 400));
    }

    // Perform comprehensive file validation
    const validation = await FileUploadValidator.validateFile(req.file, uploadDir);
    
    if (!validation.isValid) {
      // Delete the uploaded file if validation fails
      try {
        await fs.promises.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete invalid file:', unlinkError);
      }
      return next(new AppError(validation.error || 'File validation failed', 400));
    }

    // Log security warnings if any
    if (validation.warnings && validation.warnings.length > 0) {
      console.warn(`File upload warnings for ${req.file.originalname}:`, validation.warnings);
    }

    // Rename file to secure filename if it was changed
    let finalFilePath = req.file.path;
    if (validation.secureFilename && validation.secureFilename !== req.file.filename) {
      const newPath = path.join(uploadDir, validation.secureFilename);
      try {
        await fs.promises.rename(req.file.path, newPath);
        finalFilePath = newPath;
      } catch (renameError) {
        console.error('Failed to rename file:', renameError);
      }
    }

    // Set appropriate file permissions (read-only for owner)
    try {
      await fs.promises.chmod(finalFilePath, 0o644);
    } catch (chmodError) {
      console.error('Failed to set file permissions:', chmodError);
    }

    // Construct secure file URL
    const fileUrl = `/uploads/${path.basename(finalFilePath)}`;

    sendSuccessResponse(res, {
      fileUrl,
      fileName: req.file.originalname,
      secureFileName: path.basename(finalFilePath),
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedAt: new Date().toISOString(),
      securityCheck: validation.securityCheck,
      warnings: validation.warnings
    }, 'File uploaded successfully');

  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        await fs.promises.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete file after error:', unlinkError);
      }
    }
    next(error);
  }
});

// Get uploaded files list (admin only)
router.get('/files', protect, restrictTo('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = await fs.promises.readdir(uploadDir);
    const fileDetails = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(uploadDir, filename);
        try {
          const stats = await fs.promises.stat(filePath);
          return {
            filename,
            size: stats.size,
            createdAt: stats.birthtime,
            modifiedAt: stats.mtime,
            isDirectory: stats.isDirectory()
          };
        } catch (error) {
          return null;
        }
      })
    );

    const validFiles = fileDetails.filter(file => file !== null && !file.isDirectory);
    
    sendSuccessResponse(res, validFiles, 'Uploaded files retrieved successfully');
  } catch (error) {
    next(error);
  }
});

// Delete uploaded file (admin only)
router.delete('/files/:filename', protect, restrictTo('admin'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.params;
    
    // Validate filename to prevent directory traversal
    const validation = FileUploadValidator.validateFileName(filename);
    if (!validation.isValid) {
      return next(new AppError('Invalid filename', 400));
    }

    const filePath = path.join(uploadDir, filename);
    
    // Check if file exists
    try {
      await fs.promises.access(filePath);
    } catch (error) {
      return next(new AppError('File not found', 404));
    }

    // Delete the file
    await fs.promises.unlink(filePath);
    
    sendSuccessResponse(res, null, 'File deleted successfully');
  } catch (error) {
    next(error);
  }
});

// Serve uploaded files with security headers
router.get('/files/:filename', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    const validation = FileUploadValidator.validateFileName(filename);
    if (!validation.isValid) {
      return next(new AppError('Invalid filename', 400));
    }

    const filePath = path.join(uploadDir, filename);
    
    // Check if file exists
    try {
      await fs.promises.access(filePath);
    } catch (error) {
      return next(new AppError('File not found', 404));
    }

    // Set security headers
    res.set({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-Download-Options': 'noopen',
      'Content-Disposition': `attachment; filename="${filename}"`
    });

    // Send file
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error('Error sending file:', err);
        next(new AppError('Error serving file', 500));
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;