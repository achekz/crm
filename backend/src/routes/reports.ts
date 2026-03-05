import { Router } from 'express';
import { 
  getDashboardStats, 
  getFinancialReports, 
  getClientReports, 
  getAppointmentReports,
  exportReports
} from '../controllers/reportController';
import { protect } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(protect);

// Dashboard statistics
router.get('/dashboard', getDashboardStats);

// Individual report types
router.get('/financial', getFinancialReports);
router.get('/clients', getClientReports);
router.get('/appointments', getAppointmentReports);

// Export all reports
router.get('/export', exportReports);

export default router;