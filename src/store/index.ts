import { configureStore } from '@reduxjs/toolkit';
import authSlice from './slices/authSlice';
import clientsSlice from './slices/clientsSlice';
import invoicesSlice from './slices/invoicesSlice';
import quotesSlice from './slices/quotesSlice';
import paymentsSlice from './slices/paymentsSlice';
import messagesSlice from './slices/messagesSlice';
import notificationsSlice from './slices/notificationsSlice';

export const store = configureStore({
  reducer: {
    auth: authSlice,
    clients: clientsSlice,
    invoices: invoicesSlice,
    quotes: quotesSlice,
    payments: paymentsSlice,
    messages: messagesSlice,
    notifications: notificationsSlice,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;