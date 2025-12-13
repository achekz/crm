import { Request } from "express";
import { Types } from "mongoose";
import { IClient } from "../models/Client";
import { IInvoice } from "../models/Invoice";
import { IPayment } from "../models/Payment";
import { IMessage } from "../models/Message";

export interface IUser {
  _id: string;
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'client';
  company?: string;
  phone?: string;
  address?: string;
  avatar?: string;
  googleCalendarTokens?: {
    access_token: string;
    refresh_token: string;
    scope: string;
    token_type: string;
    expiry_date: number;
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: "admin" | "client";
  };
}

export interface LoginResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role: "admin" | "client";
    company?: string;
    phone?: string;
    address?: string;
    avatar?: string;
  };
  token: string;
}

export interface ClientResponse {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  address: string;
  createdAt: string;
  lastActivity: string;
  status: string;
  totalInvoices: number;
  totalPaid: number;
  totalPending: number;
}

export interface InvoiceItemResponse {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceResponse {
  id: string;
  number: string;
  clientId: string;
  clientName: string;
  date: string;
  dueDate: string;
  status: string;
  items: InvoiceItemResponse[];
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export interface PaymentResponse {
  id: string;
  invoiceId: string;
  clientId: string;
  clientName: string;
  amount: number;
  date: string;
  method: string;
  status: string;
  reference?: string;
  notes?: string;
}

export interface MessageResponse {
  id: string;
  senderId: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: "admin" | "client";
  };
  receiverId: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: "admin" | "client";
  };
  content: string;
  messageType: "text" | "file" | "image";
  fileName?: string;
  fileUrl?: string;
  conversationId: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationResponse {
  conversationId: string;
  otherUser: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    role: "admin" | "client";
  };
  lastMessage: MessageResponse;
  unreadCount: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
}
