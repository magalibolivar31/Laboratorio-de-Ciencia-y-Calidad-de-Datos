import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth.routes';
import datasetRoutes from './routes/dataset.routes';
import tokenRoutes from './routes/token.routes';
import keywordRoutes from './routes/keyword.routes';
import diccionarioRoutes from './routes/diccionario.routes';
import historialRoutes from './routes/historial.routes';
import fuentesRoutes from './routes/fuentes.routes';
import adminRoutes from './routes/admin.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

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
app.use('/exports', express.static(path.join(findRoot(__dirname), 'exports')));

app.use('/api/auth', authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/tokens', tokenRoutes);
app.use('/api/keywords', keywordRoutes);
app.use('/api/diccionarios', diccionarioRoutes);
app.use('/api/historial', historialRoutes);
app.use('/api/fuentes', fuentesRoutes);
app.use('/api/admin', adminRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, message: 'Servidor del TFI operativo' });
});

app.listen(PORT, () => {
  console.log(`[BACKEND] Servidor corriendo en http://localhost:${PORT}`);
});
