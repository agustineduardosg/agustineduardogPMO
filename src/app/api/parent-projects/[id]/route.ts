import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    const updatedParent = await prisma.parentProject.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined
      },
      include: {
        projects: true
      }
    });

    return NextResponse.json(updatedParent);
  } catch (error: any) {
    console.error('Error updating parent project:', error);
    return NextResponse.json({ error: error.message || 'Error updating parent project' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.parentProject.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Parent project deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting parent project:', error);
    return NextResponse.json({ error: error.message || 'Error deleting parent project' }, { status: 500 });
  }
}
