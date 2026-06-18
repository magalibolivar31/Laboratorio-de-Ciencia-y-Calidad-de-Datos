import { Router } from 'express';
import { getDiccionarios, createDiccionario, updateDiccionario, deleteDiccionario, addKeywordToDiccionario, removeKeywordFromDiccionario } from '../controllers/diccionario.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/', getDiccionarios);
router.post('/', createDiccionario);
router.put('/:id', updateDiccionario);
router.delete('/:id', deleteDiccionario);
router.post('/:id/keywords', addKeywordToDiccionario);
router.delete('/:id/keywords/:keywordId', removeKeywordFromDiccionario);

export default router;
