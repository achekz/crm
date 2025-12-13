import axios from 'axios';
import { Quote } from '../store/slices/quotesSlice';

const API_URL = '/api/quotes';

// Helper function to get auth token
const getAuthToken = (): string | null => {
  const token = localStorage.getItem('token');
  return token;
};

// Helper function to create auth headers
const getAuthHeaders = () => {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const fetchQuotes = async (): Promise<Quote[]> => {
  try {
    const response = await axios.get(API_URL, {
      headers: getAuthHeaders()
    });
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data?.message || error.message || 'Failed to fetch quotes';
  }
};

export const fetchQuoteById = async (id: string): Promise<Quote> => {
  try {
    const response = await axios.get(`${API_URL}/${id}`, {
      headers: getAuthHeaders()
    });
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data?.message || error.message || 'Failed to fetch quote';
  }
};

export const createQuote = async (quoteData: Omit<Quote, 'id'>): Promise<Quote> => {
  try {
    const response = await axios.post(API_URL, quoteData, {
      headers: getAuthHeaders()
    });
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data?.message || error.message || 'Failed to create quote';
  }
};

export const updateQuote = async (id: string, quoteData: Partial<Quote>): Promise<Quote> => {
  try {
    const response = await axios.patch(`${API_URL}/${id}`, quoteData, {
      headers: getAuthHeaders()
    });
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data?.message || error.message || 'Failed to update quote';
  }
};

export const deleteQuote = async (id: string): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/${id}`, {
      headers: getAuthHeaders()
    });
  } catch (error: any) {
    throw error.response?.data?.message || error.message || 'Failed to delete quote';
  }
};

export const generateQuotePdf = async (id: string): Promise<Blob> => {
  try {
    const response = await axios.get(`${API_URL}/${id}/pdf`, { 
      responseType: 'blob',
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    throw error.response?.data?.message || error.message || 'Failed to generate PDF';
  }
};

export const convertQuoteToInvoice = async (id: string): Promise<any> => {
  try {
    const response = await axios.post(`${API_URL}/${id}/convert`, {}, {
      headers: getAuthHeaders()
    });
    return response.data.data;
  } catch (error: any) {
    throw error.response?.data?.message || error.message || 'Failed to convert quote to invoice';
  }
};

