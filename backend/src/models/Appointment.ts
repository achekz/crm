import mongoose, { Schema, Document } from 'mongoose';

export interface IAppointment extends Document {
  title: string;
  description?: string;
  date: Date;
  time: string;
  duration: number; // in minutes
  type: 'presential' | 'video' | 'phone';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  clientId: mongoose.Types.ObjectId;
  adminId: mongoose.Types.ObjectId;
  location?: string;
  meetingUrl?: string;
  notes?: string;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AppointmentSchema: Schema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  date: {
    type: Date,
    required: true
  },
  time: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true,
    default: 60 // Default 1 hour
  },
  type: {
    type: String,
    enum: ['presential', 'video', 'phone'],
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
    default: 'scheduled'
  },
  clientId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adminId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  location: {
    type: String,
    trim: true
  },
  meetingUrl: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  reminderSent: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
AppointmentSchema.index({ clientId: 1, date: 1 });
AppointmentSchema.index({ adminId: 1, date: 1 });
AppointmentSchema.index({ date: 1, status: 1 });
AppointmentSchema.index({ status: 1 });

export default mongoose.model<IAppointment>('Appointment', AppointmentSchema);