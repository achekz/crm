import { Router } from 'express';
import {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  importClientsFromMongoDB,
  createClientAccount
} from '../controllers/clientController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

// All client routes require authentication
router.use(protect);

// Most routes are admin-only
router.get('/', restrictTo('admin'), getAllClients);
router.post('/', restrictTo('admin'), createClient);
router.post('/import', restrictTo('admin'), importClientsFromMongoDB);
router.post('/create-account', restrictTo('admin'), createClientAccount);

// Specific client operations
router.get('/:id', restrictTo('admin'), getClientById);
router.patch('/:id', restrictTo('admin'), updateClient);
router.delete('/:id', restrictTo('admin'), deleteClient);

export default router; 