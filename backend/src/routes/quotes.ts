import { Router } from 'express';
import {
  getAllQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  deleteQuote,
  generatePdf,
  convertToInvoice
} from '../controllers/quoteController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

// All quote routes require authentication
router.use(protect);

// GET all quotes - available to both admin and client (filtered by client's own quotes)
router.get('/', getAllQuotes);

// GET specific quote - available to admin and client (if owns the quote)
router.get('/:id', getQuoteById);

// GET PDF for quote - available to admin and client (if owns the quote)
router.get('/:id/pdf', generatePdf);

// POST, PATCH, DELETE - admin only
router.post('/', restrictTo('admin'), createQuote);
router.patch('/:id', restrictTo('admin'), updateQuote);
router.delete('/:id', restrictTo('admin'), deleteQuote);

// Convert quote to invoice - admin only
router.post('/:id/convert', restrictTo('admin'), convertToInvoice);

export default router;

