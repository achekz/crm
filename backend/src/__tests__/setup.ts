import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

config();

let mongoServer: MongoMemoryServer;

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_EXPIRES_IN = '1h';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';

// Global test setup
beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  
  await mongoose.connect(mongoUri);
  
  console.log('Test database connected');
});

// Global test teardown
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  
  console.log('Test database disconnected');
});

// Clean up between tests
beforeEach(async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
});

// Helper functions for tests
global.createAuthToken = (userId: string, role: string = 'client'): string => {
  return jwt.sign(
    { id: userId, userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
};

global.createRefreshToken = (userId: string): string => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN }
  );
};

// Extend global namespace
declare global {
  /* eslint-disable no-var */
  var createAuthToken: (userId: string, role?: string) => string;
  var createRefreshToken: (userId: string) => string;
  /* eslint-enable no-var */
}
