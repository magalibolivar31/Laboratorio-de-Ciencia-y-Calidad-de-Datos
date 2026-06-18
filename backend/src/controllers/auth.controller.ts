import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit.helper';
import { seedDefaultKeywordsForUser } from '../lib/default-keywords';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const register = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password } = req.body;
    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = await prisma.usuario.create({
      data: { nombre, email, password_hash }
    });
    await logAudit(user.id, 'REGISTRO', 'Usuario', String(user.id), email, req.ip);
    // Seed de diccionarios por defecto en background (no bloquea la respuesta)
    seedDefaultKeywordsForUser(user.id).catch(e => console.error('[SEED KW ERROR]', e));
    res.status(201).json({ mensaje: 'Usuario registrado con éxito', usuarioId: user.id });
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    if (!user.activo) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    }
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    const token = jwt.sign(
      { usuarioId: user.id, email: user.email, rol: user.rol },
      JWT_SECRET,
      { expiresIn: '8h' }
    );
    await logAudit(user.id, 'LOGIN', 'Usuario', String(user.id), email, req.ip);
    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: { nombre: user.nombre, email: user.email, rol: user.rol }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

export const updateProfile = async (req: any, res: Response) => {
  try {
    const { nombre } = req.body;
    if (!nombre) return res.status(400).json({ error: 'El nombre es requerido' });
    const user = await prisma.usuario.update({
      where: { id: req.usuarioId },
      data: { nombre }
    });
    await logAudit(req.usuarioId, 'ACTUALIZAR_PERFIL', 'Usuario', String(req.usuarioId));
    res.json({ mensaje: 'Perfil actualizado', usuario: { nombre: user.nombre, email: user.email, rol: user.rol } });
  } catch {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
};

export const changePassword = async (req: any, res: Response) => {
  try {
    const { password_actual, password_nueva } = req.body;
    const user = await prisma.usuario.findUnique({ where: { id: req.usuarioId } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    const match = await bcrypt.compare(password_actual, user.password_hash);
    if (!match) return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    const hash = await bcrypt.hash(password_nueva, 10);
    await prisma.usuario.update({ where: { id: req.usuarioId }, data: { password_hash: hash } });
    await logAudit(req.usuarioId, 'CAMBIAR_PASSWORD', 'Usuario', String(req.usuarioId), undefined, req.ip);
    res.json({ mensaje: 'Contraseña actualizada correctamente' });
  } catch {
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
};
