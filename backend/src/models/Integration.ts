import mongoose, { Schema, Document } from 'mongoose';

export interface IIntegration extends Document {
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  type: 'payment' | 'email' | 'notification' | 'storage' | 'calendar' | 'crm';
  apiKey?: string;
  apiSecret?: string;
  webhookSecret?: string;
  config: Record<string, any>;
  lastSync: Date;
  requests: number;
  monthlyRequests: number;
  errorRate: number;
  averageResponseTime: number;
  createdAt: Date;
  updatedAt: Date;
}

const IntegrationSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'error'],
    default: 'inactive'
  },
  type: {
    type: String,
    enum: ['payment', 'email', 'notification', 'storage', 'calendar', 'crm'],
    required: true
  },
  apiKey: {
    type: String,
    select: false // Don't include in queries by default
  },
  apiSecret: {
    type: String,
    select: false
  },
  webhookSecret: {
    type: String,
    select: false
  },
  config: {
    type: Schema.Types.Mixed,
    default: {}
  },
  lastSync: {
    type: Date,
    default: Date.now
  },
  requests: {
    type: Number,
    default: 0
  },
  monthlyRequests: {
    type: Number,
    default: 0
  },
  errorRate: {
    type: Number,
    default: 0
  },
  averageResponseTime: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
IntegrationSchema.index({ type: 1, status: 1 });
IntegrationSchema.index({ name: 1 });

export default mongoose.model<IIntegration>('Integration', IntegrationSchema);