import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(projects);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: error.message || 'Error fetching projects' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    const newProject = await prisma.project.create({
      data: {
        id: data.id,
        name: data.name,
        description: data.description,
        manager: data.manager,
        area: data.area,
        status: data.status || 'Planificación',
        hasEquipment: data.hasEquipment || false,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
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
                parentId: t.parentId,
                dependencies: t.dependencies ? JSON.stringify(t.dependencies) : null
              }))
            } : undefined
          }))
        } : undefined
      },
      include: {
        phases: {
          include: {
            tasks: {
              include: {
                attachments: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error: any) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: error.message || 'Error creating project' }, { status: 500 });
  }
}
