const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando sembrado de datos (seed)...');

  // 1. Usuarios iniciales
  console.log('⏳ Sembrando MasterUsers...');
  const users = [
    {
      id: 'usr-admin',
      name: 'Agustín Eduardo',
      email: 'agustin@bupa.cl',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      maxTasksLimit: 5
    },
    {
      id: 'usr-pm',
      name: 'PM Bupa',
      email: 'pm@bupa.cl',
      passwordHash: await bcrypt.hash('pm123', 10),
      role: 'Project Manager',
      maxTasksLimit: 5
    },
    {
      id: 'usr-viewer',
      name: 'Visualizador Bupa',
      email: 'viewer@bupa.cl',
      passwordHash: await bcrypt.hash('viewer123', 10),
      role: 'VIEWER',
      maxTasksLimit: 5
    }
  ];

  for (const u of users) {
    await prisma.masterUser.upsert({
      where: { email: u.email },
      update: {},
      create: u
    });
  }

  // 2. Recintos
  console.log('⏳ Sembrando Recintos...');
  const recintos = [
    { id: 'rec-1', name: 'BUPA CLA', code: 'ID: 4057', isActive: true },
    { id: 'rec-2', name: 'BUPA CLR', code: 'ID: 4528', isActive: true },
    { id: 'rec-3', name: 'BUPA Stat Las Condes', code: 'ID: 4553', isActive: true }
  ];

  for (const r of recintos) {
    await prisma.recinto.upsert({
      where: { id: r.id },
      update: {},
      create: r
    });
  }

  // 3. Equipos Clínicos
  console.log('⏳ Sembrando ClinicalEquipments...');
  const equipments = [
    {
      id: 'eq-1', recintoId: 'rec-1', name: 'Advia 2120_02', section: 'Hematología',
      levantamiento: 'Completado', parametrizacion: 'Completado', pruebas: 'Completado',
      capacitacion: 'Completado', validacion: 'Completado', golive: 'Completado',
      responsable: 'Equipo técnico', compromisoDate: '2025-04-08', observaciones: 'Sin observaciones', pendienteDe: ''
    },
    {
      id: 'eq-2', recintoId: 'rec-1', name: 'CS2500', section: 'Hematología',
      levantamiento: 'Completado', parametrizacion: 'Completado', pruebas: 'Completado',
      capacitacion: 'Completado', validacion: 'En progreso', golive: 'En progreso',
      responsable: 'Equipo técnico / Usuario', compromisoDate: '2025-04-09', observaciones: 'Canalizar con proveedor Siemens', pendienteDe: 'Siemens'
    },
    {
      id: 'eq-3', recintoId: 'rec-1', name: 'CA 600', section: 'Hematología',
      levantamiento: 'Completado', parametrizacion: 'Completado', pruebas: 'En progreso',
      capacitacion: 'Completado', validacion: 'En progreso', golive: 'En progreso',
      responsable: 'Equipo técnico', compromisoDate: '2025-04-09', observaciones: 'En espera corrección formatos proveedor - Ticket pendiente despliegue regla', pendienteDe: 'Despliegue regla'
    },
    {
      id: 'eq-4', recintoId: 'rec-1', name: 'Advia 2120_01', section: 'Hematología',
      levantamiento: 'Completado', parametrizacion: 'Completado', pruebas: 'Completado',
      capacitacion: 'Completado', validacion: 'Completado', golive: 'Completado',
      responsable: 'Equipo técnico', compromisoDate: '2025-04-08', observaciones: 'Sin observaciones', pendienteDe: ''
    },
    {
      id: 'eq-5', recintoId: 'rec-1', name: 'Atellica SCI 01', section: 'Química',
      levantamiento: 'Completado', parametrizacion: 'Completado', pruebas: 'En progreso',
      capacitacion: 'Completado', validacion: 'En progreso', golive: 'En progreso',
      responsable: 'Equipo técnico', compromisoDate: '', observaciones: 'Pendiente: PCT, VitD, PTH, Serología', pendienteDe: 'Serología'
    },
    {
      id: 'eq-6', recintoId: 'rec-1', name: 'Atellica CI 02', section: 'Química',
      levantamiento: 'Completado', parametrizacion: 'Completado', pruebas: 'En progreso',
      capacitacion: 'Completado', validacion: 'En progreso', golive: 'En progreso',
      responsable: 'Equipo técnico', compromisoDate: '', observaciones: 'Pendiente: A1c, Hep, PTH, VIH', pendienteDe: 'VIH'
    },
    {
      id: 'eq-7', recintoId: 'rec-1', name: 'Uwam', section: 'Orinas',
      levantamiento: 'Completado', parametrizacion: 'Completado', pruebas: 'Completado',
      capacitacion: 'Completado', validacion: 'Completado', golive: 'Completado',
      responsable: 'Usuario', compromisoDate: '2025-04-10', observaciones: 'Sin observaciones', pendienteDe: ''
    },
    {
      id: 'eq-8', recintoId: 'rec-1', name: 'Aqure', section: 'Gases',
      levantamiento: 'No iniciado', parametrizacion: 'No iniciado', pruebas: 'No iniciado',
      capacitacion: 'No iniciado', validacion: 'No iniciado', golive: 'No iniciado',
      responsable: 'Equipo técnico', compromisoDate: '', observaciones: 'Diferido a Fase 2', pendienteDe: ''
    },
    {
      id: 'eq-9', recintoId: 'rec-2', name: 'Advia 2120.2', section: 'Hematología',
      levantamiento: 'Completado', parametrizacion: 'Completado', pruebas: 'Completado',
      capacitacion: 'Completado', validacion: 'Completado', golive: 'Completado',
      responsable: 'Laboratorio', compromisoDate: '', observaciones: 'Sin observaciones', pendienteDe: ''
    },
    {
      id: 'eq-10', recintoId: 'rec-2', name: 'Advia 2120-1', section: 'Hematología',
      levantamiento: 'Completado', parametrizacion: 'Completado', pruebas: 'Completado',
      capacitacion: 'Completado', validacion: 'Completado', golive: 'Completado',
      responsable: 'Laboratorio', compromisoDate: '', observaciones: 'Sin observaciones', pendienteDe: ''
    },
    {
      id: 'eq-11', recintoId: 'rec-2', name: 'CA600', section: 'Hematología',
      levantamiento: 'Completado', parametrizacion: 'Completado', pruebas: 'En progreso',
      capacitacion: 'Completado', validacion: 'En progreso', golive: 'En progreso',
      responsable: 'DD / Equipo técnico', compromisoDate: '', observaciones: 'Ticket a proveedor - Pendiente despliegue de regla', pendienteDe: 'Despliegue regla'
    },
    {
      id: 'eq-12', recintoId: 'rec-2', name: 'Centaur', section: 'Química',
      levantamiento: 'Descartado', parametrizacion: 'Descartado', pruebas: 'Descartado',
      capacitacion: 'Descartado', validacion: 'Descartado', golive: 'Descartado',
      responsable: 'Laboratorio', compromisoDate: '2025-05-15', observaciones: 'Reactivado por retraso Atellica - Parametrización de lotes pendiente', pendienteDe: 'Lotes pendiente'
    }
  ];

  for (const eq of equipments) {
    await prisma.clinicalEquipment.upsert({
      where: { id: eq.id },
      update: {},
      create: eq
    });
  }

  // 4. Incidentes
  console.log('⏳ Sembrando Incidentes...');
  const incidents = [
    {
      id: 'inc-1',
      indexId: 1,
      fecha: '2025-04-16',
      recintoName: 'BUPA CLA',
      equipmentName: 'CA 600',
      faseAfectada: 'Pruebas',
      descripcion: 'Equipo transmite 907.0 - valor correcto es Retraso en implementación Atellica obliga reactivación',
      impacto: 'Crítico',
      responsable: 'Equipo técnico',
      estado: 'En proceso',
      planDeAccion: 'Ticket abierto a proveedor DD. Pendiente despliegue de regla de corrección.',
      fechaCierre: ''
    },
    {
      id: 'inc-2',
      indexId: 2,
      fecha: '2025-04-22',
      recintoName: 'BUPA CLR',
      equipmentName: 'Centaur / Dimensión / Versacell',
      faseAfectada: 'Parametrización',
      descripcion: 'Retraso en implementación Atellica obliga reactivación',
      impacto: 'Medio',
      responsable: 'Laboratorio',
      estado: 'En proceso',
      planDeAccion: 'Compromiso de laboratorio para parametrización de lotes antes del 15/05/2025',
      fechaCierre: ''
    }
  ];

  for (const inc of incidents) {
    await prisma.incident.upsert({
      where: { id: inc.id },
      update: {},
      create: inc
    });
  }

  console.log('🌱 ¡Sembrado completado con éxito!');
}

main()
  .catch((e) => {
    console.error('❌ Error durante el sembrado:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
