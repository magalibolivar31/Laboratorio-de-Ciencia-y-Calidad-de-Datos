import { Router } from 'express';
import { searchDatasets } from '../controllers/dataset.controller';

const router = Router();

// Endpoint para disparar el motor de Python
router.post('/search', searchDatasets);

export default router;
