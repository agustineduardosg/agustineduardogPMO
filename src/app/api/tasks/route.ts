import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkSession, unauthorizedResponse } from '@/lib/apiAuth';

export async function POST(req: Request) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();
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
        dependencies: data.dependencies ? JSON.stringify(data.dependencies) : null,
        realStartDate: data.realStartDate ? new Date(data.realStartDate) : null,
        realEndDate: data.realEndDate ? new Date(data.realEndDate) : null,
        expectedProgress: data.expectedProgress !== undefined && data.expectedProgress !== null ? Number(data.expectedProgress) : null,
        delayDays: data.delayDays !== undefined && data.delayDays !== null ? Number(data.delayDays) : null,
        semaphore: data.semaphore || null,
        estimatedCost: data.estimatedCost !== undefined && data.estimatedCost !== null ? Number(data.estimatedCost) : null,
        realCost: data.realCost !== undefined && data.realCost !== null ? Number(data.realCost) : null,
        risk: data.risk || null,
        customFields: data.customFields ? (typeof data.customFields === 'string' ? data.customFields : JSON.stringify(data.customFields)) : '{}'
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
