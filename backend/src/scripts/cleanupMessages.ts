import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Message from '../models/Message';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const cleanup = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully');

    // Delete messages created in the last 24 hours
    // This covers "recent messages" and the specific "hi" message if it was sent recently
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    console.log(`Deleting messages created after: ${oneDayAgo.toISOString()}`);

    const result = await Message.deleteMany({
      createdAt: { $gte: oneDayAgo }
    });

    console.log('Deletion result:', result);
    console.log(`Successfully deleted ${result.deletedCount} recent messages.`);

  } catch (error) {
    console.error('Error cleaning up messages:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

cleanup();
