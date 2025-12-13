import { Router } from 'express';
import { register, login, getCurrentUser, updateProfile, updateAvatar, getClientUsers } from '../controllers/authController';
import { protect, restrictTo } from '../middleware/auth';
// import { loginLimiter } from '../middleware/rateLimiter';

const router = Router();

// Public routes - for self-registration
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/me', protect, getCurrentUser);
router.patch('/profile', protect, updateProfile);
router.patch('/avatar', protect, updateAvatar);

// Admin routes
router.get('/client-users', protect, restrictTo('admin'), getClientUsers);

// Admin-only route to create client users
router.post('/admin/register', protect, restrictTo('admin'), register);

export default router; 