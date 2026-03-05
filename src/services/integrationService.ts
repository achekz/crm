const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'error';
  type: 'payment' | 'email' | 'notification' | 'storage' | 'calendar' | 'crm';
  lastSync: string;
  requests: number;
  monthlyRequests: number;
  errorRate: number;
  averageResponseTime: number;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationStats {
  overall: {
    totalIntegrations: number;
    activeIntegrations: number;
    inactiveIntegrations: number;
    errorIntegrations: number;
    totalRequests: number;
    totalMonthlyRequests: number;
  };
  byType: Array<{
    _id: string;
    count: number;
    activeCount: number;
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

// Get all integrations
export const getIntegrations = async (): Promise<Integration[]> => {
  try {
    const response = await fetch(`${API_BASE}/api/integrations`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch integrations');
    }
    
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching integrations:', error);
    throw error;
  }
};

// Get integration statistics
export const getIntegrationStats = async (): Promise<IntegrationStats> => {
  try {
    const response = await fetch(`${API_BASE}/api/integrations/stats`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch integration stats');
    }
    
    const data = await response.json();
    return data.success ? data.data : { 
      overall: {
        totalIntegrations: 0,
        activeIntegrations: 0,
        inactiveIntegrations: 0,
        errorIntegrations: 0,
        totalRequests: 0,
        totalMonthlyRequests: 0
      }, 
      byType: [] 
    };
  } catch (error) {
    console.error('Error fetching integration stats:', error);
    throw error;
  }
};

// Create new integration
export const createIntegration = async (integration: Partial<Integration>): Promise<Integration | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/integrations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(integration),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create integration');
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error creating integration:', error);
    throw error;
  }
};

// Update integration
export const updateIntegration = async (id: string, updates: Partial<Integration>): Promise<Integration | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/integrations/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update integration');
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error updating integration:', error);
    throw error;
  }
};

// Delete integration
export const deleteIntegration = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/api/integrations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete integration');
    }
  } catch (error) {
    console.error('Error deleting integration:', error);
    throw error;
  }
};

// Test integration connection
export const testIntegration = async (id: string): Promise<{ integration: Integration; testResult: any } | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/integrations/${id}/test`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to test integration');
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error testing integration:', error);
    throw error;
  }
};