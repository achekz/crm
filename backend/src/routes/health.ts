import { Router } from 'express';
import { 
  getHealthStatus, 
  getDatabaseHealth, 
  getSystemHealth 
} from '../controllers/healthController';

const router = Router();

// No authentication required for health checks
// These endpoints are used by monitoring systems and load balancers

// Main health check endpoint
router.get('/', getHealthStatus);

// Database health check
router.get('/database', getDatabaseHealth);

// System health check (CPU, memory, disk)
router.get('/system', getSystemHealth);

export default router;