import { Router } from 'express';
import {
  getAllPayments,
  getPaymentById,
  createPayment,
  updatePayment,
  deletePayment,
  processStripePayment
} from '../controllers/paymentController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

// All payment routes require authentication
router.use(protect);

// GET all payments - available to both admin and client (filtered by client's own payments)
router.get('/', getAllPayments);

// GET specific payment - available to admin and client (if owns the payment)
router.get('/:id', getPaymentById);

// POST process Stripe payment - available to both admin and client (for owned invoice)
router.post('/stripe', processStripePayment);

// POST, PATCH, DELETE - admin only
router.post('/', restrictTo('admin'), createPayment);
router.patch('/:id', restrictTo('admin'), updatePayment);
router.delete('/:id', restrictTo('admin'), deletePayment);

export default router; 