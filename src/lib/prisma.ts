import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Configuración de ALTA CONCURRENCIA para SQLite (WAL Mode y Synchronous Normal)
if (!globalForPrisma.prisma) {
  (async () => {
    try {
      // Activa Write-Ahead Logging (Lectores y Escritores no se bloquean mutuamente)
      await prisma.$queryRawUnsafe('PRAGMA journal_mode=WAL;');
      // Optimiza la velocidad de sincronización de disco reduciendo escrituras innecesarias
      await prisma.$queryRawUnsafe('PRAGMA synchronous=NORMAL;');
      // Cache de memoria optimizado para lecturas rápidas
      await prisma.$queryRawUnsafe('PRAGMA cache_size=-64000;'); // ~64MB cache
      console.log('⚡ Base de datos SQLite optimizada con éxito en modo WAL.');
    } catch (error) {
      console.error('❌ Error al configurar optimizaciones de SQLite:', error);
    }
  })();
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

