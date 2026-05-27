import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Capacitaciones iniciales pre-cargadas para alimentar el sistema
const initialTrainings = [
  {
    id: 'train-1',
    indexId: 1,
    participant: 'María Paz Silva',
    role: 'Enfermera Coordinadora',
    recintoName: 'BUPA CLA',
    moduleTheme: 'Manejo de Alarmas y Ciclos de Lavado',
    equipmentName: 'Atellica Solution',
    fecha: '2025-04-20',
    instructor: 'Ing. Rodrigo Torres (Siemens)',
    duration: 4.5,
    result: 'Aprobado',
    observaciones: 'Evaluación práctica completada con puntaje 100%. Capacitación exitosa.'
  }
];

export async function GET() {
  try {
    const count = await prisma.training.count();
    if (count === 0) {
      await prisma.training.createMany({
        data: initialTrainings
      });
    }

    const trainings = await prisma.training.findMany({
      orderBy: { indexId: 'asc' }
    });
    return NextResponse.json(trainings);
  } catch (error: any) {
    console.error('Error fetching trainings:', error);
    return NextResponse.json({ error: error.message || 'Error fetching trainings' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newTraining = await prisma.training.create({
      data: {
        id: data.id,
        indexId: data.indexId,
        participant: data.participant,
        role: data.role,
        recintoName: data.recintoName,
        moduleTheme: data.moduleTheme,
        equipmentName: data.equipmentName,
        fecha: data.fecha,
        instructor: data.instructor,
        duration: Number(data.duration) || 0,
        result: data.result,
        observaciones: data.observaciones,
        customFields: data.customFields || '{}'
      }
    });
    return NextResponse.json(newTraining, { status: 201 });
  } catch (error: any) {
    console.error('Error creating training:', error);
    return NextResponse.json({ error: error.message || 'Error creating training' }, { status: 500 });
  }
}
