import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import * as paymentService from '../../services/paymentService';

export interface Payment {
  id: string;
  invoiceId: string;
  clientId: string;
  clientName: string;
  amount: number;
  date: string;
  method: 'bank_transfer' | 'check' | 'cash' | 'card';
  status: 'pending' | 'completed' | 'failed';
  reference?: string;
  notes?: string;
}

interface PaymentsState {
  payments: Payment[];
  loading: boolean;
  error: string | null;
  selectedPayment: Payment | null;
}

// Async thunks
export const fetchAllPayments = createAsyncThunk(
  'payments/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      return await paymentService.fetchPayments();
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payments');
    }
  }
);

export const fetchPaymentById = createAsyncThunk(
  'payments/fetchById',
  async (id: string, { rejectWithValue }) => {
    try {
      return await paymentService.fetchPaymentById(id);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payment');
    }
  }
);

export const createNewPayment = createAsyncThunk(
  'payments/create',
  async (paymentData: Omit<Payment, 'id'>, { rejectWithValue }) => {
    try {
      return await paymentService.createPayment(paymentData);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create payment');
    }
  }
);

export const updateExistingPayment = createAsyncThunk(
  'payments/update',
  async ({ id, data }: { id: string; data: Partial<Payment> }, { rejectWithValue }) => {
    try {
      return await paymentService.updatePayment(id, data);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update payment');
    }
  }
);

export const removePayment = createAsyncThunk(
  'payments/delete',
  async (id: string, { rejectWithValue }) => {
    try {
      await paymentService.deletePayment(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete payment');
    }
  }
);

// Mock data for initial development
const mockPayments: Payment[] = [
  {
    id: '1',
    invoiceId: '1',
    clientId: '1',
    clientName: 'Jean Dupont',
    amount: 38400,
    date: '2024-01-20',
    method: 'bank_transfer',
    status: 'completed',
    reference: 'VIR-20240120-001',
  },
];

const initialState: PaymentsState = {
  payments: mockPayments,
  loading: false,
  error: null,
  selectedPayment: null,
};

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setPayments: (state, action: PayloadAction<Payment[]>) => {
      state.payments = action.payload;
    },
    addPayment: (state, action: PayloadAction<Payment>) => {
      state.payments.push(action.payload);
    },
    updatePayment: (state, action: PayloadAction<Payment>) => {
      const index = state.payments.findIndex(payment => payment.id === action.payload.id);
      if (index !== -1) {
        state.payments[index] = action.payload;
      }
    },
    selectPayment: (state, action: PayloadAction<Payment | null>) => {
      state.selectedPayment = action.payload;
    },
    deletePayment: (state, action: PayloadAction<string>) => {
      state.payments = state.payments.filter(payment => payment.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch all payments
      .addCase(fetchAllPayments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = action.payload;
      })
      .addCase(fetchAllPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Fetch payment by ID
      .addCase(fetchPaymentById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPaymentById.fulfilled, (state, action) => {
        state.loading = false;
        state.selectedPayment = action.payload;
      })
      .addCase(fetchPaymentById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Create payment
      .addCase(createNewPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createNewPayment.fulfilled, (state, action) => {
        state.loading = false;
        state.payments.push(action.payload);
      })
      .addCase(createNewPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Update payment
      .addCase(updateExistingPayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateExistingPayment.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.payments.findIndex(payment => payment.id === action.payload.id);
        if (index !== -1) {
          state.payments[index] = action.payload;
        }
      })
      .addCase(updateExistingPayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // Delete payment
      .addCase(removePayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removePayment.fulfilled, (state, action) => {
        state.loading = false;
        state.payments = state.payments.filter(payment => payment.id !== action.payload);
      })
      .addCase(removePayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
  }
});

export const { setLoading, setPayments, addPayment, updatePayment, selectPayment, deletePayment } = paymentsSlice.actions;
export default paymentsSlice.reducer;