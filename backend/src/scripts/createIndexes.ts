import mongoose from 'mongoose';
import dotenv from 'dotenv';
import indexManager from '../services/indexManager';
import { logInfo, logError } from '../utils/logger';

dotenv.config();

async function createIndexes() {
  try {
    logInfo('Starting database index creation process');
    
    // Connect to database
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/crm';
    await mongoose.connect(mongoUri);
    
    logInfo('Connected to database for index creation');
    
    // Create indexes
    await indexManager.createIndexes();
    
    // Get index statistics
    const stats = await indexManager.getIndexStats();
    logInfo('Index statistics', { stats });
    
    logInfo('Database index creation completed successfully');
    
  } catch (error) {
    logError('Database index creation failed', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    logInfo('Disconnected from database');
  }
}

// Run if called directly
if (require.main === module) {
  createIndexes();
}

export default createIndexes;