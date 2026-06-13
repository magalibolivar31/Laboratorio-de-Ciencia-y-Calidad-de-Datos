import { Router } from 'express';
import { getTokens, addToken, updateToken, deleteToken } from '../controllers/token.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

// Todas las rutas de tokens requieren autenticación
router.use(authMiddleware);

router.get('/', getTokens);
router.post('/', addToken);
router.put('/:id', updateToken);
router.delete('/:id', deleteToken);

export default router;
