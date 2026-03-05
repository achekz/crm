import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import http from "http";
import connectDB from "./config/database";
import { apiLimiter, loginLimiter } from './middleware/rateLimiter';
import { validateInput } from './middleware/validation';
import logger, { requestLogger, errorLogger, logInfo, logError, logSecurity } from './utils/logger';
import {
  sendErrorResponse,
  AppError,
  handleLargeRequestError,
} from "./utils/errorHandler";
import { initializeSocket } from "./utils/socket";
import { setSocketInstance } from "./controllers/invoiceController";
import backupService from "./services/backupService";
import { setupSwagger } from "./config/swagger";
import databaseConnection from "./config/database";
import { handleStripeWebhook } from "./controllers/paymentController";

// Routes
import authRoutes from "./routes/auth";
import clientRoutes from "./routes/clients";
import invoiceRoutes from "./routes/invoices";
import quoteRoutes from "./routes/quotes";
import paymentRoutes from "./routes/payments";
import messageRoutes from "./routes/messages";
import calendarRoutes from "./routes/calendar";
import uploadRoutes from "./routes/upload";
import integrationRoutes from "./routes/integrations";
import appointmentRoutes from "./routes/appointments";
import reportRoutes from "./routes/reports";
import healthRoutes from "./routes/health";
import backupRoutes from "./routes/backup";
import path from "path";

// Load environment variables
dotenv.config();

// Connect to MongoDB
databaseConnection.connect();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Middleware
// Raw body parser for Stripe webhooks - should come BEFORE the JSON parser
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.originalUrl === '/api/payments/webhook') {
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk.toString();
    });
    req.on('end', () => {
      (req as any).rawBody = Buffer.from(rawBody);
      next();
    });
  } else {
    next();
  }
});

// Increase JSON body size limit to 10MB for handling base64 encoded images
app.use(express.json({ limit: "10mb", verify: (req: any, _: Response, buf: Buffer) => {
  // Save raw body for webhook verification
  if (req.originalUrl === '/api/payments/webhook') {
    req.rawBody = buf;
  }
}}));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(handleLargeRequestError); // Handle "request entity too large" errors

// Request logging middleware
app.use(requestLogger);

// Configure CORS with specific allowed origins
const allowedOrigins = [
  'http://localhost:5173', // Frontend development
  'http://localhost:3000', // Alternative frontend port
  process.env.FRONTEND_URL // Production frontend URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies to be sent with requests
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
})); // Enable CORS with security
app.use(helmet()); // Security headers

// Input validation middleware
app.use(validateInput);

// API rate limiting
app.use('/api', apiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/quotes", quoteRoutes);

// Handle Stripe webhook before JSON parsing
app.post("/api/payments/webhook", (req: Request, res: Response, next: NextFunction) => {
  void handleStripeWebhook(req, res, next);
});
app.use("/api/payments", paymentRoutes);

app.use("/api/messages", messageRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/integrations", integrationRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/reports", reportRoutes);

// Health check routes (no auth required)
app.use("/api/health", healthRoutes);

// Backup routes (admin only)
app.use("/api/backups", backupRoutes);

// API Documentation
setupSwagger(app);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// 404 handler - route not found
app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

app.use(errorLogger);

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  sendErrorResponse(res, err);
});

// Initialize Socket.IO
const io = initializeSocket(server);

// Share the Socket.IO instance with the invoice controller for notifications
setSocketInstance(io);

// Initialize scheduled backups
if (process.env.NODE_ENV === 'production') {
  backupService.startScheduledBackups();
  logInfo('Automated database backups started');
}

// Start server
const HOST = '0.0.0.0';
server.listen(PORT, HOST as any, () => {
  logInfo(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  logInfo("Socket.IO server initialized with invoice notifications support");
  logInfo(`Accessible at: http://localhost:${PORT}`);
});
