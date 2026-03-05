import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Payment from '../models/Payment';
import Invoice from '../models/Invoice';
import User from '../models/User';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { AuthRequest, PaymentResponse } from '../types';
import * as paymentService from '../services/paymentService';
import { PaymentValidator } from '../services/paymentValidation';
import stripe from '../config/stripe';
import { logError, logInfo } from '../utils/logger';

// Map MongoDB document to frontend Payment response
const mapPaymentToResponse = async (payment: any): Promise<PaymentResponse> => {
  let clientName = '';
  
  try {
    // Find client in users collection
    const client = await User.findOne({ _id: payment.clientId, role: 'client' });
    if (client) {
      clientName = client.name;
    }
  } catch (error) {
    // If client not found, continue without the name
  }

  return {
    id: payment._id.toString(),
    invoiceId: payment.invoiceId.toString(),
    clientId: payment.clientId.toString(),
    clientName,
    amount: payment.amount,
    date: payment.date.toISOString().split('T')[0],
    method: payment.method,
    status: payment.status,
    reference: payment.reference,
    notes: payment.notes
  };
};

// Get all payments
export const getAllPayments = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    let payments;
    if (req.user.role === 'admin') {
      // Admins can see all payments
      payments = await Payment.find().sort({ date: -1 });
    } else {
      // Clients can only see their own payments
      const client = await User.findOne({ email: req.user.email, role: 'client' });
      if (!client) {
        return next(new AppError('Client profile not found', 404));
      }
      
      payments = await Payment.find({ clientId: client._id }).sort({ date: -1 });
    }

    const paymentResponses = await Promise.all(payments.map(mapPaymentToResponse));

    sendSuccessResponse(res, paymentResponses, 'Payments retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Get payment by ID
export const getPaymentById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid payment ID', 400));
    }

    const payment = await Payment.findById(id);
    
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Check if user has access to this payment
    if (req.user.role !== 'admin') {
      const client = await User.findOne({ email: req.user.email, role: 'client' });
      if (!client || !payment.clientId.equals(client._id)) {
        return next(new AppError('Not authorized to access this payment', 403));
      }
    }

    const paymentResponse = await mapPaymentToResponse(payment);
    sendSuccessResponse(res, paymentResponse, 'Payment retrieved successfully');
  } catch (error) {
    next(error);
  }
};

