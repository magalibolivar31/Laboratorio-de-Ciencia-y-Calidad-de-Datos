import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const register = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password } = req.body;

    // 1. Validar que el usuario no exista
    const existingUser = await prisma.usuario.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }

    // 2. Hashear la contraseña (seguridad)
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    // 3. Crear el usuario en SQL Server usando Prisma
    const user = await prisma.usuario.create({
      data: { nombre, email, password_hash }
    });

    res.status(201).json({ 
      mensaje: 'Usuario registrado con éxito', 
      usuarioId: user.id 
    });
  } catch (error) {
    console.error('Error en register:', error);
    res.status(500).json({ error: 'Error al registrar el usuario' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Buscar el usuario
    const user = await prisma.usuario.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 2. Comparar contraseñas
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // 3. Generar el Token (JWT)
    const token = jwt.sign(
      { usuarioId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ 
      mensaje: 'Login exitoso',
      token,
      usuario: { nombre: user.nombre, email: user.email }
    });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};
