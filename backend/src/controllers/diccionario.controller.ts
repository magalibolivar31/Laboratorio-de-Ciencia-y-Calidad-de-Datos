import { Response } from 'express';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit.helper';

export const getDiccionarios = async (req: any, res: Response) => {
  try {
    const grupos = await prisma.grupoDiccionario.findMany({
      where: { usuario_id: req.usuarioId },
      include: { keywords: { include: { keyword: true } } },
      orderBy: { nombre: 'asc' }
    });
    res.json(grupos);
  } catch {
    res.status(500).json({ error: 'Error al obtener diccionarios' });
  }
};

export const createDiccionario = async (req: any, res: Response) => {
  try {
    const { nombre, descripcion } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
    const grupo = await prisma.grupoDiccionario.create({
      data: { usuario_id: req.usuarioId, nombre, descripcion }
    });
    await logAudit(req.usuarioId, 'CREAR_DICCIONARIO', 'GrupoDiccionario', String(grupo.id), nombre);
    res.status(201).json(grupo);
  } catch {
    res.status(500).json({ error: 'Error al crear diccionario' });
  }
};

export const updateDiccionario = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, descripcion } = req.body;
    const result = await prisma.grupoDiccionario.updateMany({
      where: { id: parseInt(id), usuario_id: req.usuarioId },
      data: {
        ...(nombre && { nombre }),
        ...(descripcion !== undefined && { descripcion })
      }
    });
    if (result.count === 0) return res.status(404).json({ error: 'Diccionario no encontrado' });
    res.json({ mensaje: 'Diccionario actualizado' });
  } catch {
    res.status(500).json({ error: 'Error al actualizar diccionario' });
  }
};

export const deleteDiccionario = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const result = await prisma.grupoDiccionario.deleteMany({
      where: { id: parseInt(id), usuario_id: req.usuarioId }
    });
    if (result.count === 0) return res.status(404).json({ error: 'Diccionario no encontrado' });
    res.json({ mensaje: 'Diccionario eliminado' });
  } catch {
    res.status(500).json({ error: 'Error al eliminar diccionario' });
  }
};

export const addKeywordToDiccionario = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { keyword_id } = req.body;
    const grupo = await prisma.grupoDiccionario.findFirst({
      where: { id: parseInt(id), usuario_id: req.usuarioId }
    });
    if (!grupo) return res.status(404).json({ error: 'Diccionario no encontrado' });
    await prisma.grupoDiccionarioKeyword.create({
      data: { grupo_id: parseInt(id), keyword_id: parseInt(keyword_id) }
    });
    res.status(201).json({ mensaje: 'Keyword agregada al diccionario' });
  } catch {
    res.status(500).json({ error: 'Error al agregar keyword' });
  }
};

export const removeKeywordFromDiccionario = async (req: any, res: Response) => {
  try {
    const { id, keywordId } = req.params;
    await prisma.grupoDiccionarioKeyword.delete({
      where: {
        grupo_id_keyword_id: { grupo_id: parseInt(id), keyword_id: parseInt(keywordId) }
      }
    });
    res.json({ mensaje: 'Keyword removida del diccionario' });
  } catch {
    res.status(500).json({ error: 'Error al remover keyword' });
  }
};