// Create new payment
export const createPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { amount, method, reference, invoiceId, clientId, notes, date } = req.body;

    // Validate payment data
    const paymentData = {
      amount: Number(amount),
      method,
      reference,
      invoiceId,
      clientId,
      date: date ? new Date(date) : new Date()
    };

    // Use payment validator for comprehensive validation
    const { invoice, client } = await PaymentValidator.validatePayment(paymentData);

    // Create payment
    const payment = new Payment({
      invoiceId,
      clientId,
      amount: paymentData.amount,
      date: paymentData.date,
      method,
      status: method === 'stripe' ? 'pending' : 'completed',
      reference,
      notes: notes || ''
    });

    await payment.save();

    // Update invoice status if payment completes it
    if (method !== 'stripe') {
      const totalPaid = await Payment.aggregate([
        { $match: { invoiceId: invoice._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]);

      const paidAmount = totalPaid[0]?.total || 0;
      
      if (paidAmount >= invoice.total) {
        invoice.status = 'paid';
      } else if (paidAmount > 0) {
        invoice.status = 'partial';
      }
      
      await invoice.save();
    }

    // Populate and return the created payment
    const populatedPayment = await Payment.findById(payment._id)
      .populate('clientId', 'name email')
      .populate('invoiceId', 'number total');

    sendSuccessResponse(res, await mapPaymentToResponse(populatedPayment), 'Payment created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Update payment
export const updatePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;
    const { amount, method, reference, status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid payment ID', 400));
    }

    // Find existing payment
    const payment = await Payment.findById(id);
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Check authorization
    if (req.user.role !== 'admin') {
      const client = await User.findOne({ email: req.user.email, role: 'client' });
      if (!client || !payment.clientId.equals(client._id)) {
        return next(new AppError('Not authorized to update this payment', 403));
      }
    }

    // Validate payment update
    const updates: any = {};
    if (amount !== undefined) updates.amount = Number(amount);
    if (method !== undefined) updates.method = method;
    if (reference !== undefined) updates.reference = reference;
    if (status !== undefined) updates.status = status;
    if (notes !== undefined) updates.notes = notes;

    // Validate the updates
    await PaymentValidator.validatePaymentUpdate(id, updates);

    // Validate status transition
    if (status && status !== payment.status) {
      PaymentValidator.validateStatusTransition(payment.status, status);
    }

    // Apply updates
    Object.assign(payment, updates);
    await payment.save();

    // Update invoice status if payment status changed to completed
    if (status === 'completed' && payment.status !== 'completed') {
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        const totalPaid = await Payment.aggregate([
          { $match: { invoiceId: invoice._id, status: 'completed' } },
          { $group: { _id: null, total: { $sum: '$amount' } } }
        ]);

        const paidAmount = totalPaid[0]?.total || 0;
        
        if (paidAmount >= invoice.total) {
          invoice.status = 'paid';
        } else if (paidAmount > 0) {
          invoice.status = 'paid'; // Changed from 'partial' to match schema
        }
        
        await invoice.save();
      }
    }

    // Populate and return the updated payment
    const populatedPayment = await Payment.findById(payment._id)
      .populate('clientId', 'name email')
      .populate('invoiceId', 'number total');

    sendSuccessResponse(res, await mapPaymentToResponse(populatedPayment), 'Payment updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete payment
export const deletePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid payment ID', 400));
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Check authorization
    if (req.user.role !== 'admin') {
      const client = await User.findOne({ email: req.user.email, role: 'client' });
      if (!client || !payment.clientId.equals(client._id)) {
        return next(new AppError('Not authorized to delete this payment', 403));
      }
    }

    // Only allow deletion of pending payments
    if (payment.status !== 'pending') {
      return next(new AppError('Only pending payments can be deleted', 400));
    }

    await Payment.findByIdAndDelete(id);

    sendSuccessResponse(res, null, 'Payment deleted successfully');
  } catch (error) {
    next(error);
  }
};

// Process Stripe payment
export const processStripePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { invoiceId, clientId } = req.body;

    // Validate invoice and client
    const { invoice, client } = await PaymentValidator.validatePayment({
      amount: 0, // Will be set from invoice
      method: 'stripe',
      reference: '', // Will be set from Stripe
      invoiceId,
      clientId
    });

    // Create Stripe payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.total * 100), // Convert to cents
      currency: process.env.STRIPE_CURRENCY || 'usd',
      metadata: {
        invoiceId: invoiceId.toString(),
        clientId: clientId.toString()
      }
    });

    // Create payment record with pending status
    const payment = new Payment({
      invoiceId,
      clientId,
      amount: invoice.total,
      date: new Date(),
      method: 'stripe',
      status: 'pending',
      reference: paymentIntent.id,
      notes: 'Stripe payment initiated'
    });

    await payment.save();

    sendSuccessResponse(res, {
      clientSecret: paymentIntent.client_secret,
      paymentId: payment._id
    }, 'Stripe payment initiated successfully');
  } catch (error) {
    next(error);
  }
};

// Handle Stripe webhook
export const handleStripeWebhook = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sig = req.get('stripe-signature') || '';
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !endpointSecret) {
      return next(new AppError('Missing Stripe signature or webhook secret', 400));
    }

    let event;
    try {
      event = stripe.webhooks.constructEvent((req as any).rawBody, sig, endpointSecret);
    } catch (err) {
      logError('Stripe webhook signature verification failed', err);
      return next(new AppError('Invalid signature', 400));
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object;
        await handleSuccessfulPayment(paymentIntent);
        break;
      }
      
      case 'payment_intent.payment_failed': {
        const failedPaymentIntent = event.data.object;
        await handleFailedPayment(failedPaymentIntent);
        break;
      }
      
      default:
        logInfo('Unhandled Stripe webhook event', { eventType: event.type });
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};

// Helper function to handle successful Stripe payment
async function handleSuccessfulPayment(paymentIntent: any) {
  const payment = await Payment.findOne({ reference: paymentIntent.id });
  
  if (payment) {
    payment.status = 'completed';
    payment.notes = 'Stripe payment succeeded';
    await payment.save();

    // Update invoice status
    const invoice = await Invoice.findById(payment.invoiceId);
    if (invoice) {
      invoice.status = 'paid';
      await invoice.save();
    }
  }
}

// Helper function to handle failed Stripe payment
async function handleFailedPayment(paymentIntent: any) {
  const payment = await Payment.findOne({ reference: paymentIntent.id });
  
  if (payment) {
    payment.status = 'failed';
    payment.notes = `Stripe payment failed: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`;
    await payment.save();
  }
}
