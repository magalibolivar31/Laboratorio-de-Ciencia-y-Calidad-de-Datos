import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit.helper';

export const getHistorialBusquedas = async (req: any, res: Response) => {
  try {
    const busquedas = await prisma.historialBusqueda.findMany({
      where: { usuario_id: req.usuarioId },
      orderBy: { created_at: 'desc' },
      take: 100
    });
    res.json(busquedas);
  } catch {
    res.status(500).json({ error: 'Error al obtener historial de búsquedas' });
  }
};

export const deleteHistorialBusqueda = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const result = await prisma.historialBusqueda.deleteMany({
      where: { id: parseInt(id), usuario_id: req.usuarioId }
    });
    if (result.count === 0) return res.status(404).json({ error: 'Registro no encontrado' });
    res.json({ mensaje: 'Registro eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar del historial' });
  }
};

export const getHistorialExportaciones = async (req: any, res: Response) => {
  try {
    const exportaciones = await prisma.historialExportacion.findMany({
      where: { usuario_id: req.usuarioId },
      include: {
        busqueda: true,
        usuario: { select: { nombre: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(exportaciones);
  } catch {
    res.status(500).json({ error: 'Error al obtener exportaciones' });
  }
};

export const getExportacionesPublicas = async (req: any, res: Response) => {
  try {
    const exportaciones = await prisma.historialExportacion.findMany({
      where: { publica: true },
      include: {
        busqueda: true,
        usuario: { select: { nombre: true } }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(exportaciones);
  } catch {
    res.status(500).json({ error: 'Error al obtener exportaciones públicas' });
  }
};

export const toggleVisibilidadExportacion = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const exportacion = await prisma.historialExportacion.findFirst({
      where: { id: parseInt(id), usuario_id: req.usuarioId }
    });
    if (!exportacion) return res.status(404).json({ error: 'Exportación no encontrada.' });

    const updated = await prisma.historialExportacion.update({
      where: { id: parseInt(id) },
      data: { publica: !exportacion.publica }
    });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: 'Error al actualizar la visibilidad.' });
  }
};

export const saveExportacion = async (req: any, res: Response) => {
  try {
    const { filename, busqueda_id, publica, descripcion, nombre } = req.body;
    if (!filename) return res.status(400).json({ error: 'Falta el nombre del archivo.' });
    if (publica && !nombre?.trim()) return res.status(400).json({ error: 'El nombre es obligatorio para exportaciones públicas.' });
    if (publica && !descripcion?.trim()) return res.status(400).json({ error: 'La descripción es obligatoria para exportaciones públicas.' });

    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const rootDir = path.resolve(__dirname, '../../../');
    const filePath = path.join(rootDir, 'exports', filename);

    let tamanio: number | null = null;
    try { tamanio = fs.statSync(filePath).size; } catch {}

    const exportacion = await prisma.historialExportacion.create({
      data: {
        usuario_id: req.usuarioId,
        busqueda_id: busqueda_id ?? null,
        nombre_archivo: filename,
        formato: 'xlsx',
        tamanio_bytes: tamanio,
        url: `${backendUrl}/exports/${encodeURIComponent(filename)}`,
        nombre: nombre?.trim() || null,
        publica: publica === true,
        descripcion: descripcion?.trim() || null,
      }
    });

    await logAudit(req.usuarioId, 'EXPORTACION', 'Dataset', undefined, `${filename} | ${publica ? 'pública' : 'privada'}`);
    res.json(exportacion);
  } catch (err: any) {
    console.error('[SAVE EXPORT ERROR]', err);
    res.status(500).json({ error: 'Error al guardar la exportación.' });
  }
};
