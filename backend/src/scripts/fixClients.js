const mongoose = require('mongoose');
const Client = require('../models/Client.ts');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixClients() {
  try {
    console.log('Starting client data fix...');
    console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_system');
    
    // Wait for connection
    await mongoose.connection.asPromise();
    console.log('Connected to MongoDB');
    
    // Find all clients
    const clients = await Client.find({});
    console.log(`Found ${clients.length} clients`);
    
    if (clients.length === 0) {
      console.log('No clients found in database. Creating a test client...');
      
      // Create a test client
      const testClient = new Client({
        name: 'Test Client',
        email: 'test@example.com',
        phone: '123456789',
        company: 'Test Company',
        address: 'Test Address',
        status: 'active',
        lastActivity: new Date(),
        totalInvoices: 0,
        totalPaid: 0,
        totalPending: 0
      });
      
      await testClient.save();
      console.log('Test client created successfully');
    }
    
    let fixedCount = 0;
    
    for (const client of clients) {
      console.log(`Checking client: ${client.name} (${client.email})`);
      let needsUpdate = false;
      
      // Check and fix lastActivity
      if (!client.lastActivity) {
        console.log(`  - Fixing lastActivity for ${client.name}`);
        client.lastActivity = new Date();
        needsUpdate = true;
      }
      
      // Check and fix numeric fields
      if (client.totalInvoices === undefined || client.totalInvoices === null) {
        console.log(`  - Fixing totalInvoices for ${client.name}`);
        client.totalInvoices = 0;
        needsUpdate = true;
      }
      
      if (client.totalPaid === undefined || client.totalPaid === null) {
        console.log(`  - Fixing totalPaid for ${client.name}`);
        client.totalPaid = 0;
        needsUpdate = true;
      }
      
      if (client.totalPending === undefined || client.totalPending === null) {
        console.log(`  - Fixing totalPending for ${client.name}`);
        client.totalPending = 0;
        needsUpdate = true;
      }
      
      // Check and fix status
      if (!client.status) {
        console.log(`  - Fixing status for ${client.name}`);
        client.status = 'active';
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        await client.save();
        fixedCount++;
        console.log(`  ✓ Fixed client: ${client.name} (${client.email})`);
      } else {
        console.log(`  ✓ Client ${client.name} is already correct`);
      }
    }
    
    console.log(`Fixed ${fixedCount} clients out of ${clients.length} total`);
    console.log('Client data fix completed successfully!');
    
  } catch (error) {
    console.error('Error fixing clients:', error);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed');
  }
}

// Run the fix
fixClients(); 