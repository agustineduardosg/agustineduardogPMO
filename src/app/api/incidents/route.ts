import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkSession, unauthorizedResponse } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

// Incidentes iniciales pre-cargados
const initialIncidents = [
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

export async function GET() {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();

    const incidents = await prisma.incident.findMany({
      orderBy: { indexId: 'desc' },
      include: { attachments: true }
    });
    return NextResponse.json(incidents);
  } catch (error: any) {
    console.error('Error fetching incidents:', error);
    return NextResponse.json({ error: error.message || 'Error fetching incidents' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();

    const data = await req.json();
    const newIncident = await prisma.incident.create({
      data: {
        id: data.id,
        indexId: data.indexId,
        fecha: data.fecha,
        recintoName: data.recintoName,
        equipmentName: data.equipmentName,
        faseAfectada: data.faseAfectada,
        descripcion: data.descripcion,
        impacto: data.impacto,
        responsable: data.responsable,
        estado: data.estado,
        planDeAccion: data.planDeAccion,
        fechaCierre: data.fechaCierre,
        projectId: data.projectId,
        idTicket: data.idTicket || null,
        customFields: data.customFields || '{}'
      },
      include: { attachments: true }
    });
    return NextResponse.json(newIncident, { status: 201 });
  } catch (error: any) {
    console.error('Error creating incident:', error);
    return NextResponse.json({ error: error.message || 'Error creating incident' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();

    const { targetProjectId } = await req.json();
    const updateResult = await prisma.incident.updateMany({
      where: {
        projectId: null
      },
      data: {
        projectId: targetProjectId
      }
    });
    
    const updatedIncidents = await prisma.incident.findMany({
      orderBy: { indexId: 'desc' },
      include: { attachments: true }
    });
    
    return NextResponse.json({ count: updateResult.count, incidents: updatedIncidents });
  } catch (error: any) {
    console.error('Error updating incidents in bulk:', error);
    return NextResponse.json({ error: error.message || 'Error updating incidents' }, { status: 500 });
  }
}
