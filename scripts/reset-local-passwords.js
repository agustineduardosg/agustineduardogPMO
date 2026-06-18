const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('⏳ Iniciando reseteo de contraseñas locales...');

  const passwordHashAdmin = await bcrypt.hash('admin123', 10);
  const passwordHashPM = await bcrypt.hash('pm123', 10);
  const passwordHashViewer = await bcrypt.hash('viewer123', 10);

  // 1. Asegurar que los usuarios dev por defecto existan
  const devUsers = [
    {
      id: 'usr-admin',
      name: 'Agustín Eduardo (Dev)',
      email: 'agustin@bupa.cl',
      passwordHash: passwordHashAdmin,
      role: 'ADMIN',
      maxTasksLimit: 5
    },
    {
      id: 'usr-pm',
      name: 'PM Bupa (Dev)',
      email: 'pm@bupa.cl',
      passwordHash: passwordHashPM,
      role: 'Project Manager',
      maxTasksLimit: 5
    },
    {
      id: 'usr-viewer',
      name: 'Visualizador Bupa (Dev)',
      email: 'viewer@bupa.cl',
      passwordHash: passwordHashViewer,
      role: 'VIEWER',
      maxTasksLimit: 5
    }
  ];

  for (const du of devUsers) {
    await prisma.masterUser.upsert({
      where: { email: du.email },
      update: { passwordHash: du.passwordHash },
      create: du
    });
    console.log(`✅ Usuario dev creado/actualizado: ${du.email} (clave: ${du.email === 'agustin@bupa.cl' ? 'admin123' : du.email === 'pm@bupa.cl' ? 'pm123' : 'viewer123'})`);
  }

  // 2. Actualizar las contraseñas de los usuarios importados de producción
  const productionEmails = [
    'agustin.salazar@bupa.cl',
    'alejandra.cabrera@bupa.cl',
    'visualizador@bupa.cl',
    'cristobal.viveros@bupa.cl',
    'victor.zapara@bupa.cl',
    'javiera.contreras@bupa.cl'
  ];

  for (const email of productionEmails) {
    const user = await prisma.masterUser.findUnique({ where: { email } });
    if (user) {
      await prisma.masterUser.update({
        where: { email },
        data: { passwordHash: passwordHashAdmin }
      });
      console.log(`✅ Contraseña del usuario de producción reseteada: ${email} -> password: admin123`);
    } else {
      console.log(`ℹ️ Usuario no encontrado en DB, omitiendo: ${email}`);
    }
  }

  console.log('🎉 Reseteo de contraseñas locales finalizado con éxito.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
