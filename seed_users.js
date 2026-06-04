const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando sembrado de usuarios maestros...');

  // Eliminar colaboradores de prueba anteriores para evitar duplicados o cuentas sin contraseñas
  await prisma.masterUser.deleteMany({});
  console.log('Se limpió la tabla MasterUser.');

  const users = [
    {
      id: 'usr-admin',
      name: 'Agustín Eduardo',
      email: 'agustin@bupa.cl',
      passwordHash: bcrypt.hashSync('admin123', 10),
      role: 'ADMIN',
      maxTasksLimit: 5
    },
    {
      id: 'usr-pm',
      name: 'PM Bupa',
      email: 'pm@bupa.cl',
      passwordHash: bcrypt.hashSync('pm123', 10),
      role: 'Project Manager',
      maxTasksLimit: 5
    },
    {
      id: 'usr-viewer',
      name: 'Visualizador Bupa',
      email: 'viewer@bupa.cl',
      passwordHash: bcrypt.hashSync('viewer123', 10),
      role: 'VIEWER',
      maxTasksLimit: 5
    }
  ];

  for (const user of users) {
    const created = await prisma.masterUser.create({
      data: user
    });
    console.log(`Usuario creado: ${created.name} (${created.email}) - Rol: ${created.role}`);
  }

  console.log('Sembrado de usuarios maestros completado con éxito.');
}

main()
  .catch(e => {
    console.error('Error al sembrar usuarios:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
