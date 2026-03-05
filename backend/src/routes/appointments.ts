import { Router } from 'express';
import { 
  getAllAppointments, 
  getAppointmentById, 
  createAppointment, 
  updateAppointment, 
  deleteAppointment,
  getAppointmentStats
} from '../controllers/appointmentController';
import { protect } from '../middleware/auth';
import { validateObjectIdParam } from '../middleware/validation';

const router = Router();

// All routes require authentication
router.use(protect);

// Appointment statistics
router.get('/stats', getAppointmentStats);

// CRUD operations
router.get('/', getAllAppointments);
router.get('/:id', validateObjectIdParam('id'), getAppointmentById);
router.post('/', createAppointment);
router.patch('/:id', validateObjectIdParam('id'), updateAppointment);
router.delete('/:id', validateObjectIdParam('id'), deleteAppointment);

export default router;