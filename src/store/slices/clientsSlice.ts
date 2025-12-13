import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

// API paths for clients
const API_URL = '/api/clients';
const AUTH_API_URL = '/api/auth';

// Function to get the base API URL (helpful for debugging)
export const getApiBaseUrl = () => {
  // Default to relative URL which will use the Vite proxy
  return '/api';
  
  // For debugging, you can uncomment this to directly hit the backend:
  // return 'http://localhost:5000/api';
};

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  createdAt: string;
  lastActivity: string;
  status: 'active' | 'inactive';
  totalInvoices: number;
  totalPaid: number;
  totalPending: number;
  avatar?: string;
  role?: string;
}

interface ClientsState {
  clients: Client[];
  loading: boolean;
  error: string | null;
  selectedClient: Client | null;
}

// Async thunks
export const fetchClients = createAsyncThunk(
  'clients/fetchClients',
  async (_, { rejectWithValue, getState }: any) => {
    try {
      const { auth } = getState();
      const token = auth.token;
      
      if (!token) {
        console.error('No authentication token found. Please log in again.');
        return rejectWithValue('No authentication token found. Please log in again.');
      }

      console.log('Fetching clients from API...', {
        url: API_URL,
        tokenExists: !!token,
        tokenPrefix: token ? token.substring(0, 10) + '...' : null
      });

      // Try with proxy first
      let response;
      try {
        response = await axios.get(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (proxyError) {
        console.log('Proxy API call failed, trying direct connection:', proxyError);
        
        // If proxy fails, try direct connection
        try {
          response = await axios.get(`http://localhost:5000${API_URL}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          console.log('Direct connection succeeded');
        } catch (directError) {
          console.error('Both proxy and direct API calls failed');
          throw directError; // Re-throw to be caught by the outer catch
        }
      }

      console.log('Clients response:', response.data);
      
      if (!response.data || !response.data.data) {
        console.error('Invalid response format from clients API:', response.data);
        return rejectWithValue('Invalid response from server. Check API format.');
      }

      const clients = response.data.data || [];
      
      if (clients.length === 0) {
        console.warn('No clients returned from API');
      }

      // Get invoices to calculate totals (using try/catch to continue even if invoices fail)
      let invoices = [];
      try {
        const invoicesResponse = await axios.get('/api/invoices', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        invoices = invoicesResponse.data.data || [];
      } catch (invoiceError) {
        console.error('Error fetching invoices (continuing with client data):', invoiceError);
      }

      // Calculate invoice totals for each client
      return clients.map((client: Client) => {
        const clientInvoices = invoices.filter((invoice: any) => 
          invoice.clientId === client.id || 
          (invoice.clientName && invoice.clientName.includes(client.name))
        );
        
        const totalInvoices = clientInvoices.length;
        const totalPaid = clientInvoices
          .filter((invoice: any) => invoice.status === 'paid')
          .reduce((sum: number, invoice: any) => sum + invoice.total, 0);
        
        const totalPending = clientInvoices
          .filter((invoice: any) => invoice.status !== 'paid')
          .reduce((sum: number, invoice: any) => sum + invoice.total, 0);

        return {
          ...client,
          totalInvoices,
          totalPaid,
          totalPending
        };
      });
    } catch (error: any) {
      // Log detailed error information
      console.error('Error fetching clients:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: API_URL,
      });
      
      // Return a user-friendly error message
      if (error.response?.status === 401 || error.response?.status === 403) {
        return rejectWithValue('Authentication failed. Please log in again.');
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK') {
        return rejectWithValue('Cannot connect to server. Please check if the server is running at http://localhost:5000.');
      }
      
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch clients'
      );
    }
  }
);

export const createClientThunk = createAsyncThunk(
  'clients/createClient',
  async (clientData: Omit<Client, 'id'>, { rejectWithValue, getState }: any) => {
    try {
      const { auth } = getState();
      const token = auth.token;
      
      if (!token) {
        return rejectWithValue('No token found');
      }

      console.log('Creating client with data:', clientData);
      const response = await axios.post('/api/clients', clientData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.data;
    } catch (error: any) {
      console.error('Error creating client:', error.response || error);
      return rejectWithValue(
        error.response?.data?.message || 'Failed to create client'
      );
    }
  }
);

export const updateClientThunk = createAsyncThunk(
  'clients/updateClient',
  async ({ id, ...clientData }: Client, { rejectWithValue, getState }: any) => {
    try {
      const { auth } = getState();
      const token = auth.token;
      
      if (!token) {
        return rejectWithValue('No token found');
      }

      const response = await axios.patch(`/api/clients/${id}`, clientData, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return response.data.data;
    } catch (error: any) {
      console.error('Error updating client:', error.response || error);
      return rejectWithValue(
        error.response?.data?.message || 'Failed to update client'
      );
    }
  }
);

export const deleteClientThunk = createAsyncThunk(
  'clients/deleteClient',
  async (id: string, { rejectWithValue, getState }: any) => {
    try {
      const { auth } = getState();
      const token = auth.token;
      
      if (!token) {
        return rejectWithValue('No token found');
      }

      await axios.delete(`/api/clients/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      return id;
    } catch (error: any) {
      console.error('Error deleting client:', error.response || error);
      return rejectWithValue(
        error.response?.data?.message || 'Failed to delete client'
      );
    }
  }
);

const initialState: ClientsState = {
  clients: [],
  loading: false,
  error: null,
  selectedClient: null,
};

const clientsSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setClients: (state, action: PayloadAction<Client[]>) => {
      state.clients = action.payload;
    },
    addClient: (state, action: PayloadAction<Client>) => {
      state.clients.push(action.payload);
    },
    updateClient: (state, action: PayloadAction<Client>) => {
      const index = state.clients.findIndex(client => client.id === action.payload.id);
      if (index !== -1) {
        state.clients[index] = action.payload;
      }
    },
    deleteClient: (state, action: PayloadAction<string>) => {
      state.clients = state.clients.filter(client => client.id !== action.payload);
    },
    selectClient: (state, action: PayloadAction<Client | null>) => {
      state.selectedClient = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch clients
    builder
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.clients = action.payload;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Create client
    builder
      .addCase(createClientThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createClientThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.clients.push(action.payload);
      })
      .addCase(createClientThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Update client
    builder
      .addCase(updateClientThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateClientThunk.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.clients.findIndex(client => client.id === action.payload.id);
        if (index !== -1) {
          state.clients[index] = action.payload;
        }
      })
      .addCase(updateClientThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Delete client
    builder
      .addCase(deleteClientThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteClientThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.clients = state.clients.filter(client => client.id !== action.payload);
      })
      .addCase(deleteClientThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { 
  setLoading, 
  setClients, 
  addClient, 
  updateClient, 
  deleteClient, 
  selectClient,
  clearError
} = clientsSlice.actions;
export default clientsSlice.reducer;