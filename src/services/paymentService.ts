import axios from 'axios';
import { Payment } from '../store/slices/paymentsSlice';

const API_URL = '/api/payments';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  const token = localStorage.getItem('token');
  console.log('🔐 Payment Service - Token from localStorage:', token ? 'Token exists' : 'No token found');
  return token;
};

// Helper function to create auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  console.log('🔐 Payment Service - Auth headers:', headers);
  return headers;
};

export const fetchPayments = async (): Promise<Payment[]> => {
  try {
    console.log('🔐 Payment Service - Fetching payments with auth...');
    const response = await axios.get(API_URL, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Payment Service - Fetch payments success:', response.status);
    return response.data.data;
  } catch (error: any) {
    console.error('🔐 Payment Service - Fetch payments error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to fetch payments';
  }
};

export const fetchPaymentById = async (id: string): Promise<Payment> => {
  try {
    console.log('🔐 Payment Service - Fetching payment by ID with auth...');
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Payment Service - Fetch payment by ID success:', response.status);
    return response.data.data;
  } catch (error: any) {
    console.error('🔐 Payment Service - Fetch payment by ID error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to fetch payment';
  }
};

export const createPayment = async (paymentData: Omit<Payment, 'id'>): Promise<Payment> => {
  try {
    console.log('🔐 Payment Service - Creating payment with auth...', paymentData);
    const response = await axios.post(API_URL, paymentData, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Payment Service - Create payment success:', response.status);
    return response.data.data;
  } catch (error: any) {
    console.error('🔐 Payment Service - Create payment error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to create payment';
  }
};

export const updatePayment = async (id: string, paymentData: Partial<Payment>): Promise<Payment> => {
  try {
    console.log('🔐 Payment Service - Updating payment with auth...');
    const response = await axios.patch(`${API_URL}/${id}`, paymentData, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Payment Service - Update payment success:', response.status);
    return response.data.data;
  } catch (error: any) {
    console.error('🔐 Payment Service - Update payment error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to update payment';
  }
};

export const deletePayment = async (id: string): Promise<void> => {
  try {
    console.log('🔐 Payment Service - Deleting payment with auth...');
    await axios.delete(`${API_URL}/${id}`, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Payment Service - Delete payment success');
  } catch (error: any) {
    console.error('🔐 Payment Service - Delete payment error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to delete payment';
  }
};

// Online payment functions
export const createPaymentIntent = async (invoiceId: string): Promise<any> => {
  try {
    console.log('🔐 Payment Service - Creating payment intent with auth...');
    const response = await axios.post(`${API_URL}/intent`, { invoiceId }, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Payment Service - Create payment intent success:', response.status);
    return response.data.data;
  } catch (error: any) {
    console.error('🔐 Payment Service - Create payment intent error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to create payment intent';
  }
};

export const createCheckoutSession = async (invoiceId: string, successUrl: string, cancelUrl: string): Promise<any> => {
  try {
    console.log('🔐 Payment Service - Creating checkout session with auth...');
    const response = await axios.post(`${API_URL}/checkout`, { 
      invoiceId, 
      successUrl, 
      cancelUrl 
    }, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Payment Service - Create checkout session success:', response.status);
    return response.data.data;
  } catch (error: any) {
    console.error('🔐 Payment Service - Create checkout session error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to create checkout session';
  }
};

export const checkPaymentStatus = async (paymentIntentId: string): Promise<any> => {
  try {
    console.log('🔐 Payment Service - Checking payment status with auth...');
    const response = await axios.get(`${API_URL}/status/${paymentIntentId}`, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Payment Service - Check payment status success:', response.status);
    return response.data.data;
  } catch (error: any) {
    console.error('🔐 Payment Service - Check payment status error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to check payment status';
  }
}; 