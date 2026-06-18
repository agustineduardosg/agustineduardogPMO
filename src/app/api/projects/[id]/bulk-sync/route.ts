import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { compareWbs } from '@/utils/wbs';

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
            
            // Nuevos Metadatos de Proyecto Bupa
            type: project.type !== undefined ? project.type : undefined,
            methodology: project.methodology !== undefined ? project.methodology : undefined,
            pmo: project.pmo !== undefined ? project.pmo : undefined,
            budget: project.budget !== undefined ? (project.budget !== null ? Number(project.budget) : null) : undefined,
            jiraId: project.jiraId !== undefined ? project.jiraId : undefined,
            cutoffDate: project.cutoffDate !== undefined ? (project.cutoffDate ? new Date(project.cutoffDate) : null) : undefined,
            statusTime: project.statusTime !== undefined ? project.statusTime : undefined,
            statusQuality: project.statusQuality !== undefined ? project.statusQuality : undefined,
            statusCost: project.statusCost !== undefined ? project.statusCost : undefined,
            nextMilestone: project.nextMilestone !== undefined ? project.nextMilestone : undefined,
            nextMilestoneDate: project.nextMilestoneDate !== undefined ? (project.nextMilestoneDate ? new Date(project.nextMilestoneDate) : null) : undefined,
            achievements: project.achievements !== undefined ? project.achievements : undefined,
            nextSteps: project.nextSteps !== undefined ? project.nextSteps : undefined,
            blockers: project.blockers !== undefined ? project.blockers : undefined,
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
                
              // Nuevos Campos de Planificación y Control
              realStartDate: task.realStartDate !== undefined ? (task.realStartDate ? new Date(task.realStartDate) : null) : undefined,
              realEndDate: task.realEndDate !== undefined ? (task.realEndDate ? new Date(task.realEndDate) : null) : undefined,
              expectedProgress: task.expectedProgress !== undefined ? (task.expectedProgress !== null ? Number(task.expectedProgress) : null) : undefined,
              delayDays: task.delayDays !== undefined ? (task.delayDays !== null ? Number(task.delayDays) : null) : undefined,
              semaphore: task.semaphore !== undefined ? task.semaphore : undefined,
              estimatedCost: task.estimatedCost !== undefined ? (task.estimatedCost !== null ? Number(task.estimatedCost) : null) : undefined,
              realCost: task.realCost !== undefined ? (task.realCost !== null ? Number(task.realCost) : null) : undefined,
              risk: task.risk !== undefined ? task.risk : undefined,
              customFields: task.customFields !== undefined ? (typeof task.customFields === 'string' ? task.customFields : JSON.stringify(task.customFields)) : undefined,
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
          risks: true,
          costItems: true
        },
      });
    });

    if (result) {
      const sortedPhases = result.phases.map(ph => {
        const sortedTasks = [...ph.tasks].sort((t1, t2) => compareWbs(t1.wbsId, t2.wbsId));
        return { ...ph, tasks: sortedTasks };
      }).sort((ph1, ph2) => compareWbs(ph1.wbsId, ph2.wbsId));
      const sortedProject = { ...result, phases: sortedPhases };
      return NextResponse.json(sortedProject);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error executing bulk sync transaction:', error);
    return NextResponse.json(
      { error: error.message || 'Error executing bulk sync transaction' },
      { status: 500 }
    );
  }
}
