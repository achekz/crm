import crypto from 'crypto';
import { AppError } from '../utils/errorHandler';
import { promises as fs } from 'fs';
import path from 'path';

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
  warnings?: string[];
}

export interface FileSecurityCheck {
  hasMalware: boolean;
  threats: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

export class FileUploadValidator {
  // Allowed file types with their corresponding extensions and MIME types
  private static readonly ALLOWED_TYPES = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'image/webp': ['.webp'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
    'application/vnd.ms-powerpoint': ['.ppt'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
    'text/markdown': ['.md'],
    'application/json': ['.json']
  };

  // Maximum file sizes (in bytes)
  private static readonly MAX_FILE_SIZES = {
    'image': 5 * 1024 * 1024,      // 5MB for images
    'document': 10 * 1024 * 1024,  // 10MB for documents
    'video': 50 * 1024 * 1024,     // 50MB for videos (if allowed)
    'default': 10 * 1024 * 1024    // 10MB default
  };

  // Suspicious file signatures (first few bytes)
  private static readonly SUSPICIOUS_SIGNATURES = [
    { signature: Buffer.from([0x4D, 0x5A]), description: 'Windows executable (EXE)' },
    { signature: Buffer.from([0x7F, 0x45, 0x4C, 0x46]), description: 'Linux executable (ELF)' },
    { signature: Buffer.from([0xCA, 0xFE, 0xBA, 0xBE]), description: 'Java class file' },
    { signature: Buffer.from([0x25, 0x50, 0x44, 0x46]), description: 'PDF file (check for embedded scripts)' }
  ];

  // Suspicious file extensions
  private static readonly SUSPICIOUS_EXTENSIONS = [
    '.exe', '.dll', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js',
    '.jar', '.php', '.asp', '.jsp', '.sh', '.bash', '.zsh', '.csh',
    '.py', '.rb', '.pl', '.go', '.cpp', '.c', '.h', '.class', '.jar'
  ];

  // Validate file type
  static validateFileType(mimetype: string, originalname: string): FileValidationResult {
    // Check if MIME type is allowed
    if (!this.ALLOWED_TYPES[mimetype as keyof typeof this.ALLOWED_TYPES]) {
      return {
        isValid: false,
        error: `File type '${mimetype}' is not allowed`
      };
    }

    // Check file extension
    const extension = path.extname(originalname).toLowerCase();
    const allowedExtensions = this.ALLOWED_TYPES[mimetype as keyof typeof this.ALLOWED_TYPES];
    
    if (!allowedExtensions.includes(extension)) {
      return {
        isValid: false,
        error: `File extension '${extension}' does not match MIME type '${mimetype}'`
      };
    }

    // Check for suspicious extensions
    if (this.SUSPICIOUS_EXTENSIONS.includes(extension)) {
      return {
        isValid: false,
        error: `File extension '${extension}' is potentially dangerous and not allowed`
      };
    }

    return { isValid: true };
  }

  // Validate file size
  static validateFileSize(size: number, mimetype: string): FileValidationResult {
    // Determine file category
    let maxSize = this.MAX_FILE_SIZES.default;
    
    if (mimetype.startsWith('image/')) {
      maxSize = this.MAX_FILE_SIZES.image;
    } else if (mimetype.startsWith('application/')) {
      maxSize = this.MAX_FILE_SIZES.document;
    } else if (mimetype.startsWith('video/')) {
      maxSize = this.MAX_FILE_SIZES.video;
    }

    if (size > maxSize) {
      return {
        isValid: false,
        error: `File size (${this.formatFileSize(size)}) exceeds maximum allowed size of ${this.formatFileSize(maxSize)}`
      };
    }

    return { isValid: true };
  }

  // Validate file name
  static validateFileName(filename: string): FileValidationResult {
    // Remove path traversal attempts
    const cleanFilename = path.basename(filename);
    
    if (cleanFilename !== filename) {
      return {
        isValid: false,
        error: 'File name contains invalid path traversal characters'
      };
    }

    // Check for null bytes
    if (filename.includes('\0')) {
      return {
        isValid: false,
        error: 'File name contains null bytes'
      };
    }

    // Check length
    if (filename.length > 255) {
      return {
        isValid: false,
        error: 'File name is too long (maximum 255 characters)'
      };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\.{2,}/,  // Multiple dots
      /^\./,     // Starting with dot
      /[<>:"|?*]/, // Invalid Windows characters
      /\s{2,}/   // Multiple spaces
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(filename)) {
        return {
          isValid: false,
          error: 'File name contains suspicious patterns'
        };
      }
    }

    return { isValid: true };
  }

  // Basic malware check (simplified - in production, use proper antivirus)
  static async performSecurityCheck(filePath: string, mimetype: string): Promise<FileSecurityCheck> {
    const threats: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    try {
      // Read first few bytes to check file signature
      const buffer = await this.readFileHeader(filePath, 512);
      
      // Check for suspicious signatures
      for (const sig of this.SUSPICIOUS_SIGNATURES) {
        if (buffer.slice(0, sig.signature.length).equals(sig.signature)) {
          threats.push(sig.description);
          riskLevel = 'high';
        }
      }

      // Check for embedded scripts in PDFs
      if (mimetype === 'application/pdf') {
        const content = buffer.toString('utf-8', 0, Math.min(buffer.length, 1024));
        if (content.includes('/JavaScript') || content.includes('/JS')) {
          threats.push('PDF contains embedded JavaScript');
          riskLevel = 'medium';
        }
      }

      // Check for HTML/XML with script tags
      if (mimetype.startsWith('text/')) {
        const content = buffer.toString('utf-8');
        if (content.includes('<script') || content.includes('javascript:')) {
          threats.push('Text file contains script tags or JavaScript');
          riskLevel = 'medium';
        }
      }

      // Check file size vs content (potential polyglot)
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;
      
      // Simple entropy check for encrypted/obfuscated content
      const entropy = this.calculateEntropy(buffer);
      if (entropy > 7.5) {
        threats.push('High entropy content (possibly encrypted/obfuscated)');
        riskLevel = riskLevel === 'low' ? 'medium' : riskLevel;
      }

    } catch (error) {
      threats.push('Unable to read file for security check');
      riskLevel = 'high';
    }

    return {
      hasMalware: threats.length > 0,
      threats,
      riskLevel
    };
  }

  // Calculate file entropy (randomness indicator)
  private static calculateEntropy(buffer: Buffer): number {
    const frequency = new Array(256).fill(0);
    
    for (const byte of buffer) {
      frequency[byte]++;
    }
    
    let entropy = 0;
    const length = buffer.length;
    
    for (const count of frequency) {
      if (count > 0) {
        const probability = count / length;
        entropy -= probability * Math.log2(probability);
      }
    }
    
    return entropy;
  }

  // Read file header
  private static async readFileHeader(filePath: string, bytes: number): Promise<Buffer> {
    const fd = await fs.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(bytes);
      await fd.read(buffer, 0, bytes, 0);
      return buffer;
    } finally {
      await fd.close();
    }
  }

