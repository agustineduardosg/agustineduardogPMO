import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const newTask = await prisma.task.create({
      data: {
        id: data.id,
        wbsId: data.wbsId,
        name: data.name,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        duration: data.duration || 0,
        progress: data.progress || 0,
        assignee: data.assignee || 'Sin Asignar',
        status: data.status || 'Not Started',
        priority: data.priority || 'Media',
        notes: data.notes,
        jiraCode: data.jiraCode,
        phaseId: data.phaseId,
        parentId: data.parentId,
        dependencies: data.dependencies ? JSON.stringify(data.dependencies) : null
      },
      include: {
        attachments: true
      }
    });

    return NextResponse.json(newTask, { status: 201 });
  } catch (error: any) {
    console.error('Error creating task:', error);
    return NextResponse.json({ error: error.message || 'Error creating task' }, { status: 500 });
  }
}
