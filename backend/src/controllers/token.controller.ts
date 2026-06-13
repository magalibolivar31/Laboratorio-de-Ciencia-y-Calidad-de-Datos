import { Request, Response } from 'express';
import prisma from '../lib/prisma';

export const getTokens = async (req: any, res: Response) => {
  try {
    const tokens = await prisma.token.findMany({
      where: { usuario_id: req.usuarioId },
      orderBy: { created_at: 'desc' }
    });
    res.json(tokens);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener los tokens' });
  }
};

export const addToken = async (req: any, res: Response) => {
  try {
    const { servicio, api_key } = req.body;
    const token = await prisma.token.create({
      data: {
        usuario_id: req.usuarioId,
        servicio,
        api_key_cifrada: api_key // Por ahora sin cifrado real para simplicidad, o podrías usar bcrypt/crypto
      }
    });
    res.status(201).json(token);
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar el token' });
  }
};

export const updateToken = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { servicio, api_key } = req.body;
    
    const token = await prisma.token.updateMany({
      where: { id: parseInt(id), usuario_id: req.usuarioId },
      data: { servicio, api_key_cifrada: api_key }
    });

    if (token.count === 0) {
      return res.status(404).json({ error: 'Token no encontrado' });
    }

    res.json({ mensaje: 'Token actualizado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar el token' });
  }
};

export const deleteToken = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const result = await prisma.token.deleteMany({
      where: { id: parseInt(id), usuario_id: req.usuarioId }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Token no encontrado' });
    }

    res.json({ mensaje: 'Token eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar el token' });
  }
};
