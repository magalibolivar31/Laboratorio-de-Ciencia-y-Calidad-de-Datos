import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// RUTAS
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'Servidor del TFI operativo' });
});

app.listen(PORT, () => {
  console.log(`[BACKEND] Servidor corriendo en http://localhost:${PORT}`);
});
