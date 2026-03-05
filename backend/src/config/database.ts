import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logError, logInfo, logDatabase } from '../utils/logger';
import indexManager from '../services/indexManager';

dotenv.config();

interface ConnectionOptions {
  maxRetries: number;
  retryDelay: number;
  timeout: number;
}

const DEFAULT_OPTIONS: ConnectionOptions = {
  maxRetries: 5,
  retryDelay: 5000, // 5 seconds
  timeout: 30000, // 30 seconds
};

class DatabaseConnection {
  private retryCount = 0;
  private isConnected = false;
  private connectionOptions: ConnectionOptions;

  constructor(options: Partial<ConnectionOptions> = {}) {
    this.connectionOptions = { ...DEFAULT_OPTIONS, ...options };
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Connection events
    mongoose.connection.on('connected', () => {
      this.isConnected = true;
      this.retryCount = 0;
      logInfo('MongoDB connected successfully', {
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        database: mongoose.connection.name,
      });
    });

    mongoose.connection.on('disconnected', () => {
      this.isConnected = false;
      logError('MongoDB disconnected');
    });

    mongoose.connection.on('error', (error) => {
      this.isConnected = false;
      logError('MongoDB connection error', error);
    });

    mongoose.connection.on('reconnected', () => {
      this.isConnected = true;
      logInfo('MongoDB reconnected successfully');
    });

    mongoose.connection.on('timeout', () => {
      logError('MongoDB connection timeout');
    });

    mongoose.connection.on('close', () => {
      this.isConnected = false;
      logInfo('MongoDB connection closed');
    });
  }

  async connect(): Promise<void> {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';
    
    logInfo('Attempting to connect to MongoDB', {
      uri: mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//****:****@'), // Hide credentials
      retryCount: this.retryCount,
    });

    try {
      const mongooseOptions: mongoose.ConnectOptions = {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: this.connectionOptions.timeout,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        retryWrites: true,
        w: 'majority',
      };

      await mongoose.connect(mongoURI, mongooseOptions);
      
      // Test the connection
      await this.testConnection();
      
      logInfo('MongoDB connection established successfully');
      
      // Create indexes after successful connection
      try {
        await indexManager.createIndexes();
      } catch (indexError) {
        logError('Failed to create database indexes', indexError);
        // Don't fail the connection if indexes can't be created
      }
      
    } catch (error) {
      this.retryCount++;
      
      if (this.retryCount <= this.connectionOptions.maxRetries) {
        logError(`MongoDB connection attempt ${this.retryCount} failed, retrying in ${this.connectionOptions.retryDelay}ms`, error);
        
        await this.delay(this.connectionOptions.retryDelay);
        return this.connect();
      } else {
        logError('MongoDB connection failed after maximum retries', {
          maxRetries: this.connectionOptions.maxRetries,
          finalError: error instanceof Error ? error.message : String(error),
        });
        
        // Graceful shutdown
        this.handleConnectionFailure(error);
      }
    }
  }

  private async testConnection(): Promise<void> {
    try {
      // Perform a simple database operation to verify connection
      const admin = mongoose.connection.db.admin();
      const result = await admin.ping();
      
      if (!result.ok) {
        throw new Error('Database ping failed');
      }
      
      logInfo('MongoDB connection test successful');
    } catch (error) {
      logError('MongoDB connection test failed', error);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private handleConnectionFailure(error: any): void {
    logError('MongoDB connection failure - initiating graceful shutdown', error);
    
    // Attempt to close existing connections
    try {
      mongoose.connection.close();
    } catch (closeError) {
      logError('Error closing MongoDB connection during failure', closeError);
    }
    
    // Exit the process to allow container orchestrator to restart
    setTimeout(() => {
      process.exit(1);
    }, 5000); // Wait 5 seconds before exiting
  }

  async disconnect(): Promise<void> {
    try {
      await mongoose.connection.close();
      logInfo('MongoDB connection closed successfully');
    } catch (error) {
      logError('Error closing MongoDB connection', error);
      throw error;
    }
  }

  getConnectionStatus(): { isConnected: boolean; retryCount: number } {
    return {
      isConnected: this.isConnected,
      retryCount: this.retryCount,
    };
  }

  // Health check method
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (!this.isConnected) {
        return {
          status: 'unhealthy',
          details: { connected: false },
        };
      }

      const admin = mongoose.connection.db.admin();
      const serverStatus = await admin.serverStatus();
      
      return {
        status: 'healthy',
        details: {
          connected: true,
          host: mongoose.connection.host,
          port: mongoose.connection.port,
          database: mongoose.connection.name,
          version: serverStatus.version,
          uptime: serverStatus.uptime,
          connections: serverStatus.connections,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          connected: false,
          error: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }
}

// Create and export singleton instance
const databaseConnection = new DatabaseConnection();

export default databaseConnection;
