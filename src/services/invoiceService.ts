import axios from 'axios';
import { Invoice } from '../store/slices/invoicesSlice';

const API_URL = '/api/invoices';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  const token = localStorage.getItem('token');
  console.log('🔐 Invoice Service - Token from localStorage:', token ? 'Token exists' : 'No token found');
  return token;
};

// Helper function to create auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  console.log('🔐 Invoice Service - Auth headers:', headers);
  return headers;
};

export const fetchInvoices = async (): Promise<Invoice[]> => {
  try {
    console.log('🔐 Invoice Service - Fetching invoices with auth...');
    const response = await axios.get(API_URL, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Invoice Service - Fetch invoices success:', response.status);
    return response.data.data;
  } catch (error: any) {
    console.error('🔐 Invoice Service - Fetch invoices error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to fetch invoices';
  }
};

export const fetchInvoiceById = async (id: string): Promise<Invoice> => {
  try {
    console.log('🔐 Invoice Service - Fetching invoice by ID with auth...');
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Invoice Service - Fetch invoice by ID success:', response.status);
    return response.data.data;
  } catch (error: any) {
    console.error('🔐 Invoice Service - Fetch invoice by ID error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to fetch invoice';
  }
};

export const createInvoice = async (invoiceData: Omit<Invoice, 'id'>): Promise<Invoice> => {
  try {
    console.log('🔐 Invoice Service - Creating invoice with auth...', invoiceData);
    const response = await axios.post(API_URL, invoiceData, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Invoice Service - Create invoice success:', response.status);
    return response.data.data;
  } catch (error: any) {
    console.error('🔐 Invoice Service - Create invoice error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to create invoice';
  }
};

export const updateInvoice = async (id: string, invoiceData: Partial<Invoice>): Promise<Invoice> => {
  try {
    console.log('🔐 Invoice Service - Updating invoice with auth...');
    const response = await axios.patch(`${API_URL}/${id}`, invoiceData, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Invoice Service - Update invoice success:', response.status);
    return response.data.data;
  } catch (error: any) {
    console.error('🔐 Invoice Service - Update invoice error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to update invoice';
  }
};

export const deleteInvoice = async (id: string): Promise<void> => {
  try {
    console.log('🔐 Invoice Service - Deleting invoice with auth...');
    await axios.delete(`${API_URL}/${id}`, {
      headers: getAuthHeaders()
    });
    console.log('🔐 Invoice Service - Delete invoice success');
  } catch (error: any) {
    console.error('🔐 Invoice Service - Delete invoice error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to delete invoice';
  }
};

export const generateInvoicePdf = async (id: string): Promise<Blob> => {
  try {
    console.log('🔐 Invoice Service - Generating PDF with auth...');
    const response = await axios.get(`${API_URL}/${id}/pdf`, { 
      responseType: 'blob',
      headers: getAuthHeaders()
    });
    console.log('🔐 Invoice Service - Generate PDF success:', response.status);
    return response.data;
  } catch (error: any) {
    console.error('🔐 Invoice Service - Generate PDF error:', error.response?.status, error.response?.data);
    throw error.response?.data?.message || error.message || 'Failed to generate PDF';
  }
}; 