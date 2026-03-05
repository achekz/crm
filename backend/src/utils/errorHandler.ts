import { Response } from 'express';
import { ApiResponse } from '../types';

// Custom error class for API errors
export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Send error response
export const sendErrorResponse = (res: Response, err: AppError | Error): Response => {
  // Operational, trusted error: send message to client
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      success: false,
      message: err.message,
      error: err
    });
  }

  if ((err as any).name === 'ValidationError') {
    return res.status(400).json({
      status: 'error',
      success: false,
      message: `Validation error: ${err.message}`,
      error: err
    });
  }

  if ((err as any).code === 11000) {
    return res.status(409).json({
      status: 'error',
      success: false,
      message: 'Duplicate field value error',
      error: err
    });
  }
  
  // Programming or other unknown error: don't leak error details
  console.error('ERROR 💥', err);
  return res.status(500).json({
    status: 'error',
    success: false,
    message: 'Something went wrong',
    error: process.env.NODE_ENV === 'development' ? err : undefined
  });
};

// Send success response
export const sendSuccessResponse = <T>(
  res: Response, 
  data: T, 
  message = 'Success',
  statusCode = 200
): Response => {
  const response: ApiResponse<T> = {
    status: 'success',
    success: true,
    message,
    data
  };
  
  return res.status(statusCode).json(response);
}; 

// Add this error check for request entity too large

export const handleLargeRequestError = (err: any, req: any, res: any, next: any) => {
  if (err.type === 'entity.too.large') {
    return sendErrorResponse(res, new AppError('Request entity too large. Image files should be smaller than 5MB.', 413));
  }
  next(err);
}; 
