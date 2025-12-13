import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import * as invoiceService from '../../services/invoiceService';

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  date: string;
  dueDate: string;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  taxRate: number;
  total: number;
  notes?: string;
}

interface InvoicesState {
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  selectedInvoice: Invoice | null;
}

// Async thunks
export const fetchAllInvoices = createAsyncThunk(
  'invoices/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await invoiceService.fetchInvoices();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch invoices');
    }
  }
);

export const fetchInvoiceById = createAsyncThunk(
  'invoices/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await invoiceService.fetchInvoiceById(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch invoice');
    }
  }
);

export const createNewInvoice = createAsyncThunk(
  'invoices/create',
  async (invoiceData: Omit<Invoice, 'id'>, { rejectWithValue }) => {
    try {
      // Make sure each invoice item has the required fields
      const validatedInvoiceData = {
        ...invoiceData,
        items: invoiceData.items.map(item => ({
          id: item.id,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: Number(item.total)
        })),
        subtotal: Number(invoiceData.subtotal),
        tax: Number(invoiceData.tax),
        taxRate: Number(invoiceData.taxRate),
        total: Number(invoiceData.total)
      };
      
      return await invoiceService.createInvoice(validatedInvoiceData);
    } catch (error: any) {
      console.error('Error in createNewInvoice thunk:', error);
      return rejectWithValue(error.toString() || 'Failed to create invoice');
    }
  }
);

export const updateExistingInvoice = createAsyncThunk(
  'invoices/update',
  async ({ id, data }: { id: string; data: Partial<Invoice> }, { rejectWithValue }) => {
    try {
      return await invoiceService.updateInvoice(id, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update invoice');
    }
  }
);

export const removeInvoice = createAsyncThunk(
  'invoices/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await invoiceService.deleteInvoice(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete invoice');
    }
  }
);

// Mock data for initial development only
const mockInvoices: Invoice[] = [
  {
    id: '1',
    number: 'FAC-2024-001',
    clientId: '1',
    clientName: 'Jean Dupont',
    date: '2024-01-15',
    dueDate: '2024-02-15',
    status: 'paid',
    items: [
      {
        id: '1',
        description: 'Développement application web',
        quantity: 40,
        unitPrice: 800,
        total: 32000,
      },
    ],
    subtotal: 32000,
    tax: 6400,
    taxRate: 20,
    total: 38400,
    notes: 'Merci pour votre confiance',
  },
  {
    id: '2',
    number: 'FAC-2024-002',
    clientId: '2',
    clientName: 'Marie Martin',
    date: '2024-01-18',
    dueDate: '2024-02-18',
    status: 'sent',
    items: [
      {
        id: '2',
        description: 'Design UI/UX',
        quantity: 20,
        unitPrice: 600,
        total: 12000,
      },
    ],
    subtotal: 12000,
    tax: 2400,
    taxRate: 20,
    total: 14400,
  },
];

const initialState: InvoicesState = {
  invoices: mockInvoices,
  loading: false,
  error: null,
  selectedInvoice: null,
};

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setInvoices: (state, action: PayloadAction<Invoice[]>) => {
      state.invoices = action.payload;
    },
    addInvoice: (state, action: PayloadAction<Invoice>) => {
      state.invoices.push(action.payload);
    },
    updateInvoice: (state, action: PayloadAction<Invoice>) => {
      const index = state.invoices.findIndex(invoice => invoice.id === action.payload.id);
      if (index !== -1) {
        state.invoices[index] = action.payload;
      }
    },
    deleteInvoice: (state, action: PayloadAction<string>) => {
      state.invoices = state.invoices.filter(invoice => invoice.id !== action.payload);
    },
    selectInvoice: (state, action: PayloadAction<Invoice | null>) => {
      state.selectedInvoice = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all invoices
      .addCase(fetchAllInvoices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = action.payload;
      })
      .addCase(fetchAllInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch invoice by ID
      .addCase(fetchInvoiceById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchInvoiceById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedInvoice = action.payload;
      })
      .addCase(fetchInvoiceById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create invoice
      .addCase(createNewInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices.push(action.payload);
      })
      .addCase(createNewInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update invoice
      .addCase(updateExistingInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateExistingInvoice.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.invoices.findIndex(invoice => invoice.id === action.payload.id);
        if (index !== -1) {
          state.invoices[index] = action.payload;
        }
      })
      .addCase(updateExistingInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete invoice
      .addCase(removeInvoice.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeInvoice.fulfilled, (state, action) => {
        state.loading = false;
        state.invoices = state.invoices.filter(invoice => invoice.id !== action.payload);
      })
      .addCase(removeInvoice.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
  },
});

export const { setLoading, setInvoices, addInvoice, updateInvoice, deleteInvoice, selectInvoice } = invoicesSlice.actions;
export default invoicesSlice.reducer;