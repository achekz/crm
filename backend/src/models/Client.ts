import mongoose, { Schema } from 'mongoose';

export interface IClient {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  city: string;
  country: string;
  createdAt: Date;
  lastActivity: Date;
  status: 'active' | 'inactive';
  totalInvoices: number;
  totalPaid: number;
  totalPending: number;
  userId?: mongoose.Types.ObjectId; // Reference to the User model
}

const clientSchema = new Schema<IClient>(
  {
    name: {
      type: String,
      required: [true, 'Please provide client name']
    },
    email: {
      type: String,
      required: [true, 'Please provide client email'],
      unique: true,
      lowercase: true
    },
    phone: {
      type: String
    },
    company: {
      type: String
    },
    address: {
      type: String
    },
    city: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: 'Tunisie'
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    totalInvoices: {
      type: Number,
      default: 0
    },
    totalPaid: {
      type: Number,
      default: 0
    },
    totalPending: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: Date.now
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true,
  }
);

// Create index for faster lookups by userId
clientSchema.index({ userId: 1 });

// Pre-save middleware to ensure required fields are set
clientSchema.pre('save', function(next) {
  // Ensure lastActivity is set
  if (!this.lastActivity) {
    this.lastActivity = new Date();
  }
  
  // Ensure numeric fields have default values
  if (this.totalInvoices === undefined || this.totalInvoices === null) {
    this.totalInvoices = 0;
  }
  if (this.totalPaid === undefined || this.totalPaid === null) {
    this.totalPaid = 0;
  }
  if (this.totalPending === undefined || this.totalPending === null) {
    this.totalPending = 0;
  }
  
  // Ensure status is set
  if (!this.status) {
    this.status = 'active';
  }
  
  next();
});

const Client = mongoose.model<IClient>('Client', clientSchema);

export default Client; 