import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkSession, unauthorizedResponse } from '@/lib/apiAuth';

export const dynamic = 'force-dynamic';

function cleanStringForMatch(str: string): string {
  if (!str) return "";
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove tildes
    .replace(/[^a-z0-9]/g, "") // remove spaces and special characters
    .trim();
}

export async function POST(req: Request) {
  try {
    const session = await checkSession();
    if (!session) return unauthorizedResponse();
    const { incidents, customColumns, defaultValues } = await req.json();

    if (!Array.isArray(incidents)) {
      return NextResponse.json({ error: 'Payload must contain an incidents array' }, { status: 400 });
    }

    // 1. Obtener el indexId máximo actual de la base de datos
    const maxIncident = await prisma.incident.findFirst({
      orderBy: { indexId: 'desc' },
      select: { indexId: true }
    });
    let nextIndexId = (maxIncident?.indexId || 0) + 1;

    // 2. Pre-cargar todos los proyectos y recintos para resolución en memoria rápida (evita N+1 queries)
    const dbProjects = await prisma.project.findMany({
      select: { id: true, name: true }
    });

    const dbRecintos = await prisma.recinto.findMany({
      include: {
        equipments: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    const resolvedIncidentsData = [];

    for (let i = 0; i < incidents.length; i++) {
      const inc = incidents[i];
      const indexId = nextIndexId++;

      // Resolver Proyecto Asociado (si se especificó en la fila)
      let resolvedProjectId = inc.projectId || null;
      if (resolvedProjectId) {
        const matchedProj = dbProjects.find(
          p => p.id.toLowerCase() === resolvedProjectId.toLowerCase() || 
               p.name.toLowerCase() === resolvedProjectId.toLowerCase()
        );
        resolvedProjectId = matchedProj ? matchedProj.id : null;
      }

      // Si no se resolvió por fila, usar el projectId general enviado en el payload (si existe)
      if (!resolvedProjectId && inc.defaultProjectId) {
        resolvedProjectId = inc.defaultProjectId;
      }

      // Auto-asociación inteligente condicional con equipos clínicos
      let recintoName = (inc.recintoName || '').trim();
      let equipmentName = (inc.equipmentName || '').trim();

      // Buscar coincidencia inteligente de recinto y equipo
      if (recintoName) {
        const cleanedRecName = cleanStringForMatch(recintoName);
        const matchedRecinto = dbRecintos.find(
          r => cleanStringForMatch(r.name) === cleanedRecName ||
               cleanStringForMatch(r.code) === cleanedRecName ||
               r.name.toLowerCase().includes(recintoName.toLowerCase()) ||
               recintoName.toLowerCase().includes(r.name.toLowerCase())
        );
        if (matchedRecinto) {
          recintoName = matchedRecinto.name;
          
          if (equipmentName) {
            const cleanedEquipName = cleanStringForMatch(equipmentName);
            const matchedEquipment = matchedRecinto.equipments.find(
              e => cleanStringForMatch(e.name) === cleanedEquipName ||
                   e.name.toLowerCase().includes(equipmentName.toLowerCase()) ||
                   equipmentName.toLowerCase().includes(e.name.toLowerCase())
            );
            if (matchedEquipment) {
              equipmentName = matchedEquipment.name;
            }
          }
        }
      }

      // Aplicar valores por defecto inyectados si los campos vienen vacíos
      const finalEstado = inc.estado || (defaultValues?.estado) || 'Abierto';
      const finalImpacto = inc.impacto || (defaultValues?.impacto) || 'Bajo';
      const finalResponsable = inc.responsable || (defaultValues?.responsable) || 'Sin asignar';
      const finalRecintoName = recintoName || (defaultValues?.recintoName) || 'BUPA Chile';
      const finalFase = inc.faseAfectada || (defaultValues?.faseAfectada) || 'General';

      resolvedIncidentsData.push({
        id: inc.id || `inc-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
        indexId,
        fecha: inc.fecha || new Date().toISOString().split('T')[0],
        recintoName: finalRecintoName,
        equipmentName: equipmentName || '',
        faseAfectada: finalFase,
        descripcion: inc.descripcion || '',
        impacto: finalImpacto,
        responsable: finalResponsable,
        estado: finalEstado,
        planDeAccion: inc.planDeAccion || '',
        fechaCierre: inc.fechaCierre || '',
        projectId: resolvedProjectId,
        idTicket: inc.idTicket || null,
        customFields: typeof inc.customFields === 'string' ? inc.customFields : JSON.stringify(inc.customFields || {})
      });
    }

    // 3. Insertar incidentes
    await prisma.incident.createMany({
      data: resolvedIncidentsData
    });

    // 4. Registrar columnas personalizadas nuevas en SystemConfig
    if (customColumns && customColumns.length > 0) {
      // Registrar en listado global
      const config = await prisma.systemConfig.findUnique({
        where: { key: 'incidents_custom_columns' }
      });
      let existingCols: string[] = [];
      if (config) {
        try {
          existingCols = JSON.parse(config.value);
        } catch (e) {
          existingCols = [];
        }
      }
      const updatedCols = Array.from(new Set([...existingCols, ...customColumns]));
      await prisma.systemConfig.upsert({
        where: { key: 'incidents_custom_columns' },
        update: { value: JSON.stringify(updatedCols) },
        create: { key: 'incidents_custom_columns', value: JSON.stringify(updatedCols) }
      });

      // Registrar en orden global
      const orderConfig = await prisma.systemConfig.findUnique({
        where: { key: 'incidents_column_order' }
      });
      let existingOrder: string[] = [];
      if (orderConfig) {
        try {
          existingOrder = JSON.parse(orderConfig.value);
        } catch (e) {
          existingOrder = [];
        }
      }

      const DEFAULT_COLUMN_ORDER = [
        'id',
        'fecha',
        'recintoName',
        'equipmentName',
        'faseAfectada',
        'descripcion',
        'impacto',
        'responsable',
        'estado',
        'planDeAccion',
        'fechaCierre',
        'projectId'
      ];

      if (existingOrder.length === 0) {
        existingOrder = [...DEFAULT_COLUMN_ORDER];
      }

      const newColsToAdd = customColumns.filter((c: string) => !existingOrder.includes(c));
      if (newColsToAdd.length > 0 || !orderConfig) {
        const updatedOrder = [...existingOrder, ...newColsToAdd];
        await prisma.systemConfig.upsert({
          where: { key: 'incidents_column_order' },
          update: { value: JSON.stringify(updatedOrder) },
          create: { key: 'incidents_column_order', value: JSON.stringify(updatedOrder) }
        });
      }
    }

    // 5. Retornar todos los incidentes actualizados en orden indexId desc para refrescar el store del cliente (el más nuevo primero)
    const updatedIncidents = await prisma.incident.findMany({
      orderBy: { indexId: 'desc' }
    });

    return NextResponse.json(updatedIncidents);
  } catch (error: any) {
    console.error('Error in bulk import API:', error);
    return NextResponse.json({ error: error.message || 'Error executing bulk import' }, { status: 500 });
  }
}
