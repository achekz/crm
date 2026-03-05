const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export interface DashboardStats {
  clients: {
    total: number;
    active: number;
  };
  invoices: {
    total: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
  };
  payments: {
    monthlyTotal: number;
    monthlyCount: number;
  };
  appointments: {
    total: number;
    scheduled: number;
  };
  messages: {
    total: number;
    unread: number;
  };
  monthlyInvoiceTrend: Array<{
    month: number;
    year: number;
    count: number;
    total: number;
  }>;
  recentActivity: {
    invoices: Array<{
      id: string;
      number: string;
      clientName: string;
      amount: number;
      status: string;
      date: string;
    }>;
    payments: Array<{
      id: string;
      clientName: string;
      amount: number;
      method: string;
      date: string;
    }>;
  };
}

export interface FinancialReports {
  revenueByPeriod: Array<{
    period: {
      year: number;
      month: number;
      day?: number;
    };
    revenue: number;
    invoiceCount: number;
  }>;
  outstandingInvoices: Array<{
    status: string;
    count: number;
    totalAmount: number;
  }>;
  paymentMethods: Array<{
    method: string;
    count: number;
    totalAmount: number;
  }>;
  topClients: Array<{
    clientName: string;
    clientEmail: string;
    totalRevenue: number;
    invoiceCount: number;
  }>;
}

export interface ClientReports {
  acquisition: Array<{
    month: number;
    year: number;
    newClients: number;
  }>;
  activity: Array<{
    name: string;
    email: string;
    createdAt: string;
    invoiceCount: number;
    totalSpent: number;
    lastInvoiceDate?: string;
    appointmentCount: number;
    lastAppointmentDate?: string;
  }>;
  retention: {
    activeClients: number;
    atRiskClients: number;
    inactiveClients: number;
  };
}

export interface AppointmentReports {
  byType: Array<{
    type: string;
    count: number;
  }>;
  byStatus: Array<{
    status: string;
    count: number;
  }>;
  byMonth: Array<{
    month: number;
    year: number;
    count: number;
  }>;
  upcoming: Array<{
    id: string;
    title: string;
    date: string;
    time: string;
    type: string;
    clientName: string;
    adminName: string;
  }>;
}

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// Get dashboard statistics
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const response = await fetch(`${API_BASE}/api/reports/dashboard`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch dashboard stats');
    }
    
    const data = await response.json();
    return data.success ? data.data : {
      clients: { total: 0, active: 0 },
      invoices: { total: 0, totalAmount: 0, paidAmount: 0, pendingAmount: 0 },
      payments: { monthlyTotal: 0, monthlyCount: 0 },
      appointments: { total: 0, scheduled: 0 },
      messages: { total: 0, unread: 0 },
      monthlyInvoiceTrend: [],
      recentActivity: { invoices: [], payments: [] }
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    throw error;
  }
};

// Get financial reports
export const getFinancialReports = async (startDate?: string, endDate?: string): Promise<FinancialReports> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`${API_BASE}/api/reports/financial?${params}`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch financial reports');
    }
    
    const data = await response.json();
    return data.success ? data.data : {
      revenueByPeriod: [],
      outstandingInvoices: [],
      paymentMethods: [],
      topClients: []
    };
  } catch (error) {
    console.error('Error fetching financial reports:', error);
    throw error;
  }
};

// Get client reports
export const getClientReports = async (): Promise<ClientReports> => {
  try {
    const response = await fetch(`${API_BASE}/api/reports/clients`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch client reports');
    }
    
    const data = await response.json();
    return data.success ? data.data : {
      acquisition: [],
      activity: [],
      retention: { activeClients: 0, atRiskClients: 0, inactiveClients: 0 }
    };
  } catch (error) {
    console.error('Error fetching client reports:', error);
    throw error;
  }
};

// Get appointment reports
export const getAppointmentReports = async (startDate?: string, endDate?: string): Promise<AppointmentReports> => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    const response = await fetch(`${API_BASE}/api/reports/appointments?${params}`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch appointment reports');
    }
    
    const data = await response.json();
    return data.success ? data.data : {
      byType: [],
      byStatus: [],
      byMonth: [],
      upcoming: []
    };
  } catch (error) {
    console.error('Error fetching appointment reports:', error);
    throw error;
  }
};

// Export all reports
export const exportReports = async (): Promise<any> => {
  try {
    const response = await fetch(`${API_BASE}/api/reports/export`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to export reports');
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error exporting reports:', error);
    throw error;
  }
};