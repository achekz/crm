import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Client from '../models/Client';
import Invoice from '../models/Invoice';
import Payment from '../models/Payment';
import Appointment from '../models/Appointment';
import Message from '../models/Message';
import User from '../models/User';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { AuthRequest } from '../types';

// Get comprehensive dashboard statistics
export const getDashboardStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const userId = req.user.id;
    const userRole = req.user.role;

    let clientMatch = {};
    let invoiceMatch = {};
    let paymentMatch = {};

    if (userRole === 'client') {
      const client = await User.findOne({ email: req.user.email, role: 'client' });
      if (!client) {
        return next(new AppError('Client profile not found', 404));
      }
      clientMatch = { _id: client._id };
      invoiceMatch = { clientId: client._id };
      paymentMatch = { clientId: client._id };
    }

    // Get current date and date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    // Client statistics
    const clientStats = await User.aggregate([
      { $match: { role: 'client', ...clientMatch } },
      {
        $group: {
          _id: null,
          totalClients: { $sum: 1 },
          activeClients: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ]);

    // Invoice statistics
    const invoiceStats = await Invoice.aggregate([
      { $match: invoiceMatch },
      {
        $group: {
          _id: null,
          totalInvoices: { $sum: 1 },
          totalAmount: { $sum: '$total' },
          paidAmount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paid'] }, '$total', 0]
            }
          },
          pendingAmount: {
            $sum: {
              $cond: [{ $in: ['$status', ['sent', 'partial']] }, '$total', 0]
            }
          }
        }
      }
    ]);

    // Monthly invoice trend
    const monthlyInvoiceTrend = await Invoice.aggregate([
      { $match: { ...invoiceMatch, date: { $gte: startOfYear } } },
      {
        $group: {
          _id: { month: { $month: '$date' }, year: { $year: '$date' } },
          count: { $sum: 1 },
          total: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Payment statistics
    const paymentStats = await Payment.aggregate([
      { $match: { ...paymentMatch, date: { $gte: startOfMonth } } },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentInvoices = await Invoice.find({ ...invoiceMatch, createdAt: { $gte: thirtyDaysAgo } })
      .populate('clientId', 'name email')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentPayments = await Payment.find({ ...paymentMatch, date: { $gte: thirtyDaysAgo } })
      .populate('clientId', 'name email')
      .sort({ date: -1 })
      .limit(5);

    // Appointment statistics
    const appointmentStats = await Appointment.aggregate([
      { $match: { date: { $gte: now } } },
      {
        $group: {
          _id: null,
          totalAppointments: { $sum: 1 },
          scheduledAppointments: {
            $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] }
          }
        }
      }
    ]);

    // Message statistics
    const messageStats = await Message.aggregate([
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          unreadMessages: {
            $sum: { $cond: [{ $eq: ['$read', false] }, 1, 0] }
          }
        }
      }
    ]);

    const dashboardData = {
      clients: {
        total: clientStats[0]?.totalClients || 0,
        active: clientStats[0]?.activeClients || 0
      },
      invoices: {
        total: invoiceStats[0]?.totalInvoices || 0,
        totalAmount: invoiceStats[0]?.totalAmount || 0,
        paidAmount: invoiceStats[0]?.paidAmount || 0,
        pendingAmount: invoiceStats[0]?.pendingAmount || 0
      },
      payments: {
        monthlyTotal: paymentStats[0]?.totalAmount || 0,
        monthlyCount: paymentStats[0]?.totalPayments || 0
      },
      appointments: {
        total: appointmentStats[0]?.totalAppointments || 0,
        scheduled: appointmentStats[0]?.scheduledAppointments || 0
      },
      messages: {
        total: messageStats[0]?.totalMessages || 0,
        unread: messageStats[0]?.unreadMessages || 0
      },
      monthlyInvoiceTrend: monthlyInvoiceTrend.map(item => ({
        month: item._id.month,
        year: item._id.year,
        count: item.count,
        total: item.total
      })),
      recentActivity: {
        invoices: recentInvoices.map(invoice => ({
          id: invoice._id,
          number: invoice.number,
          clientName: invoice.clientId && typeof invoice.clientId === 'object' ? (invoice.clientId as any).name : 'Unknown',
          amount: invoice.total,
          status: invoice.status,
          date: invoice.date
        })),
        payments: recentPayments.map(payment => ({
          id: payment._id,
          clientName: payment.clientId && typeof payment.clientId === 'object' ? (payment.clientId as any).name : 'Unknown',
          amount: payment.amount,
          method: payment.method,
          date: payment.date
        }))
      }
    };

    sendSuccessResponse(res, dashboardData, 'Dashboard statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get financial reports
export const getFinancialReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { startDate, endDate, groupBy = 'month' } = req.query;

    let dateMatch: any = {};
    if (startDate && endDate) {
      dateMatch = {
        date: {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        }
      };
    }

    // Revenue by period
    const revenueByPeriod = await Invoice.aggregate([
      { $match: { status: { $in: ['paid', 'partial'] }, ...dateMatch } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            ...(groupBy === 'day' && { day: { $dayOfMonth: '$date' } })
          },
          revenue: { $sum: '$total' },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Outstanding invoices
    const outstandingInvoices = await Invoice.aggregate([
      { $match: { status: { $in: ['sent', 'partial'] } } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      }
    ]);

    // Payment methods analysis
    const paymentMethods = await Payment.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: '$method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Top clients by revenue
    const topClients = await Invoice.aggregate([
      { $match: { status: { $in: ['paid', 'partial'] } } },
      {
        $group: {
          _id: '$clientId',
          totalRevenue: { $sum: '$total' },
          invoiceCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'client'
        }
      },
      { $unwind: '$client' }
    ]);

    const financialData = {
      revenueByPeriod: revenueByPeriod.map(item => ({
        period: item._id,
        revenue: item.revenue,
        invoiceCount: item.invoiceCount
      })),
      outstandingInvoices: outstandingInvoices.map(item => ({
        status: item._id,
        count: item.count,
        totalAmount: item.totalAmount
      })),
      paymentMethods: paymentMethods.map(item => ({
        method: item._id,
        count: item.count,
        totalAmount: item.totalAmount
      })),
      topClients: topClients.map(item => ({
        clientName: item.client.name,
        clientEmail: item.client.email,
        totalRevenue: item.totalRevenue,
        invoiceCount: item.invoiceCount
      }))
    };

    sendSuccessResponse(res, financialData, 'Financial reports retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get client reports
export const getClientReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    // Client acquisition by month
    const clientAcquisition = await User.aggregate([
      { $match: { role: 'client' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          newClients: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Client activity analysis
    const clientActivity = await User.aggregate([
      { $match: { role: 'client' } },
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'clientId',
          as: 'invoices'
        }
      },
      {
        $lookup: {
          from: 'appointments',
          localField: '_id',
          foreignField: 'clientId',
          as: 'appointments'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          createdAt: 1,
          invoiceCount: { $size: '$invoices' },
          totalSpent: { $sum: '$invoices.total' },
          lastInvoiceDate: { $max: '$invoices.date' },
          appointmentCount: { $size: '$appointments' },
          lastAppointmentDate: { $max: '$appointments.date' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 20 }
    ]);

    // Client retention analysis
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const retentionAnalysis = await User.aggregate([
      { $match: { role: 'client' } },
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'clientId',
          as: 'invoices'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          createdAt: 1,
          lastActivity: { $max: '$invoices.date' },
          totalInvoices: { $size: '$invoices' }
        }
      },
      {
        $addFields: {
          daysSinceLastActivity: {
            $cond: [
              { $ifNull: ['$lastActivity', false] },
              { $divide: [{ $subtract: [new Date(), '$lastActivity'] }, 24 * 60 * 60 * 1000] },
              { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 24 * 60 * 60 * 1000] }]
          }
        }
      },
      {
        $group: {
          _id: null,
          activeClients: {
            $sum: { $cond: [{ $lte: ['$daysSinceLastActivity', 30] }, 1, 0] }
          },
          atRiskClients: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$daysSinceLastActivity', 30] }, { $lte: ['$daysSinceLastActivity', 90] }] },
                1,
                0
              ]
            }
          },
          inactiveClients: {
            $sum: { $cond: [{ $gt: ['$daysSinceLastActivity', 90] }, 1, 0] }
          }
        }
      }
    ]);

    const clientData = {
      acquisition: clientAcquisition.map(item => ({
        month: item._id.month,
        year: item._id.year,
        newClients: item.newClients
      })),
      activity: clientActivity.map(item => ({
        name: item.name,
        email: item.email,
        createdAt: item.createdAt,
        invoiceCount: item.invoiceCount,
        totalSpent: item.totalSpent,
        lastInvoiceDate: item.lastInvoiceDate,
        appointmentCount: item.appointmentCount,
        lastAppointmentDate: item.lastAppointmentDate
      })),
      retention: retentionAnalysis[0] || {
        activeClients: 0,
        atRiskClients: 0,
        inactiveClients: 0
      }
    };

    sendSuccessResponse(res, clientData, 'Client reports retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get appointment reports
export const getAppointmentReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { startDate, endDate } = req.query;

    let dateMatch: any = {};
    if (startDate && endDate) {
      dateMatch = {
        date: {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        }
      };
    }

    // Appointments by type
    const appointmentsByType = await Appointment.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 }
        }
      }
    ]);

    // Appointments by status
    const appointmentsByStatus = await Appointment.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Appointments by month
    const appointmentsByMonth = await Appointment.aggregate([
      { $match: dateMatch },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Upcoming appointments
    const upcomingAppointments = await Appointment.find({
      date: { $gte: new Date() },
      status: 'scheduled'
    })
      .populate('clientId', 'name email')
      .populate('adminId', 'name email')
      .sort({ date: 1, time: 1 })
      .limit(10);

    const appointmentData = {
      byType: appointmentsByType.map(item => ({
        type: item._id,
        count: item.count
      })),
      byStatus: appointmentsByStatus.map(item => ({
        status: item._id,
        count: item.count
      })),
      byMonth: appointmentsByMonth.map(item => ({
        month: item._id.month,
        year: item._id.year,
        count: item.count
      })),
      upcoming: upcomingAppointments.map(apt => ({
        id: apt._id,
        title: apt.title,
        date: apt.date,
        time: apt.time,
        type: apt.type,
        clientName: apt.clientId && typeof apt.clientId === 'object' ? (apt.clientId as any).name : 'Unknown',
        adminName: apt.adminId && typeof apt.adminId === 'object' ? (apt.adminId as any).name : 'Unknown'
      }))
    };

    sendSuccessResponse(res, appointmentData, 'Appointment reports retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Export all reports
export const exportReports = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { type = 'pdf', reportType = 'all' } = req.query;

    // Get all report data
    const dashboardStats = await getDashboardStats(req, res, () => {});
    const financialReports = await getFinancialReports(req, res, () => {});
    const clientReports = await getClientReports(req, res, () => {});
    const appointmentReports = await getAppointmentReports(req, res, () => {});

    const fullReportData = {
      generatedAt: new Date(),
      dashboard: dashboardStats,
      financial: financialReports,
      clients: clientReports,
      appointments: appointmentReports
    };

    // For now, return JSON data
    // In a real implementation, you would generate PDF/Excel files
    sendSuccessResponse(res, fullReportData, 'Reports exported successfully');
  } catch (error) {
    next(error);
  }
};
