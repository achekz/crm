import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  userId: string;
  data?: {
    invoiceId?: string;
    invoiceNumber?: string;
    amount?: number;
    paymentId?: string;
    clientId?: string;
    redirectUrl?: string;
  };
}

export interface InvoiceNotification {
  type: 'new' | 'update' | 'status';
  invoiceId: string;
  number: string;
  amount: number;
  title: string;
  message: string;
  timestamp: Date;
}

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<Notification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount++;
      }
    },
    
    addInvoiceNotification: (state, action: PayloadAction<InvoiceNotification>) => {
      const { invoiceId, number, amount, title, message, timestamp, type } = action.payload;
      
      const notification: Notification = {
        id: uuidv4(),
        title,
        message,
        type: type === 'new' ? 'info' : type === 'update' ? 'warning' : 'success',
        timestamp: timestamp.toISOString(),
        read: false,
        userId: 'client', // For client-side notifications
        data: {
          invoiceId,
          invoiceNumber: number,
          amount,
          redirectUrl: `/client/invoices/${invoiceId}`
        }
      };
      
      state.notifications.unshift(notification);
      state.unreadCount++;
    },
    
    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount--;
      }
    },
    
    markAllAsRead: (state) => {
      state.notifications.forEach(n => n.read = true);
      state.unreadCount = 0;
    },
    
    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },
  },
});

export const { 
  addNotification, 
  addInvoiceNotification, 
  markAsRead, 
  markAllAsRead,
  clearNotifications 
} = notificationsSlice.actions;

export default notificationsSlice.reducer;