import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/errorHandler';
import { AuthRequest } from '../types';
import User from '../models/User';
import { logAuth, logError, logSecurity } from '../utils/logger';

// Protect routes - verify JWT token
export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    let token: string | undefined;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      logAuth('token_missing', undefined, undefined, false, 'No bearer token in authorization header');
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      logSecurity('jwt_secret_missing', 'critical', { path: req.path, method: req.method });
      return next(new AppError('Server configuration error', 500));
    }

    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;
    const userId = decoded.id as string | undefined;
    if (!userId) {
      logAuth('token_invalid_payload', undefined, undefined, false, 'Missing user id in token payload');
      return next(new AppError('Authentication failed. Please log in again.', 401));
    }

    const user = await User.findById(userId);
    if (!user) {
      logAuth('user_not_found', userId, undefined, false, 'User does not exist');
      return next(new AppError('The user belonging to this token no longer exists.', 401));
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role
    };

    logAuth('authenticated', user._id.toString(), user.email, true);
    next();
  } catch (error) {
    logError('Authentication middleware failure', error, { path: req.path, method: req.method });
    next(new AppError('Authentication failed. Please log in again.', 401));
  }
};

// Role-based authorization
export const restrictTo = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      logAuth('authorization_missing_user', undefined, undefined, false, 'No user attached to request');
      return next(new AppError('You are not logged in. Please log in to get access.', 401));
    }

    if (!roles.includes(req.user.role)) {
      logSecurity('authorization_denied', 'medium', {
        requiredRoles: roles,
        userRole: req.user.role,
        userId: req.user.id,
      });
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
}; 
