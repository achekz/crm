import { Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import Payment from '../models/Payment';
import Invoice from '../models/Invoice';
import User from '../models/User';
import { AppError, sendSuccessResponse } from '../utils/errorHandler';
import { AuthRequest, PaymentResponse } from '../types';
import * as paymentService from '../services/paymentService';
import stripe from '../config/stripe';

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

// Create a new payment
export const createPayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to create payments', 403));
    }

    const { invoiceId, amount, date, method, status, reference, notes } = req.body;

    // Validate invoice ID
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return next(new AppError('Invalid invoice ID', 400));
    }

    // Check if invoice exists
    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Create payment
    const payment = await Payment.create({
      invoiceId,
      clientId: invoice.clientId,
      amount,
      date: new Date(date),
      method,
      status: status || 'completed',
      reference,
      notes
    });

    // If payment is completed, update client statistics
    if (payment.status === 'completed') {
      await User.findByIdAndUpdate(
        invoice.clientId,
        {
          $inc: { 
            totalPaid: amount,
            totalPending: -amount
          },
          lastActivity: new Date()
        }
      );

      // If payment covers the full invoice amount, mark invoice as paid
      if (amount >= invoice.total) {
        await Invoice.findByIdAndUpdate(
          invoiceId,
          { status: 'paid' }
        );
      }
    }

    const paymentResponse = await mapPaymentToResponse(payment);
    sendSuccessResponse(res, paymentResponse, 'Payment created successfully', 201);
  } catch (error) {
    next(error);
  }
};

// Update payment
export const updatePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to update payments', 403));
    }

    const { id } = req.params;
    const { amount, date, method, status, reference, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid payment ID', 400));
    }

    const existingPayment = await Payment.findById(id);
    if (!existingPayment) {
      return next(new AppError('Payment not found', 404));
    }

    // Update payment
    const updatedPayment = await Payment.findByIdAndUpdate(
      id,
      {
        amount: amount || existingPayment.amount,
        date: date ? new Date(date) : existingPayment.date,
        method: method || existingPayment.method,
        status: status || existingPayment.status,
        reference: reference !== undefined ? reference : existingPayment.reference,
        notes: notes !== undefined ? notes : existingPayment.notes
      },
      { new: true, runValidators: true }
    );

    // Check if updatedPayment exists
    if (!updatedPayment) {
      return next(new AppError('Failed to update payment', 500));
    }

    // If status changed, update client statistics accordingly
    if (status && status !== existingPayment.status) {
      const invoice = await Invoice.findById(updatedPayment.invoiceId);
      
      if (invoice) {
        const amountToAdjust = updatedPayment.amount;
        
        // If payment was previously not completed and now it's completed
        if (existingPayment.status !== 'completed' && status === 'completed') {
          await User.findByIdAndUpdate(
            updatedPayment.clientId,
            {
              $inc: { 
                totalPaid: amountToAdjust,
                totalPending: -amountToAdjust
              },
              lastActivity: new Date()
            }
          );

          // Check if payment covers the full invoice amount
          if (amountToAdjust >= invoice.total) {
            await Invoice.findByIdAndUpdate(
              updatedPayment.invoiceId,
              { status: 'paid' }
            );
          }
        }
        // If payment was previously completed and now it's not completed
        else if (existingPayment.status === 'completed' && status !== 'completed') {
          await User.findByIdAndUpdate(
            updatedPayment.clientId,
            {
              $inc: { 
                totalPaid: -amountToAdjust,
                totalPending: amountToAdjust
              },
              lastActivity: new Date()
            }
          );

          // Update invoice status if needed
          if (invoice.status === 'paid') {
            await Invoice.findByIdAndUpdate(
              updatedPayment.invoiceId,
              { status: 'sent' } // Reset to 'sent' status
            );
          }
        }
      }
    }

    const paymentResponse = await mapPaymentToResponse(updatedPayment);
    sendSuccessResponse(res, paymentResponse, 'Payment updated successfully');
  } catch (error) {
    next(error);
  }
};

// Delete payment
export const deletePayment = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return next(new AppError('Not authorized to delete payments', 403));
    }

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return next(new AppError('Invalid payment ID', 400));
    }

    const payment = await Payment.findById(id);
    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    // Revert client statistics if payment was completed
    if (payment.status === 'completed') {
      await User.findByIdAndUpdate(
        payment.clientId,
        {
          $inc: { 
            totalPaid: -payment.amount,
            totalPending: payment.amount
          }
        }
      );

      // Update invoice status if needed
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice && invoice.status === 'paid') {
        await Invoice.findByIdAndUpdate(
          payment.invoiceId,
          { status: 'sent' } // Reset to 'sent' status
        );
      }
    }

    await Payment.findByIdAndDelete(id);

    sendSuccessResponse(res, null, 'Payment deleted successfully');
  } catch (error) {
    next(error);
  }
}; 

