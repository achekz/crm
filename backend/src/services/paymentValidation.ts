import { AppError } from '../utils/errorHandler';
import Payment from '../models/Payment';
import Invoice from '../models/Invoice';
import User from '../models/User';
import mongoose from 'mongoose';

// Payment validation service
export class PaymentValidator {
  // Validate payment amount
  static validateAmount(amount: number): void {
    if (!amount || amount <= 0) {
      throw new AppError('Payment amount must be greater than 0', 400);
    }
    
    if (amount > 999999.99) {
      throw new AppError('Payment amount exceeds maximum allowed value', 400);
    }
    
    // Check for precision (max 2 decimal places)
    if (amount !== Math.round(amount * 100) / 100) {
      throw new AppError('Payment amount must have at most 2 decimal places', 400);
    }
  }

  // Validate payment method
  static validateMethod(method: string): void {
    const validMethods = ['credit_card', 'bank_transfer', 'check', 'cash', 'stripe'];
    
    if (!validMethods.includes(method)) {
      throw new AppError('Invalid payment method', 400);
    }
  }

  // Validate payment reference
  static validateReference(reference: string, method: string): void {
    if (!reference || reference.trim().length === 0) {
      throw new AppError('Payment reference is required', 400);
    }
    
    if (reference.length > 100) {
      throw new AppError('Payment reference must not exceed 100 characters', 400);
    }
    
    // Validate format based on payment method
    switch (method) {
      case 'stripe':
        // Stripe payment intent ID format
        if (!reference.startsWith('pi_')) {
          throw new AppError('Invalid Stripe payment intent ID format', 400);
        }
        break;
      case 'credit_card':
        // Masked card number format (e.g., ****1234)
        if (!/^\*{4}\d{4}$/.test(reference)) {
          throw new AppError('Invalid masked card number format', 400);
        }
        break;
      case 'bank_transfer':
        // Bank transfer reference format
        if (!/^[A-Z0-9]{6,20}$/.test(reference)) {
          throw new AppError('Invalid bank transfer reference format', 400);
        }
        break;
    }
  }

  // Validate invoice exists and belongs to client
  static async validateInvoice(invoiceId: string, clientId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
      throw new AppError('Invalid invoice ID format', 400);
    }

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) {
      throw new AppError('Invoice not found', 404);
    }

    if (invoice.clientId.toString() !== clientId) {
      throw new AppError('Invoice does not belong to this client', 403);
    }

    if (invoice.status === 'paid') {
      throw new AppError('Invoice is already paid', 400);
    }

    if (invoice.status === 'cancelled') {
      throw new AppError('Cannot make payment for cancelled invoice', 400);
    }

    return invoice;
  }

  // Validate payment amount against invoice balance
  static validatePaymentAgainstInvoice(amount: number, invoice: any): void {
    const paidAmount = invoice.payments?.reduce((sum: number, payment: any) => {
      return payment.status === 'completed' ? sum + payment.amount : sum;
    }, 0) || 0;

    const remainingBalance = invoice.total - paidAmount;

    if (amount > remainingBalance) {
      throw new AppError(`Payment amount exceeds remaining balance of €${remainingBalance.toFixed(2)}`, 400);
    }

    if (amount < 0.01) {
      throw new AppError('Payment amount must be at least €0.01', 400);
    }
  }

  // Validate duplicate payment
  static async validateDuplicatePayment(invoiceId: string, amount: number, reference: string): Promise<void> {
    const existingPayment = await Payment.findOne({
      invoiceId,
      amount,
      reference,
      status: { $in: ['pending', 'completed'] }
    });

    if (existingPayment) {
      throw new AppError('A payment with the same details already exists', 409);
    }
  }

  // Validate payment date
  static validatePaymentDate(date: Date): void {
    const now = new Date();
    const maxFutureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days in future
    const minPastDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year in past

    if (date > maxFutureDate) {
      throw new AppError('Payment date cannot be more than 7 days in the future', 400);
    }

    if (date < minPastDate) {
      throw new AppError('Payment date cannot be more than 1 year in the past', 400);
    }
  }

  // Validate client exists and is active
  static async validateClient(clientId: string): Promise<any> {
    if (!mongoose.Types.ObjectId.isValid(clientId)) {
      throw new AppError('Invalid client ID format', 400);
    }

    const client = await User.findOne({ _id: clientId, role: 'client' });
    if (!client) {
      throw new AppError('Client not found', 404);
    }

    return client;
  }

  // Comprehensive payment validation
  static async validatePayment(paymentData: any): Promise<{ invoice: any; client: any }> {
    const { amount, method, reference, invoiceId, clientId, date } = paymentData;

    // Validate amount
    this.validateAmount(amount);

    // Validate method
    this.validateMethod(method);

    // Validate reference
    this.validateReference(reference, method);

    // Validate date
    if (date) {
      this.validatePaymentDate(new Date(date));
    }

    // Validate client
    const client = await this.validateClient(clientId);

    // Validate invoice
    const invoice = await this.validateInvoice(invoiceId, clientId);

    // Validate payment amount against invoice
    this.validatePaymentAgainstInvoice(amount, invoice);

    // Validate duplicate payment
    await this.validateDuplicatePayment(invoiceId, amount, reference);

    return { invoice, client };
  }

  // Validate payment update
  static async validatePaymentUpdate(paymentId: string, updates: any): Promise<any> {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found', 404);
    }

    // If amount is being updated, validate it
    if (updates.amount !== undefined && updates.amount !== payment.amount) {
      this.validateAmount(updates.amount);
      
      // Re-validate against invoice
      const invoice = await Invoice.findById(payment.invoiceId);
      if (invoice) {
        this.validatePaymentAgainstInvoice(updates.amount, invoice);
      }
    }

    // If method is being updated, validate it
    if (updates.method && updates.method !== payment.method) {
      this.validateMethod(updates.method);
    }

    // If reference is being updated, validate it
    if (updates.reference && updates.reference !== payment.reference) {
      this.validateReference(updates.reference, updates.method || payment.method);
    }

    return payment;
  }

  // Validate payment status transition
  static validateStatusTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      'pending': ['completed', 'failed', 'cancelled'],
      'completed': ['refunded'],
      'failed': ['pending'],
      'cancelled': [],
      'refunded': []
    };

    const allowedTransitions = validTransitions[currentStatus] || [];
    
    if (!allowedTransitions.includes(newStatus)) {
      throw new AppError(`Cannot transition payment from ${currentStatus} to ${newStatus}`, 400);
    }
  }
}