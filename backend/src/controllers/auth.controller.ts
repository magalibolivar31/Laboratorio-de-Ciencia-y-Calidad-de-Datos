import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit.helper';
import { seedDefaultKeywordsForUser } from '../lib/default-keywords';

const buildTransporter = () => nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

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

export const requestReset = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'El email es requerido.' });

    const user = await prisma.usuario.findUnique({ where: { email } });
    // Siempre responder igual para no revelar si el email existe
    const okMsg = { mensaje: 'Si el email está registrado, recibirás un enlace para restablecer tu contraseña.' };
    if (!user || !user.activo) return res.json(okMsg);

    // Invalidar tokens anteriores
    await prisma.passwordResetToken.updateMany({
      where: { usuario_id: user.id, used: false },
      data: { used: true }
    });

    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.passwordResetToken.create({
      data: { usuario_id: user.id, token, expires_at }
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await buildTransporter().sendMail({
          from: `"Laboratorio CAETI UAI" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'Restablecer contraseña — Laboratorio de Calidad y Ciencia de Datos',
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff;border-radius:16px;border:1px solid #eee">
              <div style="background:#800020;padding:24px;border-radius:12px;text-align:center;margin-bottom:28px">
                <h1 style="color:#fff;margin:0;font-size:22px;font-weight:900;letter-spacing:-0.5px">Laboratorio de Calidad y Ciencia de Datos</h1>
                <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:12px;font-weight:600;letter-spacing:2px;text-transform:uppercase">UAI · CAETI</p>
              </div>
              <h2 style="color:#1a1a1a;font-size:20px;font-weight:900;margin:0 0 12px">Restablecé tu contraseña</h2>
              <p style="color:#555;font-size:14px;line-height:1.6;margin:0 0 28px">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si no fuiste vos, podés ignorar este mensaje.
              </p>
              <a href="${resetUrl}" style="display:inline-block;background:#800020;color:#fff;padding:14px 28px;border-radius:10px;font-weight:900;font-size:15px;text-decoration:none;letter-spacing:0.5px">
                RESTABLECER CONTRASEÑA
              </a>
              <p style="color:#999;font-size:12px;margin:24px 0 0">
                Este enlace es válido por <strong>1 hora</strong>. Si no funciona, copiá y pegá esta URL en tu navegador:<br/>
                <a href="${resetUrl}" style="color:#800020;word-break:break-all">${resetUrl}</a>
              </p>
            </div>
          `
        });
      } catch (mailErr) {
        console.error('[MAIL ERROR]', mailErr);
      }
    } else {
      // En desarrollo sin credenciales de mail, logueamos el link
      console.log(`\n[RESET LINK] ${resetUrl}\n`);
    }

    await logAudit(user.id, 'SOLICITUD_RESET_PASSWORD', 'Usuario', String(user.id), email);
    res.json(okMsg);
  } catch (error) {
    console.error('Error en requestReset:', error);
    res.status(500).json({ error: 'Error al procesar la solicitud.' });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ error: 'Token y contraseña son requeridos.' });
    if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });

    const reset = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!reset || reset.used || reset.expires_at < new Date()) {
      return res.status(400).json({ error: 'El enlace es inválido o ya expiró. Solicitá uno nuevo.' });
    }

    const hash = await bcrypt.hash(password, 10);
    await prisma.usuario.update({ where: { id: reset.usuario_id }, data: { password_hash: hash } });
    await prisma.passwordResetToken.update({ where: { id: reset.id }, data: { used: true } });
    await logAudit(reset.usuario_id, 'RESET_PASSWORD', 'Usuario', String(reset.usuario_id));

    res.json({ mensaje: 'Contraseña restablecida correctamente. Ya podés iniciar sesión.' });
  } catch (error) {
    console.error('Error en resetPassword:', error);
    res.status(500).json({ error: 'Error al restablecer la contraseña.' });
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
