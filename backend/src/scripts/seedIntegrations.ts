import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Integration from '../models/Integration';

dotenv.config();

const seedIntegrations = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm');
    console.log('Connected to MongoDB');

    // Default integrations data
    const defaultIntegrations = [
      {
        name: 'Stripe',
        description: 'Online payment processing and financial services',
        status: 'active' as const,
        type: 'payment' as const,
        config: {
          publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
          currency: 'usd'
        },
        requests: 1247,
        monthlyRequests: 3421,
        errorRate: 0.5,
        averageResponseTime: 245
      },
      {
        name: 'SendGrid',
        description: 'Email delivery and marketing services',
        status: 'active' as const,
        type: 'email' as const,
        config: {
          apiKey: process.env.SENDGRID_API_KEY || '',
          fromEmail: 'noreply@yourdomain.com',
          templates: {
            welcome: 'd-welcome-template',
            invoice: 'd-invoice-template'
          }
        },
        requests: 892,
        monthlyRequests: 2156,
        errorRate: 0.2,
        averageResponseTime: 180
      },
      {
        name: 'Slack',
        description: 'Team communication and notifications',
        status: 'inactive' as const,
        type: 'notification' as const,
        config: {
          webhookUrl: process.env.SLACK_WEBHOOK_URL || '',
          channel: '#notifications',
          username: 'CRM Bot'
        },
        requests: 156,
        monthlyRequests: 423,
        errorRate: 1.2,
        averageResponseTime: 320
      },
      {
        name: 'Google Drive',
        description: 'Cloud storage and file management',
        status: 'active' as const,
        type: 'storage' as const,
        config: {
          clientId: process.env.GOOGLE_CLIENT_ID || '',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          folderId: 'root'
        },
        requests: 445,
        monthlyRequests: 1234,
        errorRate: 0.8,
        averageResponseTime: 290
      },
      {
        name: 'Google Calendar',
        description: 'Calendar synchronization and event management',
        status: 'active' as const,
        type: 'calendar' as const,
        config: {
          clientId: process.env.GOOGLE_CLIENT_ID || '',
          clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
          calendarId: 'primary'
        },
        requests: 678,
        monthlyRequests: 1890,
        errorRate: 0.3,
        averageResponseTime: 165
      }
    ];

    // Clear existing integrations
    await Integration.deleteMany({});
    console.log('Cleared existing integrations');

    // Insert default integrations
    await Integration.insertMany(defaultIntegrations);
    console.log('Seeded default integrations successfully');

    // Show created integrations
    const createdIntegrations = await Integration.find({});
    console.log('Created integrations:');
    createdIntegrations.forEach(integration => {
      console.log(`- ${integration.name} (${integration.type}): ${integration.status}`);
    });

  } catch (error) {
    console.error('Error seeding integrations:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the seed function
if (require.main === module) {
  seedIntegrations();
}

export default seedIntegrations;