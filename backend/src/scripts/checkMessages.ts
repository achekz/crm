import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Message from '../models/Message';
import path from 'path';

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkMessages = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('MONGODB_URI not found in environment variables');
      process.exit(1);
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected successfully');

    // Get last 5 messages
    const messages = await Message.find().sort({ createdAt: -1 }).limit(5);
    
    console.log('Last 5 messages:');
    messages.forEach(msg => {
      console.log({
        id: msg._id,
        content: msg.content,
        createdAt: msg.createdAt,
        updatedAt: msg.updatedAt,
        type: typeof msg.createdAt
      });
    });

  } catch (error) {
    console.error('Error checking messages:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
};

checkMessages();
