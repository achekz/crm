import winston from 'winston';
import path from 'path';

// Define log levels and their colors
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Add colors to winston
winston.addColors(logColors);

// Create logs directory if it doesn't exist
import fs from 'fs';
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console log format (colored)
const consoleLogFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info;
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: logFormat,
  defaultMeta: { service: 'crm-backend' },
  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // HTTP logs
    new winston.transports.File({
      filename: path.join(logsDir, 'http.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleLogFormat,
    level: 'debug',
  }));
}

// Create HTTP request logger
const httpLogger = winston.createLogger({
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({
      filename: path.join(logsDir, 'http.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  ],
});

// Add console transport for HTTP logs in development
if (process.env.NODE_ENV !== 'production') {
  httpLogger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

// Logger utility functions
export const logError = (message: string, error?: Error | any, meta?: any) => {
  logger.error(message, { error: error?.stack || error, ...meta });
};

export const logWarn = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};

export const logHttp = (message: string, meta?: any) => {
  httpLogger.http(message, meta);
};

const sanitizePayload = (payload: any): any => {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item));
  }

  if (typeof payload !== 'object') {
    return payload;
  }

  const redactedKeys = ['password', 'token', 'authorization', 'access_token', 'refresh_token', 'secret', 'api_key', 'apikey'];
  const sanitized: Record<string, any> = {};

  for (const [key, value] of Object.entries(payload)) {
    const normalizedKey = key.toLowerCase();
    const shouldRedact = redactedKeys.some((sensitiveKey) => normalizedKey.includes(sensitiveKey));
    sanitized[key] = shouldRedact ? '[REDACTED]' : sanitizePayload(value);
  }

  return sanitized;
};

// Database operation logger
export const logDatabase = (operation: string, collection: string, query?: any, result?: any, duration?: number) => {
  logger.info('Database operation', {
    operation,
    collection,
    query: query ? JSON.stringify(query) : undefined,
    resultCount: result ? (Array.isArray(result) ? result.length : 1) : 0,
    duration: duration ? `${duration}ms` : undefined,
  });
};

// Authentication logger
export const logAuth = (action: string, userId?: string, email?: string, success: boolean = true, reason?: string) => {
  const level = success ? 'info' : 'warn';
  logger[level]('Authentication event', {
    action,
    userId,
    email,
    success,
    reason,
  });
};

// Security event logger
export const logSecurity = (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any) => {
  const level = severity === 'critical' ? 'error' : severity === 'high' ? 'warn' : 'info';
  logger[level]('Security event', {
    event,
    severity,
    details,
  });
};

// Performance logger
export const logPerformance = (operation: string, duration: number, threshold: number = 1000) => {
  const level = duration > threshold ? 'warn' : 'info';
  logger[level]('Performance metric', {
    operation,
    duration: `${duration}ms`,
    threshold: `${threshold}ms`,
    exceeded: duration > threshold,
  });
};

// Request/Response logger middleware
export const requestLogger = (req: any, res: any, next: any) => {
  const start = Date.now();
  
  // Log incoming request
  logHttp('Incoming request', {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    contentType: req.get('Content-Type'),
    contentLength: req.get('Content-Length'),
  });

  // Override res.end to capture response
  const originalEnd = res.end;
  res.end = function(chunk: any) {
    const duration = Date.now() - start;
    
    logHttp('Request completed', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      contentLength: res.get('Content-Length'),
      ip: req.ip,
    });

    // Log slow requests
    if (duration > 5000) {
      logPerformance('Slow request', duration, 5000);
    }

    originalEnd.call(this, chunk);
  };

  next();
};

// Error logger middleware
export const errorLogger = (error: Error, req: any, res: any, next: any) => {
  const statusCode = (error as any)?.statusCode;
  const isHandledClientError = typeof statusCode === 'number' && statusCode >= 400 && statusCode < 500;
  const metadata = {
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: sanitizePayload(req.body),
    params: req.params,
    query: req.query,
    statusCode,
  };

  if (isHandledClientError) {
    logger.warn('Handled request error', {
      error: error.message,
      ...metadata,
    });
  } else {
    logError('Unhandled error', error, metadata);
  }
  
  next(error);
};

export default logger;
