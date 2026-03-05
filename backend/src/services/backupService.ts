import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { logInfo, logError, logWarn } from '../utils/logger';

const execAsync = promisify(exec);

interface BackupConfig {
  schedule: string; // Cron expression
  retentionDays: number;
  backupPath: string;
  compress: boolean;
  notifyOnFailure: boolean;
}

interface BackupResult {
  success: boolean;
  backupPath?: string;
  size?: number;
  duration: number;
  error?: string;
  timestamp: Date;
}

export class DatabaseBackupService {
  private config: BackupConfig;
  private cronJob: NodeJS.Timeout | null = null;

  constructor(config: Partial<BackupConfig> = {}) {
    this.config = {
      schedule: '0 2 * * *', // Daily at 2 AM
      retentionDays: 7,
      backupPath: path.join(__dirname, '../../backups'),
      compress: true,
      notifyOnFailure: true,
      ...config
    };

    this.ensureBackupDirectory();
  }

  private ensureBackupDirectory(): void {
    if (!fs.existsSync(this.config.backupPath)) {
      fs.mkdirSync(this.config.backupPath, { recursive: true });
      logInfo('Created backup directory', { path: this.config.backupPath });
    }
  }

  async createBackup(): Promise<BackupResult> {
    const startTime = Date.now();
    const timestamp = new Date();
    const backupFileName = `backup_${timestamp.toISOString().replace(/[:.]/g, '-')}`;
    const backupPath = path.join(this.config.backupPath, backupFileName);

    try {
      logInfo('Starting database backup', { backupPath });

      // Get MongoDB connection details
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';
      const dbName = this.extractDatabaseName(mongoUri);

      // Create backup using mongodump
      const dumpCommand = this.buildMongodumpCommand(mongoUri, backupPath, dbName);
      
      logInfo('Executing mongodump command', { command: this.sanitizeCommand(dumpCommand) });
      await execAsync(dumpCommand);

      // Compress if enabled
      let finalBackupPath = backupPath;
      if (this.config.compress) {
        finalBackupPath = await this.compressBackup(backupPath);
      }

      // Get backup size
      const stats = fs.statSync(finalBackupPath);
      const size = stats.size;

      const duration = Date.now() - startTime;

      logInfo('Database backup completed successfully', {
        backupPath: finalBackupPath,
        size: this.formatFileSize(size),
        duration: `${duration}ms`
      });

      return {
        success: true,
        backupPath: finalBackupPath,
        size,
        duration,
        timestamp
      };

    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logError('Database backup failed', error, {
        backupPath,
        duration: `${duration}ms`
      });

      return {
        success: false,
        duration,
        error: errorMessage,
        timestamp
      };
    }
  }

  private extractDatabaseName(mongoUri: string): string {
    try {
      const url = new URL(mongoUri);
      return url.pathname.substring(1) || 'crm';
    } catch {
      // Fallback for connection strings without proper URL format
      const match = mongoUri.match(/\/([^/?]+)/);
      return match ? match[1] : 'crm';
    }
  }

  private buildMongodumpCommand(mongoUri: string, backupPath: string, dbName: string): string {
    const authPart = this.extractAuthPart(mongoUri);
    const hostPart = this.extractHostPart(mongoUri);
    
    let command = `mongodump`;
    
    if (authPart) {
      command += ` ${authPart}`;
    }
    
    command += ` --host ${hostPart} --db ${dbName} --out ${backupPath}`;
    command += ' --gzip'; // Compress individual collections
    
    return command;
  }

  private extractAuthPart(mongoUri: string): string | null {
    try {
      const url = new URL(mongoUri);
      if (url.username && url.password) {
        return `--username ${url.username} --password ${url.password} --authenticationDatabase admin`;
      }
    } catch {
      // Handle traditional MongoDB connection strings
      const authMatch = mongoUri.match(/mongodb:\/\/([^:]+):([^@]+)@/);
      if (authMatch) {
        return `--username ${authMatch[1]} --password ${authMatch[2]} --authenticationDatabase admin`;
      }
    }
    return null;
  }

  private extractHostPart(mongoUri: string): string {
    try {
      const url = new URL(mongoUri);
      return `${url.hostname}:${url.port || '27017'}`;
    } catch {
      // Handle traditional MongoDB connection strings
      const hostMatch = mongoUri.match(/mongodb:\/\/([^/]+)/);
      if (hostMatch) {
        const hostPort = hostMatch[1].split('@').pop() || 'localhost:27017';
        return hostPort.includes(':') ? hostPort : `${hostPort}:27017`;
      }
    }
    return 'localhost:27017';
  }

  private sanitizeCommand(command: string): string {
    // Remove password from logging
    return command.replace(/--password\s+\S+/, '--password ****');
  }

  private async compressBackup(backupPath: string): Promise<string> {
    const archivePath = `${backupPath}.tar.gz`;
    
    logInfo('Compressing backup', { source: backupPath, target: archivePath });
    
    try {
      await execAsync(`tar -czf ${archivePath} -C ${path.dirname(backupPath)} ${path.basename(backupPath)}`);
      
      // Remove uncompressed backup
      await fs.promises.rm(backupPath, { recursive: true, force: true });
      
      logInfo('Backup compression completed', { archivePath });
      return archivePath;
    } catch (error) {
      logError('Backup compression failed', error);
      throw error;
    }
  }

