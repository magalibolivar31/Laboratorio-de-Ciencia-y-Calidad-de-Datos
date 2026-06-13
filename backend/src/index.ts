import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth.routes';
import datasetRoutes from './routes/dataset.routes';
import tokenRoutes from './routes/token.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Servir archivos estáticos (los Excel generados)
app.use('/exports', express.static(path.join(__dirname, '../../exports')));

// RUTAS
app.use('/api/auth', authRoutes);
app.use('/api/datasets', datasetRoutes);
app.use('/api/tokens', tokenRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Servidor del TFI operativo' });
});

app.listen(PORT, () => {
  console.log(`[BACKEND] Servidor corriendo en http://localhost:${PORT}`);
});
