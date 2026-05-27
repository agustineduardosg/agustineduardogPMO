import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    const updatedRecinto = await prisma.recinto.update({
      where: { id },
      data: {
        name: data.name,
        code: data.code,
        isActive: data.isActive
      },
      include: { equipments: true }
    });

    return NextResponse.json(updatedRecinto);
  } catch (error: any) {
    console.error('Error updating recinto:', error);
    return NextResponse.json({ error: error.message || 'Error updating recinto' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.recinto.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Recinto deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting recinto:', error);
    return NextResponse.json({ error: error.message || 'Error deleting recinto' }, { status: 500 });
  }
}
