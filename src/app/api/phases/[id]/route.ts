import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    const updatedPhase = await prisma.phase.update({
      where: { id },
      data: {
        wbsId: data.wbsId,
        name: data.name,
        progress: data.progress !== undefined ? data.progress : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined
      },
      include: {
        tasks: {
          include: {
            attachments: true
          }
        }
      }
    });

    return NextResponse.json(updatedPhase);
  } catch (error: any) {
    console.error('Error updating phase:', error);
    return NextResponse.json({ error: error.message || 'Error updating phase' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.phase.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Phase deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting phase:', error);
    return NextResponse.json({ error: error.message || 'Error deleting phase' }, { status: 500 });
  }
}
