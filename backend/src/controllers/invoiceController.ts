import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Invoice from '../models/Invoice';
import User from '../models/User';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { AuthRequest, InvoiceResponse } from '../types';
import { generateInvoicePdf } from '../utils/pdfGenerator';
import { activeUsers } from '../utils/socket';
import { Server } from 'socket.io';

let io: Server | null = null;

// Set the Socket.io instance
export const setSocketInstance = (socketIo: Server) => {
  io = socketIo;
};

// Send notification to client via socket
const sendInvoiceNotification = async (clientId: string, invoice: any, notificationType: 'new' | 'update' | 'status') => {
  try {
    if (!io) return;

    // Find client
    const client = await User.findById(clientId);
    if (!client) return;

    // Check if user is online - use client._id as userId
    const socketId = activeUsers.get(client._id.toString() || '');
    
    if (socketId) {
      const notificationTitle = notificationType === 'new' 
        ? 'Nouvelle facture' 
        : notificationType === 'update'
          ? 'Facture modifiée'
          : 'Statut de facture modifié';

      const notificationMessage = notificationType === 'new'
        ? `Une nouvelle facture (${invoice.number}) d'un montant de ${invoice.total.toLocaleString()} TND a été créée.`
        : notificationType === 'update'
          ? `La facture ${invoice.number} a été mise à jour.`
          : `Le statut de la facture ${invoice.number} est maintenant "${invoice.status}".`;

      // Send to client's personal room
      io.to(socketId).emit('notification:invoice', {
        type: notificationType,
        invoiceId: invoice._id,
        number: invoice.number,
        amount: invoice.total,
        title: notificationTitle,
        message: notificationMessage,
        timestamp: new Date()
      });

      console.log(`Invoice notification sent to client ${client.name}`);
    } else {
      console.log(`Client ${client.name} is not online, notification not sent`);
      // In a real app, you would store the notification in the database for later
    }
  } catch (error) {
    console.error('Error sending invoice notification:', error);
  }
};

// Map MongoDB document to frontend Invoice response
const mapInvoiceToResponse = async (invoice: any): Promise<InvoiceResponse> => {
  let clientName = '';
  
  try {
    const client = await User.findById(invoice.clientId);
    if (client) {
      clientName = client.name;
    }
  } catch (error) {
    // If client not found, continue without the name
  }
  
  return {
    id: invoice._id.toString(),
    number: invoice.number,
    clientId: invoice.clientId.toString(),
    clientName,
    date: invoice.date.toISOString().split('T')[0],
    dueDate: invoice.dueDate.toISOString().split('T')[0],
    status: invoice.status,
    items: invoice.items.map((item: any, index: number) => ({
      id: index.toString(), // Use index as ID
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total
    })),
    subtotal: invoice.subtotal,
    tax: invoice.tax,
    total: invoice.total,
    notes: invoice.notes
  };
};

