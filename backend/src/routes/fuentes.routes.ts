import { Router } from 'express';
import { getFuentes, createFuente, updateFuente, toggleFuente, deleteFuente } from '../controllers/fuentes.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();

router.get('/', authMiddleware, getFuentes);
router.post('/', adminMiddleware, createFuente);
router.put('/:id', adminMiddleware, updateFuente);
router.patch('/:id/toggle', adminMiddleware, toggleFuente);
router.delete('/:id', adminMiddleware, deleteFuente);

export default router;
