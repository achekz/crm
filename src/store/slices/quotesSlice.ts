import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Quote {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  date: string;
  validUntil: string;
  status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

interface QuotesState {
  quotes: Quote[];
  loading: boolean;
  selectedQuote: Quote | null;
}

const initialState: QuotesState = {
  quotes: [],
  loading: false,
  selectedQuote: null,
};

const quotesSlice = createSlice({
  name: 'quotes',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setQuotes: (state, action: PayloadAction<Quote[]>) => {
      state.quotes = action.payload;
    },
    addQuote: (state, action: PayloadAction<Quote>) => {
      state.quotes.push(action.payload);
    },
    updateQuote: (state, action: PayloadAction<Quote>) => {
      const index = state.quotes.findIndex(quote => quote.id === action.payload.id);
      if (index !== -1) {
        state.quotes[index] = action.payload;
      }
    },
    deleteQuote: (state, action: PayloadAction<string>) => {
      state.quotes = state.quotes.filter(quote => quote.id !== action.payload);
    },
    selectQuote: (state, action: PayloadAction<Quote | null>) => {
      state.selectedQuote = action.payload;
    },
  },
});

export const { setLoading, setQuotes, addQuote, updateQuote, deleteQuote, selectQuote } = quotesSlice.actions;
export default quotesSlice.reducer;