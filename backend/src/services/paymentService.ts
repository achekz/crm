import stripe from '../config/stripe';
import { IInvoice } from '../models/Invoice';
import { IUser } from '../types';

/**
 * Create a payment intent for an invoice
 */
export const createPaymentIntent = async (invoice: IInvoice, client: IUser) => {
  try {
    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(invoice.total * 100), // Stripe requires amount in smallest currency unit (cents)
      currency: 'tnd',
      description: `Invoice #${invoice.number} payment`,
      metadata: {
        invoiceId: invoice._id.toString(),
        clientId: client._id.toString(),
        invoiceNumber: invoice.number
      },
      receipt_email: client.email,
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    throw error;
  }
};

/**
 * Check the status of a payment intent
 */
export const checkPaymentStatus = async (paymentIntentId: string) => {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      status: paymentIntent.status,
      id: paymentIntent.id,
      metadata: paymentIntent.metadata
    };
  } catch (error) {
    console.error('Error checking payment status:', error);
    throw error;
  }
};

/**
 * Create a Stripe Checkout session
 */
export const createCheckoutSession = async (invoice: IInvoice, client: IUser, successUrl: string, cancelUrl: string) => {
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'tnd',
            product_data: {
              name: `Invoice #${invoice.number}`,
              description: `Payment for invoice #${invoice.number}`,
            },
            unit_amount: Math.round(invoice.total * 100), // Stripe requires amount in smallest currency unit (cents)
          },
          quantity: 1,
        },
      ],
      metadata: {
        invoiceId: invoice._id.toString(),
        clientId: client._id.toString(),
        invoiceNumber: invoice.number
      },
      customer_email: client.email,
      mode: 'payment',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    });

    return {
      sessionId: session.id,
      url: session.url
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
};

/**
 * Handle webhook events from Stripe
 */
export const handleWebhookEvent = async (event: any) => {
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      // Handle successful payment intent
      return {
        paymentIntentId: paymentIntent.id,
        invoiceId: paymentIntent.metadata.invoiceId,
        status: 'completed',
        amount: paymentIntent.amount / 100, // Convert from cents to actual amount
      };
    
    case 'checkout.session.completed':
      const session = event.data.object;
      // Handle completed checkout session
      return {
        sessionId: session.id,
        paymentIntentId: session.payment_intent,
        invoiceId: session.metadata.invoiceId,
        status: 'completed',
        amount: session.amount_total / 100, // Convert from cents to actual amount
      };
    
    default:
      // Unhandled event type
      return null;
  }
}; 