// Get all invoices
export const getAllInvoices = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    let invoices;
    if (req.user.role === 'admin') {
      // Admins can see all invoices
      invoices = await Invoice.find().sort({ date: -1 });
    } else {
      // Clients can only see their own invoices
      const client = await User.findOne({ email: req.user.email });
      if (!client) {
        return next(new AppError('Client profile not found', 404));
      }
      
      invoices = await Invoice.find({ clientId: client._id }).sort({ date: -1 });
    }

    const invoiceResponses = await Promise.all(invoices.map(mapInvoiceToResponse));

    sendSuccessResponse(res, invoiceResponses, 'Invoices retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get invoice by ID
export const getInvoiceById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid invoice ID', 400));
    }

    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Check if user has access to this invoice
    if (req.user.role !== 'admin') {
      const client = await User.findOne({ email: req.user.email });
      if (!client || !invoice.clientId.equals(client._id)) {
        return next(new AppError('Not authorized to access this invoice', 403));
      }
    }

    const invoiceResponse = await mapInvoiceToResponse(invoice);
    sendSuccessResponse(res, invoiceResponse, 'Invoice retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Create a new invoice
export const createInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to create invoices', 403));
    }

    const { number, clientId, date, dueDate, items, notes, status, sendNotification } = req.body;

    // Validate client ID
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      return next(new AppError('Invalid client ID', 400));
    }

    // Check if client exists
    const client = await User.findById(clientId);
    if (!client) {
      return next(new AppError('Client not found', 404));
    }

    // Check if invoice number already exists
    const existingInvoice = await Invoice.findOne({ number });
    if (existingInvoice) {
      return next(new AppError('Invoice number already exists', 400));
    }

    // Calculate totals for each item
    const processedItems = items.map((item: any) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice
    }));

    // Calculate subtotal
    const subtotal = processedItems.reduce((sum: number, item: any) => sum + item.total, 0);
    
    // Calculate tax (using provided tax rate or default 19%)
    const taxRate = req.body.taxRate ?? 0.19;
    const tax = subtotal * taxRate;
    
    // Calculate total
    const total = subtotal + tax;

    // Create invoice
    const invoice = await Invoice.create({
      number,
      clientId,
      date: new Date(date),
      dueDate: new Date(dueDate),
      status: status || 'draft',
      items: processedItems,
      subtotal,
      tax,
      taxRate,
      total,
      notes
    });

    // Update client's invoice statistics
    await User.findByIdAndUpdate(
      clientId,
      {
        $inc: { 
          totalInvoices: 1,
          totalPending: status !== 'paid' ? total : 0
        },
        lastActivity: new Date()
      }
    );

    // Send notification to client if requested
    if (sendNotification) {
      await sendInvoiceNotification(clientId, invoice, 'new');
    }

    const invoiceResponse = await mapInvoiceToResponse(invoice);
    sendSuccessResponse(res, invoiceResponse, 'Invoice created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Update invoice
export const updateInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to update invoices', 403));
    }

    const { id } = req.params;
    const { number, clientId, date, dueDate, items, notes, status, sendNotification } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid invoice ID', 400));
    }

    // Get existing invoice
    const existingInvoice = await Invoice.findById(id);
    if (!existingInvoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // If updating number, check if it would create a duplicate
    if (number && number !== existingInvoice.number) {
      const duplicateInvoice = await Invoice.findOne({ number, _id: { $ne: id } });
      if (duplicateInvoice) {
        return next(new AppError('Invoice number already exists', 400));
      }
    }

    // If changing client, validate client ID and check if client exists
    if (clientId && clientId !== existingInvoice.clientId.toString()) {
      if (!mongoose.Types.ObjectId.isValid(clientId)) {
        return next(new AppError('Invalid client ID', 400));
      }

      const client = await User.findById(clientId);
      if (!client) {
        return next(new AppError('Client not found', 404));
      }
    }

    // Calculate totals if items are provided
    let newSubtotal = existingInvoice.subtotal;
    let newTax = existingInvoice.tax;
    let newTotal = existingInvoice.total;
    let processedItems = existingInvoice.items;

    if (items) {
      processedItems = items.map((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.quantity * item.unitPrice
      }));

      newSubtotal = processedItems.reduce((sum: number, item: any) => sum + item.total, 0);
      
      // Use provided tax rate or existing one
      const taxRate = req.body.taxRate ?? existingInvoice.taxRate ?? 0.19;
      newTax = newSubtotal * taxRate;
      newTotal = newSubtotal + newTax;
    }

    // Update invoice
    const updatedInvoice = await Invoice.findByIdAndUpdate(
      id,
      {
        number: number || existingInvoice.number,
        clientId: clientId || existingInvoice.clientId,
        date: date ? new Date(date) : existingInvoice.date,
        dueDate: dueDate ? new Date(dueDate) : existingInvoice.dueDate,
        status: status || existingInvoice.status,
        items: processedItems,
        subtotal: newSubtotal,
        tax: newTax,
        taxRate: req.body.taxRate ?? existingInvoice.taxRate,
        total: newTotal,
        notes: notes !== undefined ? notes : existingInvoice.notes
      },
      { new: true }
    );

    // Update client statistics if status has changed (e.g., from draft to sent)
    if (status && status !== existingInvoice.status) {
      // Handle different status transitions
      if (status === 'paid' && existingInvoice.status !== 'paid') {
        // Invoice is now paid - decrease pending, increase paid
        await User.findByIdAndUpdate(
          updatedInvoice?.clientId,
          {
            $inc: { 
              totalPending: updatedInvoice?.total ? -updatedInvoice.total : 0,
              totalPaid: updatedInvoice?.total || 0
            },
            lastActivity: new Date()
          }
        );
      } else if (status !== 'paid' && existingInvoice.status === 'paid') {
        // Invoice was paid but isn't anymore - increase pending, decrease paid
        await User.findByIdAndUpdate(
          updatedInvoice?.clientId,
          {
            $inc: { 
              totalPending: updatedInvoice?.total || 0,
              totalPaid: updatedInvoice?.total ? -updatedInvoice.total : 0
            },
            lastActivity: new Date()
          }
        );
      }
      
      // Send notification for status update
      await sendInvoiceNotification(updatedInvoice!.clientId.toString(), updatedInvoice!, 'status');
    } 
    // Send regular update notification if requested
    else if (sendNotification) {
      await sendInvoiceNotification(updatedInvoice!.clientId.toString(), updatedInvoice!, 'update');
    }

    const invoiceResponse = await mapInvoiceToResponse(updatedInvoice!);
    sendSuccessResponse(res, invoiceResponse, 'Invoice updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete invoice
export const deleteInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to delete invoices', 403));
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid invoice ID', 400));
    }

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Update client statistics before deleting invoice
    if (invoice.status === 'paid') {
      await User.findByIdAndUpdate(
        invoice.clientId,
        {
          $inc: { 
            totalInvoices: -1,
            totalPaid: -invoice.total
          }
        }
      );
    } else {
      await User.findByIdAndUpdate(
        invoice.clientId,
        {
          $inc: { 
            totalInvoices: -1,
            totalPending: -invoice.total
          }
        }
      );
    }

    await Invoice.findByIdAndDelete(id);

    sendSuccessResponse(res, null, 'Invoice deleted successfully');
  } catch (error) {
    next(error);
  }
}; 

// Generate PDF for invoice
export const generatePdf = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid invoice ID', 400));
    }

    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Check if user has access to this invoice
    if (req.user.role !== 'admin') {
      const client = await User.findOne({ email: req.user.email });
      if (!client || !invoice.clientId.equals(client._id)) {
        return next(new AppError('Not authorized to access this invoice', 403));
      }
    }

    // Get client information for the invoice
    const client = await User.findById(invoice.clientId);
    
    if (!client) {
      return next(new AppError('Client not found', 404));
    }

    // Generate PDF
    const pdfBuffer = await generateInvoicePdf(invoice, client);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.number}.pdf`);
    
    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
}; 