import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newPhase = await prisma.phase.create({
      data: {
        id: data.id,
        wbsId: data.wbsId,
        name: data.name,
        progress: data.progress || 0,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        projectId: data.projectId
      },
      include: {
        tasks: {
          include: {
            attachments: true
          }
        }
      }
    });

    return NextResponse.json(newPhase, { status: 201 });
  } catch (error: any) {
    console.error('Error creating phase:', error);
    return NextResponse.json({ error: error.message || 'Error creating phase' }, { status: 500 });
  }
}
