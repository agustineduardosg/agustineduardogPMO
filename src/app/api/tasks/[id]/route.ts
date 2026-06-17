import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkSession, unauthorizedResponse } from '@/lib/apiAuth';

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();
    const { id } = await params;
    const data = await req.json();

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        wbsId: data.wbsId,
        name: data.name,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        duration: data.duration !== undefined ? data.duration : undefined,
        progress: data.progress !== undefined ? data.progress : undefined,
        assignee: data.assignee,
        status: data.status,
        priority: data.priority,
        notes: data.notes,
        jiraCode: data.jiraCode,
        phaseId: data.phaseId,
        parentId: data.parentId,
        dependencies: data.dependencies ? JSON.stringify(data.dependencies) : undefined,
        realStartDate: data.realStartDate !== undefined ? (data.realStartDate ? new Date(data.realStartDate) : null) : undefined,
        realEndDate: data.realEndDate !== undefined ? (data.realEndDate ? new Date(data.realEndDate) : null) : undefined,
        expectedProgress: data.expectedProgress !== undefined ? (data.expectedProgress !== null ? Number(data.expectedProgress) : null) : undefined,
        delayDays: data.delayDays !== undefined ? (data.delayDays !== null ? Number(data.delayDays) : null) : undefined,
        semaphore: data.semaphore !== undefined ? data.semaphore : undefined,
        estimatedCost: data.estimatedCost !== undefined ? (data.estimatedCost !== null ? Number(data.estimatedCost) : null) : undefined,
        realCost: data.realCost !== undefined ? (data.realCost !== null ? Number(data.realCost) : null) : undefined,
        risk: data.risk !== undefined ? data.risk : undefined,
        customFields: data.customFields !== undefined ? (typeof data.customFields === 'string' ? data.customFields : JSON.stringify(data.customFields)) : undefined
      },
      include: {
        attachments: true
      }
    });

    // Procesar de manera amigable las dependencias stringificadas para retornar al cliente
    const formattedTask = {
      ...updatedTask,
      dependencies: updatedTask.dependencies ? JSON.parse(updatedTask.dependencies) : []
    };

    return NextResponse.json(formattedTask);
  } catch (error: any) {
    console.error('Error updating task:', error);
    return NextResponse.json({ error: error.message || 'Error updating task' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();
    const { id } = await params;

    await prisma.task.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: error.message || 'Error deleting task' }, { status: 500 });
  }
}
