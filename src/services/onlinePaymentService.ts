import axios from 'axios';

// Base URL for payment API endpoints
const PAYMENT_API_URL = '/api/payments';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  const token = localStorage.getItem('token');
  console.log('🔐 Online Payment Service - Token from localStorage:', token ? 'Token exists' : 'No token found');
  return token;
};

// Helper function to create auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  console.log('🔐 Online Payment Service - Auth headers:', headers);
  return headers;
};

/**
 * Create a payment intent for an invoice
 */
export const createPaymentIntent = async (invoiceId: string) => {
  try {
    console.log('🔐 Online Payment Service - Creating payment intent with auth...');
    const response = await axios.post(`${PAYMENT_API_URL}/intent`, { invoiceId }, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Online Payment Service - Create payment intent success:', response.status);
    return response.data.data;
  } catch (error) {
    console.error('🔐 Online Payment Service - Create payment intent error:', error);
    throw error;
  }
};

/**
 * Create a checkout session for an invoice
 */
export const createCheckoutSession = async (
  invoiceId: string,
  successUrl: string,
  cancelUrl: string
) => {
  try {
    console.log('🔐 Online Payment Service - Creating checkout session with auth...');
    const response = await axios.post(`${PAYMENT_API_URL}/checkout`, {
      invoiceId,
      successUrl,
      cancelUrl,
    }, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Online Payment Service - Create checkout session success:', response.status);
    return response.data.data;
  } catch (error) {
    console.error('🔐 Online Payment Service - Create checkout session error:', error);
    throw error;
  }
};

/**
 * Check the status of a payment intent
 */
export const checkPaymentStatus = async (paymentIntentId: string) => {
  try {
    console.log('🔐 Online Payment Service - Checking payment status with auth...');
    const response = await axios.get(`${PAYMENT_API_URL}/status/${paymentIntentId}`, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Online Payment Service - Check payment status success:', response.status);
    return response.data.data;
  } catch (error) {
    console.error('🔐 Online Payment Service - Check payment status error:', error);
    throw error;
  }
};

/**
 * Process online payment using Stripe Elements
 * This function assumes you're using Stripe Elements in your frontend
 */
export const processStripePayment = async (
  stripe: any,
  elements: any,
  clientSecret: string
) => {
  if (!stripe || !elements) {
    throw new Error('Stripe or Elements not loaded');
  }
  
  const cardElement = elements.getElement('card');
  
  // Use Stripe.js to confirm the payment
  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: cardElement,
    },
  });
  
  if (error) {
    throw new Error(error.message);
  }
  
  return {
    paymentIntentId: paymentIntent.id,
    status: paymentIntent.status,
  };
}; 