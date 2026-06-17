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
    const updatedProject = await prisma.project.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description !== undefined ? data.description : undefined,
        manager: data.manager !== undefined ? data.manager : undefined,
        sponsor: data.sponsor !== undefined ? data.sponsor : undefined,
        responsible: data.responsible !== undefined ? data.responsible : undefined,
        area: data.area !== undefined ? data.area : undefined,
        status: data.status !== undefined ? data.status : undefined,
        hasEquipment: data.hasEquipment !== undefined ? data.hasEquipment : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        parentProjectId: data.parentProjectId !== undefined ? data.parentProjectId : undefined,
        
        // Nuevos campos de metadatos Bupa PMO
        type: data.type !== undefined ? data.type : undefined,
        methodology: data.methodology !== undefined ? data.methodology : undefined,
        pmo: data.pmo !== undefined ? data.pmo : undefined,
        budget: data.budget !== undefined ? (data.budget !== null ? Number(data.budget) : null) : undefined,
        jiraId: data.jiraId !== undefined ? data.jiraId : undefined,
        cutoffDate: data.cutoffDate !== undefined ? (data.cutoffDate ? new Date(data.cutoffDate) : null) : undefined,
        goLiveDate: data.goLiveDate !== undefined ? (data.goLiveDate ? new Date(data.goLiveDate) : null) : undefined,
        statusTime: data.statusTime !== undefined ? data.statusTime : undefined,
        statusQuality: data.statusQuality !== undefined ? data.statusQuality : undefined,
        statusCost: data.statusCost !== undefined ? data.statusCost : undefined,
        nextMilestone: data.nextMilestone !== undefined ? data.nextMilestone : undefined,
        nextMilestoneDate: data.nextMilestoneDate !== undefined ? (data.nextMilestoneDate ? new Date(data.nextMilestoneDate) : null) : undefined,
        achievements: data.achievements !== undefined ? data.achievements : undefined,
        nextSteps: data.nextSteps !== undefined ? data.nextSteps : undefined,
        blockers: data.blockers !== undefined ? data.blockers : undefined,
        expectedProgress: data.expectedProgress !== undefined ? (data.expectedProgress !== null ? Number(data.expectedProgress) : null) : undefined,
        delayDays: data.delayDays !== undefined ? (data.delayDays !== null ? Number(data.delayDays) : null) : undefined,
        consolidatedRisk: data.consolidatedRisk !== undefined ? data.consolidatedRisk : undefined,
        costStatusText: data.costStatusText !== undefined ? data.costStatusText : undefined
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
        },
        risks: true,
        costItems: true
      }
    });

    return NextResponse.json(updatedProject);
  } catch (error: any) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: error.message || 'Error updating project' }, { status: 500 });
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

    await prisma.project.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Project deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: error.message || 'Error deleting project' }, { status: 500 });
  }
}
