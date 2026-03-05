import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Appointment from '../models/Appointment';
import User from '../models/User';

dotenv.config();

const seedAppointments = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/crm');
    console.log('Connected to MongoDB');

    // Find admin and client users
    const admin = await User.findOne({ role: 'admin' });
    const client = await User.findOne({ role: 'client' });

    if (!admin || !client) {
      console.log('Admin or client user not found. Please run user seed script first.');
      return;
    }

    // Clear existing appointments
    await Appointment.deleteMany({});
    console.log('Cleared existing appointments');

    // Sample appointments data
    const appointments = [
      {
        title: 'Project Q1 Review',
        description: 'Review of Q1 project results and planning for Q2',
        date: new Date('2024-01-25'),
        time: '14:00',
        duration: 90,
        type: 'presential' as const,
        status: 'scheduled' as const,
        clientId: client._id,
        adminId: admin._id,
        location: 'Office Paris - Conference Room A'
      },
      {
        title: 'Monthly Follow-up',
        description: 'Monthly progress review on ongoing projects',
        date: new Date('2024-02-01'),
        time: '10:30',
        duration: 60,
        type: 'video' as const,
        status: 'scheduled' as const,
        clientId: client._id,
        adminId: admin._id,
        meetingUrl: 'https://zoom.us/j/123456789'
      },
      {
        title: 'Team Training Session',
        description: 'Training on new tools and processes',
        date: new Date('2024-01-15'),
        time: '09:00',
        duration: 120,
        type: 'presential' as const,
        status: 'completed' as const,
        clientId: client._id,
        adminId: admin._id,
        location: 'Training Center Lyon'
      },
      {
        title: 'Strategy Planning Call',
        description: 'Strategic planning discussion for upcoming quarter',
        date: new Date('2024-02-15'),
        time: '15:00',
        duration: 60,
        type: 'phone' as const,
        status: 'scheduled' as const,
        clientId: client._id,
        adminId: admin._id
      },
      {
        title: 'Product Demo',
        description: 'Demonstration of new product features',
        date: new Date('2024-01-30'),
        time: '11:00',
        duration: 45,
        type: 'video' as const,
        status: 'cancelled' as const,
        clientId: client._id,
        adminId: admin._id,
        meetingUrl: 'https://teams.microsoft.com/l/meetup-join/19%3a1234567890%40thread.tacv2/1234567890'
      }
    ];

    // Insert appointments
    await Appointment.insertMany(appointments);
    console.log('Seeded appointments successfully');

    // Show created appointments
    const createdAppointments = await Appointment.find({}).populate('clientId', 'name email').populate('adminId', 'name email');
    console.log('Created appointments:');
    createdAppointments.forEach(appointment => {
      console.log(`- ${appointment.title} (${appointment.type}): ${appointment.status} - ${appointment.date.toISOString().split('T')[0]} ${appointment.time}`);
    });

  } catch (error) {
    console.error('Error seeding appointments:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
};

// Run the seed function
if (require.main === module) {
  seedAppointments();
}

export default seedAppointments;