  async restoreBackup(backupPath: string): Promise<void> {
    try {
      logInfo('Starting database restore', { backupPath });

      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';
      const dbName = this.extractDatabaseName(mongoUri);

      let restorePath = backupPath;
      
      // If compressed, extract first
      if (backupPath.endsWith('.tar.gz')) {
        restorePath = await this.extractBackup(backupPath);
      }

      const restoreCommand = this.buildMongorestoreCommand(mongoUri, restorePath, dbName);
      
      logInfo('Executing mongorestore command', { command: this.sanitizeCommand(restoreCommand) });
      await execAsync(restoreCommand);

      logInfo('Database restore completed successfully');

    } catch (error) {
      logError('Database restore failed', error);
      throw error;
    }
  }

  private async extractBackup(archivePath: string): Promise<string> {
    const extractPath = archivePath.replace('.tar.gz', '_extracted');
    
    logInfo('Extracting backup archive', { archivePath, extractPath });
    
    try {
      await fs.promises.mkdir(extractPath, { recursive: true });
      await execAsync(`tar -xzf ${archivePath} -C ${extractPath} --strip-components=1`);
      
      return extractPath;
    } catch (error) {
      logError('Backup extraction failed', error);
      throw error;
    }
  }

  private buildMongorestoreCommand(mongoUri: string, backupPath: string, dbName: string): string {
    const authPart = this.extractAuthPart(mongoUri);
    const hostPart = this.extractHostPart(mongoUri);
    
    let command = `mongorestore`;
    
    if (authPart) {
      command += ` ${authPart}`;
    }
    
    command += ` --host ${hostPart} --db ${dbName} ${backupPath}`;
    command += ' --gzip'; // Handle compressed collections
    command += ' --drop'; // Drop existing collections before restore
    
    return command;
  }

  async cleanupOldBackups(): Promise<void> {
    try {
      logInfo('Starting backup cleanup', { retentionDays: this.config.retentionDays });

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

      const files = await fs.promises.readdir(this.config.backupPath);
      let deletedCount = 0;

      for (const file of files) {
        const filePath = path.join(this.config.backupPath, file);
        const stats = await fs.promises.stat(filePath);
        
        if (stats.mtime < cutoffDate) {
          await fs.promises.rm(filePath, { recursive: true, force: true });
          deletedCount++;
          logInfo('Deleted old backup', { file });
        }
      }

      logInfo('Backup cleanup completed', { deletedCount });

    } catch (error) {
      logError('Backup cleanup failed', error);
    }
  }

  async listBackups(): Promise<any[]> {
    try {
      const files = await fs.promises.readdir(this.config.backupPath);
      const backups = [];

      for (const file of files) {
        const filePath = path.join(this.config.backupPath, file);
        const stats = await fs.promises.stat(filePath);
        
        backups.push({
          name: file,
          path: filePath,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime,
          isDirectory: stats.isDirectory()
        });
      }

      return backups.sort((a, b) => b.created.getTime() - a.created.getTime());

    } catch (error) {
      logError('Failed to list backups', error);
      return [];
    }
  }

  private parseDailySchedule(schedule: string): { hour: number; minute: number } {
    const [minutePart, hourPart] = schedule.split(' ');
    const minute = Number.parseInt(minutePart, 10);
    const hour = Number.parseInt(hourPart, 10);
    if (Number.isNaN(minute) || Number.isNaN(hour)) {
      return { hour: 2, minute: 0 };
    }
    return {
      hour: Math.max(0, Math.min(23, hour)),
      minute: Math.max(0, Math.min(59, minute))
    };
  }

  startScheduledBackups(): void {
    if (this.cronJob) {
      clearInterval(this.cronJob);
    }

    const { hour, minute } = this.parseDailySchedule(this.config.schedule);
    let lastRunDateKey = '';

    this.cronJob = setInterval(async () => {
      const now = new Date();
      const dateKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
      if (now.getHours() !== hour || now.getMinutes() !== minute || lastRunDateKey === dateKey) {
        return;
      }

      lastRunDateKey = dateKey;
      logInfo('Starting scheduled backup');

      try {
        const result = await this.createBackup();

        if (result.success) {
          logInfo('Scheduled backup completed successfully');
          await this.cleanupOldBackups();
        } else {
          logError('Scheduled backup failed', { error: result.error });
          if (this.config.notifyOnFailure) {
            logWarn('Backup notification would be sent here');
          }
        }
      } catch (error) {
        logError('Scheduled backup encountered an error', error);
      }
    }, 60 * 1000);

    logInfo('Scheduled backups started', { schedule: this.config.schedule });
  }

  stopScheduledBackups(): void {
    if (this.cronJob) {
      clearInterval(this.cronJob);
      this.cronJob = null;
      logInfo('Scheduled backups stopped');
    }
  }

  private formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}

// Create singleton instance
const backupService = new DatabaseBackupService({
  schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
  retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '7'),
  backupPath: process.env.BACKUP_PATH || path.join(__dirname, '../../backups'),
  compress: process.env.BACKUP_COMPRESS !== 'false',
  notifyOnFailure: process.env.BACKUP_NOTIFY_FAILURE !== 'false'
});

export default backupService;
