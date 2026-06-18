import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkSession, unauthorizedResponse } from '@/lib/apiAuth';
import { compareWbs } from '@/utils/wbs';


export async function GET() {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();

    const projects = await prisma.project.findMany({
      include: {
        phases: {
          include: {
            tasks: {
              include: {
                attachments: true
              },
              orderBy: { createdAt: 'asc' }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        risks: true,
        costItems: {
          include: {
            attachments: true
          },
          orderBy: { indexId: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    // Ordenar lógicamente por WBS
    const sortedProjects = projects.map(p => {
      const sortedPhases = p.phases.map(ph => {
        const sortedTasks = [...ph.tasks].sort((t1, t2) => compareWbs(t1.wbsId, t2.wbsId));
        return { ...ph, tasks: sortedTasks };
      }).sort((ph1, ph2) => compareWbs(ph1.wbsId, ph2.wbsId));
      return { ...p, phases: sortedPhases };
    });
    return NextResponse.json(sortedProjects);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: error.message || 'Error fetching projects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();

    const data = await req.json();
    
    const newProject = await prisma.$transaction(async (tx) => {
      // 1. Create project, phases, and tasks (with parentId set to null to avoid FK constraint issues)
      const proj = await tx.project.create({
        data: {
          id: data.id,
          name: data.name,
          description: data.description,
          manager: data.manager,
          sponsor: data.sponsor,
          responsible: data.responsible,
          area: data.area,
          status: data.status || 'Planificación',
          hasEquipment: data.hasEquipment || false,
          startDate: new Date(data.startDate),
          endDate: new Date(data.endDate),
          parentProjectId: data.parentProjectId || null,
          
          // Nuevos Metadatos de Proyecto Bupa
          type: data.type || null,
          methodology: data.methodology || null,
          pmo: data.pmo || null,
          budget: data.budget !== undefined && data.budget !== null ? Number(data.budget) : null,
          jiraId: data.jiraId || null,
          cutoffDate: data.cutoffDate ? new Date(data.cutoffDate) : null,
          goLiveDate: data.goLiveDate ? new Date(data.goLiveDate) : null,
          statusTime: data.statusTime || 'Verde',
          statusQuality: data.statusQuality || 'Verde',
          statusCost: data.statusCost || 'Verde',
          nextMilestone: data.nextMilestone || null,
          nextMilestoneDate: data.nextMilestoneDate ? new Date(data.nextMilestoneDate) : null,
          achievements: data.achievements || null,
          nextSteps: data.nextSteps || null,
          blockers: data.blockers || null,

          phases: data.phases ? {
            create: data.phases.map((ph: any) => ({
              id: ph.id,
              wbsId: ph.wbsId,
              name: ph.name,
              progress: ph.progress || 0,
              startDate: new Date(ph.startDate),
              endDate: new Date(ph.endDate),
              tasks: ph.tasks ? {
                create: ph.tasks.map((t: any) => ({
                  id: t.id,
                  wbsId: t.wbsId,
                  name: t.name,
                  startDate: new Date(t.startDate),
                  endDate: new Date(t.endDate),
                  duration: t.duration || 0,
                  progress: t.progress || 0,
                  assignee: t.assignee || 'Sin Asignar',
                  status: t.status || 'Not Started',
                  priority: t.priority || 'Media',
                  notes: t.notes,
                  jiraCode: t.jiraCode,
                  parentId: null, // Keep null initially to prevent circular/missing FK checks
                  dependencies: t.dependencies ? JSON.stringify(t.dependencies) : null,
                  realStartDate: t.realStartDate ? new Date(t.realStartDate) : null,
                  realEndDate: t.realEndDate ? new Date(t.realEndDate) : null,
                  expectedProgress: t.expectedProgress !== undefined && t.expectedProgress !== null ? Number(t.expectedProgress) : null,
                  delayDays: t.delayDays !== undefined && t.delayDays !== null ? Number(t.delayDays) : null,
                  semaphore: t.semaphore || 'Verde',
                  estimatedCost: t.estimatedCost !== undefined && t.estimatedCost !== null ? Number(t.estimatedCost) : null,
                  realCost: t.realCost !== undefined && t.realCost !== null ? Number(t.realCost) : null,
                  risk: t.risk || 'Bajo'
                }))
              } : undefined
            }))
          } : undefined
        }
      });

      // 2. Run updates to bind parentId values for subtasks
      if (data.phases && Array.isArray(data.phases)) {
        for (const ph of data.phases) {
          if (ph.tasks && Array.isArray(ph.tasks)) {
            for (const t of ph.tasks) {
              if (t.parentId) {
                await tx.task.update({
                  where: { id: t.id },
                  data: { parentId: t.parentId }
                });
              }
            }
          }
        }
      }

      // 3. Return the fully loaded project with relations
      return await tx.project.findUnique({
        where: { id: proj.id },
        include: {
          phases: {
            include: {
              tasks: {
                include: {
                  attachments: true
                },
                orderBy: { createdAt: 'asc' }
              }
            },
            orderBy: { createdAt: 'asc' }
          },
          risks: true,
          costItems: {
            include: {
              attachments: true
            }
          }
        }
      });
    });

    if (newProject) {
      const sortedPhases = newProject.phases.map(ph => {
        const sortedTasks = [...ph.tasks].sort((t1, t2) => compareWbs(t1.wbsId, t2.wbsId));
        return { ...ph, tasks: sortedTasks };
      }).sort((ph1, ph2) => compareWbs(ph1.wbsId, ph2.wbsId));
      const sortedProject = { ...newProject, phases: sortedPhases };
      return NextResponse.json(sortedProject, { status: 201 });
    }

    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: error.message || 'Error creating project' }, { status: 500 });
  }
}
