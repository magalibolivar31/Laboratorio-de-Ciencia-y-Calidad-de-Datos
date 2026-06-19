import { Response } from 'express';
import prisma from '../lib/prisma';

const mask = (t: any) => ({ ...t, api_key_cifrada: t.api_key_cifrada ? '••••••••' : null });

export const getTokens = async (req: any, res: Response) => {
  try {
    const tokens = await prisma.token.findMany({
      where: { usuario_id: req.usuarioId },
      include: { fuente: { select: { id: true, nombre: true, tipo: true, descripcion: true, url_base: true, activa: true } } },
      orderBy: { created_at: 'desc' }
    });
    res.json(tokens.map(mask));
  } catch {
    res.status(500).json({ error: 'Error al obtener las conexiones' });
  }
};

export const addToken = async (req: any, res: Response) => {
  try {
    const { servicio, api_key, fuente_id, usuario_api } = req.body;
    if (!servicio || !api_key) return res.status(400).json({ error: 'Servicio y API Key son requeridos' });

    // Un token por servicio por usuario
    const existing = await prisma.token.findFirst({
      where: { usuario_id: req.usuarioId, servicio }
    });
    if (existing) {
      const updated = await prisma.token.update({
        where: { id: existing.id },
        data: {
          api_key_cifrada: api_key,
          ...(fuente_id !== undefined && { fuente_id: fuente_id || null }),
          ...(usuario_api !== undefined && { usuario_api: usuario_api || null }),
          activa: true,
        }
      });
      return res.json(mask(updated));
    }

    const token = await prisma.token.create({
      data: {
        usuario_id: req.usuarioId,
        servicio,
        api_key_cifrada: api_key,
        fuente_id: fuente_id || null,
        usuario_api: usuario_api || null,
        activa: true,
      }
    });
    res.status(201).json(mask(token));
  } catch {
    res.status(500).json({ error: 'Error al guardar la conexión' });
  }
};

export const updateToken = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { servicio, api_key, usuario_api, fuente_id } = req.body;

    const data: any = {
      ...(servicio && { servicio }),
      ...(api_key?.trim() && { api_key_cifrada: api_key.trim() }),
      ...(usuario_api !== undefined && { usuario_api: usuario_api || null }),
      ...(fuente_id !== undefined && { fuente_id: fuente_id || null }),
    };

    const result = await prisma.token.updateMany({
      where: { id: parseInt(id), usuario_id: req.usuarioId },
      data
    });
    if (result.count === 0) return res.status(404).json({ error: 'Conexión no encontrada' });
    res.json({ mensaje: 'Conexión actualizada' });
  } catch {
    res.status(500).json({ error: 'Error al actualizar la conexión' });
  }
};

export const toggleToken = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const token = await prisma.token.findFirst({
      where: { id: parseInt(id), usuario_id: req.usuarioId }
    });
    if (!token) return res.status(404).json({ error: 'Conexión no encontrada' });
    const updated = await prisma.token.update({
      where: { id: parseInt(id) },
      data: { activa: !token.activa }
    });
    res.json(mask(updated));
  } catch {
    res.status(500).json({ error: 'Error al cambiar estado de la conexión' });
  }
};

export const deleteToken = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const result = await prisma.token.deleteMany({
      where: { id: parseInt(id), usuario_id: req.usuarioId }
    });
    if (result.count === 0) return res.status(404).json({ error: 'Conexión no encontrada' });
    res.json({ mensaje: 'Conexión eliminada' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar la conexión' });
  }
};
