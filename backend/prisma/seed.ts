import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('flor123', 10);
  
  const user = await prisma.usuario.upsert({
    where: { email: 'flor@uai.edu.ar' },
    update: {},
    create: {
      nombre: 'Flor Gomez',
      email: 'flor@uai.edu.ar',
      password_hash: passwordHash,
    },
  });

  console.log('✅ Usuario de prueba creado:');
  console.log(`   - Email: ${user.email}`);
  console.log('   - Password: flor123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
