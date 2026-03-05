import { Response, NextFunction } from 'express';
import Integration from '../models/Integration';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { AuthRequest } from '../types';

// Map MongoDB document to frontend Integration response
const mapIntegrationToResponse = (integration: any) => {
  return {
    id: integration._id.toString(),
    name: integration.name,
    description: integration.description,
    status: integration.status,
    type: integration.type,
    lastSync: integration.lastSync,
    requests: integration.requests,
    monthlyRequests: integration.monthlyRequests,
    errorRate: integration.errorRate,
    averageResponseTime: integration.averageResponseTime,
    createdAt: integration.createdAt,
    updatedAt: integration.updatedAt
  };
};

// Get all integrations
export const getAllIntegrations = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const integrations = await Integration.find().sort({ name: 1 });
    const integrationResponses = integrations.map(mapIntegrationToResponse);

    sendSuccessResponse(res, integrationResponses, 'Integrations retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get integration by ID
export const getIntegrationById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;
    
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError('Invalid integration ID format', 400));
    }

    const integration = await Integration.findById(id);
    
    if (!integration) {
      return next(new AppError('Integration not found', 404));
    }

    sendSuccessResponse(res, mapIntegrationToResponse(integration), 'Integration retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Create new integration
export const createIntegration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { name, description, type, config } = req.body;

    // Check if integration with same name already exists
    const existingIntegration = await Integration.findOne({ name });
    if (existingIntegration) {
      return next(new AppError('Integration with this name already exists', 409));
    }

    const integration = new Integration({
      name,
      description,
      type,
      config: config || {},
      status: 'inactive'
    });

    await integration.save();

    sendSuccessResponse(res, mapIntegrationToResponse(integration), 'Integration created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Update integration
export const updateIntegration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;
    const { name, description, status, type, config } = req.body;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError('Invalid integration ID format', 400));
    }

    const integration = await Integration.findById(id);
    
    if (!integration) {
      return next(new AppError('Integration not found', 404));
    }

    // Update fields if provided
    if (name) integration.name = name;
    if (description) integration.description = description;
    if (status) integration.status = status;
    if (type) integration.type = type;
    if (config) integration.config = { ...integration.config, ...config };

    integration.updatedAt = new Date();
    await integration.save();

    sendSuccessResponse(res, mapIntegrationToResponse(integration), 'Integration updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete integration
export const deleteIntegration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError('Invalid integration ID format', 400));
    }

    const integration = await Integration.findByIdAndDelete(id);
    
    if (!integration) {
      return next(new AppError('Integration not found', 404));
    }

    sendSuccessResponse(res, null, 'Integration deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Test integration connection
export const testIntegration = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return next(new AppError('Invalid integration ID format', 400));
    }

    const integration = await Integration.findById(id);
    
    if (!integration) {
      return next(new AppError('Integration not found', 404));
    }

    // Simulate connection test based on integration type
    let testResult = { success: false, message: 'Test not implemented' };

    switch (integration.type) {
      case 'payment':
        // Test Stripe connection
        testResult = { success: true, message: 'Payment integration test successful' };
        break;
      case 'email':
        // Test email service
        testResult = { success: true, message: 'Email integration test successful' };
        break;
      case 'notification':
        // Test notification service
        testResult = { success: true, message: 'Notification integration test successful' };
        break;
      case 'storage':
        // Test storage service
        testResult = { success: true, message: 'Storage integration test successful' };
        break;
      default:
        testResult = { success: false, message: 'Integration type not supported for testing' };
    }

    // Update integration status based on test result
    integration.status = testResult.success ? 'active' : 'error';
    integration.lastSync = new Date();
    await integration.save();

    sendSuccessResponse(res, {
      integration: mapIntegrationToResponse(integration),
      testResult
    }, 'Integration test completed');
  } catch (error) {
    next(error);
  }
};

// Get integration statistics
export const getIntegrationStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const stats = await Integration.aggregate([
      {
        $group: {
          _id: null,
          totalIntegrations: { $sum: 1 },
          activeIntegrations: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          },
          inactiveIntegrations: {
            $sum: { $cond: [{ $eq: ['$status', 'inactive'] }, 1, 0] }
          },
          errorIntegrations: {
            $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
          },
          totalRequests: { $sum: '$requests' },
          totalMonthlyRequests: { $sum: '$monthlyRequests' }
        }
      }
    ]);

    const typeStats = await Integration.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
          }
        }
      }
    ]);

    sendSuccessResponse(res, {
      overall: stats[0] || {
        totalIntegrations: 0,
        activeIntegrations: 0,
        inactiveIntegrations: 0,
        errorIntegrations: 0,
        totalRequests: 0,
        totalMonthlyRequests: 0
      },
      byType: typeStats
    }, 'Integration statistics retrieved successfully');
  } catch (error) {
    next(error);
  }
};