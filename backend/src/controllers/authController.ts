import { Request, Response, NextFunction } from 'express';
import User from '../models/User';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { generateToken } from '../utils/jwt';
import { AuthRequest, LoginResponse } from '../types';

// Register a new user
export const register = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { 
      email, 
      password, 
      name, 
      company, 
      role, 
      phone, 
      address, 
      avatar,
      dossier_number,
      tax_number,
      cnss,
      nature,
      regime_fiscal,
      gerants,
      status
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already in use', 400));
    }

    // Validate that regime_fiscal is only set for personne_physique
    if (regime_fiscal && nature !== 'personne_physique') {
      return next(new AppError('Régime fiscal can only be set for personne physique', 400));
    }

    // Validate gerants array
    if (gerants && Array.isArray(gerants)) {
      if (gerants.length === 0) {
        return next(new AppError('At least one gérant is required', 400));
      }
      // Validate each gerant has required fields
      for (const gerant of gerants) {
        if (!gerant.email || !gerant.phone) {
          return next(new AppError('Each gérant must have email and phone', 400));
        }
      }
    } else if (!gerants) {
      return next(new AppError('At least one gérant is required', 400));
    }

    // Create new user
    const user = await User.create({
      email,
      password,
      name,
      company,
      phone,
      address,
      avatar,
      dossier_number,
      tax_number,
      cnss,
      nature,
      regime_fiscal,
      gerants,
      status: status || 'active',
      // Always set role to 'client' for security
      // Admin users must be created manually or through a separate process
      role: 'client'
    });

    // Generate JWT token
    const token = generateToken(user);

    // Format response data
    const responseData: LoginResponse = {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company,
        phone: user.phone,
        address: user.address,
        avatar: user.avatar,
        dossier_number: user.dossier_number,
        tax_number: user.tax_number,
        cnss: user.cnss,
        nature: user.nature,
        regime_fiscal: user.regime_fiscal,
        gerants: user.gerants,
        status: user.status
      },
      token
    };

    sendSuccessResponse(res, responseData, 'Registration successful', 201);
  } catch (error) {
    next(error);
  }
};

// Login user
export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    // Check if email and password are provided
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email }).select('+password');
    
    // Check if user exists and password is correct
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Incorrect email or password', 401));
    }

    // Generate JWT token
    const token = generateToken(user);

    // Format response data
    const responseData: LoginResponse = {
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        role: user.role,
        company: user.company,
        avatar: user.avatar
      },
      token
    };

    sendSuccessResponse(res, responseData, 'Login successful');
  } catch (error) {
    next(error);
  }
};

// Get current user
export const getCurrentUser = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('You are not logged in', 401));
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    sendSuccessResponse(res, {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      company: user.company,
      phone: user.phone,
      address: user.address,
      avatar: user.avatar,
      dossier_number: user.dossier_number,
      tax_number: user.tax_number,
      cnss: user.cnss,
      nature: user.nature,
      regime_fiscal: user.regime_fiscal,
      gerants: user.gerants,
      status: user.status
    }, 'User details retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Update user profile
export const updateProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('You are not logged in', 401));
    }

    const { 
      name, 
      email, 
      company, 
      phone, 
      address,
      dossier_number,
      tax_number,
      cnss,
      nature,
      regime_fiscal,
      gerants,
      status
    } = req.body;

    // Check if email is unique if changed
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: req.user.id } });
      if (existingUser) {
        return next(new AppError('Email already in use', 400));
      }
    }

    // Validate that regime_fiscal is only set for personne_physique
    if (regime_fiscal && nature !== 'personne_physique') {
      return next(new AppError('Régime fiscal can only be set for personne physique', 400));
    }

    // Validate gerants array if provided
    if (gerants && Array.isArray(gerants)) {
      if (gerants.length === 0) {
        return next(new AppError('At least one gérant is required', 400));
      }
      // Validate each gerant has required fields
      for (const gerant of gerants) {
        if (!gerant.email || !gerant.phone) {
          return next(new AppError('Each gérant must have email and phone', 400));
        }
      }
    }

    const updateData: any = { 
      name, 
      email, 
      company, 
      phone, 
      address,
      dossier_number,
      tax_number,
      cnss,
      nature,
      regime_fiscal,
      gerants,
      status
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id, 
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return next(new AppError('User not found', 404));
    }

    sendSuccessResponse(res, {
      id: updatedUser._id.toString(),
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      company: updatedUser.company,
      phone: updatedUser.phone,
      address: updatedUser.address,
      avatar: updatedUser.avatar,
      dossier_number: updatedUser.dossier_number,
      tax_number: updatedUser.tax_number,
      cnss: updatedUser.cnss,
      nature: updatedUser.nature,
      regime_fiscal: updatedUser.regime_fiscal,
      gerants: updatedUser.gerants,
      status: updatedUser.status
    }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

// Update user avatar
export const updateAvatar = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('You are not logged in', 401));
    }

    // In a real implementation, we would handle the file upload
    // For now, we're just accepting a URL from the request
    const { avatar } = req.body;

    if (!avatar) {
      return next(new AppError('No avatar provided', 400));
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { avatar },
      { new: true }
    );

    if (!updatedUser) {
      return next(new AppError('User not found', 404));
    }

    sendSuccessResponse(res, {
      avatar: updatedUser.avatar
    }, 'Avatar updated successfully');
  } catch (error) {
    next(error);
  }
}; 

// Get all users with client role
export const getClientUsers = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to access client users', 403));
    }

    const clientUsers = await User.find({ role: 'client' });
    
    const formattedUsers = clientUsers.map(user => ({
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      company: user.company || '',
      phone: user.phone || '',
      address: user.address || '',
      role: user.role,
      avatar: user.avatar,
      dossier_number: user.dossier_number,
      tax_number: user.tax_number,
      cnss: user.cnss,
      nature: user.nature,
      regime_fiscal: user.regime_fiscal,
      gerants: user.gerants || [],
      status: user.status || 'active',
      createdAt: user.createdAt.toISOString().split('T')[0],
      lastActivity: user.updatedAt.toISOString().split('T')[0],
      totalInvoices: 0,  // These would need to be calculated from actual invoices
      totalPaid: 0,
      totalPending: 0
    }));

    sendSuccessResponse(res, formattedUsers, 'Client users retrieved successfully');
  } catch (error) {
    next(error);
  }
}; 