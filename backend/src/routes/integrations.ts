import { Router } from 'express';
import { 
  getAllIntegrations, 
  getIntegrationById, 
  createIntegration, 
  updateIntegration, 
  deleteIntegration,
  testIntegration,
  getIntegrationStats
} from '../controllers/integrationController';
import { protect, restrictTo } from '../middleware/auth';
import { validateObjectIdParam } from '../middleware/validation';

const router = Router();

// All routes require admin authentication
router.use(protect, restrictTo('admin'));

// Integration statistics
router.get('/stats', getIntegrationStats);

// CRUD operations
router.get('/', getAllIntegrations);
router.get('/:id', validateObjectIdParam('id'), getIntegrationById);
router.post('/', createIntegration);
router.patch('/:id', validateObjectIdParam('id'), updateIntegration);
router.delete('/:id', validateObjectIdParam('id'), deleteIntegration);

// Test integration connection
router.post('/:id/test', validateObjectIdParam('id'), testIntegration);

export default router;