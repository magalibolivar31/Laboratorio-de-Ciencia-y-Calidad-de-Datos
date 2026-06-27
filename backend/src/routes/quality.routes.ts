import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
  analyzeQuality, analyzeQualityUrl, uploadAndAnalyze,
  getQualityReport, getQualityHistory, compareQuality, validateQuality,
} from '../controllers/quality.controller';
import { authMiddleware, optionalAuth } from '../middlewares/auth.middleware';

// Encuentra la raíz que contiene python/ y exports/ (igual que el controller)
const findRoot = (start: string): string => {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'python', 'etl.py'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
};

const exportsPath = path.join(findRoot(__dirname), 'exports');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(exportsPath)) fs.mkdirSync(exportsPath, { recursive: true });
    cb(null, exportsPath);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `UPLOAD_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.csv', '.xlsx', '.xls', '.tsv'].includes(ext)) cb(null, true);
    else cb(new Error('Formato no soportado. Subí un archivo .csv o .xlsx.'));
  },
});

// Wrapper que captura errores de multer y los devuelve como JSON claro.
const uploadSingle = (req: any, res: any, next: any) => {
  upload.single('file')(req, res, (err: any) => {
    if (err) return res.status(400).json({ error: err.message || 'Error al subir el archivo.' });
    next();
  });
};

const router = Router();

router.post('/analyze', optionalAuth, analyzeQuality);
router.post('/analyze-url', optionalAuth, analyzeQualityUrl);
router.post('/upload-analyze', optionalAuth, uploadSingle, uploadAndAnalyze);
router.post('/validate', optionalAuth, validateQuality);
router.get('/compare', optionalAuth, compareQuality);
router.get('/history', authMiddleware, getQualityHistory);
router.get('/report/:id', optionalAuth, getQualityReport);

export default router;
