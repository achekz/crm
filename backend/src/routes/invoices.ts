import { Router } from 'express';
import {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  generatePdf
} from '../controllers/invoiceController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

// All invoice routes require authentication
router.use(protect);

// GET all invoices - available to both admin and client (filtered by client's own invoices)
router.get('/', getAllInvoices);

// GET specific invoice - available to admin and client (if owns the invoice)
router.get('/:id', getInvoiceById);

// GET PDF for invoice - available to admin and client (if owns the invoice)
router.get('/:id/pdf', generatePdf);

// POST, PATCH, DELETE - admin only
router.post('/', restrictTo('admin'), createInvoice);
router.patch('/:id', restrictTo('admin'), updateInvoice);
router.delete('/:id', restrictTo('admin'), deleteInvoice);

export default router; 