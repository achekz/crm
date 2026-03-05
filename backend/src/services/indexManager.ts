import mongoose from 'mongoose';
import { logInfo, logError } from '../utils/logger';

interface IndexConfig {
  collection: string;
  fields: Record<string, any>;
  options?: mongoose.IndexOptions;
  description: string;
}

export class DatabaseIndexManager {
  private indexes: IndexConfig[] = [
    // User indexes
    {
      collection: 'users',
      fields: { email: 1 },
      options: { unique: true, background: true },
      description: 'Unique index on email for fast user lookup'
    },
    {
      collection: 'users',
      fields: { role: 1, isActive: 1 },
      options: { background: true },
      description: 'Compound index for role-based queries'
    },
    {
      collection: 'users',
      fields: { createdAt: -1 },
      options: { background: true },
      description: 'Index on creation date for sorting'
    },

    // Client indexes
    {
      collection: 'clients',
      fields: { userId: 1 },
      options: { background: true },
      description: 'Index on userId for client-user relationship'
    },
    {
      collection: 'clients',
      fields: { email: 1 },
      options: { background: true },
      description: 'Index on email for client lookup'
    },
    {
      collection: 'clients',
      fields: { status: 1, createdAt: -1 },
      options: { background: true },
      description: 'Compound index for status-based queries with sorting'
    },
    {
      collection: 'clients',
      fields: { company: 'text', contactName: 'text', email: 'text' },
      options: { background: true },
      description: 'Text index for client search functionality'
    },

    // Invoice indexes
    {
      collection: 'invoices',
      fields: { invoiceNumber: 1 },
      options: { unique: true, background: true },
      description: 'Unique index on invoice number'
    },
    {
      collection: 'invoices',
      fields: { clientId: 1, status: 1 },
      options: { background: true },
      description: 'Compound index for client invoice queries'
    },
    {
      collection: 'invoices',
      fields: { status: 1, dueDate: 1 },
      options: { background: true },
      description: 'Compound index for status and due date queries'
    },
    {
      collection: 'invoices',
      fields: { createdAt: -1 },
      options: { background: true },
      description: 'Index on creation date for invoice sorting'
    },
    {
      collection: 'invoices',
      fields: { amount: 1 },
      options: { background: true },
      description: 'Index on amount for financial queries'
    },

    // Payment indexes
    {
      collection: 'payments',
      fields: { invoiceId: 1 },
      options: { background: true },
      description: 'Index on invoiceId for payment lookup'
    },
    {
      collection: 'payments',
      fields: { clientId: 1, status: 1 },
      options: { background: true },
      description: 'Compound index for client payment queries'
    },
    {
      collection: 'payments',
      fields: { paidAt: -1 },
      options: { background: true },
      description: 'Index on payment date for sorting'
    },
    {
      collection: 'payments',
      fields: { method: 1 },
      options: { background: true },
      description: 'Index on payment method for filtering'
    },

    // Appointment indexes
    {
      collection: 'appointments',
      fields: { clientId: 1, date: 1, time: 1 },
      options: { background: true },
      description: 'Compound index for client appointment queries'
    },
    {
      collection: 'appointments',
      fields: { adminId: 1, date: 1, status: 1 },
      options: { background: true },
      description: 'Compound index for admin appointment management'
    },
    {
      collection: 'appointments',
      fields: { date: 1, time: 1 },
      options: { background: true },
      description: 'Compound index on date and time for scheduling'
    },
    {
      collection: 'appointments',
      fields: { status: 1, createdAt: -1 },
      options: { background: true },
      description: 'Compound index for status-based queries with sorting'
    },

    // Message indexes
    {
      collection: 'messages',
      fields: { senderId: 1, createdAt: -1 },
      options: { background: true },
      description: 'Compound index for sender message queries'
    },
    {
      collection: 'messages',
      fields: { receiverId: 1, isRead: 1, createdAt: -1 },
      options: { background: true },
      description: 'Compound index for receiver message queries'
    },
    {
      collection: 'messages',
      fields: { conversationId: 1, createdAt: 1 },
      options: { background: true },
      description: 'Compound index for conversation message retrieval'
    },

    // Integration indexes
    {
      collection: 'integrations',
      fields: { name: 1 },
      options: { unique: true, background: true },
      description: 'Unique index on integration name'
    },
    {
      collection: 'integrations',
      fields: { type: 1, status: 1 },
      options: { background: true },
      description: 'Compound index for integration type and status queries'
    },
    {
      collection: 'integrations',
      fields: { lastSync: -1 },
      options: { background: true },
      description: 'Index on last sync date for monitoring'
    }
  ];

