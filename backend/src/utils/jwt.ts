import jwt from 'jsonwebtoken';
import { IUser } from '../types';

export const generateToken = (user: IUser): string => {
  const payload = { 
    id: user._id.toString(),
    email: user.email,
    role: user.role 
  };
  
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  
  const expiresIn = (process.env.JWT_EXPIRES_IN || '30d') as jwt.SignOptions['expiresIn'];
  return jwt.sign(payload, jwtSecret, { expiresIn });
};

export const verifyToken = (token: string): jwt.JwtPayload | string => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  return jwt.verify(token, jwtSecret);
}; 
