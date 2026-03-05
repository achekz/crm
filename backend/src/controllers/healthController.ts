import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import databaseConnection from '../config/database';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { AuthRequest } from '../types';
import { logInfo, logError, logDatabase } from '../utils/logger';
import fs from 'fs';
import path from 'path';
import os from 'os';

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy' | 'warning';
  message?: string;
  details?: any;
  responseTime?: number;
}

interface SystemMetrics {
  uptime: number;
  memory: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
  cpu: {
    loadAverage: number[];
    cores: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
    usagePercent: number;
  };
}

// Database health check
async function checkDatabaseHealth(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Check connection status
    const connectionStatus = databaseConnection.getConnectionStatus();
    
    if (!connectionStatus.isConnected) {
      return {
        name: 'database',
        status: 'unhealthy',
        message: 'Database connection lost',
        details: connectionStatus,
        responseTime: Date.now() - startTime
      };
    }

    // Perform detailed health check
    const healthCheck = await databaseConnection.healthCheck();
    
    if (healthCheck.status !== 'healthy') {
      return {
        name: 'database',
        status: 'unhealthy',
        message: healthCheck.details.error || 'Database health check failed',
        details: healthCheck.details,
        responseTime: Date.now() - startTime
      };
    }

    // Test a simple database operation
    const testStart = Date.now();
    await mongoose.connection.db.admin().ping();
    const dbResponseTime = Date.now() - testStart;

    logDatabase('health_check', 'admin', {}, { status: 'healthy' }, dbResponseTime);

    return {
      name: 'database',
      status: 'healthy',
      message: 'Database is operational',
      details: {
        ...healthCheck.details,
        responseTime: dbResponseTime
      },
      responseTime: Date.now() - startTime
    };

  } catch (error) {
    logError('Database health check failed', error);
    return {
      name: 'database',
      status: 'unhealthy',
      message: 'Database health check failed',
      details: { error: error instanceof Error ? error.message : String(error) },
      responseTime: Date.now() - startTime
    };
  }
}

// Memory health check
function checkMemoryHealth(): HealthCheck {
  const startTime = Date.now();
  
  try {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    let status: 'healthy' | 'unhealthy' | 'warning' = 'healthy';
    let message = 'Memory usage is normal';

    if (memoryUsagePercent > 90) {
      status = 'unhealthy';
      message = 'Critical memory usage detected';
    } else if (memoryUsagePercent > 80) {
      status = 'warning';
      message = 'High memory usage detected';
    }

    return {
      name: 'memory',
      status,
      message,
      details: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
        usagePercent: memoryUsagePercent
      },
      responseTime: Date.now() - startTime
    };

  } catch (error) {
    return {
      name: 'memory',
      status: 'unhealthy',
      message: 'Memory health check failed',
      details: { error: error instanceof Error ? error.message : String(error) },
      responseTime: Date.now() - startTime
    };
  }
}

// Disk space health check
function checkDiskHealth(): HealthCheck {
  const startTime = Date.now();
  
  try {
    const stats = fs.statSync('/');
    const totalSpace = 0; // This is a simplified check
    const freeSpace = 0;
    const usedSpace = 0;
    const usagePercent = 0;

    // In a real implementation, you'd use a proper disk space library
    // For now, we'll do a basic check
    const uploadsDir = path.join(__dirname, '../../uploads');
    let uploadsDirSize = 0;
    
    if (fs.existsSync(uploadsDir)) {
      const files = fs.readdirSync(uploadsDir);
      uploadsDirSize = files.length;
    }

    let status: 'healthy' | 'unhealthy' | 'warning' = 'healthy';
    let message = 'Disk space is adequate';

    // Simplified disk space check
    if (uploadsDirSize > 1000) { // More than 1000 files
      status = 'warning';
      message = 'Upload directory has many files';
    }

    return {
      name: 'disk',
      status,
      message,
      details: {
        uploadsDirSize,
        uploadsDir: uploadsDir
      },
      responseTime: Date.now() - startTime
    };

  } catch (error) {
    return {
      name: 'disk',
      status: 'unhealthy',
      message: 'Disk health check failed',
      details: { error: error instanceof Error ? error.message : String(error) },
      responseTime: Date.now() - startTime
    };
  }
}

// CPU health check
function checkCpuHealth(): HealthCheck {
  const startTime = Date.now();
  
  try {
    const loadAverage = os.loadavg();
    const cpuCount = os.cpus().length;
    
    // Normalize load average by CPU count
    const normalizedLoad = loadAverage[0] / cpuCount;
    
    let status: 'healthy' | 'unhealthy' | 'warning' = 'healthy';
    let message = 'CPU load is normal';

    if (normalizedLoad > 2.0) {
      status = 'unhealthy';
      message = 'Critical CPU load detected';
    } else if (normalizedLoad > 1.5) {
      status = 'warning';
      message = 'High CPU load detected';
    }

    return {
      name: 'cpu',
      status,
      message,
      details: {
        loadAverage: loadAverage,
        cores: cpuCount,
        normalizedLoad: normalizedLoad
      },
      responseTime: Date.now() - startTime
    };

  } catch (error) {
    return {
      name: 'cpu',
      status: 'unhealthy',
      message: 'CPU health check failed',
      details: { error: error instanceof Error ? error.message : String(error) },
      responseTime: Date.now() - startTime
    };
  }
}

