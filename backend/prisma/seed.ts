import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Usuario investigador de prueba
  const passwordHash = await bcrypt.hash('flor123', 10);
  const user = await prisma.usuario.upsert({
    where: { email: 'flor@uai.edu.ar' },
    update: {},
    create: { nombre: 'Flor Gomez', email: 'flor@uai.edu.ar', password_hash: passwordHash, rol: 'INVESTIGADOR' }
  });
  console.log(`✅ Investigadora: ${user.email} / flor123`);

  // Usuario administrador
  const adminHash = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.usuario.upsert({
    where: { email: 'admin@caeti.uai.edu.ar' },
    update: {},
    create: { nombre: 'Administrador CAETI', email: 'admin@caeti.uai.edu.ar', password_hash: adminHash, rol: 'ADMINISTRADOR' }
  });
  console.log(`✅ Administrador: ${admin.email} / Admin123!`);

  // Fuentes de datos iniciales
  const fuentes = [
    { nombre: 'Zenodo', tipo: 'API', url_base: 'https://zenodo.org/api', descripcion: 'Repositorio de acceso abierto de investigación europea' },
    { nombre: 'Kaggle', tipo: 'API', url_base: 'https://www.kaggle.com/api/v1', descripcion: 'Plataforma de datasets y competencias de ML' },
    { nombre: 'Hugging Face', tipo: 'API', url_base: 'https://huggingface.co/api', descripcion: 'Repositorio de datasets de IA y NLP' },
    { nombre: 'UCI Repository', tipo: 'WEB', url_base: 'https://archive.ics.uci.edu', descripcion: 'Machine Learning Repository de la UC Irvine' },
    { nombre: 'HealthData.gov', tipo: 'API', url_base: 'https://healthdata.gov/api', descripcion: 'Portal de datos de salud del gobierno de EEUU' },
    { nombre: 'PhysioNet', tipo: 'WEB', url_base: 'https://physionet.org', descripcion: 'Base de datos fisiológicos y clínicos' },
  ];

  for (const f of fuentes) {
    const exists = await prisma.fuenteDatos.findFirst({ where: { nombre: f.nombre } });
    if (!exists) {
      await prisma.fuenteDatos.create({ data: f });
      console.log(`✅ Fuente: ${f.nombre}`);
    }
  }

  console.log('\n🚀 Seed completado.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
