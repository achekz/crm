import { Router } from 'express';
import {
  getAuthUrl,
  handleCallback,
  checkAuthStatus,
  addInvoiceToCalendar,
  revokeAccess
} from '../controllers/calendarController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

// All calendar routes require authentication and admin role
router.use(protect);
router.use(restrictTo('admin'));

// Get Google Calendar authorization URL
router.get('/auth-url', getAuthUrl);

// Handle Google Calendar callback (no auth required for callback)
router.get('/callback', handleCallback);

// Check if user is authorized with Google Calendar
router.get('/auth-status', checkAuthStatus);

// Add invoice to Google Calendar
router.post('/add-invoice', addInvoiceToCalendar);

// Revoke Google Calendar access
router.post('/revoke', revokeAccess);

export default router; 