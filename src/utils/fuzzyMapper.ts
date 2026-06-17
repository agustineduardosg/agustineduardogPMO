export interface SynonymMapping {
  field: string;
  label: string;
  synonyms: string[];
}

export const INCIDENT_MAPPING_DICTIONARY: SynonymMapping[] = [
  {
    field: 'idTicket',
    label: 'ID_Ticket',
    synonyms: ['ticket jira', 'ticket', 'id', 'caso', 'nro incidente', 'nro_incidente', 'codigo', 'id_ticket', 'jira ticket']
  },
  {
    field: 'descripcion',
    label: 'Título/Descripción',
    synonyms: ['item', 'detalle', 'descripcion', 'glosa', 'hallazgo', 'titulo', 'resumen', 'summary', 'description']
  },
  {
    field: 'recintoName',
    label: 'Origen',
    synonyms: ['laboratorio', 'centro', 'sucursal', 'clinica', 'cliente', 'empresa', 'origen', 'sede', 'sede/clinica']
  },
  {
    field: 'responsable',
    label: 'Reportado Por',
    synonyms: ['reportado', 'usuario', 'informante', 'creado por', 'quien reporta', 'creador', 'reportado por', 'responsable', 'asignado']
  },
  {
    field: 'impacto',
    label: 'Prioridad/Criticidad',
    synonyms: ['impacto', 'criticidad', 'severidad', 'prioridad', 'urgencia', 'criticidad/severidad']
  },
  {
    field: 'fecha',
    label: 'Fecha',
    synonyms: ['fecha', 'f. creacion', 'creado el', 'fecha creacion', 'date', 'created at', 'f. creacion/fecha']
  },
  {
    field: 'faseAfectada',
    label: 'Fase Afectada',
    synonyms: ['fase', 'fase afectada', 'etapa', 'proceso']
  },
  {
    field: 'planDeAccion',
    label: 'Plan de Acción',
    synonyms: ['plan de accion', 'accion', 'accion inmediata', 'mitigacion', 'plan de accion inmediato']
  },
  {
    field: 'fechaCierre',
    label: 'Fecha de Cierre',
    synonyms: ['fecha cierre', 'fecha de cierre', 'cierre', 'fecha resolucion']
  }
];

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove tildes
    .replace(/[^a-z0-9]/g, " ")       // normalize special chars to spaces
    .trim()
    .replace(/\s+/g, " ");            // remove multiple spaces
}

export function getNormalizedSimilarity(s1: string, s2: string): number {
  const norm1 = normalizeString(s1);
  const norm2 = normalizeString(s2);

  if (norm1 === norm2) return 1.0;
  if (!norm1 || !norm2) return 0.0;

  const m = norm1.length;
  const n = norm2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (norm1[i - 1] === norm2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // delete
          dp[i][j - 1] + 1,    // insert
          dp[i - 1][j - 1] + 1 // substitute
        );
      }
    }
  }

  const distance = dp[m][n];
  const maxLength = Math.max(m, n);
  return 1.0 - distance / maxLength;
}

export function predictMappings(headers: string[]): Record<string, string> {
  const predictedMap: Record<string, string> = {};
  
  // Inicializar todas las columnas como vacías (columna personalizada)
  headers.forEach(h => {
    predictedMap[h] = "";
  });

  // Generar lista de posibles emparejamientos con puntuación
  const matches: { header: string; field: string; score: number }[] = [];

  headers.forEach(header => {
    INCIDENT_MAPPING_DICTIONARY.forEach(fieldDef => {
      const fieldNameSim = getNormalizedSimilarity(header, fieldDef.field);
      const fieldLabelSim = getNormalizedSimilarity(header, fieldDef.label);
      let currentMax = Math.max(fieldNameSim, fieldLabelSim);

      fieldDef.synonyms.forEach(alias => {
        const aliasSim = getNormalizedSimilarity(header, alias);
        if (aliasSim > currentMax) {
          currentMax = aliasSim;
        }
      });

      // Solo considerar si supera el 80% de similitud
      if (currentMax >= 0.8) {
        // Otorgar un pequeño bono (0.05) si coincide exactamente con el nombre de campo o la etiqueta
        const normHeader = normalizeString(header);
        const normField = normalizeString(fieldDef.field);
        const normLabel = normalizeString(fieldDef.label);
        const isExactMatch = (normHeader === normField || normHeader === normLabel);
        
        const score = currentMax + (isExactMatch ? 0.05 : 0.0);
        matches.push({ header, field: fieldDef.field, score });
      }
    });
  });

  // Ordenar de mayor a menor puntuación
  matches.sort((a, b) => b.score - a.score);

  const assignedHeaders = new Set<string>();
  const assignedFields = new Set<string>();

  // Asignar de forma codiciosa (greedy) evitando duplicaciones de campos mapeados
  matches.forEach(match => {
    if (!assignedHeaders.has(match.header) && !assignedFields.has(match.field)) {
      predictedMap[match.header] = match.field;
      assignedHeaders.add(match.header);
      assignedFields.add(match.field);
    }
  });

  return predictedMap;
}
