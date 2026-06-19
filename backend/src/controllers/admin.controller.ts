import { Response } from 'express';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit.helper';

export const getUsuarios = async (_req: any, res: Response) => {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: { id: true, nombre: true, email: true, rol: true, activo: true, created_at: true },
      orderBy: { created_at: 'desc' }
    });
    res.json(usuarios);
  } catch {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

export const updateRolUsuario = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { rol } = req.body;
    if (!['INVESTIGADOR', 'ADMINISTRADOR'].includes(rol)) {
      return res.status(400).json({ error: 'Rol inválido. Use INVESTIGADOR o ADMINISTRADOR' });
    }
    await prisma.usuario.update({ where: { id: parseInt(id) }, data: { rol } });
    await logAudit(req.usuarioId, 'CAMBIAR_ROL', 'Usuario', String(id), rol);
    res.json({ mensaje: 'Rol actualizado' });
  } catch {
    res.status(500).json({ error: 'Error al actualizar rol' });
  }
};

export const toggleActivoUsuario = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.usuario.findUnique({ where: { id: parseInt(id) } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const updated = await prisma.usuario.update({
      where: { id: parseInt(id) },
      data: { activo: !user.activo }
    });
    await logAudit(req.usuarioId, updated.activo ? 'ACTIVAR_USUARIO' : 'DESACTIVAR_USUARIO', 'Usuario', String(id));
    res.json({ mensaje: `Usuario ${updated.activo ? 'activado' : 'desactivado'}` });
  } catch {
    res.status(500).json({ error: 'Error al cambiar estado del usuario' });
  }
};

export const getAuditoria = async (_req: any, res: Response) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { usuario: { select: { nombre: true, email: true } } },
      orderBy: { created_at: 'desc' },
      take: 500
    });
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Error al obtener auditoría' });
  }
};
