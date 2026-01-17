import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import http from "http";
import connectDB from "./config/database";
//import { apiLimiter } from './middleware/rateLimiter';
import {
  sendErrorResponse,
  AppError,
  handleLargeRequestError,
} from "./utils/errorHandler";
import { initializeSocket } from "./utils/socket";
import { setSocketInstance } from "./controllers/invoiceController";

// Routes
import authRoutes from "./routes/auth";
import clientRoutes from "./routes/clients";
import invoiceRoutes from "./routes/invoices";
import quoteRoutes from "./routes/quotes";
import paymentRoutes from "./routes/payments";
import messageRoutes from "./routes/messages";
import calendarRoutes from "./routes/calendar";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

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
app.use(cors()); // Enable CORS
app.use(helmet()); // Security headers
app.use(morgan("dev")); // Request logger

// API rate limiting
//app.use('/api', apiLimiter);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/calendar", calendarRoutes);

// Health check route
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" });
});

// 404 handler - route not found
app.all("*", (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response) => {
  sendErrorResponse(res, err);
});

// Initialize Socket.IO
const io = initializeSocket(server);

// Share the Socket.IO instance with the invoice controller for notifications
setSocketInstance(io);

// Start server
const HOST = '0.0.0.0';
server.listen(PORT, HOST as any, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log("Socket.IO server initialized with invoice notifications support");
  console.log(`Accessible at: http://localhost:${PORT}`);
});