// Create payment intent for online payment
export const createPaymentIntent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { invoiceId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return next(new AppError('Invalid invoice ID', 400));
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Check if user has access to this invoice
    if (req.user.role !== 'admin') {
      const client = await User.findOne({ email: req.user.email, role: 'client' });
      if (!client || !invoice.clientId.equals(client._id)) {
        return next(new AppError('Not authorized to pay this invoice', 403));
      }
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return next(new AppError('This invoice is already paid', 400));
    }

    const client = await User.findById(invoice.clientId);
    if (!client) {
      return next(new AppError('Client not found', 404));
    }

    // Create payment intent with Stripe
    const paymentIntent = await paymentService.createPaymentIntent(invoice, client);

    sendSuccessResponse(res, paymentIntent, 'Payment intent created successfully');
  } catch (error) {
    next(error);
  }
};

// Create checkout session for online payment
export const createCheckoutSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { invoiceId, successUrl, cancelUrl } = req.body;

    if (!invoiceId || !successUrl || !cancelUrl) {
      return next(new AppError('Missing required parameters', 400));
    }

    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      return next(new AppError('Invalid invoice ID', 400));
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      return next(new AppError('Invoice not found', 404));
    }

    // Check if user has access to this invoice
    if (req.user.role !== 'admin') {
      const client = await User.findOne({ email: req.user.email, role: 'client' });
      if (!client || !invoice.clientId.equals(client._id)) {
        return next(new AppError('Not authorized to pay this invoice', 403));
      }
    }

    // Check if invoice is already paid
    if (invoice.status === 'paid') {
      return next(new AppError('This invoice is already paid', 400));
    }

    const client = await User.findById(invoice.clientId);
    if (!client) {
      return next(new AppError('Client not found', 404));
    }

    // Create checkout session with Stripe
    const session = await paymentService.createCheckoutSession(invoice, client, successUrl, cancelUrl);

    sendSuccessResponse(res, session, 'Checkout session created successfully');
  } catch (error) {
    next(error);
  }
};

// Handle Stripe webhook events
export const handleWebhook = async (req: any, res: Response, next: NextFunction) => {
  try {
    const signature = req.headers['stripe-signature'];
    const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!signature || !stripeWebhookSecret) {
      return next(new AppError('Missing stripe signature or webhook secret', 400));
    }
    
    // Verify the event
    let event;
    try {
      // Make sure we're using the raw body that was saved by the middleware
      if (!req.rawBody) {
        return next(new AppError('Missing raw request body for webhook verification', 400));
      }
      
      event = stripe.webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return next(new AppError(`Webhook signature verification failed: ${err.message}`, 400));
    }
    
    // Process the event
    const paymentResult = await paymentService.handleWebhookEvent(event);
    
    if (!paymentResult) {
      // Unhandled event type, still return success to Stripe
      return res.status(200).json({ received: true });
    }
    
    // Create a payment record in our database
    if (paymentResult.status === 'completed' && paymentResult.invoiceId) {
      const invoice = await Invoice.findById(paymentResult.invoiceId);
      
      if (invoice) {
        // Create payment record
        await Payment.create({
          invoiceId: invoice._id,
          clientId: invoice.clientId,
          amount: paymentResult.amount,
          date: new Date(),
          method: 'card',
          status: 'completed',
          reference: paymentResult.paymentIntentId,
          notes: 'Online payment via Stripe'
        });
        
        // Update invoice status
        invoice.status = 'paid';
        await invoice.save();
        
        // Update client statistics
        await User.findByIdAndUpdate(
          invoice.clientId,
          {
            $inc: { 
              totalPaid: invoice.total,
              totalPending: -invoice.total
            },
            lastActivity: new Date()
          }
        );
      }
    }
    
    // Return a response to acknowledge receipt of the event
    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

// Check payment status
export const checkPaymentStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next(new AppError('Not authenticated', 401));
    }

    const { paymentIntentId } = req.params;

    if (!paymentIntentId) {
      return next(new AppError('Payment intent ID is required', 400));
    }

    // Check payment status with Stripe
    const status = await paymentService.checkPaymentStatus(paymentIntentId);

    sendSuccessResponse(res, status, 'Payment status retrieved successfully');
  } catch (error) {
    next(error);
  }
}; 