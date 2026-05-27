const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO SEEDING DE RECINTOS Y EQUIPOS CLINICOS ===");

  // 1. Obtener el primer proyecto de la base de datos para asociar los equipos
  const firstProject = await prisma.project.findFirst();
  const projectId = firstProject ? firstProject.id : null;
  console.log(`Proyecto asociado para equipos: ${firstProject ? `"${firstProject.name}" (ID: ${projectId})` : 'Ninguno'}`);

  // 2. Limpiar tablas existentes para evitar conflictos
  console.log("Limpiando registros antiguos de Recinto y ClinicalEquipment...");
  await prisma.clinicalEquipment.deleteMany({});
  await prisma.recinto.deleteMany({});
  console.log("Tablas limpiadas.");

  // 3. Definición de Recintos con IDs del Excel
  const recintosData = [
    { id: 'rec-4527', code: 'ID: 4527', name: 'BUPA CLA', isActive: true },
    { id: 'rec-4528', code: 'ID: 4528', name: 'BUPA CLR', isActive: true },
    { id: 'rec-4529', code: 'ID: 4529', name: 'BUPA Stat Las Condes', isActive: true },
    { id: 'rec-4530', code: 'ID: 4530', name: 'BUPA Stat San José de Arica', isActive: true },
    { id: 'rec-4531', code: 'ID: 4531', name: 'BUPA Stat Cordillera', isActive: true },
    { id: 'rec-4532', code: 'ID: 4532', name: 'BUPA Stat Los Carrera', isActive: true },
    { id: 'rec-4533', code: 'ID: 4533', name: 'BUPA Stat Los Leones', isActive: true },
    { id: 'rec-4534', code: 'ID: 4534', name: 'BUPA Stat Tarapacá', isActive: true }
  ];

  console.log("Creando Recintos...");
  for (const r of recintosData) {
    await prisma.recinto.create({ data: r });
  }
  console.log("Recintos creados con éxito.");

  // 4. Equipos Biomédicos detallados por sede
  const equipmentsData = [
    // === BUPA CLA (rec-4527) ===
    {
      recintoId: 'rec-4527',
      name: 'Advia 2120_02',
      section: 'Hematología',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'Completado',
      golive: 'Completado',
      responsable: 'Equipo Técnico',
      compromisoDate: '2025-04-08',
      observaciones: 'Sin observaciones',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4527',
      name: 'CS2500',
      section: 'Hematología',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'Completado',
      golive: 'Completado',
      responsable: 'Equipo Técnico / Usuario',
      compromisoDate: '2025-04-09',
      observaciones: 'Canalizar con proveedor Siemens',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4527',
      name: 'CA 600',
      section: 'Hematología',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'En progreso',
      golive: 'En progreso',
      responsable: 'Equipo Técnico',
      compromisoDate: '2025-04-09',
      observaciones: 'En espera corrección formatos proveedor - Ticket pendiente despliegue regla',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4527',
      name: 'Advia 2120_01',
      section: 'Hematología',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'Completado',
      golive: 'Completado',
      responsable: 'Equipo Técnico',
      compromisoDate: '2025-04-08',
      observaciones: 'Sin observaciones',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4527',
      name: 'Atellica SCI 01',
      section: 'Química',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'En progreso',
      golive: 'En progreso',
      responsable: 'Equipo Técnico',
      compromisoDate: '',
      observaciones: 'Pendiente: PCT, VitD, PTH, Serología',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4527',
      name: 'Atellica CH 02',
      section: 'Química',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'En progreso',
      golive: 'En progreso',
      responsable: 'Equipo Técnico',
      compromisoDate: '',
      observaciones: 'Pendiente: A1c, Hap, PTH, VIH',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4527',
      name: 'Uwam',
      section: 'Orinas',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'Completado',
      golive: 'Completado',
      responsable: 'Usuario',
      compromisoDate: '2025-04-10',
      observaciones: 'Sin observaciones',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4527',
      name: 'Aqure',
      section: 'Gases',
      levantamiento: 'No iniciado',
      parametrizacion: 'No iniciado',
      pruebas: 'No iniciado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      compromisoDate: '',
      observaciones: 'Diferido a Fase 2',
      pendienteDe: ''
    },

    // === BUPA CLR (rec-4528) ===
    {
      recintoId: 'rec-4528',
      name: 'Advia 2120 2',
      section: 'Hematología',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'Completado',
      golive: 'Completado',
      responsable: 'Laboratorio',
      compromisoDate: '',
      observaciones: 'Sin observaciones',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4528',
      name: 'Advia 2120 1',
      section: 'Hematología',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'Completado',
      golive: 'Completado',
      responsable: 'Laboratorio',
      compromisoDate: '',
      observaciones: 'Sin observaciones',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4528',
      name: 'CA600',
      section: 'Hematología',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'En progreso',
      golive: 'En progreso',
      responsable: 'DD /Equipo Técnico',
      compromisoDate: '',
      observaciones: 'Ticket a proveedor - Pendiente despliegue de regla',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4528',
      name: 'Centaur',
      section: 'Química',
      levantamiento: 'Descartado',
      parametrizacion: 'Descartado',
      pruebas: 'Descartado',
      validacion: 'Descartado',
      golive: 'Descartado',
      responsable: 'Laboratorio',
      compromisoDate: '2025-05-15',
      observaciones: 'Reactivado por retraso Atellica - Parametrización de lotes pendiente',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4528',
      name: 'Dimensión',
      section: 'Química',
      levantamiento: 'Descartado',
      parametrizacion: 'Descartado',
      pruebas: 'Descartado',
      validacion: 'Descartado',
      golive: 'Descartado',
      responsable: 'Laboratorio',
      compromisoDate: '2025-05-15',
      observaciones: 'Reactivado por retraso Atellica - Parametrización de lotes pendiente',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4528',
      name: 'Versacell',
      section: 'Química',
      levantamiento: 'Descartado',
      parametrizacion: 'Descartado',
      pruebas: 'Descartado',
      validacion: 'Descartado',
      golive: 'Descartado',
      responsable: 'Laboratorio',
      compromisoDate: '2025-05-15',
      observaciones: 'Reactivado por retraso Atellica - Parametrización de lotes pendiente',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4528',
      name: 'Atellica CH_01',
      section: 'Química',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'Completado',
      golive: 'Completado',
      responsable: 'Laboratorio',
      compromisoDate: '',
      observaciones: 'Sin observaciones',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4528',
      name: 'Atellica CH_02',
      section: 'Química',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'Completado',
      golive: 'Completado',
      responsable: 'Laboratorio',
      compromisoDate: '',
      observaciones: 'Sin observaciones',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4528',
      name: 'Cobas u411',
      section: 'Química / Orinas',
      levantamiento: 'No iniciado',
      parametrizacion: 'No iniciado',
      pruebas: 'No iniciado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Laboratorio',
      compromisoDate: '',
      observaciones: 'Desestimado',
      pendienteDe: ''
    },

    // === BUPA Stat Las Condes (rec-4529) ===
    {
      recintoId: 'rec-4529',
      name: 'AQURE_CLC',
      section: 'GASES',
      levantamiento: 'No iniciado',
      parametrizacion: 'No iniciado',
      pruebas: 'No iniciado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4529',
      name: 'CA_660_CLC',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4529',
      name: 'Advia 2120_CLC',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4529',
      name: 'Roller 20PN_CLC',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4529',
      name: 'Atellica SCI_CLC',
      section: 'QUIMICA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4529',
      name: 'Atellica CH_CLC',
      section: 'QUIMICA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4529',
      name: 'UN 3000_CLC',
      section: 'ORINAS',
      levantamiento: 'No iniciado',
      parametrizacion: 'No iniciado',
      pruebas: 'No iniciado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },

    // === BUPA Stat San José de Arica (rec-4530) ===
    {
      recintoId: 'rec-4530',
      name: 'AQURE',
      section: 'GASES',
      levantamiento: 'No iniciado',
      parametrizacion: 'No iniciado',
      pruebas: 'No iniciado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4530',
      name: 'Advia2120_CSJ',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'Completado',
      validacion: 'Completado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4530',
      name: 'Advia120_CJA',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4530',
      name: 'CA660_CSJ',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4530',
      name: 'Roller20_CSJ',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4530',
      name: 'Centaur CP2_CSJ',
      section: 'QUIMICA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4530',
      name: 'Centaur CP_CSJ',
      section: 'QUIMICA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4530',
      name: 'DimensionRxL 1_CSJ',
      section: 'QUIMICA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4530',
      name: 'DimensionRxL2_CSJ',
      section: 'QUIMICA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4530',
      name: 'Cobas u411_CSJ',
      section: 'ORINAS',
      levantamiento: 'No iniciado',
      parametrizacion: 'No iniciado',
      pruebas: 'No iniciado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },

    // === BUPA Stat Cordillera (rec-4531) ===
    {
      recintoId: 'rec-4531',
      name: 'AQURE',
      section: 'GASES',
      levantamiento: 'No iniciado',
      parametrizacion: 'No iniciado',
      pruebas: 'No iniciado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4531',
      name: 'Roller20LC_COR',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4531',
      name: 'CA660_COR',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4531',
      name: 'UC3500_COR',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4531',
      name: 'Atellica_COR',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'Configurado en Driver',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4531',
      name: 'UC3500_COR',
      section: 'ORINAS',
      levantamiento: 'No iniciado',
      parametrizacion: 'No iniciado',
      pruebas: 'No iniciado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },

    // === BUPA Stat Los Carrera (rec-4532) ===
    {
      recintoId: 'rec-4532',
      name: 'AQURE_CAR',
      section: 'GASES',
      levantamiento: 'No iniciado',
      parametrizacion: 'No iniciado',
      pruebas: 'No iniciado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4532',
      name: 'CA_660_CAR',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Configuracion de lotes erroneas',
      pruebas: 'No transmite',
      validacion: 'Configurado en Driver',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4532',
      name: 'Roller20LC_CAR',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'No iniciado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4532',
      name: 'BC 5380_CAR',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'No iniciado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4532',
      name: 'Atellica_CAR01',
      section: 'QUIMICA',
      levantamiento: 'Completado',
      parametrizacion: 'No iniciado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4532',
      name: 'UC 3500_CRR',
      section: 'ORINAS',
      levantamiento: 'No iniciado',
      parametrizacion: 'No iniciado',
      pruebas: 'No iniciado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },

    // === BUPA Stat Los Leones (rec-4533) ===
    {
      recintoId: 'rec-4533',
      name: 'AQURE_CLL',
      section: 'GASES',
      levantamiento: 'No iniciado',
      parametrizacion: 'No iniciado',
      pruebas: 'No iniciado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4533',
      name: 'CA620_CLL',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'Configurado en Driver',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4533',
      name: 'BC 5150_CLL',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'Configurado en Driver',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4533',
      name: 'Roller20MC_CLL',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'Configurado en Driver',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4533',
      name: 'Dimension EXL_CLL',
      section: 'QUIMICA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'Configurado en Driver',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },

    // === BUPA Stat Tarapacá (rec-4534) ===
    {
      recintoId: 'rec-4534',
      name: 'AQURE_TAR',
      section: 'GASES',
      levantamiento: 'No iniciado',
      parametrizacion: 'No iniciado',
      pruebas: 'No iniciado',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4534',
      name: 'CA 660_TAR',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4534',
      name: 'Roller 20LC_TAR',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4534',
      name: 'BC 5380_TAR',
      section: 'HEMATOLOGIA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4534',
      name: 'Dimension EXL_TAR',
      section: 'QUIMICA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4534',
      name: 'CentaurXPT_TAR',
      section: 'QUIMICA',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    },
    {
      recintoId: 'rec-4534',
      name: 'UC 3500_TAR',
      section: 'ORINAS',
      levantamiento: 'Completado',
      parametrizacion: 'Completado',
      pruebas: 'No transmite',
      validacion: 'No iniciado',
      golive: 'No iniciado',
      responsable: 'Equipo Técnico',
      observaciones: '',
      pendienteDe: ''
    }
  ];

  console.log(`Sembrando ${equipmentsData.length} Equipos Biomédicos asociados al proyecto...`);
  for (const eq of equipmentsData) {
    await prisma.clinicalEquipment.create({
      data: {
        ...eq,
        projectId: projectId
      }
    });
  }
  console.log("¡Seeding completado exitosamente!");
}

main()
  .catch(e => {
    console.error("Error durante el seeding:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
