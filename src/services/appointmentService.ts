const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

export interface Appointment {
  id: string;
  title: string;
  description?: string;
  date: string;
  time: string;
  duration: number;
  type: 'presential' | 'video' | 'phone';
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  clientId: string;
  adminId: string;
  location?: string;
  meetingUrl?: string;
  notes?: string;
  reminderSent: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AppointmentStats {
  overall: {
    totalAppointments: number;
    scheduledAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
  };
  byType: Array<{
    _id: string;
    count: number;
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

// Get all appointments
export const getAppointments = async (): Promise<Appointment[]> => {
  try {
    const response = await fetch(`${API_BASE}/api/appointments`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch appointments');
    }
    
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }
};

// Get appointment statistics
export const getAppointmentStats = async (): Promise<AppointmentStats> => {
  try {
    const response = await fetch(`${API_BASE}/api/appointments/stats`, {
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch appointment stats');
    }
    
    const data = await response.json();
    return data.success ? data.data : { 
      overall: {
        totalAppointments: 0,
        scheduledAppointments: 0,
        completedAppointments: 0,
        cancelledAppointments: 0
      }, 
      byType: [] 
    };
  } catch (error) {
    console.error('Error fetching appointment stats:', error);
    throw error;
  }
};

// Create new appointment
export const createAppointment = async (appointment: Partial<Appointment>): Promise<Appointment> => {
  try {
    const response = await fetch(`${API_BASE}/api/appointments`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(appointment),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create appointment');
    }
    
    const data = await response.json();
    if (!data.success) {
      throw new Error('Failed to create appointment');
    }
    return data.data;
  } catch (error) {
    console.error('Error creating appointment:', error);
    throw error;
  }
};

// Update appointment
export const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<Appointment | null> => {
  try {
    const response = await fetch(`${API_BASE}/api/appointments/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    
    if (!response.ok) {
      throw new Error('Failed to update appointment');
    }
    
    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error updating appointment:', error);
    throw error;
  }
};

// Delete appointment
export const deleteAppointment = async (id: string): Promise<void> => {
  try {
    const response = await fetch(`${API_BASE}/api/appointments/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    
    if (!response.ok) {
      throw new Error('Failed to delete appointment');
    }
  } catch (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
};
