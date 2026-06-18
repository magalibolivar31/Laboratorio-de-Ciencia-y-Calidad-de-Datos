import { Router } from 'express';
import { register, login, updateProfile, changePassword } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.put('/profile', authMiddleware, updateProfile);
router.put('/password', authMiddleware, changePassword);

export default router;
