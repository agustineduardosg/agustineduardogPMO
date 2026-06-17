export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkSession, unauthorizedResponse } from '@/lib/apiAuth';


// Equipos iniciales pre-cargados
const initialEquipments = [
  // BUPA CLA (rec-1)
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
  
  // BUPA CLR (rec-2)
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

export async function GET(req: Request) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();

    const { searchParams } = new URL(req.url);
    const onlyDeleted = searchParams.get('deleted') === 'true';

    const equipments = await prisma.clinicalEquipment.findMany({
      where: onlyDeleted ? { NOT: { deletedAt: null } } : { deletedAt: null },
      orderBy: { name: 'asc' }
    });
    return NextResponse.json(equipments);
  } catch (error: any) {
    console.error('Error fetching equipments:', error);
    return NextResponse.json({ error: error.message || 'Error fetching equipments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();

    const data = await req.json();
    const newEquipment = await prisma.clinicalEquipment.create({
      data: {
        id: data.id,
        recintoId: data.recintoId,
        name: data.name,
        section: data.section,
        levantamiento: data.levantamiento,
        parametrizacion: data.parametrizacion,
        pruebas: data.pruebas,
        capacitacion: data.capacitacion,
        validacion: data.validacion,
        golive: data.golive,
        responsable: data.responsable,
        compromisoDate: data.compromisoDate,
        observaciones: data.observaciones,
        pendienteDe: data.pendienteDe,
        projectId: data.projectId,
        customFields: data.customFields || '{}'
      }
    });
    return NextResponse.json(newEquipment, { status: 201 });
  } catch (error: any) {
    console.error('Error creating equipment:', error);
    return NextResponse.json({ error: error.message || 'Error creating equipment' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();

    const { targetProjectId } = await req.json();
    const updateResult = await prisma.clinicalEquipment.updateMany({
      where: {
        projectId: null,
        deletedAt: null
      },
      data: {
        projectId: targetProjectId
      }
    });
    
    const updatedEquipments = await prisma.clinicalEquipment.findMany({
      where: { deletedAt: null },
      orderBy: { name: 'asc' }
    });
    
    return NextResponse.json({ count: updateResult.count, equipments: updatedEquipments });
  } catch (error: any) {
    console.error('Error updating equipments in bulk:', error);
    return NextResponse.json({ error: error.message || 'Error updating equipments' }, { status: 500 });
  }
}