// Application health check
function checkApplicationHealth(): HealthCheck {
  const startTime = Date.now();
  
  try {
    const uptime = process.uptime();
    const memoryUsage = process.memoryUsage();
    
    let status: 'healthy' | 'unhealthy' | 'warning' = 'healthy';
    let message = 'Application is running normally';

    // Check for memory leaks (simplified)
    if (memoryUsage.heapUsed > 500 * 1024 * 1024) { // 500MB
      status = 'warning';
      message = 'High memory usage detected';
    }

    // Check uptime (should be reasonable)
    if (uptime < 60) { // Less than 1 minute
      status = 'warning';
      message = 'Application recently started';
    }

    return {
      name: 'application',
      status,
      message,
      details: {
        uptime: uptime,
        memoryUsage: memoryUsage,
        nodeVersion: process.version,
        pid: process.pid,
        platform: process.platform,
        arch: process.arch
      },
      responseTime: Date.now() - startTime
    };

  } catch (error) {
    return {
      name: 'application',
      status: 'unhealthy',
      message: 'Application health check failed',
      details: { error: error instanceof Error ? error.message : String(error) },
      responseTime: Date.now() - startTime
    };
  }
}

// Get system metrics
function getSystemMetrics(): SystemMetrics {
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  
  return {
    uptime: os.uptime(),
    memory: {
      total: totalMemory,
      free: freeMemory,
      used: usedMemory,
      usagePercent: (usedMemory / totalMemory) * 100
    },
    cpu: {
      loadAverage: os.loadavg(),
      cores: os.cpus().length
    },
    disk: {
      total: 0, // Would need proper disk space library
      free: 0,
      used: 0,
      usagePercent: 0
    }
  };
}

// Main health check endpoint
export const getHealthStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const startTime = Date.now();
    
    // Perform all health checks in parallel
    const [database, memory, disk, cpu, application] = await Promise.all([
      checkDatabaseHealth(),
      checkMemoryHealth(),
      checkDiskHealth(),
      checkCpuHealth(),
      checkApplicationHealth()
    ]);

    const checks = [database, memory, disk, cpu, application];
    
    // Determine overall status
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
    const hasWarning = checks.some(check => check.status === 'warning');
    
    let overallStatus: 'healthy' | 'unhealthy' | 'warning';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasWarning) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'healthy';
    }

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: Date.now() - startTime,
      checks: {
        database,
        memory,
        disk,
        cpu,
        application
      },
      system: getSystemMetrics()
    };

    // Log health check results
    logInfo('Health check completed', {
      overallStatus,
      responseTime: response.responseTime,
      checks: checks.map(c => ({ name: c.name, status: c.status }))
    });

    // Return appropriate HTTP status code
    const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
    
    sendSuccessResponse(res, response, 'Health check completed', httpStatus);
    
  } catch (error) {
    logError('Health check failed', error);
    next(new AppError('Health check failed', 500));
  }
};

// Database-specific health check
export const getDatabaseHealth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const healthCheck = await checkDatabaseHealth();
    
    const httpStatus = healthCheck.status === 'unhealthy' ? 503 : 200;
    
    sendSuccessResponse(res, healthCheck, 'Database health check completed', httpStatus);
    
  } catch (error) {
    logError('Database health check failed', error);
    next(new AppError('Database health check failed', 500));
  }
};

// System health check
export const getSystemHealth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const memory = checkMemoryHealth();
    const disk = checkDiskHealth();
    const cpu = checkCpuHealth();
    const application = checkApplicationHealth();
    
    const checks = [memory, disk, cpu, application];
    
    // Determine overall status
    const hasUnhealthy = checks.some(check => check.status === 'unhealthy');
    const hasWarning = checks.some(check => check.status === 'warning');
    
    let overallStatus: 'healthy' | 'unhealthy' | 'warning';
    if (hasUnhealthy) {
      overallStatus = 'unhealthy';
    } else if (hasWarning) {
      overallStatus = 'warning';
    } else {
      overallStatus = 'healthy';
    }

    const response = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks: {
        memory,
        disk,
        cpu,
        application
      },
      system: getSystemMetrics()
    };

    const httpStatus = overallStatus === 'unhealthy' ? 503 : 200;
    
    sendSuccessResponse(res, response, 'System health check completed', httpStatus);
    
  } catch (error) {
    logError('System health check failed', error);
    next(new AppError('System health check failed', 500));
  }
};