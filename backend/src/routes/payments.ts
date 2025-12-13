import { Router } from 'express';
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  createPaymentIntent,
  createCheckoutSession,
  handleWebhook,
  checkPaymentStatus
} from '../controllers/paymentController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

// Webhook route - no auth required
// Note: Do not use express.json() middleware for this route
// Raw body parsing is handled in server.ts
router.post('/webhook', handleWebhook);

// All other payment routes require authentication
router.use(protect);

// GET all payments - available to both admin and client (filtered by client's own payments)
router.get('/', getAllPayments);

// GET payment status from Stripe - must come before the /:id route to avoid conflicts
router.get('/status/:paymentIntentId', checkPaymentStatus);

// GET specific payment - available to admin and client (if owns the payment)
router.get('/:id', getPaymentById);

// POST create payment intent - available to both admin and client (for owned invoice)
router.post('/intent', createPaymentIntent);

// POST create checkout session - available to both admin and client (for owned invoice)
router.post('/checkout', createCheckoutSession);

// POST, PATCH, DELETE - admin only
router.post('/', restrictTo('admin'), createPayment);
router.patch('/:id', restrictTo('admin'), updatePayment);
router.delete('/:id', restrictTo('admin'), deletePayment);

export default router; 