  // Generate secure filename
  static generateSecureFilename(originalname: string): string {
    // Remove extension
    const extension = path.extname(originalname);
    const basename = path.basename(originalname, extension);
    
    // Clean basename (remove special characters)
    const cleanBasename = basename.replace(/[^a-zA-Z0-9-_]/g, '_').slice(0, 50);
    
    // Generate random suffix
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    
    return `${cleanBasename}_${randomSuffix}${extension}`;
  }

  // Validate upload directory
  static validateUploadDirectory(uploadDir: string): FileValidationResult {
    // Check for path traversal in directory name
    if (uploadDir.includes('..') || uploadDir.includes('~')) {
      return {
        isValid: false,
        error: 'Upload directory path contains invalid characters'
      };
    }

    // Ensure directory is within allowed paths (add your allowed paths here)
    const allowedPaths = [
      'uploads',
      'public/uploads',
      'temp/uploads'
    ];

    const isAllowed = allowedPaths.some(allowed => 
      uploadDir.includes(allowed) || uploadDir.startsWith(`./${allowed}`)
    );

    if (!isAllowed) {
      return {
        isValid: false,
        error: 'Upload directory is not in allowed paths'
      };
    }

    return { isValid: true };
  }

  // Comprehensive file validation
  static async validateFile(file: Express.Multer.File, uploadDir: string): Promise<{
    isValid: boolean;
    error?: string;
    warnings?: string[];
    securityCheck?: FileSecurityCheck;
    secureFilename?: string;
  }> {
    const warnings: string[] = [];

    // Validate upload directory
    const dirValidation = this.validateUploadDirectory(uploadDir);
    if (!dirValidation.isValid) {
      return { isValid: false, error: dirValidation.error };
    }

    // Validate file type
    const typeValidation = this.validateFileType(file.mimetype, file.originalname);
    if (!typeValidation.isValid) {
      return { isValid: false, error: typeValidation.error };
    }

    // Validate file size
    const sizeValidation = this.validateFileSize(file.size, file.mimetype);
    if (!sizeValidation.isValid) {
      return { isValid: false, error: sizeValidation.error };
    }

    // Validate file name
    const nameValidation = this.validateFileName(file.originalname);
    if (!nameValidation.isValid) {
      return { isValid: false, error: nameValidation.error };
    }

    // Generate secure filename
    const secureFilename = this.generateSecureFilename(file.originalname);

    // Perform security check
    const securityCheck = await this.performSecurityCheck(file.path, file.mimetype);
    
    if (securityCheck.riskLevel === 'high') {
      return {
        isValid: false,
        error: `File failed security check: ${securityCheck.threats.join(', ')}`
      };
    }

    if (securityCheck.riskLevel === 'medium') {
      warnings.push(`Security warning: ${securityCheck.threats.join(', ')}`);
    }

    return {
      isValid: true,
      warnings,
      securityCheck,
      secureFilename
    };
  }

  // Format file size for display
  private static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}