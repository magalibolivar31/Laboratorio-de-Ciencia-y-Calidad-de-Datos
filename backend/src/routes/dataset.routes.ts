import { Router } from 'express';
import { searchDatasets } from '../controllers/dataset.controller';
import { optionalAuth } from '../middlewares/auth.middleware';

const router = Router();

router.post('/search', optionalAuth, searchDatasets);

export default router;