  async createIndexes(): Promise<void> {
    logInfo('Starting database index creation');
    
    for (const indexConfig of this.indexes) {
      try {
        const collection = mongoose.connection.collection(indexConfig.collection);
        
        await collection.createIndex(indexConfig.fields, indexConfig.options);
        
        logInfo(`Created index: ${indexConfig.description}`, {
          collection: indexConfig.collection,
          fields: Object.keys(indexConfig.fields)
        });
        
      } catch (error) {
        logError(`Failed to create index for ${indexConfig.collection}`, error, {
          collection: indexConfig.collection,
          fields: Object.keys(indexConfig.fields)
        });
      }
    }
    
    logInfo('Database index creation completed');
  }

  async dropIndexes(): Promise<void> {
    logInfo('Starting database index cleanup');
    
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collectionInfo of collections) {
        const collection = mongoose.connection.collection(collectionInfo.name);
        const indexes = await collection.indexes();
        
        for (const index of indexes) {
          if (index.name !== '_id_') { // Don't drop the default _id index
            try {
              await collection.dropIndex(index.name);
              logInfo(`Dropped index: ${index.name}`, { collection: collectionInfo.name });
            } catch (error) {
              logError(`Failed to drop index ${index.name}`, error, {
                collection: collectionInfo.name
              });
            }
          }
        }
      }
      
      logInfo('Database index cleanup completed');
    } catch (error) {
      logError('Failed to drop indexes', error);
    }
  }

  async analyzeQueryPerformance(collectionName: string, query: any, explainOptions: any = {}): Promise<any> {
    try {
      const collection = mongoose.connection.collection(collectionName);
      const explanation = await collection.find(query).explain(explainOptions);
      
      logInfo(`Query analysis for ${collectionName}`, {
        query,
        executionStats: explanation.executionStats,
        indexUsage: explanation.executionStats?.totalDocsExamined,
        efficiency: explanation.executionStats?.totalDocsExamined / explanation.executionStats?.totalDocsReturned
      });
      
      return explanation;
    } catch (error) {
      logError(`Failed to analyze query performance for ${collectionName}`, error, { query });
      throw error;
    }
  }

  async getIndexStats(): Promise<any[]> {
    const stats: any[] = [];
    
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      
      for (const collectionInfo of collections) {
        const collection = mongoose.connection.collection(collectionInfo.name);
        const indexes = await collection.indexes();
        const stats = await collection.stats();
        
        stats.push({
          collection: collectionInfo.name,
          indexes: indexes.map(index => ({
            name: index.name,
            keys: index.key,
            size: index.sizes || 0,
            usage: index.usage || 'unknown'
          })),
          totalIndexSize: stats.totalIndexSize,
          indexSizes: stats.indexSizes
        });
      }
      
      return stats;
    } catch (error) {
      logError('Failed to get index statistics', error);
      return [];
    }
  }

  async optimizeIndexes(): Promise<void> {
    logInfo('Starting index optimization');
    
    try {
      const stats = await this.getIndexStats();
      
      for (const collectionStats of stats) {
        for (const index of collectionStats.indexes) {
          // Check if index is unused or inefficient
          if (index.usage === 'unused' || index.size > 1000000) { // 1MB threshold
            console.warn(`Potentially inefficient index detected`, {
              collection: collectionStats.collection,
              index: index.name,
              size: index.size
            });
          }
        }
      }
      
      logInfo('Index optimization analysis completed');
    } catch (error) {
      logError('Failed to optimize indexes', error);
    }
  }
}

// Create singleton instance
const indexManager = new DatabaseIndexManager();

export default indexManager;