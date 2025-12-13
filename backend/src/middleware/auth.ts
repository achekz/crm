import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errorHandler';
import { AuthRequest } from '../types';
import User from '../models/User';

// Protect routes - verify JWT token
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    console.log('🔐 Auth Middleware - Checking authentication for:', req.method, req.path);
    
    // 1) Get token from headers
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    console.log('🔐 Auth Middleware - Authorization header:', authHeader ? 'Present' : 'Missing');

    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
      console.log('🔐 Auth Middleware - Token extracted:', token ? 'Token exists' : 'No token');
    }

    // Check if token exists
    if (!token) {
      console.log('🔐 Auth Middleware - No token found, returning 401');
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    // 2) Verify token
    console.log('🔐 Auth Middleware - Verifying token...');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here') as jwt.JwtPayload;
    console.log('🔐 Auth Middleware - Token verified, user ID:', decoded.id);

    // 3) Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('🔐 Auth Middleware - User not found in database, returning 401');
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    console.log('🔐 Auth Middleware - User found:', user.email, 'Role:', user.role);

    // Grant access to protected route
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };
    
    console.log('🔐 Auth Middleware - Authentication successful, proceeding to route');
    next();
  } catch (error) {
    console.error('🔐 Auth Middleware - Authentication failed:', error);
    next(new AppError('Authentication failed. Please log in again.', 401));
  }
};

// Role-based authorization
export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    console.log('🔐 Role Middleware - Checking roles:', roles, 'User role:', req.user?.role);
    
    // Check if user exists on request
    if (!req.user) {
      console.log('🔐 Role Middleware - No user found, returning 401');
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }
    
    // Check if user has required role
    if (!roles.includes(req.user.role)) {
      console.log('🔐 Role Middleware - Insufficient permissions, returning 403');
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    console.log('🔐 Role Middleware - Authorization successful');
    next();
  };
}; 