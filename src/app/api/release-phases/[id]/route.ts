import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { name, description, isActive } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre de la fase es obligatorio' }, { status: 400 });
    }

    const nameTrimmed = name.trim();

    // Evitar nombres duplicados
    const existing = await prisma.releasePhase.findFirst({
      where: {
        name: nameTrimmed,
        NOT: { id }
      }
    });

    if (existing) {
      return NextResponse.json({ error: `La fase "${nameTrimmed}" ya existe` }, { status: 400 });
    }

    const updatedPhase = await prisma.releasePhase.update({
      where: { id },
      data: {
        name: nameTrimmed,
        description: description?.trim() || null,
        isActive: isActive !== undefined ? isActive : true
      }
    });

    return NextResponse.json(updatedPhase);
  } catch (error: any) {
    console.error('Error updating release phase:', error);
    return NextResponse.json({ error: error.message || 'Error updating release phase' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.releasePhase.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Fase de liberación eliminada correctamente' });
  } catch (error: any) {
    console.error('Error deleting release phase:', error);
    return NextResponse.json({ error: error.message || 'Error deleting release phase' }, { status: 500 });
  }
}
