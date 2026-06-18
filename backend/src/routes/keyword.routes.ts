import { Router } from 'express';
import { getKeywords, getCategorias, createKeyword, updateKeyword, deleteKeyword, bulkCreateKeywords, renameCategoria, deleteCategoria } from '../controllers/keyword.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', getKeywords);
router.get('/categorias', getCategorias);
router.patch('/categorias/rename', renameCategoria);
router.delete('/categorias/:nombre', deleteCategoria);
router.post('/', createKeyword);
router.post('/bulk', bulkCreateKeywords);
router.put('/:id', updateKeyword);
router.delete('/:id', deleteKeyword);

export default router;
