import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    const updatedTraining = await prisma.training.update({
      where: { id },
      data: {
        indexId: data.indexId,
        participant: data.participant,
        role: data.role,
        recintoName: data.recintoName,
        moduleTheme: data.moduleTheme,
        equipmentName: data.equipmentName,
        fecha: data.fecha,
        instructor: data.instructor,
        duration: data.duration !== undefined ? Number(data.duration) : undefined,
        result: data.result,
        observaciones: data.observaciones,
        customFields: data.customFields
      }
    });

    return NextResponse.json(updatedTraining);
  } catch (error: any) {
    console.error('Error updating training:', error);
    return NextResponse.json({ error: error.message || 'Error updating training' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.training.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Training deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting training:', error);
    return NextResponse.json({ error: error.message || 'Error deleting training' }, { status: 500 });
  }
}
