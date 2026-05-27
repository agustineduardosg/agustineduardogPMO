import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const body = await req.json();
    const { project, phases, tasks } = body;

    // Ejecutar todas las actualizaciones dentro de una única transacción relacional SQLite segura
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar campos básicos del proyecto si vienen en el lote
      if (project) {
        await tx.project.update({
          where: { id: projectId },
          data: {
            name: project.name,
            description: project.description !== undefined ? project.description : undefined,
            manager: project.manager !== undefined ? project.manager : undefined,
            area: project.area !== undefined ? project.area : undefined,
            status: project.status !== undefined ? project.status : undefined,
            hasEquipment: project.hasEquipment !== undefined ? project.hasEquipment : undefined,
            startDate: project.startDate ? new Date(project.startDate) : undefined,
            endDate: project.endDate ? new Date(project.endDate) : undefined,
          },
        });
      }

      // 2. Actualizar fases en lote
      if (phases && Array.isArray(phases)) {
        for (const phase of phases) {
          await tx.phase.update({
            where: { id: phase.id },
            data: {
              name: phase.name,
              progress: phase.progress !== undefined ? Number(phase.progress) : undefined,
              startDate: phase.startDate ? new Date(phase.startDate) : undefined,
              endDate: phase.endDate ? new Date(phase.endDate) : undefined,
            },
          });
        }
      }

      // 3. Actualizar tareas en lote
      if (tasks && Array.isArray(tasks)) {
        for (const task of tasks) {
          await tx.task.update({
            where: { id: task.id },
            data: {
              name: task.name,
              startDate: task.startDate ? new Date(task.startDate) : undefined,
              endDate: task.endDate ? new Date(task.endDate) : undefined,
              duration: task.duration !== undefined ? Number(task.duration) : undefined,
              progress: task.progress !== undefined ? Number(task.progress) : undefined,
              assignee: task.assignee,
              status: task.status,
              priority: task.priority,
              notes: task.notes,
              jiraCode: task.jiraCode,
              parentId: task.parentId,
              dependencies: task.dependencies 
                ? (typeof task.dependencies === 'string' ? task.dependencies : JSON.stringify(task.dependencies))
                : undefined,
            },
          });
        }
      }

      // Devolver el proyecto completo actualizado con fases y tareas para la hidratación
      return await tx.project.findUnique({
        where: { id: projectId },
        include: {
          phases: {
            include: {
              tasks: {
                include: {
                  attachments: true,
                },
                orderBy: { createdAt: 'asc' },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing bulk sync transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Error executing bulk sync transaction' },
      { status: 500 }
    );
  }
}
