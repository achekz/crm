import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Appointment from '../models/Appointment';
import User from '../models/User';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { AuthRequest } from '../types';

// Map MongoDB document to frontend Appointment response
const mapAppointmentToResponse = (appointment: any) => {
  return {
    id: appointment._id.toString(),
    title: appointment.title,
    description: appointment.description,
    date: appointment.date.toISOString().split('T')[0],
    time: appointment.time,
    duration: appointment.duration,
    type: appointment.type,
    status: appointment.status,
    clientId: appointment.clientId.toString(),
    adminId: appointment.adminId.toString(),
    location: appointment.location,
    meetingUrl: appointment.meetingUrl,
    notes: appointment.notes,
    reminderSent: appointment.reminderSent,
    createdAt: appointment.createdAt,
    updatedAt: appointment.updatedAt
  };
};

// Get all appointments (admin) or user's appointments (client)
export const getAllAppointments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    let appointments;
    
    if (req.user.role === 'admin') {
      // Admin can see all appointments
      appointments = await Appointment.find()
        .populate('clientId', 'name email')
        .populate('adminId', 'name email')
        .sort({ date: -1, time: -1 });
    } else {
      // Client can only see their own appointments
      const client = await User.findOne({ email: req.user.email, role: 'client' });
      if (!client) {
        return next(new AppError('Client profile not found', 404));
      }
      
      appointments = await Appointment.find({ clientId: client._id })
        .populate('adminId', 'name email')
        .sort({ date: -1, time: -1 });
    }

    const appointmentResponses = appointments.map(mapAppointmentToResponse);

    sendSuccessResponse(res, appointmentResponses, 'Appointments retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get appointment by ID
export const getAppointmentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid appointment ID', 400));
    }

    const appointment = await Appointment.findById(id)
      .populate('clientId', 'name email')
      .populate('adminId', 'name email');
    
    if (!appointment) {
      return next(new AppError('Appointment not found', 404));
    }

    // Check if user has access to this appointment
    if (req.user.role !== 'admin') {
      const client = await User.findOne({ email: req.user.email, role: 'client' });
      if (!client || !appointment.clientId.equals(client._id)) {
        return next(new AppError('Not authorized to access this appointment', 403));
      }
    }

    sendSuccessResponse(res, mapAppointmentToResponse(appointment), 'Appointment retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Create new appointment
export const createAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { title, description, date, time, duration, type, clientId, location, meetingUrl, notes } = req.body;

    // Validate required fields
    if (!title || !date || !time || !type) {
      return next(new AppError('Title, date, time, and type are required', 400));
    }

    // Validate date is not in the past
    const appointmentDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDate < today) {
      return next(new AppError('Appointment date cannot be in the past', 400));
    }

    let clientObjectId;
    let adminObjectId;

    if (req.user.role === 'admin') {
      // Admin creating appointment for a client
      if (!clientId) {
        return next(new AppError('Client ID is required when creating appointment as admin', 400));
      }
      
      if (!mongoose.Types.ObjectId.isValid(clientId)) {
        return next(new AppError('Invalid client ID', 400));
      }

      const client = await User.findOne({ _id: clientId, role: 'client' });
      if (!client) {
        return next(new AppError('Client not found', 404));
      }
      
      clientObjectId = client._id;
      adminObjectId = req.user.id;
    } else {
      // Client creating appointment for themselves
      const client = await User.findOne({ email: req.user.email, role: 'client' });
      if (!client) {
        return next(new AppError('Client profile not found', 404));
      }
      
      clientObjectId = client._id;
      
      // For client-created appointments, we'll assign to the first admin
      const admin = await User.findOne({ role: 'admin' });
      if (!admin) {
        return next(new AppError('No admin available to assign appointment', 500));
      }
      
      adminObjectId = admin._id;
    }

    // Check for conflicting appointments
    const conflictingAppointment = await Appointment.findOne({
      adminId: adminObjectId,
      date: appointmentDate,
      time: time,
      status: { $in: ['scheduled', 'rescheduled'] }
    });

    if (conflictingAppointment) {
      return next(new AppError('Time slot is already booked', 409));
    }

    const appointment = new Appointment({
      title,
      description,
      date: appointmentDate,
      time,
      duration: duration || 60,
      type,
      status: 'scheduled',
      clientId: clientObjectId,
      adminId: adminObjectId,
      location,
      meetingUrl,
      notes
    });

    await appointment.save();

    // Populate the created appointment
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('clientId', 'name email')
      .populate('adminId', 'name email');

    sendSuccessResponse(res, mapAppointmentToResponse(populatedAppointment), 'Appointment created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Update appointment
export const updateAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;
    const { title, description, date, time, duration, type, status, location, meetingUrl, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid appointment ID', 400));
    }

    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      return next(new AppError('Appointment not found', 404));
    }

    // Check if user has permission to update this appointment
    if (req.user.role !== 'admin') {
      const client = await User.findOne({ email: req.user.email, role: 'client' });
      if (!client || !appointment.clientId.equals(client._id)) {
        return next(new AppError('Not authorized to update this appointment', 403));
      }
    }

    // Validate date if provided
    if (date) {
      const appointmentDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (appointmentDate < today) {
        return next(new AppError('Appointment date cannot be in the past', 400));
      }
    }

    // Check for conflicts if date or time is being changed
    if ((date || time) && status !== 'cancelled') {
      const checkDate = date ? new Date(date) : appointment.date;
      const checkTime = time || appointment.time;
      
      const conflictingAppointment = await Appointment.findOne({
        _id: { $ne: appointment._id },
        adminId: appointment.adminId,
        date: checkDate,
        time: checkTime,
        status: { $in: ['scheduled', 'rescheduled'] }
      });

      if (conflictingAppointment) {
        return next(new AppError('Time slot is already booked', 409));
      }
    }

    // Update fields
    if (title) appointment.title = title;
    if (description !== undefined) appointment.description = description;
    if (date) appointment.date = new Date(date);
    if (time) appointment.time = time;
    if (duration) appointment.duration = duration;
    if (type) appointment.type = type;
    if (status) appointment.status = status;
    if (location !== undefined) appointment.location = location;
    if (meetingUrl !== undefined) appointment.meetingUrl = meetingUrl;
    if (notes !== undefined) appointment.notes = notes;

    await appointment.save();

    // Populate the updated appointment
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('clientId', 'name email')
      .populate('adminId', 'name email');

    sendSuccessResponse(res, mapAppointmentToResponse(populatedAppointment), 'Appointment updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete appointment
export const deleteAppointment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid appointment ID', 400));
    }

    const appointment = await Appointment.findById(id);
    
    if (!appointment) {
      return next(new AppError('Appointment not found', 404));
    }

    // Check if user has permission to delete this appointment
    if (req.user.role !== 'admin') {
      const client = await User.findOne({ email: req.user.email, role: 'client' });
      if (!client || !appointment.clientId.equals(client._id)) {
        return next(new AppError('Not authorized to delete this appointment', 403));
      }
    }

    await Appointment.findByIdAndDelete(id);

    sendSuccessResponse(res, null, 'Appointment deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Get appointment statistics
export const getAppointmentStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    let matchStage: any = {};
    
    if (userRole === 'client') {
      const client = await User.findOne({ email: req.user.email, role: 'client' });
      if (!client) {
        return next(new AppError('Client profile not found', 404));
      }
      matchStage = { clientId: client._id };
    }

    const stats = await Appointment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalAppointments: { $sum: 1 },
          scheduledAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] }
          },
          completedAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          cancelledAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const typeStats = await Appointment.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    sendSuccessResponse(res, {
      overall: stats[0] || {
        totalAppointments: 0,
        scheduledAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0
      },
      byType: typeStats
    }, 'Appointment statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};