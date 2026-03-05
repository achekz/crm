import { Router } from 'express';
import { 
  createBackup, 
  listBackups, 
  restoreBackup, 
  deleteBackup, 
  getBackupConfig, 
  cleanupBackups 
} from '../controllers/backupController';
import { protect, restrictTo } from '../middleware/auth';

const router = Router();

// All backup operations require admin authentication
router.use(protect);
router.use(restrictTo('admin'));

// Backup management
router.post('/', createBackup); // Create manual backup
router.get('/', listBackups); // List available backups
router.post('/restore', restoreBackup); // Restore from backup
router.delete('/:filename', deleteBackup); // Delete specific backup
router.get('/config', getBackupConfig); // Get backup configuration
router.post('/cleanup', cleanupBackups); // Manual cleanup of old backups

export default router;