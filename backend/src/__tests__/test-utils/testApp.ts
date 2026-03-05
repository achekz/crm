import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { validateInput } from '../../middleware/validation';
import { apiLimiter } from '../../middleware/rateLimiter';
import {
  sendErrorResponse,
  AppError,
  handleLargeRequestError,
} from '../../utils/errorHandler';

// Routes
import authRoutes from '../../routes/auth';
import clientRoutes from '../../routes/clients';
import invoiceRoutes from '../../routes/invoices';
import quoteRoutes from '../../routes/quotes';
import paymentRoutes from '../../routes/payments';
import messageRoutes from '../../routes/messages';
import calendarRoutes from '../../routes/calendar';
import uploadRoutes from '../../routes/upload';
import integrationRoutes from '../../routes/integrations';
import appointmentRoutes from '../../routes/appointments';
import reportRoutes from '../../routes/reports';
import healthRoutes from '../../routes/health';
import backupRoutes from '../../routes/backup';

// Load environment variables
dotenv.config();

// Create Express app for testing
export const app = express();

// Middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(handleLargeRequestError);
app.use(helmet());

// Configure CORS for testing
app.use(cors({
  origin: '*',
  credentials: true
}));

// Input validation middleware
app.use(validateInput);

// Rate limiting
app.use('/api/', apiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/health", healthRoutes);
app.use("/api/backups", backupRoutes);

// 404 handler
app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  sendErrorResponse(res, err);
});

