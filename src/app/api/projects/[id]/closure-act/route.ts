import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkSession, unauthorizedResponse } from '@/lib/apiAuth';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check session authorization
  const session = await checkSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { id: projectId } = await params;

    // Try to find the existing ClosureAct
    let closureAct = await prisma.closureAct.findUnique({
      where: { projectId }
    });

    // If it doesn't exist, we construct a pre-populated default object (unsaved)
    if (!closureAct) {
      const project = await prisma.project.findUnique({
        where: { id: projectId }
      });

      if (!project) {
        return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
      }

      closureAct = {
        id: 'draft',
        projectId,
        acceptanceCriteria: 'Todos los entregables definidos en el alcance del proyecto han sido revisados y aceptados formalmente. Las pruebas funcionales y de conectividad fueron completadas de forma satisfactoria.',
        lessonsLearned: '1. ¿Qué funcionó bien?:\n- Excelente coordinación entre el equipo clínico y de TI.\n- El pre-mapeo del importador redujo el tiempo de configuración inicial.\n\n2. ¿Qué se puede mejorar?:\n- Planificar las capacitaciones de usuarios clave con mayor anticipación para asegurar disponibilidad de turnos.\n\n3. Recomendaciones para futuros proyectos:\n- Homologar plantillas de Excel con los proveedores clínicos previo a la etapa de desarrollo.',
        handoverNotes: 'Traspaso formal a operaciones completado. Se capacitó a los usuarios clínicos clave, se entregó la matriz de analitos configurada y se completó la integración con el sistema de transmisión LIS.',
        pendingItems: 'Ninguno. Proyecto cerrado al 100% sin pendientes críticos.',
        customSections: '[]',
        signedByPm: null,
        signedBySponsor: null,
        signedByPmo: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    return NextResponse.json(closureAct);
  } catch (error: any) {
    console.error('Error in GET /api/projects/[id]/closure-act:', error);
    return NextResponse.json({ error: error.message || 'Error al obtener el acta de cierre' }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Check session authorization
  const session = await checkSession();
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const { id: projectId } = await params;
    const body = await req.json();

    const {
      acceptanceCriteria,
      lessonsLearned,
      handoverNotes,
      pendingItems,
      customSections,
      signedByPm,
      signedBySponsor,
      signedByPmo
    } = body;

    const updatedAct = await prisma.closureAct.upsert({
      where: { projectId },
      update: {
        acceptanceCriteria,
        lessonsLearned,
        handoverNotes,
        pendingItems,
        customSections,
        signedByPm,
        signedBySponsor,
        signedByPmo
      },
      create: {
        projectId,
        acceptanceCriteria,
        lessonsLearned,
        handoverNotes,
        pendingItems,
        customSections,
        signedByPm,
        signedBySponsor,
        signedByPmo
      }
    });

    return NextResponse.json(updatedAct);
  } catch (error: any) {
    console.error('Error in PUT /api/projects/[id]/closure-act:', error);
    return NextResponse.json({ error: error.message || 'Error al guardar el acta de cierre' }, { status: 500 });
  }
}
