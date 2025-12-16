import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Client from '../models/Client';
import User from '../models/User';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { AuthRequest, ClientResponse } from '../types';
import bcrypt from 'bcryptjs';

// Map MongoDB document to frontend Client response
const mapClientToResponse = (client: any): ClientResponse => {
  return {
    id: client._id.toString(),
    name: client.name,
    email: client.email,
    phone: client.phone || '',
    company: client.company || '',
    address: client.address || '',
    createdAt: client.createdAt ? client.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    lastActivity: client.lastActivity ? client.lastActivity.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: client.status,
    totalInvoices: client.totalInvoices || 0,
    totalPaid: client.totalPaid || 0,
    totalPending: client.totalPending || 0
  };
};

// Get all clients
export const getAllClients = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to access clients', 403));
    }

    // Fetch clients from the users collection where role is 'client'
    const clients = await User.find({ role: 'client' });
    
    // Map the user data to client response format
    const clientResponses = clients.map((user: any) => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      company: user.company || '',
      address: user.address || '',
      dossier_number: user.dossier_number,
      tax_number: user.tax_number,
      cnss: user.cnss,
      nature: user.nature,
      regime_fiscal: user.regime_fiscal,
      gerants: user.gerants || [],
      status: user.status || 'active',
      createdAt: user.createdAt ? user.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      lastActivity: user.updatedAt ? user.updatedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      totalInvoices: 0, // Will be calculated from invoices
      totalPaid: 0, // Will be calculated from invoices
      totalPending: 0 // Will be calculated from invoices
    }));

    sendSuccessResponse(res, clientResponses, 'Clients retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get client by ID
export const getClientById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to access clients', 403));
    }

    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid client ID', 400));
    }

    // Find client in users collection
    const client = await User.findOne({ _id: id, role: 'client' });
    
    if (!client) {
      return next(new AppError('Client not found', 404));
    }

    // Map to client response format
    const clientResponse = {
      id: client._id.toString(),
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      company: client.company || '',
      address: client.address || '',
      dossier_number: client.dossier_number,
      tax_number: client.tax_number,
      cnss: client.cnss,
      nature: client.nature,
      regime_fiscal: client.regime_fiscal,
      gerants: client.gerants || [],
      status: client.status || 'active',
      createdAt: client.createdAt ? client.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      lastActivity: client.updatedAt ? client.updatedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      totalInvoices: 0,
      totalPaid: 0,
      totalPending: 0
    };

    sendSuccessResponse(res, clientResponse, 'Client retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Create a new client
export const createClient = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to create clients', 403));
    }

    const { name, email, phone, company, address, createAccount, password } = req.body;

    // Check if user with this email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }

    // Create user with role 'client'
    const client = await User.create({
      name,
      email,
      phone,
      company,
      address,
      role: 'client',
      password: password || 'defaultPassword123' // You might want to generate a random password
    });

    // Map to client response format
    const clientResponse = {
      id: client._id.toString(),
      name: client.name,
      email: client.email,
      phone: client.phone || '',
      company: client.company || '',
      address: client.address || '',
      createdAt: client.createdAt ? client.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      lastActivity: client.updatedAt ? client.updatedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      status: 'active',
      totalInvoices: 0,
      totalPaid: 0,
      totalPending: 0
    };

    sendSuccessResponse(res, clientResponse, 'Client created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Update client
export const updateClient = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to update clients', 403));
    }

    const { id } = req.params;
    const { 
      name, 
      email, 
      phone, 
      company, 
      address, 
      status,
      dossier_number,
      tax_number,
      cnss,
      nature,
      regime_fiscal,
      gerants
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid client ID', 400));
    }

    // If email is being changed, check if new email is already taken
    if (email) {
      const existingUser = await User.findOne({ email, _id: { $ne: id }, role: 'client' });
      if (existingUser) {
        return next(new AppError('User with this email already exists', 400));
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
      phone,
      company,
      address,
      status,
      dossier_number,
      tax_number,
      cnss,
      nature,
      regime_fiscal,
      gerants
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedClient = await User.findOneAndUpdate(
      { _id: id, role: 'client' },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedClient) {
      return next(new AppError('Client not found', 404));
    }

    // Map to client response format
    const clientResponse = {
      id: updatedClient._id.toString(),
      name: updatedClient.name,
      email: updatedClient.email,
      phone: updatedClient.phone || '',
      company: updatedClient.company || '',
      address: updatedClient.address || '',
      dossier_number: updatedClient.dossier_number,
      tax_number: updatedClient.tax_number,
      cnss: updatedClient.cnss,
      nature: updatedClient.nature,
      regime_fiscal: updatedClient.regime_fiscal,
      gerants: updatedClient.gerants || [],
      status: updatedClient.status || 'active',
      createdAt: updatedClient.createdAt ? updatedClient.createdAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      lastActivity: updatedClient.updatedAt ? updatedClient.updatedAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      totalInvoices: 0,
      totalPaid: 0,
      totalPending: 0
    };

    sendSuccessResponse(res, clientResponse, 'Client updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete client
export const deleteClient = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to delete clients', 403));
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid client ID', 400));
    }

    const client = await User.findOne({ _id: id, role: 'client' });
    if (!client) {
      return next(new AppError('Client not found', 404));
    }

    // Check if client has invoices or payments before deleting
    // For now, we'll just delete without checking

    await User.findByIdAndDelete(id);

    sendSuccessResponse(res, null, 'Client deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Import clients from external MongoDB collection
export const importClientsFromMongoDB = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to import clients', 403));
    }

    // This would normally connect to another MongoDB collection
    // For demonstration purposes, we'll simulate this by using mock data
    // In a real implementation, you would use mongoose to connect to the external DB

    const { createAccounts, defaultPassword } = req.body;
    
    // Normally, you would use mongoose.createConnection to connect to a different database
    // const externalDb = mongoose.createConnection('mongodb://localhost:27017/erp_pro');
    // const ExternalUser = externalDb.model('users', new mongoose.Schema({}, { strict: false }));
    // const externalUsers = await ExternalUser.find({});

    // Mock external users
    const externalUsers = [
      {
        name: 'Imported User 1',
        email: 'imported1@example.com',
        company: 'Imported Company 1',
        phone: '216-12345678',
        address: 'Tunis, Tunisia'
      },
      {
        name: 'Imported User 2',
        email: 'imported2@example.com',
        company: 'Imported Company 2',
        phone: '216-87654321',
        address: 'Sfax, Tunisia'
      }
    ];

    const results = {
      total: externalUsers.length,
      created: 0,
      skipped: 0,
      errors: [] as string[]
    };

    for (const externalUser of externalUsers) {
      try {
        // Check if client already exists
        const existingClient = await Client.findOne({ email: externalUser.email });
        
        if (existingClient) {
          results.skipped++;
          continue;
        }

        // Create client
        const client = await Client.create({
          name: externalUser.name,
          email: externalUser.email,
          phone: externalUser.phone || '',
          company: externalUser.company || '',
          address: externalUser.address || '',
          status: 'active',
          lastActivity: new Date()
        });

        // If createAccounts is true, create a user account for each imported client
        if (createAccounts && defaultPassword) {
          const existingUser = await User.findOne({ email: externalUser.email });
          
          if (!existingUser) {
            await User.create({
              email: externalUser.email,
              password: defaultPassword,
              name: externalUser.name,
              company: externalUser.company,
              phone: externalUser.phone,
              address: externalUser.address,
              role: 'client'
            });
          }
        }

        results.created++;
      } catch (error: any) {
        results.errors.push(`Error importing ${externalUser.email}: ${error.message}`);
      }
    }

    sendSuccessResponse(res, results, 'Client import completed');
  } catch (error) {
    next(error);
  }
};

// Create user account for existing client
export const createClientAccount = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to create client accounts', 403));
    }

    const { clientId, password } = req.body;

    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return next(new AppError('Invalid client ID', 400));
    }

    if (!password || password.length < 8) {
      return next(new AppError('Password must be at least 8 characters long', 400));
    }

    const client = await Client.findById(clientId);
    
    if (!client) {
      return next(new AppError('Client not found', 404));
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: client.email });
    if (existingUser) {
      return next(new AppError('User account already exists for this client', 400));
    }

    // Create user
    const newUser = await User.create({
      email: client.email,
      password,
      name: client.name,
      company: client.company,
      phone: client.phone,
      address: client.address,
      role: 'client'
    });

    sendSuccessResponse(res, { userId: newUser._id }, 'Client account created successfully', 201);
  } catch (error) {
    next(error);
  }
}; 