import { Router } from 'express';
import { register, login, googleLogin, updateProfile, changePassword, requestReset, resetPassword } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleLogin);
router.put('/profile', authMiddleware, updateProfile);
router.put('/password', authMiddleware, changePassword);
router.post('/forgot-password', requestReset);
router.post('/reset-password', resetPassword);

export default router;
