import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export const adminMiddleware = (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token no proporcionado' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.usuarioId = decoded.usuarioId;
    req.rol = decoded.rol;
    if (decoded.rol !== 'ADMINISTRADOR') {
      return res.status(403).json({ error: 'Acceso denegado. Se requiere rol Administrador.' });
    }
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};
