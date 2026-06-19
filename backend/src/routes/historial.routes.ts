import { Router } from 'express';
import {
  getHistorialBusquedas, deleteHistorialBusqueda,
  getHistorialExportaciones, getExportacionesPublicas,
  saveExportacion, toggleVisibilidadExportacion
} from '../controllers/historial.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();
router.use(authMiddleware);

router.get('/busquedas', getHistorialBusquedas);
router.delete('/busquedas/:id', deleteHistorialBusqueda);
router.get('/exportaciones', getHistorialExportaciones);
router.get('/exportaciones/publicas', getExportacionesPublicas);
router.post('/exportaciones', saveExportacion);
router.patch('/exportaciones/:id/visibilidad', toggleVisibilidadExportacion);

export default router;
