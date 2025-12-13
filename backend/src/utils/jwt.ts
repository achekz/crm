import jwt from 'jsonwebtoken';
import { IUser } from '../types';

export const generateToken = (user: IUser): string => {
  const payload = { 
    id: user._id.toString(),
    email: user.email,
    role: user.role 
  };
  
  const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
  const expiresIn = process.env.JWT_EXPIRES_IN || '30d';
  
  // @ts-ignore - Ignoring TypeScript error for jwt.sign 
  return jwt.sign(payload, jwtSecret, { expiresIn });
};

export const verifyToken = (token: string): jwt.JwtPayload | string => {
  const jwtSecret = process.env.JWT_SECRET || 'your_jwt_secret_key_here';
  return jwt.verify(token, jwtSecret);
}; 