import axios from 'axios';

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

export interface CalendarEvent {
  summary: string;
  description: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  reminders: {
    useDefault: boolean;
    overrides: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

/**
 * Add invoice due date to Google Calendar
 */
export const addInvoiceToCalendar = async (invoiceData: {
  number: string;
  clientName: string;
  dueDate: string;
  total: number;
  description?: string;
}) => {
  try {
    console.log('📅 Google Calendar - Adding invoice to calendar:', invoiceData);
    
    const response = await axios.post('/api/calendar/add-invoice', {
      invoice: invoiceData
    }, {
      headers: getAuthHeaders()
    });
    
    console.log('📅 Google Calendar - Success:', response.data);
    return response.data;
  } catch (error: any) {
    console.error('📅 Google Calendar - Error:', error.response?.data || error);
    throw error.response?.data?.message || error.message || 'Failed to add to Google Calendar';
  }
};

/**
 * Get Google Calendar authorization URL
 */
export const getGoogleCalendarAuthUrl = async () => {
  try {
    const response = await axios.get('/api/calendar/auth-url', {
      headers: getAuthHeaders()
    });
    return response.data.authUrl;
  } catch (error: any) {
    console.error('📅 Google Calendar - Auth URL error:', error);
    throw error.response?.data?.message || error.message || 'Failed to get auth URL';
  }
};

/**
 * Check if user is authorized with Google Calendar
 */
export const checkGoogleCalendarAuth = async () => {
  try {
    const response = await axios.get('/api/calendar/auth-status', {
      headers: getAuthHeaders()
    });
    return response.data.authorized;
  } catch (error: any) {
    console.error('📅 Google Calendar - Auth check error:', error);
    return false;
  }
};

/**
 * Revoke Google Calendar access
 */
export const revokeGoogleCalendarAccess = async () => {
  try {
    const response = await axios.post('/api/calendar/revoke', {}, {
      headers: getAuthHeaders()
    });
    return response.data;
  } catch (error: any) {
    console.error('📅 Google Calendar - Revoke error:', error);
    throw error.response?.data?.message || error.message || 'Failed to revoke access';
  }
}; 