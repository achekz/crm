import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Invoice from '../models/Invoice';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { AuthRequest } from '../types';
import { generateQuotePdf } from '../utils/pdfGenerator';

// For now, we'll use a simple in-memory store or you can create a Quote model later
// This is a temporary solution to match the frontend Quote interface
interface Quote {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  date: string;
  validUntil: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

// Temporary storage (in production, use a database model)
const quotesStorage: Map<string, Quote> = new Map();

// Get all quotes
export const getAllQuotes = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    // If client, filter by their quotes
    let quotes = Array.from(quotesStorage.values());
    
    if (req.user.role !== 'admin') {
      // For clients, filter by their clientId (you'll need to get clientId from user)
      const client = await User.findOne({ email: req.user.email });
      if (client) {
        quotes = quotes.filter(q => q.clientId === client._id.toString());
      }
    }

    sendSuccessResponse(res, quotes, 'Quotes retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

// Get quote by ID
export const getQuoteById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;
    const quote = quotesStorage.get(id);

    if (!quote) {
      return next(new AppError('Quote not found', 404));
    }

    // Check authorization
    if (req.user.role !== 'admin') {
      const client = await User.findOne({ email: req.user.email });
      if (!client || quote.clientId !== client._id.toString()) {
        return next(new AppError('Not authorized to access this quote', 403));
      }
    }

    sendSuccessResponse(res, quote, 'Quote retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

// Create quote
export const createQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const quoteData = req.body;
    const newQuote: Quote = {
      ...quoteData,
      id: new mongoose.Types.ObjectId().toString(),
    };

    quotesStorage.set(newQuote.id, newQuote);
    sendSuccessResponse(res, newQuote, 'Quote created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Update quote
export const updateQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;
    const quote = quotesStorage.get(id);

    if (!quote) {
      return next(new AppError('Quote not found', 404));
    }

    const updatedQuote = { ...quote, ...req.body };
    quotesStorage.set(id, updatedQuote);
    sendSuccessResponse(res, updatedQuote, 'Quote updated successfully', 200);
  } catch (error) {
    next(error);
  }
};

// Delete quote
export const deleteQuote = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;
    const quote = quotesStorage.get(id);

    if (!quote) {
      return next(new AppError('Quote not found', 404));
    }

    quotesStorage.delete(id);
    sendSuccessResponse(res, null, 'Quote deleted successfully', 204);
  } catch (error) {
    next(error);
  }
};

// Generate PDF for quote
export const generatePdf = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;
    const quote = quotesStorage.get(id);
    
    if (!quote) {
      return next(new AppError('Quote not found', 404));
    }

    // Check if user has access to this quote
    if (req.user.role !== 'admin') {
      const client = await User.findOne({ email: req.user.email });
      if (!client || quote.clientId !== client._id.toString()) {
        return next(new AppError('Not authorized to access this quote', 403));
      }
    }

    // Get client information for the quote
    const client = await User.findById(quote.clientId);
    
    if (!client) {
      return next(new AppError('Client not found', 404));
    }

    // Convert quote to format expected by generateQuotePdf
    const quoteForPdf = {
      number: quote.number,
      date: new Date(quote.date),
      validUntil: quote.validUntil ? new Date(quote.validUntil) : undefined,
      items: quote.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })),
      subtotal: quote.subtotal,
      taxRate: quote.tax / quote.subtotal,
      tax: quote.tax,
      total: quote.total,
      notes: quote.notes
    };

    // Generate PDF
    const pdfBuffer = await generateQuotePdf(quoteForPdf, client);

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=devis-${quote.number}.pdf`);
    
    // Send PDF
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

// Convert quote to invoice
export const convertToInvoice = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;
    const quote = quotesStorage.get(id);
    
    if (!quote) {
      return next(new AppError('Quote not found', 404));
    }

    // Create invoice from quote
    const invoiceData = {
      number: `FAC-${quote.number.replace('DEV-', '')}`,
      clientId: new mongoose.Types.ObjectId(quote.clientId),
      date: new Date(),
      dueDate: quote.validUntil ? new Date(quote.validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'draft' as const,
      items: quote.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total
      })),
      subtotal: quote.subtotal,
      taxRate: quote.subtotal > 0 ? quote.tax / quote.subtotal : 0.19,
      tax: quote.tax,
      total: quote.total,
      notes: quote.notes
    };

    // Create invoice
    const invoice = await Invoice.create(invoiceData);

    // Update quote status to accepted
    const updatedQuote = { ...quote, status: 'accepted' as const };
    quotesStorage.set(id, updatedQuote);

    sendSuccessResponse(res, { invoice, quote: updatedQuote }, 'Quote converted to invoice successfully', 201);
  } catch (error) {
    next(error);
  }
};

