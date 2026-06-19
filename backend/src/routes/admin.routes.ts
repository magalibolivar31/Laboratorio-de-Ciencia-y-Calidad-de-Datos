import { Router } from 'express';
import { getUsuarios, updateRolUsuario, toggleActivoUsuario, getAuditoria } from '../controllers/admin.controller';
import { adminMiddleware } from '../middlewares/admin.middleware';

const router = Router();
router.use(adminMiddleware);

router.get('/usuarios', getUsuarios);
router.put('/usuarios/:id/rol', updateRolUsuario);
router.patch('/usuarios/:id/toggle', toggleActivoUsuario);
router.get('/auditoria', getAuditoria);

export default router;
