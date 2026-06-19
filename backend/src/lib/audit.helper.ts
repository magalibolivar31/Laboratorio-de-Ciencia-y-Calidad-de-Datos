import prisma from './prisma';

export const logAudit = async (
  usuarioId: number | null,
  accion: string,
  entidad: string,
  entidad_id?: string,
  detalle?: string,
  ip?: string
) => {
  try {
    await prisma.auditLog.create({
      data: { usuario_id: usuarioId, accion, entidad, entidad_id, detalle, ip }
    });
  } catch {}
};
