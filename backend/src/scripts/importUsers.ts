import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

// Import User model
import '../models/User';
const User = mongoose.model('User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cmt-app');
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

// Function to import users from CSV
const importUsers = async () => {
  try {
    await connectDB();
    
    const results: any[] = [];
    const filePath = path.resolve(__dirname, '../..', 'users_tunisia.csv');
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        console.log(`Processing ${results.length} users...`);
        
        let imported = 0;
        let skipped = 0;
        
        for (const row of results) {
          try {
            // Check if user already exists
            const existingUser = await User.findOne({ email: row.email });
            
            if (existingUser) {
              console.log(`Skipping ${row.email} - already exists`);
              skipped++;
              continue;
            }
            
            // Hash the password
            const hashedPassword = await bcrypt.hash(row.password, 12);
            
            // Create new user
            await User.create({
              name: row.name,
              email: row.email,
              password: hashedPassword,
              company: row.company,
              role: row.role,
              avatar: row.avatar || undefined
            });
            
            console.log(`Imported ${row.email}`);
            imported++;
          } catch (error) {
            console.error(`Error importing ${row.email}:`, error);
          }
        }
        
        console.log(`Import completed: ${imported} users imported, ${skipped} users skipped`);
        process.exit(0);
      });
  } catch (error) {
    console.error('Import failed:', error);
    process.exit(1);
  }
};

// Run the import
importUsers(); 