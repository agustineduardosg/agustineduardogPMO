import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const initialStakeholders = [
  {
    id: 'st-1',
    indexId: 1,
    name: 'Juan Pérez',
    role: 'Coordinador de Proyecto',
    orgSede: 'BUPA/TI',
    area: 'TI Clinica',
    contact: 'jperez@bupa.cl',
    influence: 'Alto',
    impact: 'Alto',
    notes: 'Responsable general de la implementación'
  },
  {
    id: 'st-2',
    indexId: 2,
    name: 'Dra. Andrea Gomez',
    role: 'Jefe de Laboratorio - CLA',
    orgSede: 'BUPA Santiago',
    area: 'Laboratorio',
    contact: 'agomez@bupa.cl',
    influence: 'Alto',
    impact: 'Alto',
    notes: 'Aprueba parametrización y valida resultados'
  },
  {
    id: 'st-3',
    indexId: 3,
    name: 'Dr. Carlos Fuentes',
    role: 'Jefe de Laboratorio - CLR',
    orgSede: 'BUPA Antofagasta',
    area: 'Laboratorio',
    contact: 'cfuentes@bupa.cl',
    influence: 'Alto',
    impact: 'Alto',
    notes: 'Aprueba parametrización y valida resultados'
  },
  {
    id: 'st-4',
    indexId: 4,
    name: 'Marta Riquelme',
    role: 'Técnico de Laboratorio',
    orgSede: 'BUPA / Sede',
    area: 'Laboratorio',
    contact: 'mriquelme@bupa.cl',
    influence: 'Medio',
    impact: 'Medio',
    notes: 'Usuario final del sistema'
  },
  {
    id: 'st-5',
    indexId: 5,
    name: 'Ing. Rodrigo Torres',
    role: 'Representante Siemens',
    orgSede: 'Proveedor',
    area: 'Soporte técnico',
    contact: 'rodrigo.torres@siemens.com',
    influence: 'Medio',
    impact: 'Alto',
    notes: 'Responsable soporte equipos Siemens'
  },
  {
    id: 'st-6',
    indexId: 6,
    name: 'Cristian Silva',
    role: 'Representante DD (Proveedor)',
    orgSede: 'Proveedor',
    area: 'Soporte técnico',
    contact: 'csilva@diagnostica.cl',
    influence: 'Medio',
    impact: 'Alto',
    notes: 'Pendiente despliegue de regla CA600'
  },
  {
    id: 'st-7',
    indexId: 7,
    name: 'Sofía Valenzuela',
    role: 'Gerente Clínico / QA',
    orgSede: 'BUPA',
    area: 'Calidad',
    contact: 'svalenzuela@bupa.cl',
    influence: 'Alto',
    impact: 'Medio',
    notes: 'Aprueba Go-live y validación QA'
  }
];

export async function GET() {
  try {
    const count = await prisma.stakeholder.count();
    if (count === 0) {
      await prisma.stakeholder.createMany({
        data: initialStakeholders
      });
    }

    const stakeholders = await prisma.stakeholder.findMany({
      orderBy: { indexId: 'asc' }
    });
    return NextResponse.json(stakeholders);
  } catch (error: any) {
    console.error('Error fetching stakeholders:', error);
    return NextResponse.json({ error: error.message || 'Error fetching stakeholders' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newStakeholder = await prisma.stakeholder.create({
      data: {
        id: data.id,
        indexId: data.indexId,
        name: data.name || '',
        role: data.role || '',
        orgSede: data.orgSede || '',
        area: data.area || '',
        contact: data.contact || '',
        influence: data.influence || 'Medio',
        impact: data.impact || 'Medio',
        notes: data.notes || '',
        projectId: data.projectId || null,
        customFields: data.customFields || '{}'
      }
    });
    return NextResponse.json(newStakeholder, { status: 201 });
  } catch (error: any) {
    console.error('Error creating stakeholder:', error);
    return NextResponse.json({ error: error.message || 'Error creating stakeholder' }, { status: 500 });
  }
}
