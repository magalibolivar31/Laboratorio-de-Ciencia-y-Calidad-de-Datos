import { Response } from 'express';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit.helper';

const MASK = '••••••••';

const sanitize = (f: any) => ({ ...f, api_key: f.api_key ? MASK : null });

export const getFuentes = async (_req: any, res: Response) => {
  try {
    const fuentes = await prisma.fuenteDatos.findMany({ orderBy: { nombre: 'asc' } });
    res.json(fuentes.map(sanitize));
  } catch {
    res.status(500).json({ error: 'Error al obtener fuentes' });
  }
};

export const createFuente = async (req: any, res: Response) => {
  try {
    const { nombre, tipo, url_base, descripcion, api_key } = req.body;
    if (!nombre || !tipo) return res.status(400).json({ error: 'Nombre y tipo son requeridos' });
    const fuente = await prisma.fuenteDatos.create({
      data: { nombre, tipo, url_base, descripcion, api_key: api_key?.trim() || null }
    });
    await logAudit(req.usuarioId, 'CREAR_FUENTE', 'FuenteDatos', String(fuente.id), nombre);
    res.status(201).json(sanitize(fuente));
  } catch {
    res.status(500).json({ error: 'Error al crear fuente' });
  }
};

export const updateFuente = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, tipo, url_base, descripcion, api_key } = req.body;

    // Solo actualiza api_key si se envió un valor no vacío; si es vacío lo ignora (no borra la key existente)
    const data: any = {
      ...(nombre && { nombre }),
      ...(tipo && { tipo }),
      ...(url_base !== undefined && { url_base }),
      ...(descripcion !== undefined && { descripcion }),
      ...(api_key?.trim() && { api_key: api_key.trim() }),
    };

    const fuente = await prisma.fuenteDatos.update({ where: { id: parseInt(id) }, data });
    await logAudit(req.usuarioId, 'EDITAR_FUENTE', 'FuenteDatos', String(id), nombre);
    res.json(sanitize(fuente));
  } catch {
    res.status(500).json({ error: 'Error al actualizar fuente' });
  }
};

export const toggleFuente = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const fuente = await prisma.fuenteDatos.findUnique({ where: { id: parseInt(id) } });
    if (!fuente) return res.status(404).json({ error: 'Fuente no encontrada' });
    const updated = await prisma.fuenteDatos.update({
      where: { id: parseInt(id) },
      data: { activa: !fuente.activa }
    });
    await logAudit(req.usuarioId, updated.activa ? 'ACTIVAR_FUENTE' : 'DESACTIVAR_FUENTE', 'FuenteDatos', String(id), fuente.nombre);
    res.json(sanitize(updated));
  } catch {
    res.status(500).json({ error: 'Error al cambiar estado de fuente' });
  }
};

export const deleteFuente = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.fuenteDatos.delete({ where: { id: parseInt(id) } });
    await logAudit(req.usuarioId, 'ELIMINAR_FUENTE', 'FuenteDatos', String(id));
    res.json({ mensaje: 'Fuente eliminada' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar fuente' });
  }
};
