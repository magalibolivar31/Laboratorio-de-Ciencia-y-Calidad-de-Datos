import { PrismaClient } from '@prisma/client';
import { seedDefaultKeywordsForUser, DEFAULT_DICCIONARIOS } from '../src/lib/default-keywords';

const prisma = new PrismaClient();

async function main() {
  const usuarios = await prisma.usuario.findMany({ select: { id: true, nombre: true, email: true } });
  console.log(`\n📋 Creando diccionarios para ${usuarios.length} usuario(s)...\n`);

  const temas = Object.keys(DEFAULT_DICCIONARIOS);
  const kwsPorTema = Object.values(DEFAULT_DICCIONARIOS).map(d => d.palabras.length);
  console.log(`   Temas: ${temas.join(', ')}`);
  console.log(`   Keywords por tema: ${kwsPorTema.join(', ')} (total: ${kwsPorTema.reduce((a, b) => a + b, 0)})\n`);

  for (const u of usuarios) {
    console.log(`👤 ${u.nombre} (${u.email})...`);
    await seedDefaultKeywordsForUser(u.id);
    console.log(`   ✅ Diccionarios creados\n`);
  }

  console.log('🚀 ¡Listo! Todos los usuarios tienen sus diccionarios por defecto.\n');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
