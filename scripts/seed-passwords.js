const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Iniciando inicialización de contraseñas por defecto...');
  
  const users = await prisma.masterUser.findMany();
  console.log(`👥 Usuarios encontrados en MasterUser: ${users.length}`);

  let updatedCount = 0;
  const defaultPassword = 'Bupa2026!';
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(defaultPassword, salt);

  for (const user of users) {
    if (!user.passwordHash) {
      await prisma.masterUser.update({
        where: { id: user.id },
        data: { passwordHash: hash }
      });
      console.log(`✅ Contraseña inicial establecida para: ${user.email} (${user.role})`);
      updatedCount++;
    }
  }

  console.log(`🎉 Proceso completado. ${updatedCount} usuarios actualizados con la clave por defecto: ${defaultPassword}`);
}

main()
  .catch(e => {
    console.error('❌ Error durante la inicialización:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
