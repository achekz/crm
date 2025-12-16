import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import validator from 'validator';
import { IUser } from '../types';

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'Please provide your email'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email']
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false // Don't include password in query results by default
    },
    name: {
      type: String,
      required: [true, 'Please provide your name']
    },
    role: {
      type: String,
      enum: ['admin', 'client'],
      default: 'client'
    },
    company: {
      type: String
    },
    phone: {
      type: String
    },
    address: {
      type: String
    },
    avatar: {
      type: String
    },
    dossier_number: {
      type: String
    },
    tax_number: {
      type: String
    },
    cnss: {
      type: String
    },
    nature: {
      type: String,
      enum: ['personne_physique', 'personne_morale']
    },
    regime_fiscal: {
      type: String,
      enum: ['regime_reel', 'regime_reel_simplifie', 'forfait_assiette', 'forfaitaire']
    },
    gerants: [{
      email: {
        type: String,
        required: true
      },
      phone: {
        type: String,
        required: true
      },
      'Nom gérant': {
        type: String
      }
    }],
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active'
    },
    googleCalendarTokens: {
      access_token: String,
      refresh_token: String,
      scope: String,
      token_type: String,
      expiry_date: Number
    }
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only run this function if password was modified
  if (!this.isModified('password')) return next();

  // Hash the password with a salt of 12
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare entered password with stored password
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model<IUser>('User', userSchema);

export default User; 