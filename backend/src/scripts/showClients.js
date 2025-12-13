// Load environment variables
require('dotenv').config();

const mongoose = require('mongoose');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_system', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function showClients() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('MongoDB URI:', process.env.MONGODB_URI || 'mongodb://localhost:27017/crm_system');
    
    // Wait for connection
    await mongoose.connection.asPromise();
    console.log('Connected to MongoDB successfully!');
    
    // Get the User model for clients
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    // Find all clients (users with role 'client')
    const clients = await User.find({ role: 'client' });
    console.log(`\n📊 Found ${clients.length} clients in the users collection:\n`);
    
    if (clients.length === 0) {
      console.log('❌ No clients found in the users collection.');
      console.log('💡 You may need to create some client users first.');
    } else {
      clients.forEach((client, index) => {
        console.log(`\n👤 Client #${index + 1}:`);
        console.log(`   ID: ${client._id}`);
        console.log(`   Name: ${client.name || 'N/A'}`);
        console.log(`   Email: ${client.email || 'N/A'}`);
        console.log(`   Phone: ${client.phone || 'N/A'}`);
        console.log(`   Company: ${client.company || 'N/A'}`);
        console.log(`   Address: ${client.address || 'N/A'}`);
        console.log(`   Role: ${client.role || 'N/A'}`);
        console.log(`   Created At: ${client.createdAt || 'N/A'}`);
        console.log(`   Updated At: ${client.updatedAt || 'N/A'}`);
        console.log(`   Avatar: ${client.avatar || 'N/A'}`);
        console.log('   ──────────────────────────────────────────────');
      });
    }
    
    // Also show the collections in the database
    console.log('\n📋 Collections in the database:');
    const collections = await mongoose.connection.db.listCollections().toArray();
    collections.forEach(collection => {
      console.log(`   - ${collection.name}`);
    });
    
  } catch (error) {
    console.error('❌ Error connecting to MongoDB:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run the script
showClients(); 