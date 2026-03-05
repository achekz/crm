import { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { protect, restrictTo } from '../middleware/auth';
import backupService from '../services/backupService';
import { logInfo, logError } from '../utils/logger';

// Create manual backup
export const createBackup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logInfo('Manual backup requested', { userId: (req as any).user?.id });

    const result = await backupService.createBackup();

    if (result.success) {
      logInfo('Manual backup completed successfully', {
        backupPath: result.backupPath,
        size: result.size,
        duration: result.duration
      });

      sendSuccessResponse(res, {
        backupPath: result.backupPath,
        size: result.size,
        duration: result.duration,
        timestamp: result.timestamp
      }, 'Backup created successfully');
    } else {
      throw new AppError(result.error || 'Backup creation failed', 500);
    }

  } catch (error) {
    logError('Manual backup failed', error);
    next(error);
  }
};

// List available backups
export const listBackups = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const backups = await backupService.listBackups();

    sendSuccessResponse(res, backups, 'Backups retrieved successfully');

  } catch (error) {
    logError('Failed to list backups', error);
    next(error);
  }
};

// Restore from backup
export const restoreBackup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { backupPath } = req.body;

    if (!backupPath) {
      return next(new AppError('Backup path is required', 400));
    }

    logInfo('Restore requested', { 
      backupPath, 
      userId: (req as any).user?.id 
    });

    await backupService.restoreBackup(backupPath);

    logInfo('Restore completed successfully', { backupPath });

    sendSuccessResponse(res, null, 'Database restored successfully');

  } catch (error) {
    logError('Restore failed', error);
    next(error);
  }
};

// Delete backup
export const deleteBackup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { filename } = req.params;

    if (!filename) {
      return next(new AppError('Backup filename is required', 400));
    }

    logInfo('Backup deletion requested', { 
      filename, 
      userId: (req as any).user?.id 
    });

    // Validate filename to prevent directory traversal
    if (filename.includes('..') || filename.includes('/')) {
      return next(new AppError('Invalid backup filename', 400));
    }

    const backupPath = path.join(backupService['config'].backupPath, filename);
    
    // Check if backup exists
    const backups = await backupService.listBackups();
    const backup = backups.find(b => b.name === filename);
    
    if (!backup) {
      return next(new AppError('Backup not found', 404));
    }

    // Delete the backup
    await fs.promises.rm(backupPath, { recursive: true, force: true });

    logInfo('Backup deleted successfully', { filename });

    sendSuccessResponse(res, null, 'Backup deleted successfully');

  } catch (error) {
    logError('Backup deletion failed', error);
    next(error);
  }
};

// Get backup configuration
export const getBackupConfig = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const config = {
      schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *',
      retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7'),
      compress: process.env.BACKUP_COMPRESS !== 'false',
      notifyOnFailure: process.env.BACKUP_NOTIFY_FAILURE !== 'false'
    };

    sendSuccessResponse(res, config, 'Backup configuration retrieved successfully');

  } catch (error) {
    logError('Failed to get backup configuration', error);
    next(error);
  }
};

// Cleanup old backups
export const cleanupBackups = async (req: Request, res: Response, next: NextFunction) => {
  try {
    logInfo('Manual backup cleanup requested', { userId: (req as any).user?.id });

    await backupService.cleanupOldBackups();

    logInfo('Manual backup cleanup completed successfully');

    sendSuccessResponse(res, null, 'Old backups cleaned up successfully');

  } catch (error) {
    logError('Manual backup cleanup failed', error);
    next(error);
  }
};