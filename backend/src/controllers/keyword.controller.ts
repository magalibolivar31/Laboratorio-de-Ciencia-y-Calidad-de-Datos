import { Response } from 'express';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit.helper';

export const getKeywords = async (req: any, res: Response) => {
  try {
    const { categoria } = req.query;
    const where: any = { usuario_id: req.usuarioId };
    if (categoria) where.categoria = categoria;
    const keywords = await prisma.keyword.findMany({
      where,
      orderBy: [{ categoria: 'asc' }, { palabra: 'asc' }]
    });
    res.json(keywords);
  } catch {
    res.status(500).json({ error: 'Error al obtener keywords' });
  }
};

export const getCategorias = async (req: any, res: Response) => {
  try {
    const keywords = await prisma.keyword.findMany({
      where: { usuario_id: req.usuarioId },
      select: { categoria: true },
      distinct: ['categoria']
    });
    res.json(keywords.map((k: any) => k.categoria));
  } catch {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};

export const createKeyword = async (req: any, res: Response) => {
  try {
    const { palabra, categoria = 'General' } = req.body;
    if (!palabra) return res.status(400).json({ error: 'La palabra es requerida' });
    const keyword = await prisma.keyword.create({
      data: { usuario_id: req.usuarioId, palabra: palabra.trim(), categoria }
    });
    await logAudit(req.usuarioId, 'CREAR_KEYWORD', 'Keyword', String(keyword.id), palabra);
    res.status(201).json(keyword);
  } catch {
    res.status(500).json({ error: 'Error al crear keyword' });
  }
};

export const updateKeyword = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { palabra, categoria } = req.body;
    const result = await prisma.keyword.updateMany({
      where: { id: parseInt(id), usuario_id: req.usuarioId },
      data: {
        ...(palabra && { palabra: palabra.trim() }),
        ...(categoria && { categoria })
      }
    });
    if (result.count === 0) return res.status(404).json({ error: 'Keyword no encontrada' });
    res.json({ mensaje: 'Keyword actualizada' });
  } catch {
    res.status(500).json({ error: 'Error al actualizar keyword' });
  }
};

export const deleteKeyword = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const result = await prisma.keyword.deleteMany({
      where: { id: parseInt(id), usuario_id: req.usuarioId }
    });
    if (result.count === 0) return res.status(404).json({ error: 'Keyword no encontrada' });
    res.json({ mensaje: 'Keyword eliminada' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar keyword' });
  }
};

export const renameCategoria = async (req: any, res: Response) => {
  try {
    const { from, to } = req.body;
    if (!from || !to) return res.status(400).json({ error: 'from y to son requeridos' });
    if (from === to) return res.status(400).json({ error: 'Los nombres son iguales' });
    const result = await prisma.keyword.updateMany({
      where: { usuario_id: req.usuarioId, categoria: from },
      data: { categoria: to.trim() }
    });
    res.json({ mensaje: `Categoría renombrada`, count: result.count });
  } catch {
    res.status(500).json({ error: 'Error al renombrar categoría' });
  }
};

export const deleteCategoria = async (req: any, res: Response) => {
  try {
    const nombre = decodeURIComponent(req.params.nombre);
    if (nombre === 'General') return res.status(400).json({ error: 'No se puede eliminar la categoría General' });
    const result = await prisma.keyword.updateMany({
      where: { usuario_id: req.usuarioId, categoria: nombre },
      data: { categoria: 'General' }
    });
    res.json({ mensaje: `Categoría eliminada, ${result.count} keywords movidas a General`, count: result.count });
  } catch {
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
};

export const bulkCreateKeywords = async (req: any, res: Response) => {
  try {
    const { palabras, categoria = 'General' } = req.body;
    if (!palabras || !Array.isArray(palabras) || palabras.length === 0) {
      return res.status(400).json({ error: 'Debes enviar un array de palabras' });
    }
    const data = palabras
      .filter((p: string) => p && p.trim())
      .map((p: string) => ({ usuario_id: req.usuarioId, palabra: p.trim(), categoria }));
    const result = await prisma.keyword.createMany({ data, skipDuplicates: true });
    await logAudit(req.usuarioId, 'BULK_CREAR_KEYWORDS', 'Keyword', undefined, `${result.count} keywords`);
    res.status(201).json({ mensaje: `${result.count} keywords creadas`, count: result.count });
  } catch {
    res.status(500).json({ error: 'Error al crear keywords en masa' });
  }
};
