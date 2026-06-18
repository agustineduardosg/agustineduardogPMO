"use client";

import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, 
  Check, 
  Loader2, 
  ArrowRight, 
  Table as TableIcon, 
  Info, 
  Download, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Sparkles, 
  Database,
  ArrowLeft,
  ChevronRight,
  Activity,
  FileSpreadsheet,
  Link2,
  Building
} from 'lucide-react';
import { useProjectStore, Task, Phase, Project, TaskStatus } from '@/store/projectStore';
import { useEquipmentStore, ClinicalEquipment, Recinto, EquipmentPhaseStatus } from '@/store/equipmentStore';
import { useIncidentStore } from '@/store/incidentStore';
import { useRouter } from 'next/navigation';
import { addBusinessDays } from '@/utils/dateUtils';
import { format } from 'date-fns';
import { predictMappings } from '@/utils/fuzzyMapper';

type GanttMappingKeys = 'taskName' | 'phaseName' | 'startDate' | 'endDate' | 'duration' | 'assignee' | 'progress' | 'status' | 'priority' | 'notes' | 'realStartDate' | 'realEndDate' | 'expectedProgress' | 'estimatedCost' | 'realCost' | 'risk' | 'wbsId';
type EquipmentMappingKeys = 'name' | 'section' | 'recintoName' | 'responsable' | 'observaciones' | 'pendienteDe' | 'compromisoDate' | 'levantamiento' | 'parametrizacion' | 'pruebas' | 'capacitacion' | 'validacion' | 'golive';
type AnalyteMappingKeys = 'instrumentName' | 'transmissionCode' | 'testCode' | 'name' | 'description' | 'section' | 'state';
type IncidentMappingKeys = 'fecha' | 'recintoName' | 'equipmentName' | 'faseAfectada' | 'descripcion' | 'impacto' | 'responsable' | 'estado' | 'planDeAccion' | 'fechaCierre' | 'projectId' | 'idTicket' | 'ignore';

interface ValidationError {
  row: number;
  column: string;
  level: 'critical' | 'warning' | 'info';
  message: string;
}

const GANTT_FIELD_OPTIONS = [
  { value: '', label: 'No usar esta columna' },
  { value: 'wbsId', label: 'ID WBS (ej: 1, 1.1, 1.2)' },
  { value: 'taskName', label: '✅ Nombre de la Tarea (Requerido)' },
  { value: 'phaseName', label: 'Fase / Grupo' },
  { value: 'startDate', label: 'Fecha de Inicio' },
  { value: 'endDate', label: 'Fecha de Fin' },
  { value: 'duration', label: 'Duración (Días)' },
  { value: 'assignee', label: 'Responsable' },
  { value: 'progress', label: 'Progreso (%)' },
  { value: 'status', label: 'Estado' },
  { value: 'priority', label: 'Prioridad' },
  { value: 'notes', label: 'Notas' },
  { value: 'realStartDate', label: 'Fecha Inicio Real' },
  { value: 'realEndDate', label: 'Fecha Fin Real' },
  { value: 'expectedProgress', label: 'Progreso Esperado (%)' },
  { value: 'estimatedCost', label: 'Costo Estimado' },
  { value: 'realCost', label: 'Costo Real' },
  { value: 'risk', label: 'Riesgo (Bajo-Crítico)' }
];

const EQUIP_FIELD_OPTIONS = [
  { value: '', label: 'No usar esta columna' },
  { value: 'name', label: '✅ Nombre del Equipo (Requerido)' },
  { value: 'recintoName', label: '✅ Nombre de la Ubicación/Recinto (Requerido)' },
  { value: 'section', label: 'Sección / Especialidad' },
  { value: 'responsable', label: 'Responsable' },
  { value: 'levantamiento', label: 'F1: Levantamiento' },
  { value: 'parametrizacion', label: 'F2: Parametrización' },
  { value: 'pruebas', label: 'F3: Pruebas' },
  { value: 'capacitacion', label: 'F4: Capacitación' },
  { value: 'validacion', label: 'F5: Validación' },
  { value: 'golive', label: 'F6: Go Live' },
  { value: 'observaciones', label: 'Observaciones' },
  { value: 'pendienteDe', label: 'Pendiente de' },
  { value: 'compromisoDate', label: 'Fecha de Compromiso' }
];

const ANALYTE_FIELD_OPTIONS = [
  { value: '', label: 'No usar esta columna' },
  { value: 'instrumentName', label: '✅ Instrumento / Equipo (Requerido)' },
  { value: 'transmissionCode', label: '✅ Cód. Transmisión (Requerido)' },
  { value: 'testCode', label: '✅ Cód. Test / Código Analito (Requerido)' },
  { value: 'name', label: '✅ Nombre del Analito (Requerido)' },
  { value: 'description', label: 'Descripción Extensa' },
  { value: 'section', label: 'Sección / Laboratorio' },
  { value: 'state', label: 'Estado Actual' }
];

const INCIDENT_FIELD_OPTIONS = [
  { value: '', label: '⚙️ Columna Personalizada (Importación Automática)' },
  { value: 'ignore', label: '❌ Ignorar esta columna (No importar)' },
  { value: 'idTicket', label: 'ID del Ticket / Código' },
  { value: 'fecha', label: '✅ Fecha del Incidente (Requerido)' },
  { value: 'recintoName', label: 'Nombre de la Sede/Clínica' },
  { value: 'equipmentName', label: 'Nombre del Equipo Afectado' },
  { value: 'faseAfectada', label: 'Fase Afectada' },
  { value: 'descripcion', label: '✅ Descripción del Incidente (Requerido)' },
  { value: 'impacto', label: 'Impacto (Bajo, Medio, Crítico)' },
  { value: 'responsable', label: 'Responsable' },
  { value: 'estado', label: 'Estado (Abierto, En proceso, Cerrado)' },
  { value: 'planDeAccion', label: 'Plan de Acción Inmediato' },
  { value: 'fechaCierre', label: 'Fecha de Cierre' },
  { value: 'projectId', label: 'Proyecto Asociado' }
];

export default function ImportPage() {
  // Stepper state: 1 = Config/Upload, 2 = Mapping, 3 = Validation, 4 = Syncing/Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [importType, setImportType] = useState<'gantt' | 'equipment' | 'analyte' | 'incident'>('gantt');
  const [isContextual, setIsContextual] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  
  // Google Sheets URL import states
  const [url, setUrl] = useState('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Multi-sheet and Workbook state variables
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  
  // Mapping structures
  const [ganttMapping, setGanttMapping] = useState<Record<string, GanttMappingKeys | ''>>({});
  const [equipMapping, setEquipMapping] = useState<Record<string, EquipmentMappingKeys | ''>>({});
  const [analyteMapping, setAnalyteMapping] = useState<Record<string, AnalyteMappingKeys | ''>>({});
  const [incidentMapping, setIncidentMapping] = useState<Record<string, IncidentMappingKeys | ''>>({});
  
  // Asignación interactiva de sedes para analitos sin sigla visible
  const [instrumentSedeMap, setInstrumentSedeMap] = useState<Record<string, string>>({});
  const [uniqueInstrumentsList, setUniqueInstrumentsList] = useState<string[]>([]);
  
  // Meta Configuration
  const [projectName, setProjectName] = useState('Nuevo Proyecto Importado');
  const [linkProjectOption, setLinkProjectOption] = useState<'new' | 'existing'>('new');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  
  // Validation States
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [criticalRows, setCriticalRows] = useState<Set<number>>(new Set());
  
  // Incident Default Values
  const [defaultEstado, setDefaultEstado] = useState<string>('Abierto');
  const [defaultImpacto, setDefaultImpacto] = useState<string>('Bajo');

  // Import Progress States
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [importSummary, setImportSummary] = useState({ success: 0, failed: 0, recintosCreated: 0 });

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Global Stores
  const { projects, addProject, fetchProjects } = useProjectStore();
  const { recintos, addRecinto, addEquipment, fetchEquipmentData, bulkImportAnalytes } = useEquipmentStore();

  useEffect(() => {
    fetchProjects();
    fetchEquipmentData();
  }, []);

  useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const typeParam = params.get('type');
      if (typeParam === 'gantt' || typeParam === 'equipment' || typeParam === 'analyte' || typeParam === 'incident') {
        setImportType(typeParam as any);
        setIsContextual(true);
      }
      const projParam = params.get('projectId');
      if (projParam && projParam !== 'independent') {
        setSelectedProjectId(projParam);
        setLinkProjectOption('existing');
      }
    }
  }, []);

  const normalizeStr = (str: string) => String(str).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  // WBS Grouping Heuristic
  const normalizePhaseName = (rawName: string) => {
    let name = String(rawName).trim();
    const prefixMatch = name.match(/^(fase|etapa)\s*\d+/i);
    if (prefixMatch) {
      return prefixMatch[0].toUpperCase();
    }
    return name;
  };

  // Generate dynamic Excel template and download in client
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    if (importType === 'gantt') {
      const headers = ['Fase / Grupo', 'Nombre de la Tarea', 'Fecha de Inicio', 'Duración (Días)', 'Responsable', 'Progreso (%)', 'Estado', 'Prioridad', 'Notas'];
      const rows = [
        ['Fase 1: Planificación', 'Diseño de Plan de Negocios', '2026-05-20', '5', 'Sofía Rodríguez', '100%', 'Completed', 'Alta', 'Aprobado por patrocinador'],
        ['Fase 1: Planificación', 'Revisión Legal de Contrato', '2026-05-25', '3', 'Sofía Rodríguez', '50%', 'In Progress', 'Media', 'En revisión por fiscalía'],
        ['Fase 2: Ejecución', 'Compra de Dispositivos Biomédicos', '2026-05-28', '10', 'Cristian Rojas', '0%', 'Not Started', 'Alta', 'Pendiente de fondos'],
        ['Fase 2: Ejecución', 'Capacitación del Personal Médico', '2026-06-08', '5', 'Alejandra Pérez', '0%', 'Not Started', 'Media', 'Coordinar con enfermería jefa']
      ];
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Cronograma Gantt");
      XLSX.writeFile(wb, "Plantilla_Gantt_SmartPM.xlsx");
    } else if (importType === 'equipment') {
      const headers = ['Nombre del Recinto', 'Nombre del Equipo', 'Sección / Especialidad', 'Responsable', 'Levantamiento', 'Parametrización', 'Pruebas', 'Capacitación', 'Validación', 'Go Live', 'Observaciones'];
      const rows = [
        ['BUPA CLA', 'Advia 2120 Hematología', 'Hematología', 'Dr. Juan Gómez', 'Completado', 'Completado', 'En progreso', 'No iniciado', 'No iniciado', 'No iniciado', 'Calibración anual al día'],
        ['BUPA CLA', 'Centrífuga Beckman', 'Química', 'Dra. María Paz', 'Completado', 'No iniciado', 'No iniciado', 'No iniciado', 'No iniciado', 'No iniciado', 'Requiere mantención preventiva'],
        ['NUEVO RECINTO CLINICO', 'Ecógrafo General Electric', 'Imagenología', 'Sin asignar', 'No iniciado', 'No iniciado', 'No iniciado', 'No iniciado', 'No iniciado', 'No iniciado', 'Equipo nuevo de última generación']
      ];
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Equipamiento Clínico");
      XLSX.writeFile(wb, "Plantilla_Equipos_Clinicos_SmartPM.xlsx");
    } else if (importType === 'analyte') {
      const headers = ['Instrumento', 'Cod transmision', 'Cod Test', 'Nombre analito', 'Descripcion Extensa', 'Seccion', 'estado'];
      const rows = [
        ['A15', 'ADA', '302050', 'ADA', 'Adenosindeaminasa', 'TECNICAS ESPECIALES', 'No Iniciado'],
        ['A15_2', 'FCAL', '302530', 'Calpro', 'Calprotectina', 'INMUNOLOGIA', 'No Iniciado'],
        ['Advia1201AD', 'HemImage', '301045-AD', 'HemImage', 'HemImage', 'HEMATOLOGIA', 'Transmitiendo'],
        ['Advia1201AD', '5', '301045-D', 'VCM', 'VCM', 'HEMATOLOGIA', 'Transmitiendo']
      ];
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Matriz de Analitos");
      XLSX.writeFile(wb, "Plantilla_Analitos_Bupa.xlsx");
    } else if (importType === 'incident') {
      const headers = ['Fecha', 'Sede / Clínica', 'Equipo Afectado', 'Fase Afectada', 'Descripción del Incidente', 'Impacto', 'Responsable', 'Estado', 'Plan de Acción', 'Fecha Cierre', 'Proyecto Asociado'];
      const rows = [
        ['2026-06-11', 'BUPA CLA', 'CA 600', 'Pruebas', 'Error en transmisión de resultados de glucosa', 'Crítico', 'Sistemas TI Bupa', 'Abierto', 'Revisar puertos del middleware y reiniciar servicio', '', 'Calidad Bupa'],
        ['2026-06-12', 'BUPA CLR', '', 'General', 'Caída de enlace MPLS principal de la clínica', 'Crítico', 'Soporte Telecom', 'Abierto', 'Escalar con proveedor de telecomunicaciones', '', 'Calidad Bupa'],
        ['2026-06-12', 'BUPA CLA', 'Advia 2120 Hematología', 'Capacitación', 'Dudas del personal con la visualización de alarmas', 'Bajo', 'Laboratorio', 'Cerrado', 'Capacitación reforzada realizada en terreno', '2026-06-12', '']
      ];
      const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
      XLSX.utils.book_append_sheet(wb, ws, "Incidentes");
      XLSX.writeFile(wb, "Plantilla_Incidentes_SmartPM.xlsx");
    }
  };

  const processSheet = (wb: XLSX.WorkBook, sheetName: string) => {
    const worksheet = wb.Sheets[sheetName];
    if (!worksheet) return;

    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false }) as any[][];
    
    if (rawData.length === 0) {
      alert("No pudimos encontrar datos legibles en esta pestaña.");
      return;
    }

    const keywords = [
      'tarea', 'actividad', 'nombre', 'inicio', 'fin', 'fecha', 'responsable', 'asignado', 
      'avance', 'progreso', 'estado', 'fase', 'etapa', 'duracion', 'prio', 'prioridad',
      'recinto', 'ubicacion', 'equipo', 'seccion', 'marca', 'modelo', 'calibra'
    ];
    
    let maxScore = -1;
    let headerRowIndex = 0;

    for (let i = 0; i < Math.min(15, rawData.length); i++) {
      const row = rawData[i];
      if (!Array.isArray(row)) continue;
      
      let score = 0;
      row.forEach(cell => {
        const text = normalizeStr(cell);
        if (text && keywords.some(kw => text.includes(kw))) {
          score++;
        }
      });

      // Strict heuristic: Only update if score is strictly greater, preventing data rows from overriding the first header row.
      if (score > maxScore) {
        maxScore = score;
        headerRowIndex = i;
      }
    }

    const rawHeaders = rawData[headerRowIndex] || [];
    const headers = rawHeaders.map((h, i) => String(h).trim() || `Columna ${i + 1}`);

    const json: any[] = [];
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.every(cell => String(cell).trim() === '')) continue;
      
      const obj: any = {};
      headers.forEach((header, colIndex) => {
        obj[header] = row[colIndex];
      });
      json.push(obj);
    }

    if (json.length === 0) {
      alert("Se encontraron los encabezados en esta pestaña, pero no hay filas con datos válidos debajo.");
      return;
    }

    setColumns(headers);
    setParsedData(json);

    // Auto-guessing columns mapping heuristic
    if (importType === 'gantt') {
      const initialGantt: Record<string, GanttMappingKeys | ''> = {};
      headers.forEach(col => initialGantt[col] = '');
      
      let foundTask = false, foundStart = false;

      headers.forEach(col => {
        const norm = normalizeStr(col);
        if (norm === 'id' || norm === 'wbs' || norm === 'codigo' || norm.includes('wbs') || norm === 'wbsid' || norm === 'n°') {
          initialGantt[col] = 'wbsId';
        } else if (!foundTask && (norm.includes('tarea') || norm.includes('nombre') || norm.includes('actividad') || norm.includes('descripcion') || norm.includes('fase / actividad') || norm.includes('actividad (wbs)'))) {
          initialGantt[col] = 'taskName';
          foundTask = true;
        } else if (!Object.values(initialGantt).includes('phaseName') && (norm.includes('fase') || norm.includes('etapa') || norm.includes('grupo'))) {
          initialGantt[col] = 'phaseName';
        } else if (norm.includes('inicio') && norm.includes('real')) {
          initialGantt[col] = 'realStartDate';
        } else if ((norm.includes('fin') || norm.includes('termino')) && norm.includes('real')) {
          initialGantt[col] = 'realEndDate';
        } else if (!foundStart && (norm.includes('inicio') || norm.includes('start') || norm.includes('desde'))) {
          initialGantt[col] = 'startDate';
          foundStart = true;
        } else if (!Object.values(initialGantt).includes('endDate') && (norm.includes('fin') || norm.includes('end') || norm.includes('hasta') || norm.includes('vence'))) {
          initialGantt[col] = 'endDate';
        } else if (!Object.values(initialGantt).includes('duration') && (norm.includes('duracion') || norm.includes('dias') || norm.includes('plazo'))) {
          initialGantt[col] = 'duration';
        } else if (!Object.values(initialGantt).includes('assignee') && (norm.includes('responsable') || norm.includes('asignado') || norm.includes('recurso') || norm.includes('encargado'))) {
          initialGantt[col] = 'assignee';
        } else if (norm.includes('esperado') || (norm.includes('planificado') && norm.includes('%'))) {
          initialGantt[col] = 'expectedProgress';
        } else if (!Object.values(initialGantt).includes('progress') && (norm.includes('avance') || norm.includes('progreso') || norm.includes('%'))) {
          initialGantt[col] = 'progress';
        } else if (!Object.values(initialGantt).includes('status') && (norm.includes('estado') || norm.includes('status') || norm.includes('situacion'))) {
          initialGantt[col] = 'status';
        } else if (!Object.values(initialGantt).includes('priority') && (norm.includes('prio') || norm.includes('importancia') || norm.includes('severidad'))) {
          initialGantt[col] = 'priority';
        } else if (!Object.values(initialGantt).includes('notes') && (norm.includes('nota') || norm.includes('comentario') || norm.includes('observacion'))) {
          initialGantt[col] = 'notes';
        } else if ((norm.includes('estimado') && norm.includes('costo')) || norm.includes('presupuesto')) {
          initialGantt[col] = 'estimatedCost';
        } else if (norm.includes('real') && norm.includes('costo')) {
          initialGantt[col] = 'realCost';
        } else if (norm.includes('riesgo') || norm.includes('criticidad')) {
          initialGantt[col] = 'risk';
        }
      });
      setGanttMapping(initialGantt);
    } else if (importType === 'equipment') {
      const initialEquip: Record<string, EquipmentMappingKeys | ''> = {};
      headers.forEach(col => initialEquip[col] = '');

      let foundEquip = false, foundRec = false;

      headers.forEach(col => {
        const norm = normalizeStr(col);
        if (!foundEquip && (norm.includes('equipo') || norm.includes('dispositivo') || norm.includes('nombre del equipo') || norm.includes('biomedico'))) {
          initialEquip[col] = 'name';
          foundEquip = true;
        } else if (!foundRec && (norm.includes('recinto') || norm.includes('ubicacion') || norm.includes('sala') || norm.includes('centro') || norm.includes('sede'))) {
          initialEquip[col] = 'recintoName';
          foundRec = true;
        } else if (!Object.values(initialEquip).includes('section') && (norm.includes('seccion') || norm.includes('especialidad') || norm.includes('area') || norm.includes('unidad'))) {
          initialEquip[col] = 'section';
        } else if (!Object.values(initialEquip).includes('responsable') && (norm.includes('responsable') || norm.includes('tecnico') || norm.includes('operador'))) {
          initialEquip[col] = 'responsable';
        } else if (!Object.values(initialEquip).includes('observaciones') && (norm.includes('obs') || norm.includes('comentario') || norm.includes('detalle'))) {
          initialEquip[col] = 'observaciones';
        } else if (!Object.values(initialEquip).includes('pendienteDe') && (norm.includes('pendiente') || norm.includes('bloqueado'))) {
          initialEquip[col] = 'pendienteDe';
        } else if (!Object.values(initialEquip).includes('compromisoDate') && (norm.includes('compromiso') || norm.includes('fecha limite'))) {
          initialEquip[col] = 'compromisoDate';
        } else if (norm.includes('levantamiento') || norm.includes('f1') || norm.includes('fase 1')) {
          initialEquip[col] = 'levantamiento';
        } else if (norm.includes('parametrizacion') || norm.includes('f2') || norm.includes('fase 2') || norm.includes('config')) {
          initialEquip[col] = 'parametrizacion';
        } else if (norm.includes('prueba') || norm.includes('f3') || norm.includes('fase 3') || norm.includes('test')) {
          initialEquip[col] = 'pruebas';
        } else if (norm.includes('capacitacion') || norm.includes('f4') || norm.includes('fase 4') || norm.includes('entrena')) {
          initialEquip[col] = 'capacitacion';
        } else if (norm.includes('validacion') || norm.includes('f5') || norm.includes('fase 5') || norm.includes('firma')) {
          initialEquip[col] = 'validacion';
        } else if (norm.includes('go live') || norm.includes('golive') || norm.includes('f6') || norm.includes('fase 6') || norm.includes('produccion')) {
          initialEquip[col] = 'golive';
        }
      });
      setEquipMapping(initialEquip);
    } else if (importType === 'analyte') {
      const initialAnalyte: Record<string, AnalyteMappingKeys | ''> = {};
      headers.forEach(col => initialAnalyte[col] = '');

      headers.forEach(col => {
        const norm = normalizeStr(col);
        if (norm.includes('instrumento') || norm.includes('equipo') || norm.includes('aparato')) {
          initialAnalyte[col] = 'instrumentName';
        } else if (norm.includes('cod transmision') || norm.includes('transmision') || norm.includes('codigo transmision')) {
          initialAnalyte[col] = 'transmissionCode';
        } else if (norm.includes('cod test') || norm.includes('codigo test') || norm.includes('test')) {
          initialAnalyte[col] = 'testCode';
        } else if (norm.includes('nombre analito') || norm.includes('analito') || norm.includes('nombre')) {
          initialAnalyte[col] = 'name';
        } else if (norm.includes('descripcion') || norm.includes('extensa')) {
          initialAnalyte[col] = 'description';
        } else if (norm.includes('seccion') || norm.includes('departamento') || norm.includes('laboratorio')) {
          initialAnalyte[col] = 'section';
        } else if (norm.includes('estado') || norm.includes('status')) {
          initialAnalyte[col] = 'state';
        }
      });
      setAnalyteMapping(initialAnalyte);
    } else if (importType === 'incident') {
      const headersHash = headers.map(h => String(h).trim()).join('|');
      
      // Intentar cargar plantilla guardada desde el servidor
      fetch(`/api/import-templates?headersHash=${encodeURIComponent(headersHash)}`, { cache: 'no-store' })
        .then(res => {
          if (res.ok) return res.json();
          throw new Error('No template found');
        })
        .then(data => {
          if (data && data.mapping) {
            const parsedMapping = JSON.parse(data.mapping);
            const resolvedMapping: Record<string, IncidentMappingKeys | ''> = {};
            headers.forEach(col => {
              resolvedMapping[col] = (parsedMapping[col] || '') as IncidentMappingKeys | '';
            });
            setIncidentMapping(resolvedMapping);
            console.log('✅ Plantilla de importación auto-aplicada:', data.name);
          }
        })
        .catch(() => {
          // Si no existe, aplicar Fuzzy Matching predictivo inteligente
          const predicted = predictMappings(headers);
          const resolvedMapping: Record<string, IncidentMappingKeys | ''> = {};
          headers.forEach(col => {
            resolvedMapping[col] = (predicted[col] || '') as IncidentMappingKeys | '';
          });
          setIncidentMapping(resolvedMapping);
          console.log('⚡ Fuzzy Matching inteligente aplicado.');
        });
    }
  };

  const processWorkbook = (wb: XLSX.WorkBook) => {
    setWorkbook(wb);
    setSheetNames(wb.SheetNames);
    const defaultSheet = wb.SheetNames[0];
    setSelectedSheet(defaultSheet);
    processSheet(wb, defaultSheet);
    setStep(2);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setProjectName(uploadedFile.name.split('.')[0]);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target?.result as ArrayBuffer);
      const wb = XLSX.read(data, { type: 'array', codepage: 65001 });
      processWorkbook(wb);
    };
    reader.readAsArrayBuffer(uploadedFile);
  };

  const handleUrlImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoadingUrl(true);
    try {
      let targetUrl = url.trim();
      let isCsv = false;
      
      // Check if it's a Google Sheets link
      const sheetIdMatch = targetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetIdMatch) {
        const sheetId = sheetIdMatch[1];
        // Extract gid if present
        const gidMatch = targetUrl.match(/[#&?]gid=([0-9]+)/);
        if (gidMatch) {
          const gid = gidMatch[1];
          targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;
          isCsv = true;
        } else {
          targetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
        }
      }

      const response = await fetch(targetUrl);
      if (!response.ok) {
        throw new Error('No se pudo acceder a la URL. Asegúrate de que el documento de Google Sheets esté compartido públicamente ("Cualquier persona con el enlace puede ver").');
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = new Uint8Array(arrayBuffer);
      
      // Read CSV if we exported exactly a GID, otherwise read XLSX
      const wb = XLSX.read(data, { 
        type: 'array', 
        codepage: 65001,
        ...(isCsv ? { raw: false } : {}) 
      });
      
      // Set a mock file name to represent the project name
      setProjectName(importType === 'gantt' ? "Google Sheet Importado" : "Equipos Google Sheet");
      processWorkbook(wb);
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error al intentar descargar e importar la hoja de cálculo de Google Sheets. Asegúrate de que el enlace sea público.');
    } finally {
      setIsLoadingUrl(false);
    }
  };

  const parseSafeDate = (val: any, fallback: Date): Date => {
    if (!val) return fallback;
    
    // Si viene como string, limpiamos posibles nombres de días al inicio (ej: 'miércoles 29/04/2026')
    if (typeof val === 'string') {
      val = val.replace(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s,]+/i, '').trim();
    }
    
    // Si viene como número (serial de Excel), lo convertimos
    if (typeof val === 'number') {
      const excelEpoch = new Date(Date.UTC(1899, 11, 30));
      const msInDay = 24 * 60 * 60 * 1000;
      const d = new Date(excelEpoch.getTime() + val * msInDay);
      if (!isNaN(d.getTime())) {
        return d;
      }
    }
    
    // Si viene como string, priorizamos el formato DD-MM-YY / DD-MM-YYYY usual de Chile/España
    if (typeof val === 'string') {
      const parts = val.split(/[-/]/).map(p => p.trim());
      if (parts.length === 3) {
        let day = parseInt(parts[0]);
        let month = parseInt(parts[1]) - 1; // 0-indexed
        let year = parseInt(parts[2]);
        
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          if (parts[0].length === 4) {
            year = parseInt(parts[0]);
            month = parseInt(parts[1]) - 1;
            day = parseInt(parts[2]);
          }
          
          if (year < 100) {
            year = 2000 + year;
          }
          
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime())) return d;
        }
      }
    }
    
    const parsed = new Date(val);
    if (!isNaN(parsed.getTime())) {
      let yr = parsed.getFullYear();
      if (yr < 100) {
        parsed.setFullYear(2000 + yr);
      }
      return parsed;
    }
    
    return fallback;
  };

  const parsePhaseStatus = (val: any): EquipmentPhaseStatus => {
    if (!val) return 'No iniciado';
    const norm = String(val).toLowerCase().trim();
    if (norm.includes('complet') || norm.includes('listo') || norm.includes('ok') || norm.includes('terminad') || norm.includes('si') || norm.includes('done') || norm === '1' || norm === '100%') {
      return 'Completado';
    }
    if (norm.includes('progres') || norm.includes('ejecuc') || norm.includes('curs') || norm.includes('haciend')) {
      return 'En progreso';
    }
    if (norm.includes('descart') || norm.includes('cancel')) {
      return 'Descartado';
    }
    if (norm.includes('desestim') || norm.includes('obsole')) {
      return 'Desestimado';
    }
    return 'No iniciado';
  };

  const handleRunValidation = () => {
    const errors: ValidationError[] = [];
    const criticalRowsSet = new Set<number>();

    if (importType === 'gantt') {
      const colTask = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'taskName');
      const colStart = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'startDate');
      const colEnd = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'endDate');
      const colProg = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'progress');
      const colPhase = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'phaseName');

      if (!colTask) {
        alert("¡Falta Mapeo Crítico! Debes seleccionar cuál columna contiene el 'Nombre de la Tarea'.");
        return;
      }

      const colWbs = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'wbsId');
      const colDur = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'duration');

      parsedData.forEach((row, index) => {
        const rowNum = index + 1;
        const taskVal = row[colTask] ? String(row[colTask]).trim() : '';
        const phaseVal = colPhase && row[colPhase] ? String(row[colPhase]).trim() : '';
        const wbsIdVal = colWbs && row[colWbs] ? String(row[colWbs]).trim() : '';

        // 1. Detect inline WBS
        let inlineWbs = '';
        let cleanName = taskVal;
        const inlineWbsMatch = taskVal.match(/^(\d+(\.\d+)*)\.?\s+(.+)$/);
        if (inlineWbsMatch) {
          inlineWbs = inlineWbsMatch[1];
          cleanName = inlineWbsMatch[3].trim();
        }

        let wbsId = wbsIdVal;
        if (!wbsId && inlineWbs) {
          wbsId = inlineWbs;
        }

        // Normalizar WBS ID
        if (wbsId.endsWith('.0')) {
          wbsId = wbsId.slice(0, -2);
        }
        if (wbsId.endsWith('.')) {
          wbsId = wbsId.slice(0, -1);
        }

        // 3. Detect if this is a Phase Header row
        const colStartVal = colStart ? row[colStart] : '';
        const colEndVal = colEnd ? row[colEnd] : '';
        const colDurVal = colDur ? row[colDur] : '';
        const hasNoDatesOrDuration = (!colStartVal || colStartVal === '') && (!colEndVal || colEndVal === '') && (!colDurVal || colDurVal === '');

        const isExplicitWbsPhase = wbsId && (!wbsId.includes('.') || wbsId === '');
        const isNoWbsPhaseHeader = !wbsId && taskVal !== '' && hasNoDatesOrDuration;
        const isPhaseHeaderRow = taskVal === '' && phaseVal !== '';
        const isPhaseKeyword = /^\s*(fase|etapa|módulo|modulo|phase|stage|grupo)\b/i.test(taskVal);

        const isPhase = isExplicitWbsPhase || isNoWbsPhaseHeader || isPhaseHeaderRow || isPhaseKeyword;

        if (isPhase) {
          // La descartamos de la lista de tareas a crear sin generar error visual
          criticalRowsSet.add(index);
          return;
        }

        if (taskVal === '') {
          errors.push({
            row: rowNum,
            column: colTask,
            level: 'critical',
            message: 'Nombre de tarea vacío. Esta fila se descartará.'
          });
          criticalRowsSet.add(index);
          return;
        }

        if (colStart && colEnd && row[colStart] && row[colEnd]) {
          const s = parseSafeDate(row[colStart], new Date());
          const e = parseSafeDate(row[colEnd], new Date());
          if (s > e) {
            errors.push({
              row: rowNum,
              column: `${colStart} / ${colEnd}`,
              level: 'warning',
              message: 'Fecha de fin anterior a fecha de inicio. Se ajustará la fecha de fin de forma automatizada.'
            });
          }
        }

        if (colProg && row[colProg] !== undefined && row[colProg] !== '') {
          const val = String(row[colProg]).replace('%', '').trim();
          const p = parseFloat(val);
          if (isNaN(p) || p < 0 || p > 100) {
            errors.push({
              row: rowNum,
              column: colProg,
              level: 'warning',
              message: `El valor de progreso (${row[colProg]}) no es un porcentaje estándar de 0-100. Se normalizará.`
            });
          }
        }
      });
    } else if (importType === 'equipment') {
      const colName = Object.keys(equipMapping).find(k => equipMapping[k] === 'name');
      const colRec = Object.keys(equipMapping).find(k => equipMapping[k] === 'recintoName');

      if (!colName || !colRec) {
        alert("¡Falta Mapeo Crítico! Debes seleccionar las columnas del 'Nombre del Equipo' y del 'Nombre del Recinto'.");
        return;
      }

      parsedData.forEach((row, index) => {
        const rowNum = index + 1;
        const nameVal = row[colName];
        const recVal = row[colRec];

        if (!nameVal || String(nameVal).trim() === '') {
          errors.push({
            row: rowNum,
            column: colName,
            level: 'critical',
            message: 'Nombre del equipo clínico vacío. Fila descartada.'
          });
          criticalRowsSet.add(index);
        }

        if (!recVal || String(recVal).trim() === '') {
          errors.push({
            row: rowNum,
            column: colRec,
            level: 'critical',
            message: 'Nombre de la ubicación (Recinto) vacío. Fila descartada.'
          });
          criticalRowsSet.add(index);
        } else {
          const recNameStr = String(recVal).trim();
          const exist = recintos.find(r => r.name.toLowerCase() === recNameStr.toLowerCase());
          if (!exist) {
            errors.push({
              row: rowNum,
              column: colRec,
              level: 'info',
              message: `El recinto '${recNameStr}' no existe en el sistema. Se creará automáticamente al importar.`
            });
          }
        }
      });
    } else if (importType === 'analyte') {
      // Validar Analitos
      const colInst = Object.keys(analyteMapping).find(k => analyteMapping[k] === 'instrumentName');
      const colTrans = Object.keys(analyteMapping).find(k => analyteMapping[k] === 'transmissionCode');
      const colTest = Object.keys(analyteMapping).find(k => analyteMapping[k] === 'testCode');
      const colName = Object.keys(analyteMapping).find(k => analyteMapping[k] === 'name');

      if (!colInst || !colTrans || !colTest || !colName) {
        alert("¡Falta Mapeo Crítico! Debes seleccionar las columnas de Instrumento, Cód. Transmisión, Cód. Test y Nombre de Analito.");
        return;
      }

      const uniqueInstruments = new Set<string>();

      parsedData.forEach((row, index) => {
        const rowNum = index + 1;
        const instVal = row[colInst];
        const transVal = row[colTrans];
        const testVal = row[colTest];
        const nameVal = row[colName];

        if (!instVal || String(instVal).trim() === '') {
          errors.push({
            row: rowNum,
            column: colInst,
            level: 'critical',
            message: 'Nombre del instrumento vacío. Fila descartada.'
          });
          criticalRowsSet.add(index);
        } else {
          uniqueInstruments.add(String(instVal).trim());
        }

        if (!transVal || String(transVal).trim() === '') {
          errors.push({
            row: rowNum,
            column: colTrans,
            level: 'critical',
            message: 'Código de transmisión vacío. Fila descartada.'
          });
          criticalRowsSet.add(index);
        }

        if (!testVal || String(testVal).trim() === '') {
          errors.push({
            row: rowNum,
            column: colTest,
            level: 'critical',
            message: 'Código de Test vacío. Fila descartada.'
          });
          criticalRowsSet.add(index);
        }

        if (!nameVal || String(nameVal).trim() === '') {
          errors.push({
            row: rowNum,
            column: colName,
            level: 'critical',
            message: 'Nombre del analito vacío. Fila descartada.'
          });
          criticalRowsSet.add(index);
        }
      });

      // Inicializar el listado único de instrumentos y autodetección de sedes clínicas
      const instList = Array.from(uniqueInstruments);
      setUniqueInstrumentsList(instList);

      const map: Record<string, string> = {};
      instList.forEach(name => {
        const norm = name.toUpperCase().trim();
        let matchedRecId = '';

        // Algoritmo de mapeo de siglas del usuario (AD, CLC, DSJ, CLBS, TAR, CAR, CLL, COR, CSJ, R, CI, A, CDSJ)
        if (norm.endsWith('AD') || norm.endsWith('CLBS') || norm.endsWith('CI') || norm.endsWith('A')) {
          const rec = recintos.find(r => r.name.toLowerCase().includes('cla') || r.name.toLowerCase().includes('bupa cla'));
          matchedRecId = rec ? rec.id : 'rec-4527';
        } else if (norm.endsWith('CLR') || norm.endsWith('R')) {
          const rec = recintos.find(r => r.name.toLowerCase().includes('clr') || r.name.toLowerCase().includes('bupa clr'));
          matchedRecId = rec ? rec.id : 'rec-4528';
        } else if (norm.endsWith('CLC')) {
          const rec = recintos.find(r => r.name.toLowerCase().includes('las condes') || r.name.toLowerCase().includes('clc'));
          matchedRecId = rec ? rec.id : 'rec-4529';
        } else if (norm.endsWith('CSJ') || norm.endsWith('DSJ') || norm.endsWith('CDSJ')) {
          const rec = recintos.find(r => r.name.toLowerCase().includes('arica') || r.name.toLowerCase().includes('san jose'));
          matchedRecId = rec ? rec.id : 'rec-4530';
        } else if (norm.endsWith('COR')) {
          const rec = recintos.find(r => r.name.toLowerCase().includes('cordillera') || r.name.toLowerCase().includes('cor'));
          matchedRecId = rec ? rec.id : 'rec-4531';
        } else if (norm.endsWith('CAR')) {
          const rec = recintos.find(r => r.name.toLowerCase().includes('carrera') || r.name.toLowerCase().includes('car'));
          matchedRecId = rec ? rec.id : 'rec-4532';
        } else if (norm.endsWith('CLL')) {
          const rec = recintos.find(r => r.name.toLowerCase().includes('leones') || r.name.toLowerCase().includes('cll'));
          matchedRecId = rec ? rec.id : 'rec-4533';
        } else if (norm.endsWith('TAR')) {
          const rec = recintos.find(r => r.name.toLowerCase().includes('tarapaca') || r.name.toLowerCase().includes('tar'));
          matchedRecId = rec ? rec.id : 'rec-4534';
        }

        map[name] = matchedRecId; // Si no hay sigla conocida, queda vacío '' para selección interactiva
      });
      setInstrumentSedeMap(map);
    } else if (importType === 'incident') {
      const colFecha = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'fecha');
      const colDesc = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'descripcion');

      if (!colFecha || !colDesc) {
        alert("¡Falta Mapeo Crítico! Debes seleccionar las columnas de 'Fecha' y 'Descripción'.");
        return;
      }

      parsedData.forEach((row, index) => {
        const rowNum = index + 1;
        const fechaVal = row[colFecha];
        const descVal = row[colDesc];

        if (!fechaVal || String(fechaVal).trim() === '') {
          errors.push({
            row: rowNum,
            column: colFecha,
            level: 'critical',
            message: 'Fecha del incidente vacía. Fila descartada.'
          });
          criticalRowsSet.add(index);
        } else {
          const parsed = parseSafeDate(fechaVal, new Date(NaN));
          if (isNaN(parsed.getTime())) {
            errors.push({
              row: rowNum,
              column: colFecha,
              level: 'warning',
              message: `La fecha '${fechaVal}' no tiene un formato válido (se usará la fecha actual por defecto).`
            });
          }
        }

        if (!descVal || String(descVal).trim() === '') {
          errors.push({
            row: rowNum,
            column: colDesc,
            level: 'critical',
            message: 'Descripción del incidente vacía. Fila descartada.'
          });
          criticalRowsSet.add(index);
        }
      });
    }

    setValidationErrors(errors);
    setCriticalRows(criticalRowsSet);
    setStep(3);
  };

  const handleConfirmImport = async () => {
    setIsImporting(true);
    setStep(4);
    setStatusMessage('Inicializando motor de importación corporativo...');
    setImportProgress(10);

    const validRows = parsedData.filter((_, idx) => !criticalRows.has(idx));

    if (importType === 'gantt') {
      try {
        const colTask = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'taskName')!;
        const colPhase = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'phaseName');
        const colStart = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'startDate');
        const colEnd = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'endDate');
        const colDur = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'duration');
        const colAssig = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'assignee');
        const colProg = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'progress');
        const colStatus = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'status');
        const colPrio = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'priority');
        const colNotes = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'notes');
        
        const colRealStart = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'realStartDate');
        const colRealEnd = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'realEndDate');
        const colExpProg = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'expectedProgress');
        const colEstCost = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'estimatedCost');
        const colRealCost = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'realCost');
        const colRisk = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'risk');

        const colWbs = Object.keys(ganttMapping).find(k => ganttMapping[k] === 'wbsId');

        let newPhases: Phase[] = [];
        const phasesList: Phase[] = [];
        const phaseWbsMap = new Map<string, Phase>();
        const taskWbsMap = new Map<string, Task>();
        const tasksList: Task[] = [];
        let currentPhase: Phase | null = null;
        let autoPhaseCounter = 1;

        parsedData.forEach((row, index) => {
          const wbsIdVal = colWbs && row[colWbs] ? String(row[colWbs]).trim() : '';
          const taskNameVal = row[colTask] ? String(row[colTask]).trim() : '';
          const phaseVal = colPhase && row[colPhase] ? String(row[colPhase]).trim() : '';

          if (!wbsIdVal && !taskNameVal) return;

          // 1. Normalize WBS ID: e.g. "1.0" -> "1"
          let wbsId = wbsIdVal;
          if (wbsId.endsWith('.0')) {
            wbsId = wbsId.slice(0, -2);
          }
          if (wbsId.endsWith('.')) {
            wbsId = wbsId.slice(0, -1);
          }

          // 2. Detect inline WBS
          let inlineWbs = '';
          let cleanName = taskNameVal;
          const inlineWbsMatch = taskNameVal.match(/^(\d+(\.\d+)*)\.?\s+(.+)$/);
          if (inlineWbsMatch) {
            inlineWbs = inlineWbsMatch[1];
            cleanName = inlineWbsMatch[3].trim();
          }

          if (!wbsId && inlineWbs) {
            wbsId = inlineWbs;
          }

          // 3. Detect if this is a Phase Header row
          const colStartVal = colStart ? row[colStart] : '';
          const colEndVal = colEnd ? row[colEnd] : '';
          const colDurVal = colDur ? row[colDur] : '';
          const hasNoDatesOrDuration = (!colStartVal || colStartVal === '') && (!colEndVal || colEndVal === '') && (!colDurVal || colDurVal === '');

          const isExplicitWbsPhase = wbsId && (!wbsId.includes('.') || wbsId === '');
          const isNoWbsPhaseHeader = !wbsId && taskNameVal !== '' && hasNoDatesOrDuration;
          const isPhaseHeaderRow = taskNameVal === '' && phaseVal !== '';
          const isPhaseKeyword = /^\s*(fase|etapa|módulo|modulo|phase|stage|grupo)\b/i.test(taskNameVal);

          const isPhase = isExplicitWbsPhase || isNoWbsPhaseHeader || isPhaseHeaderRow || isPhaseKeyword;

          if (isPhase) {
            const phaseName = cleanName || phaseVal || `Fase ${wbsId || autoPhaseCounter}`;
            const phaseKey = wbsId ? normalizePhaseName(wbsId) : normalizePhaseName(phaseName);
            
            const phaseObj: Phase = {
              id: `ph-${Date.now()}-${index}`,
              wbsId: wbsId || String(autoPhaseCounter++),
              name: phaseName,
              tasks: [],
              startDate: new Date(),
              endDate: new Date(),
              progress: 0
            };
            phasesList.push(phaseObj);
            phaseWbsMap.set(phaseKey, phaseObj);
            currentPhase = phaseObj;
            return;
          }

          if (criticalRows.has(index)) return;

          // Resolve current phase contexts
          if (!currentPhase) {
            if (phaseVal) {
              const phaseKey = normalizePhaseName(phaseVal);
              let phaseObj = phaseWbsMap.get(phaseKey);
              if (!phaseObj) {
                phaseObj = {
                  id: `ph-${Date.now()}-${index}-auto`,
                  wbsId: String(autoPhaseCounter++),
                  name: phaseVal,
                  tasks: [],
                  startDate: new Date(),
                  endDate: new Date(),
                  progress: 0
                };
                phasesList.push(phaseObj);
                phaseWbsMap.set(phaseKey, phaseObj);
              }
              currentPhase = phaseObj;
            } else {
              const defaultPhaseName = 'Fase 1';
              const phaseKey = normalizePhaseName(defaultPhaseName);
              let phaseObj = phaseWbsMap.get(phaseKey);
              if (!phaseObj) {
                phaseObj = {
                  id: `ph-${Date.now()}-${index}-auto`,
                  wbsId: String(autoPhaseCounter++),
                  name: defaultPhaseName,
                  tasks: [],
                  startDate: new Date(),
                  endDate: new Date(),
                  progress: 0
                };
                phasesList.push(phaseObj);
                phaseWbsMap.set(phaseKey, phaseObj);
              }
              currentPhase = phaseObj;
            }
          }

          if (wbsId && wbsId.includes('.')) {
            const dotIdx = wbsId.indexOf('.');
            const rootWbs = wbsId.substring(0, dotIdx);
            const rootKey = normalizePhaseName(rootWbs);
            let targetPhase = phaseWbsMap.get(rootKey);
            if (!targetPhase) {
              targetPhase = {
                id: `ph-${Date.now()}-${index}-auto`,
                wbsId: rootWbs,
                name: phaseVal || `Fase ${rootWbs}`,
                tasks: [],
                startDate: new Date(),
                endDate: new Date(),
                progress: 0
              };
              phasesList.push(targetPhase);
              phaseWbsMap.set(rootKey, targetPhase);
            }
            currentPhase = targetPhase;
          } else if (phaseVal && normalizePhaseName(phaseVal) !== normalizePhaseName(currentPhase.name)) {
            const phaseKey = normalizePhaseName(phaseVal);
            let targetPhase = phaseWbsMap.get(phaseKey);
            if (!targetPhase) {
              targetPhase = {
                id: `ph-${Date.now()}-${index}-auto`,
                wbsId: String(autoPhaseCounter++),
                name: phaseVal,
                tasks: [],
                startDate: new Date(),
                endDate: new Date(),
                progress: 0
              };
              phasesList.push(targetPhase);
              phaseWbsMap.set(phaseKey, targetPhase);
            }
            currentPhase = targetPhase;
          }

          const assignee = colAssig && row[colAssig] ? String(row[colAssig]).trim() : 'Sin Asignar';
          
          let startDate = new Date();
          if (colStart) startDate = parseSafeDate(row[colStart], new Date());

          let duration = 5;
          if (colDur && row[colDur]) duration = parseInt(row[colDur]) || 5;
          if (duration < 0) duration = 1;

          let endDate = addBusinessDays(startDate, duration);
          if (colEnd && row[colEnd]) {
            endDate = parseSafeDate(row[colEnd], addBusinessDays(startDate, duration));
            if (endDate < startDate) endDate = addBusinessDays(startDate, duration);
          }

          let progress = 0;
          if (colProg && row[colProg]) {
            const val = String(row[colProg]).replace('%', '').trim();
            const p = parseFloat(val);
            if (!isNaN(p)) {
              progress = p <= 1 && val.includes('.') ? p * 100 : p;
            }
          }
          progress = Math.min(100, Math.max(0, progress));

          let status: TaskStatus = progress >= 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started';
          if (colStatus && row[colStatus]) {
            const val = String(row[colStatus]).toLowerCase();
            if (val.includes('complet') || val.includes('terminad') || val.includes('listo') || val.includes('cerrad')) status = 'Completed';
            else if (val.includes('progres') || val.includes('ejecucion') || val.includes('curs') || val.includes('proceso')) status = 'In Progress';
            else if (val.includes('riesgo') || val.includes('atras') || val.includes('peligro') || val.includes('demor')) status = 'At Risk';
          }

          let priority: 'Baja' | 'Media' | 'Alta' = 'Media';
          if (colPrio && row[colPrio]) {
            const val = String(row[colPrio]).toLowerCase();
            if (val.includes('alt') || val.includes('high') || val.includes('1') || val.includes('urgente')) priority = 'Alta';
            else if (val.includes('baj') || val.includes('low') || val.includes('3')) priority = 'Baja';
          }

          const notes = colNotes && row[colNotes] ? String(row[colNotes]).trim() : '';

          let realStartDate = null;
          if (colRealStart && row[colRealStart]) realStartDate = parseSafeDate(row[colRealStart], new Date());

          let realEndDate = null;
          if (colRealEnd && row[colRealEnd]) realEndDate = parseSafeDate(row[colRealEnd], new Date());

          let expectedProgress = null;
          if (colExpProg && row[colExpProg] !== undefined && row[colExpProg] !== '') {
            const val = String(row[colExpProg]).replace('%', '').trim();
            const p = parseFloat(val);
            if (!isNaN(p)) {
              expectedProgress = Math.min(100, Math.max(0, p <= 1 && val.includes('.') ? p * 100 : p));
            }
          }

          let estimatedCost = null;
          if (colEstCost && row[colEstCost] !== undefined && row[colEstCost] !== '') {
            const val = Number(String(row[colEstCost]).replace(/[^0-9.-]/g, ''));
            if (!isNaN(val)) estimatedCost = val;
          }

          let realCost = null;
          if (colRealCost && row[colRealCost] !== undefined && row[colRealCost] !== '') {
            const val = Number(String(row[colRealCost]).replace(/[^0-9.-]/g, ''));
            if (!isNaN(val)) realCost = val;
          }

          let risk = 'Bajo';
          if (colRisk && row[colRisk]) {
            const val = String(row[colRisk]).toLowerCase().trim();
            if (val.includes('crit') || val.includes('muy alt')) risk = 'Crítico';
            else if (val.includes('alt')) risk = 'Alto';
            else if (val.includes('med')) risk = 'Medio';
            else risk = 'Bajo';
          }

          const task: Task = {
            id: `t-${Date.now()}-${index}`,
            wbsId: wbsId || `${currentPhase.wbsId}.${currentPhase.tasks.length + 1}`,
            name: String(cleanName),
            startDate,
            endDate,
            duration,
            progress,
            assignee: String(assignee),
            status,
            priority,
            notes,
            realStartDate,
            realEndDate,
            expectedProgress,
            estimatedCost,
            realCost,
            risk,
            parentId: undefined
          };

          taskWbsMap.set(task.wbsId!, task);
          currentPhase.tasks.push(task);
          tasksList.push(task);
        });

        // Hierarchical nesting parentId linkage
        tasksList.forEach(task => {
          if (!task.wbsId) return;
          const wbs = task.wbsId;
          const lastDot = wbs.lastIndexOf('.');
          if (lastDot !== -1) {
            const parentWbs = wbs.substring(0, lastDot);
            if (parentWbs.includes('.')) {
              const parentTask = taskWbsMap.get(parentWbs);
              if (parentTask) {
                task.parentId = parentTask.id;
              }
            }
          }
        });

        // Recalculate phases summary
        newPhases = phasesList.filter(ph => ph.tasks.length > 0).map(ph => {
          const minDate = new Date(Math.min(...ph.tasks.map(t => t.startDate.getTime())));
          const maxDate = new Date(Math.max(...ph.tasks.map(t => t.endDate.getTime())));
          
          let totalDuration = 0;
          let totalWeightedProgress = 0;
          
          ph.tasks.forEach(t => {
            totalDuration += t.duration;
            totalWeightedProgress += (t.progress * t.duration);
          });

          const phaseProgress = totalDuration > 0 ? Math.round(totalWeightedProgress / totalDuration) : 0;

          return {
            ...ph,
            startDate: minDate,
            endDate: maxDate,
            progress: phaseProgress
          };
        });

        setStatusMessage('Almacenando proyecto en base de datos SQLite...');
        setImportProgress(70);

        const projectStartDate = newPhases.length > 0 ? new Date(Math.min(...newPhases.map(p => p.startDate.getTime()))) : new Date();
        const projectEndDate = newPhases.length > 0 ? new Date(Math.max(...newPhases.map(p => p.endDate.getTime()))) : new Date();

        const newProject: Project = {
          id: `proj-${Date.now()}`,
          name: projectName,
          description: `Proyecto importado de archivo el ${format(new Date(), 'dd/MM/yyyy')}`,
          phases: newPhases,
          startDate: projectStartDate,
          endDate: projectEndDate,
          hasEquipment: false
        };

        await addProject(newProject);
        
        setImportSummary({ success: validRows.length, failed: criticalRows.size, recintosCreated: 0 });
        setImportProgress(100);
        setStatusMessage('Importación completada con éxito.');
        setIsImporting(false);
      } catch (err: any) {
        console.error(err);
        alert(`Error durante la importación: ${err.message || 'Error desconocido'}`);
        setStep(3);
        setIsImporting(false);
      }
    } else if (importType === 'equipment') {
      // Equipment Import
      try {
        const colName = Object.keys(equipMapping).find(k => equipMapping[k] === 'name')!;
        const colRec = Object.keys(equipMapping).find(k => equipMapping[k] === 'recintoName')!;
        const colSection = Object.keys(equipMapping).find(k => equipMapping[k] === 'section');
        const colResp = Object.keys(equipMapping).find(k => equipMapping[k] === 'responsable');
        const colObs = Object.keys(equipMapping).find(k => equipMapping[k] === 'observaciones');
        const colPend = Object.keys(equipMapping).find(k => equipMapping[k] === 'pendienteDe');
        const colComp = Object.keys(equipMapping).find(k => equipMapping[k] === 'compromisoDate');
        
        const colLev = Object.keys(equipMapping).find(k => equipMapping[k] === 'levantamiento');
        const colParam = Object.keys(equipMapping).find(k => equipMapping[k] === 'parametrizacion');
        const colPruebas = Object.keys(equipMapping).find(k => equipMapping[k] === 'pruebas');
        const colCap = Object.keys(equipMapping).find(k => equipMapping[k] === 'capacitacion');
        const colVal = Object.keys(equipMapping).find(k => equipMapping[k] === 'validacion');
        const colGo = Object.keys(equipMapping).find(k => equipMapping[k] === 'golive');

        // Resolve or create Recintos dynamically
        setStatusMessage('Resolviendo ubicaciones y recintos...');
        setImportProgress(30);

        const newRecintosToCreate = new Set<string>();
        validRows.forEach(row => {
          const recName = String(row[colRec]).trim();
          const exist = recintos.find(r => r.name.toLowerCase() === recName.toLowerCase());
          if (!exist) {
            newRecintosToCreate.add(recName);
          }
        });

        const recintoIdMap = new Map<string, string>();
        recintos.forEach(r => recintoIdMap.set(r.name.toLowerCase(), r.id));

        let createdRecintosCount = 0;
        const newRecArrayList = Array.from(newRecintosToCreate);
        
        for (let i = 0; i < newRecArrayList.length; i++) {
          const recNameStr = newRecArrayList[i];
          setStatusMessage(`Creando recinto nuevo: "${recNameStr}"...`);
          
          const newRecId = `rec-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          const newRecCode = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
          
          await addRecinto({
            id: newRecId,
            name: recNameStr,
            code: newRecCode,
            isActive: true
          });
          
          recintoIdMap.set(recNameStr.toLowerCase(), newRecId);
          createdRecintosCount++;
          setImportProgress(30 + Math.round((i / newRecArrayList.length) * 20));
        }

        setStatusMessage('Guardando equipos clínicos de forma transaccional...');
        setImportProgress(50);

        const targetProjectId = linkProjectOption === 'existing' ? selectedProjectId : null;
        let successEquips = 0;

        for (let i = 0; i < validRows.length; i++) {
          const row = validRows[i];
          const recNameStr = String(row[colRec]).trim();
          const recId = recintoIdMap.get(recNameStr.toLowerCase())!;

          const newEquip: ClinicalEquipment = {
            id: `eq-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
            recintoId: recId,
            name: String(row[colName]).trim(),
            section: colSection && row[colSection] ? String(row[colSection]).trim() : 'General',
            levantamiento: colLev && row[colLev] ? parsePhaseStatus(row[colLev]) : 'No iniciado',
            parametrizacion: colParam && row[colParam] ? parsePhaseStatus(row[colParam]) : 'No iniciado',
            pruebas: colPruebas && row[colPruebas] ? parsePhaseStatus(row[colPruebas]) : 'No iniciado',
            capacitacion: colCap && row[colCap] ? parsePhaseStatus(row[colCap]) : 'No iniciado',
            validacion: colVal && row[colVal] ? parsePhaseStatus(row[colVal]) : 'No iniciado',
            golive: colGo && row[colGo] ? parsePhaseStatus(row[colGo]) : 'No iniciado',
            responsable: colResp && row[colResp] ? String(row[colResp]).trim() : 'Sin asignar',
            observaciones: colObs && row[colObs] ? String(row[colObs]).trim() : '',
            pendienteDe: colPend && row[colPend] ? String(row[colPend]).trim() : '',
            scopeStatus: 'ACTIVE',
            releasePhaseId: null,
            projectId: targetProjectId,
            compromisoDate: colComp && row[colComp] ? parseSafeDate(row[colComp], new Date()).toISOString().split('T')[0] : undefined
          };

          setStatusMessage(`Insertando equipo biomédico ${i + 1} de ${validRows.length}: "${newEquip.name}"`);
          await addEquipment(newEquip);
          
          successEquips++;
          setImportProgress(50 + Math.round((i / validRows.length) * 50));
        }

        setImportSummary({ success: successEquips, failed: criticalRows.size, recintosCreated: createdRecintosCount });
        setImportProgress(100);
        setStatusMessage('Equipos clínicos importados y vinculados correctamente.');
        setIsImporting(false);
      } catch (err: any) {
        console.error(err);
        alert(`Error durante la importación: ${err.message || 'Error desconocido'}`);
        setStep(3);
        setIsImporting(false);
      }
    } else if (importType === 'analyte') {
      // Importar Analitos
      try {
        const colInst = Object.keys(analyteMapping).find(k => analyteMapping[k] === 'instrumentName')!;
        const colTrans = Object.keys(analyteMapping).find(k => analyteMapping[k] === 'transmissionCode')!;
        const colTest = Object.keys(analyteMapping).find(k => analyteMapping[k] === 'testCode')!;
        const colName = Object.keys(analyteMapping).find(k => analyteMapping[k] === 'name')!;
        const colDesc = Object.keys(analyteMapping).find(k => analyteMapping[k] === 'description');
        const colSection = Object.keys(analyteMapping).find(k => analyteMapping[k] === 'section');
        const colState = Object.keys(analyteMapping).find(k => analyteMapping[k] === 'state');

        // Si hay instrumentos sin sede asignada, preguntar si desean continuar e importarlos sin sede
        const unassigned = uniqueInstrumentsList.filter(name => !instrumentSedeMap[name]);
        if (unassigned.length > 0) {
          const proceed = confirm(`⚠️ Tienes ${unassigned.length} instrumentos sin sede asignada (ej: ${unassigned.slice(0, 3).join(', ')}).\n\n¿Deseas importarlos de todas formas? Podrás asignarles su recinto/sede en cascada en cualquier momento desde la pantalla de Matriz de Analitos.`);
          if (!proceed) {
            setIsImporting(false);
            setStep(3);
            return;
          }
        }

        setStatusMessage('Estructurando analitos y resolviendo mapeos de sede en cascada...');
        setImportProgress(30);

        const analytesPayload = validRows.map(row => {
          const instName = String(row[colInst]).trim();
          return {
            instrumentName: instName,
            transmissionCode: String(row[colTrans]).trim(),
            testCode: String(row[colTest]).trim(),
            name: String(row[colName]).trim(),
            description: colDesc && row[colDesc] ? String(row[colDesc]).trim() : '',
            section: colSection && row[colSection] ? String(row[colSection]).trim() : 'General',
            state: colState && row[colState] ? String(row[colState]).trim() : 'No Iniciado',
            scopeStatus: 'INHERITED',
            releasePhaseId: null,
            recintoId: instrumentSedeMap[instName]
          };
        });

        setStatusMessage('Enviando analitos y auto-creando equipos clínicos en el servidor...');
        setImportProgress(65);

        const importResult = await bulkImportAnalytes(analytesPayload);
        
        if (importResult.success) {
          setImportSummary({ 
            success: importResult.details.importedAnalytes, 
            failed: criticalRows.size, 
            recintosCreated: importResult.details.createdEquipments 
          });
          setImportProgress(100);
          setStatusMessage(`¡Éxito! Se importaron ${importResult.details.importedAnalytes} analitos. Se crearon ${importResult.details.createdEquipments} equipos clínicos nuevos.`);
        } else {
          throw new Error(importResult.details || 'Error en la importación masiva');
        }
        setIsImporting(false);
      } catch (err: any) {
        console.error(err);
        alert(`Error durante la importación de analitos: ${err.message || 'Error desconocido'}`);
        setStep(3);
        setIsImporting(false);
      }
    } else if (importType === 'incident') {
      try {
        const colFecha = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'fecha')!;
        const colRec = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'recintoName');
        const colEquip = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'equipmentName');
        const colFase = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'faseAfectada');
        const colDesc = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'descripcion')!;
        const colImp = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'impacto');
        const colResp = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'responsable');
        const colEst = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'estado');
        const colPlan = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'planDeAccion');
        const colCierre = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'fechaCierre');
        const colProj = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'projectId');
        const colIdTicket = Object.keys(incidentMapping).find(k => incidentMapping[k] === 'idTicket');

        setStatusMessage('Estructurando incidentes y detectando campos personalizados...');
        setImportProgress(30);

        // Detectar las columnas personalizadas (las que no están mapeadas a campos estándar)
        const mappedOriginalCols = new Set(
          Object.keys(incidentMapping).filter(k => incidentMapping[k] !== '')
        );
        const customColumns = columns.filter(col => !mappedOriginalCols.has(col));

        const defaultProjectId = linkProjectOption === 'existing' ? selectedProjectId : null;

        const incidentsPayload = validRows.map(row => {
          // Extraer campos estándar
          const fechaRaw = row[colFecha];
          const descRaw = row[colDesc];
          
          let fechaStr = '';
          if (fechaRaw) {
            try {
              fechaStr = parseSafeDate(fechaRaw, new Date()).toISOString().split('T')[0];
            } catch(e) {
              fechaStr = String(fechaRaw);
            }
          } else {
            fechaStr = new Date().toISOString().split('T')[0];
          }

          // Extraer campos personalizados
          const customFields: Record<string, string> = {};
          customColumns.forEach(col => {
            const val = row[col];
            customFields[col] = val !== undefined && val !== null ? String(val).trim() : '';
          });

          return {
            id: `inc-${Date.now()}-${Math.floor(Math.random() * 1000000)}`,
            fecha: fechaStr,
            recintoName: colRec && row[colRec] ? String(row[colRec]).trim() : '',
            equipmentName: colEquip && row[colEquip] ? String(row[colEquip]).trim() : '',
            faseAfectada: colFase && row[colFase] ? String(row[colFase]).trim() : 'General',
            descripcion: descRaw ? String(descRaw).trim() : '',
            impacto: colImp && row[colImp] ? String(row[colImp]).trim() : '',
            responsable: colResp && row[colResp] ? String(row[colResp]).trim() : '',
            estado: colEst && row[colEst] ? String(row[colEst]).trim() : '',
            planDeAccion: colPlan && row[colPlan] ? String(row[colPlan]).trim() : '',
            fechaCierre: colCierre && row[colCierre] ? String(row[colCierre]).trim() : '',
            projectId: colProj && row[colProj] ? String(row[colProj]).trim() : null,
            idTicket: colIdTicket && row[colIdTicket] ? String(row[colIdTicket]).trim() : null,
            defaultProjectId,
            customFields
          };
        });

        setStatusMessage('Enviando incidentes al servidor...');
        setImportProgress(60);

        // Llamar a bulkImportIncidents de nuestro store
        await useIncidentStore.getState().bulkImportIncidents({
          incidents: incidentsPayload,
          customColumns,
          defaultValues: {
            estado: defaultEstado,
            impacto: defaultImpacto
          }
        });

        // Guardar la plantilla en el servidor para "Smart Learning"
        const headersHash = columns.map(h => String(h).trim()).join('|');
        fetch('/api/import-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: `Plantilla para formato ${columns.slice(0, 3).join(', ')}...`,
            headersHash,
            mapping: incidentMapping
          })
        }).catch(e => console.error('Error auto-saving import template:', e));

        setImportSummary({ 
          success: incidentsPayload.length, 
          failed: criticalRows.size, 
          recintosCreated: 0 
        });
        setImportProgress(100);
        setStatusMessage(`¡Éxito! Se importaron ${incidentsPayload.length} incidentes correctamente.`);
        setIsImporting(false);
      } catch (err: any) {
        console.error(err);
        alert(`Error durante la importación de incidentes: ${err.message || 'Error desconocido'}`);
        setStep(3);
        setIsImporting(false);
      }
    }
  };

  const handleSelectGanttChange = (colName: string, value: string) => {
    const newMapping = { ...ganttMapping };
    if (value !== '') {
      Object.keys(newMapping).forEach(k => {
        if (newMapping[k] === value) newMapping[k] = '';
      });
    }
    newMapping[colName] = value as GanttMappingKeys | '';
    setGanttMapping(newMapping);
  };

  const handleSelectEquipChange = (colName: string, value: string) => {
    const newMapping = { ...equipMapping };
    if (value !== '') {
      Object.keys(newMapping).forEach(k => {
        if (newMapping[k] === value) newMapping[k] = '';
      });
    }
    newMapping[colName] = value as EquipmentMappingKeys | '';
    setEquipMapping(newMapping);
  };

  const handleSelectAnalyteChange = (colName: string, value: string) => {
    const newMapping = { ...analyteMapping };
    if (value !== '') {
      Object.keys(newMapping).forEach(k => {
        if (newMapping[k] === value) newMapping[k] = '';
      });
    }
    newMapping[colName] = value as AnalyteMappingKeys | '';
    setAnalyteMapping(newMapping);
  };

  const handleSelectIncidentChange = (colName: string, value: string) => {
    const newMapping = { ...incidentMapping };
    if (value !== '') {
      Object.keys(newMapping).forEach(k => {
        if (newMapping[k] === value) newMapping[k] = '';
      });
    }
    newMapping[colName] = value as IncidentMappingKeys | '';
    setIncidentMapping(newMapping);
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      
      {/* Visual Dynamic Wizard Stepper */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: '16px', padding: '16px 24px' }}>
        {[
          { number: 1, label: 'Cargar Archivo' },
          { number: 2, label: 'Mapear Columnas' },
          { number: 3, label: 'Validar Datos' },
          { number: 4, label: 'Importar con Éxito' }
        ].map((s, idx) => {
          const isActive = step === s.number;
          const isDone = step > s.number;
          return (
            <React.Fragment key={s.number}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.95rem',
                  border: '2px solid',
                  background: isDone ? 'var(--accent-success)' : isActive ? 'var(--accent-primary)' : 'transparent',
                  borderColor: isDone ? 'var(--accent-success)' : isActive ? 'var(--accent-primary)' : 'var(--border-strong)',
                  color: isDone || isActive ? '#ffffff' : 'var(--text-muted)',
                  transition: 'all 0.3s ease'
                }}>
                  {isDone ? <Check size={18} /> : s.number}
                </div>
                <span style={{ 
                  fontSize: '0.9rem', 
                  fontWeight: isActive ? 800 : 600, 
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)' 
                }}>
                  {s.label}
                </span>
              </div>
              {idx < 3 && <ChevronRight size={18} style={{ color: 'var(--border-strong)' }} />}
            </React.Fragment>
          );
        })}
      </div>

      {/* STEP 1: CONFIGURATION AND UPLOAD */}
      {step === 1 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', animation: 'fadeIn 0.4s ease' }}>
          
          {/* Main Upload Box */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Header Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <div style={{ 
                width: '48px', 
                height: '48px', 
                borderRadius: '12px', 
                background: importType === 'equipment' ? 'rgba(16, 185, 129, 0.1)' : 'var(--gradient-primary)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                boxShadow: importType === 'equipment' ? '0 4px 16px rgba(16, 185, 129, 0.3)' : '0 4px 16px rgba(0, 121, 193, 0.3)' 
              }}>
                <UploadCloud size={24} color={importType === 'equipment' ? '#10b981' : 'white'} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                  {isContextual 
                    ? (importType === 'gantt' ? 'Importación de Cronograma de Proyectos' : importType === 'incident' ? 'Importación de Registro de Incidentes' : 'Importación de Equipamiento Clínico')
                    : 'Importación de Archivos Corporativa'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '4px 0 0 0' }}>
                  {isContextual
                    ? (importType === 'gantt' 
                        ? 'Carga el cronograma de tareas del proyecto para tu portafolio PMO.' 
                        : importType === 'analyte'
                          ? 'Carga la matriz de analitos para monitoreo de transmisión de laboratorio.'
                          : importType === 'incident'
                            ? 'Carga el registro de incidentes, soporte y continuidad operacional para el proyecto.'
                            : 'Carga el inventario de activos biomédicos para monitoreo clínico.')
                    : 'Tráete tus datos de forma segura desde hojas de cálculo locales o de la nube.'}
                </p>
              </div>
            </div>

            {/* Split Options Panel (Gantt vs Equipment vs Analyte vs Incident) */}
            {!isContextual && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                
                <div 
                  onClick={() => setImportType('gantt')}
                  style={{
                    padding: '24px',
                    borderRadius: '12px',
                    border: '2px solid',
                    borderColor: importType === 'gantt' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    background: importType === 'gantt' ? 'rgba(0, 121, 193, 0.04)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  className="hover-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(0, 121, 193, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                      <TableIcon size={20} />
                    </div>
                    {importType === 'gantt' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-primary)' }} />}
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>Cronograma Gantt de Proyecto</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>Fases de la WBS, tareas, fechas de inicio y fin, duraciones, responsables y avances.</p>
                </div>

                <div 
                  onClick={() => setImportType('equipment')}
                  style={{
                    padding: '24px',
                    borderRadius: '12px',
                    border: '2px solid',
                    borderColor: importType === 'equipment' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    background: importType === 'equipment' ? 'rgba(0, 121, 193, 0.04)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  className="hover-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-success)' }}>
                      <Activity size={20} />
                    </div>
                    {importType === 'equipment' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-success)' }} />}
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>🩺 Equipamiento Clínico</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>Activos biomédicos, marcas, modelos, ubicaciones de recintos y estado de calibración.</p>
                </div>

                <div 
                  onClick={() => setImportType('analyte')}
                  style={{
                    padding: '24px',
                    borderRadius: '12px',
                    border: '2px solid',
                    borderColor: importType === 'analyte' ? '#7c3aed' : 'var(--border-subtle)',
                    background: importType === 'analyte' ? 'rgba(124, 58, 237, 0.04)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  className="hover-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(124, 58, 237, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed' }}>
                      <Database size={20} />
                    </div>
                    {importType === 'analyte' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#7c3aed' }} />}
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>🔬 Matriz de Analitos</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>Mapeo de códigos de transmisión, códigos de test, nombres de analitos y estados de transmisión.</p>
                </div>

                <div 
                  onClick={() => setImportType('incident')}
                  style={{
                    padding: '24px',
                    borderRadius: '12px',
                    border: '2px solid',
                    borderColor: importType === 'incident' ? 'var(--accent-primary)' : 'var(--border-subtle)',
                    background: importType === 'incident' ? 'rgba(0, 121, 193, 0.04)' : 'var(--bg-secondary)',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                  className="hover-card"
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'rgba(225, 29, 72, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
                      <AlertTriangle size={20} />
                    </div>
                    {importType === 'incident' && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--accent-primary)' }} />}
                  </div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0' }}>⚠️ Incidentes y Desvíos</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0, lineHeight: 1.4 }}>Puntos de alerta, continuidad operacional, incidentes de soporte o fallas técnicas.</p>
                </div>

              </div>
            )}

            {/* Drag & Drop File Zone */}
            <div 
              className="glass-panel" 
              style={{ 
                padding: '50px 30px', 
                textAlign: 'center', 
                border: '2.5px dashed var(--border-strong)',
                borderColor: importType === 'equipment' 
                  ? 'rgba(16, 185, 129, 0.35)' 
                  : importType === 'analyte' 
                    ? 'rgba(124, 58, 237, 0.35)' 
                    : 'var(--border-strong)',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                accept=".xlsx, .xls, .csv" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                style={{ display: 'none' }} 
              />
              {importType === 'equipment' ? (
                <Activity size={48} style={{ color: '#10b981', opacity: 0.8 }} />
              ) : importType === 'analyte' ? (
                <Database size={48} style={{ color: '#7c3aed', opacity: 0.8 }} />
              ) : (
                <FileSpreadsheet size={48} style={{ color: 'var(--accent-primary)', opacity: 0.8 }} />
              )}
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '6px', color: 'var(--text-primary)', fontWeight: 800 }}>
                  {importType === 'equipment' 
                    ? 'Sube tu inventario de equipamiento clínico' 
                    : importType === 'analyte'
                      ? 'Sube tu matriz de analitos de laboratorio'
                      : 'Sube tu cronograma de proyecto'}
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>Soporta formatos estándar de Excel (.xlsx, .xls) o valores delimitados por comas (.csv)</p>
              </div>
              <button 
                className="btn btn-secondary" 
                style={{ 
                  fontSize: '0.85rem', 
                  marginTop: '8px',
                  color: importType === 'equipment' ? '#10b981' : importType === 'analyte' ? '#7c3aed' : undefined,
                  borderColor: importType === 'equipment' ? '#10b981' : importType === 'analyte' ? '#7c3aed' : undefined
                }}
              >
                Buscar en mi computador
              </button>
            </div>

            {/* Divider "O desde la nube" */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', margin: '8px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                O vincula desde la nube
              </span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
            </div>

            {/* Google Sheets Link Input Card */}
            <div 
              className="glass-panel"
              style={{
                padding: '24px',
                borderRadius: '16px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderColor: importType === 'equipment' ? 'rgba(16, 185, 129, 0.2)' : 'var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  width: '36px', 
                  height: '36px', 
                  borderRadius: '8px', 
                  background: importType === 'equipment' 
                    ? 'rgba(16, 185, 129, 0.1)' 
                    : importType === 'analyte' 
                      ? 'rgba(124, 58, 237, 0.1)' 
                      : 'rgba(0, 121, 193, 0.1)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: importType === 'equipment' 
                    ? '#10b981' 
                    : importType === 'analyte' 
                      ? '#7c3aed' 
                      : 'var(--accent-primary)' 
                }}>
                  <Link2 size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Vincular Google Sheets</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '2px 0 0 0' }}>Importa directamente pegando el enlace para compartir de tu hoja de cálculo pública.</p>
                </div>
              </div>

              <form onSubmit={handleUrlImport} style={{ display: 'flex', gap: '12px' }}>
                <input 
                  type="url" 
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit?usp=sharing"
                  disabled={isLoadingUrl}
                  required
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border-strong)',
                    borderColor: importType === 'equipment' 
                      ? 'rgba(16, 185, 129, 0.3)' 
                      : importType === 'analyte' 
                        ? 'rgba(124, 58, 237, 0.3)' 
                        : 'var(--border-strong)',
                    background: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    fontFamily: 'monospace'
                  }}
                  className="input-focus-ring"
                />
                <button 
                  type="submit" 
                  disabled={isLoadingUrl || !url}
                  className="btn btn-primary"
                  style={{
                    padding: '12px 24px',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    minWidth: '130px',
                    justifyContent: 'center',
                    background: importType === 'equipment' 
                      ? '#10b981' 
                      : importType === 'analyte' 
                        ? '#7c3aed' 
                        : undefined,
                    borderColor: importType === 'equipment' 
                      ? '#10b981' 
                      : importType === 'analyte' 
                        ? '#7c3aed' 
                        : undefined
                  }}
                >
                  {isLoadingUrl ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      Cargar link
                    </>
                  )}
                </button>
              </form>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', borderRadius: '8px', padding: '12px' }}>
                <Info size={16} color="var(--accent-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                  <strong>Requisito Crítico:</strong> Asegúrate de que el documento esté configurado en Google Sheets con acceso para <strong>"Cualquier persona con el enlace"</strong> (modo Lector o Editor). De lo contrario, la descarga fallará por permisos de seguridad de Google.
                </span>
              </div>
            </div>

          </div>

          {/* Sidebar Guidelines & Downloads */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={16} color="var(--accent-primary)" />
                Plantillas Blueprint
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                Descarga nuestras plantillas corporativas prediseñadas para evitar errores de mapeo en tu estructura.
              </p>
              <button 
                onClick={downloadTemplate}
                className="btn btn-primary" 
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '0.85rem', padding: '10px 0' }}
              >
                <Download size={16} /> Descargar Plantilla
              </button>
            </div>

            <div className="glass-panel" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Info size={16} color="var(--accent-warning)" />
                Instrucciones Enterprise
              </h3>
              <ul style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', paddingLeft: '16px', margin: 0, display: 'flex', flexDirection: 'column', gap: '10px', lineHeight: 1.4 }}>
                <li>La primera fila del archivo debe contener los títulos de cada columna para que el mapeador pueda predecirlos.</li>
                <li>Si importas equipamiento, el sistema creará de forma atómica los <strong>Recintos</strong> no registrados.</li>
                <li>Las fechas deben tener formato legible (ej: AAAA-MM-DD o DD/MM/AAAA).</li>
              </ul>
            </div>

          </div>

        </div>
      )}

      {/* STEP 2: COLUMN MAPPING */}
      {step === 2 && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          
          <header style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
                Mapeo de Atributos del Archivo
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '4px 0 0 0' }}>
                Asigna las columnas detectadas en tu archivo a los campos oficiales requeridos por la plataforma.
              </p>
            </div>
            
            <button 
              className="btn btn-secondary" 
              onClick={() => setStep(1)}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
            >
              <ArrowLeft size={16} /> Volver a subir
            </button>
          </header>

          <div className="glass-panel" style={{ overflow: 'hidden', marginBottom: '24px' }}>
            
            {/* Meta Configuration Inputs Row */}
            <div style={{ padding: '20px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {importType === 'gantt' ? (
                <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Nombre del Nuevo Proyecto</label>
                    <input 
                      type="text" 
                      value={projectName} 
                      onChange={e => setProjectName(e.target.value)}
                      style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 'bold', 
                        color: 'var(--text-primary)', 
                        background: 'var(--bg-tertiary)', 
                        border: '1px solid var(--border-strong)', 
                        borderRadius: 'var(--radius-md)', 
                        padding: '10px 14px',
                        outline: 'none',
                        width: '100%'
                      }}
                      placeholder="Ej. Despliegue Médico Bupa CLA"
                    />
                  </div>
                  {sheetNames.length > 1 && (
                    <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', fontWeight: 800 }}>📄 Pestaña de Excel a Importar</label>
                      <select 
                        value={selectedSheet}
                        onChange={e => {
                          setSelectedSheet(e.target.value);
                          if (workbook) processSheet(workbook, e.target.value);
                        }}
                        style={{
                          padding: '12px 14px',
                          background: 'rgba(0, 121, 193, 0.05)',
                          border: '2px solid var(--accent-primary)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-primary)',
                          fontWeight: 'bold',
                          outline: 'none',
                          cursor: 'pointer',
                          fontSize: '0.95rem'
                        }}
                      >
                        {sheetNames.map(name => (
                          <option key={name} value={name} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              ) : (importType === 'equipment' || importType === 'incident') ? (
                <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, maxWidth: '280px', minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Asociación de Proyecto</label>
                    <select 
                      value={linkProjectOption}
                      onChange={e => setLinkProjectOption(e.target.value as 'new' | 'existing')}
                      style={{
                        padding: '10px',
                        background: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: 'var(--radius-md)',
                        color: 'var(--text-primary)',
                        outline: 'none',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        width: '100%'
                      }}
                    >
                      <option value="new">Crear nuevo proyecto e importar en él</option>
                      <option value="existing">Asociar a un proyecto PMO existente</option>
                    </select>
                  </div>

                  {linkProjectOption === 'new' ? (
                    <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Nombre del Nuevo Proyecto</label>
                      <input 
                        type="text" 
                        value={projectName} 
                        onChange={e => setProjectName(e.target.value)}
                        style={{ 
                          fontSize: '0.95rem', 
                          fontWeight: 'bold', 
                          color: 'var(--text-primary)', 
                          background: 'var(--bg-tertiary)', 
                          border: '1px solid var(--border-strong)', 
                          borderRadius: 'var(--radius-md)', 
                          padding: '10px 14px',
                          outline: 'none',
                          width: '100%'
                        }}
                        placeholder="Ej. Equipamiento Clínico Central"
                      />
                    </div>
                  ) : (
                    <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Seleccionar Proyecto Existente</label>
                      <select
                        value={selectedProjectId}
                        onChange={e => setSelectedProjectId(e.target.value)}
                        style={{
                          padding: '10px',
                          background: 'var(--bg-tertiary)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-primary)',
                          outline: 'none',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          width: '100%'
                        }}
                      >
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {sheetNames.length > 1 && (
                    <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: importType === 'equipment' ? 'var(--accent-success)' : 'var(--accent-primary)', fontWeight: 800 }}>📄 Pestaña de Excel a Importar</label>
                      <select 
                        value={selectedSheet}
                        onChange={e => {
                          setSelectedSheet(e.target.value);
                          if (workbook) processSheet(workbook, e.target.value);
                        }}
                        style={{
                          padding: '10px 14px',
                          background: importType === 'equipment' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(0, 75, 135, 0.05)',
                          border: `2px solid ${importType === 'equipment' ? 'var(--accent-success)' : 'var(--accent-primary)'}`,
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-primary)',
                          fontWeight: 'bold',
                          outline: 'none',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        {sheetNames.map(name => (
                          <option key={name} value={name} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {importType === 'incident' && (
                    <>
                      <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Estado por Defecto</label>
                        <select
                          value={defaultEstado}
                          onChange={e => setDefaultEstado(e.target.value)}
                          style={{
                            padding: '10px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-strong)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            width: '100%'
                          }}
                        >
                          <option value="Abierto">Abierto</option>
                          <option value="En proceso">En proceso</option>
                          <option value="Cerrado">Cerrado</option>
                        </select>
                      </div>
                      <div style={{ width: '180px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Impacto por Defecto</label>
                        <select
                          value={defaultImpacto}
                          onChange={e => setDefaultImpacto(e.target.value)}
                          style={{
                            padding: '10px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-strong)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            outline: 'none',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            width: '100%'
                          }}
                        >
                          <option value="Bajo">Bajo</option>
                          <option value="Medio">Medio</option>
                          <option value="Crítico">Crítico</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>Módulo de Destino</label>
                    <div style={{
                      fontSize: '0.95rem',
                      fontWeight: 'bold',
                      color: '#7c3aed',
                      background: 'rgba(124, 58, 237, 0.05)',
                      border: '1.5px solid rgba(124, 58, 237, 0.2)',
                      borderRadius: 'var(--radius-md)',
                      padding: '10px 14px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Database size={16} /> Matriz de Analitos de Laboratorio (Bupa Chile)
                    </div>
                  </div>
                  {sheetNames.length > 1 && (
                    <div style={{ width: '280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '0.85rem', color: '#7c3aed', fontWeight: 800 }}>📄 Pestaña de Excel a Importar</label>
                      <select 
                        value={selectedSheet}
                        onChange={e => {
                          setSelectedSheet(e.target.value);
                          if (workbook) processSheet(workbook, e.target.value);
                        }}
                        style={{
                          padding: '10px 14px',
                          background: 'rgba(124, 58, 237, 0.05)',
                          border: '2px solid #7c3aed',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-primary)',
                          fontWeight: 'bold',
                          outline: 'none',
                          cursor: 'pointer',
                          fontSize: '0.9rem'
                        }}
                      >
                        {sheetNames.map(name => (
                          <option key={name} value={name} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mappers Scroll Grid Table */}
            <div style={{ overflowX: 'auto', padding: '24px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {columns.map(col => {
                      const isMapped = 
                        importType === 'gantt' 
                          ? ganttMapping[col] !== '' 
                          : importType === 'equipment' 
                            ? equipMapping[col] !== '' 
                            : importType === 'analyte'
                              ? analyteMapping[col] !== ''
                              : incidentMapping[col] !== '';
                      const mapVal = 
                        importType === 'gantt' 
                          ? ganttMapping[col] 
                          : importType === 'equipment' 
                            ? equipMapping[col] 
                            : importType === 'analyte'
                              ? analyteMapping[col]
                              : incidentMapping[col];
                      
                      return (
                        <th key={`mapth-${col}`} style={{ padding: '0 12px 16px 12px', minWidth: '220px', verticalAlign: 'top' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 'normal', textAlign: 'left', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              Columna Original: <strong style={{ color: 'var(--text-secondary)' }}>{col}</strong>
                            </span>
                            
                            {importType === 'gantt' ? (
                              <select 
                                value={mapVal}
                                onChange={(e) => handleSelectGanttChange(col, e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  background: isMapped ? 'rgba(0, 121, 193, 0.08)' : 'var(--bg-tertiary)',
                                  border: `2px solid ${isMapped ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
                                  borderRadius: 'var(--radius-md)',
                                  color: isMapped ? 'var(--accent-primary)' : 'var(--text-primary)',
                                  outline: 'none',
                                  fontWeight: isMapped ? 800 : 500,
                                  fontSize: '0.85rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {GANTT_FIELD_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : importType === 'equipment' ? (
                              <select 
                                value={mapVal}
                                onChange={(e) => handleSelectEquipChange(col, e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  background: isMapped ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-tertiary)',
                                  border: `2px solid ${isMapped ? 'var(--accent-success)' : 'var(--border-strong)'}`,
                                  borderRadius: 'var(--radius-md)',
                                  color: isMapped ? 'var(--accent-success)' : 'var(--text-primary)',
                                  outline: 'none',
                                  fontWeight: isMapped ? 800 : 500,
                                  fontSize: '0.85rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {EQUIP_FIELD_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : importType === 'analyte' ? (
                              <select 
                                value={mapVal}
                                onChange={(e) => handleSelectAnalyteChange(col, e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  background: isMapped ? 'rgba(124, 58, 237, 0.08)' : 'var(--bg-tertiary)',
                                  border: `2px solid ${isMapped ? '#7c3aed' : 'var(--border-strong)'}`,
                                  borderRadius: 'var(--radius-md)',
                                  color: isMapped ? '#7c3aed' : 'var(--text-primary)',
                                  outline: 'none',
                                  fontWeight: isMapped ? 800 : 500,
                                  fontSize: '0.85rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {ANALYTE_FIELD_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <select 
                                value={mapVal}
                                onChange={(e) => handleSelectIncidentChange(col, e.target.value)}
                                style={{
                                  width: '100%',
                                  padding: '10px',
                                  background: isMapped ? 'rgba(0, 75, 135, 0.08)' : 'var(--bg-tertiary)',
                                  border: `2px solid ${isMapped ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
                                  borderRadius: 'var(--radius-md)',
                                  color: isMapped ? 'var(--accent-primary)' : 'var(--text-primary)',
                                  outline: 'none',
                                  fontWeight: isMapped ? 800 : 500,
                                  fontSize: '0.85rem',
                                  cursor: 'pointer'
                                }}
                              >
                                {INCIDENT_FIELD_OPTIONS.map(opt => (
                                  <option key={opt.value} value={opt.value} style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {parsedData.slice(0, 3).map((row, rIdx) => (
                    <tr key={`rawrow-${rIdx}`} style={{ borderBottom: '1px solid var(--border-subtle)', background: rIdx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                      {columns.map(col => (
                        <td key={`rawcell-${rIdx}-${col}`} style={{ padding: '12px', color: 'var(--text-primary)', fontSize: '0.85rem', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {row[col] !== undefined && row[col] !== null ? String(row[col]) : <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Vacío</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {parsedData.length > 3 && (
                    <tr>
                      <td colSpan={columns.length} style={{ padding: '12px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', background: 'rgba(255,255,255,0.01)' }}>
                        ... y {parsedData.length - 3} filas más en el archivo
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>
              Atrás
            </button>
            <button 
              className="btn btn-primary" 
              onClick={handleRunValidation}
              style={{ padding: '12px 32px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              Ejecutar Validación de Calidad <ChevronRight size={18} />
            </button>
          </div>

        </div>
      )}

      {/* STEP 3: PRE-IMPORT VALIDATION HUB */}
      {step === 3 && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          
          <header style={{ marginBottom: '24px' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)', margin: 0 }}>
              Consola de Calidad de Datos (Pre-importación)
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '4px 0 0 0' }}>
              Se ha completado el escaneo automatizado. Revisa las advertencias e inconsistencias antes de impactar la base de datos.
            </p>
          </header>

          {/* Validation Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            
            <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(2, 132, 199, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <TableIcon size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{parsedData.length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filas Totales Detectadas</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(225, 29, 72, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-danger)' }}>
                <XCircle size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-danger)' }}>{validationErrors.filter(e => e.level === 'critical').length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Errores Críticos (Descartados)</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-warning)' }}>
                <AlertTriangle size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-warning)' }}>{validationErrors.filter(e => e.level === 'warning').length}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Advertencias (Autoreparadas)</div>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-success)' }}>
                <CheckCircle2 size={20} />
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--accent-success)' }}>{parsedData.length - criticalRows.size}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filas Listas para Importar</div>
              </div>
            </div>

          </div>

          {/* ASIGNACIÓN EN CASCADA INTERACTIVA DE SEDES PARA ANALITOS */}
          {importType === 'analyte' && (
            <div style={{ 
              background: 'var(--bg-secondary)', 
              border: '1.5px solid var(--border-subtle)', 
              borderRadius: '16px',
              padding: '24px', 
              marginBottom: '24px', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.015)' 
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: 'rgba(124, 58, 237, 0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#7c3aed'
                }}>
                  <Building size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                    Asignación en Cascada (Un solo clic)
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '2px 0 0 0', lineHeight: 1.4 }}>
                    Asigna cada equipo/instrumento a su Sede Clínica correspondiente. Todos los analitos asociados a ese instrumento en el archivo Excel heredarán la sede en cascada de forma automática al presionar "Confirmar e Importar".
                  </p>
                </div>
              </div>

              {/* Grid of unique instruments */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {uniqueInstrumentsList.map(instName => {
                  const currentRecId = instrumentSedeMap[instName] || '';
                  const matchedRec = recintos.find(r => r.id === currentRecId);
                  const isAutodetected = !!matchedRec && currentRecId !== '';
                  
                  return (
                    <div 
                      key={`cascade-${instName}`}
                      style={{
                        padding: '16px',
                        background: 'var(--bg-primary)',
                        border: '1.5px solid',
                        borderColor: isAutodetected ? 'rgba(16, 185, 129, 0.25)' : 'rgba(245, 158, 11, 0.3)',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.01)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                          🔬 {instName}
                        </span>
                        
                        {isAutodetected ? (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '99px',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--accent-success)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <CheckCircle2 size={12} /> Autodetectado
                          </span>
                        ) : (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '99px',
                            background: 'rgba(245, 158, 11, 0.1)',
                            color: 'var(--accent-warning)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <AlertTriangle size={12} /> Sede por Definir
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SEDE / RECINTO ASOCIADO</label>
                        <select
                          value={currentRecId}
                          onChange={(e) => {
                            const val = e.target.value;
                            setInstrumentSedeMap(prev => ({
                              ...prev,
                              [instName]: val
                            }));
                          }}
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'var(--bg-tertiary)',
                            border: `1.5px solid ${isAutodetected ? 'var(--border-subtle)' : 'var(--accent-warning)'}`,
                            borderRadius: '8px',
                            color: 'var(--text-primary)',
                            fontSize: '0.85rem',
                            outline: 'none',
                            cursor: 'pointer',
                            fontWeight: 'bold'
                          }}
                        >
                          <option value="">-- Seleccionar Sede Clínica --</option>
                          {recintos.map(rec => (
                            <option key={rec.id} value={rec.id}>
                              {rec.name} ({rec.code})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Warning if there are unassigned instruments */}
              {uniqueInstrumentsList.some(name => !instrumentSedeMap[name]) && (
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                  background: 'rgba(225, 29, 72, 0.05)',
                  border: '1px solid rgba(225, 29, 72, 0.15)',
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '16px'
                }}>
                  <AlertTriangle size={16} color="var(--accent-danger)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-danger)', fontWeight: 700 }}>
                    Requisito Crítico: Debes asignar una sede clínica para cada instrumento para poder importar los analitos de forma consistente.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Split layout: Errors log & preview */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '32px' }}>
            
            {/* Warning Console */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={18} color="var(--accent-warning)" />
                Detalle del Diagnóstico de Datos
              </h3>
              
              {validationErrors.length === 0 ? (
                <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--accent-success)', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <CheckCircle2 size={40} />
                  <div>
                    <h4 style={{ fontWeight: 800, margin: '0 0 4px 0', fontSize: '1.05rem' }}>¡Estructura Impecable!</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No se encontraron advertencias ni inconsistencias de datos en el archivo.</p>
                  </div>
                </div>
              ) : (
                <div style={{ maxHeight: '380px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '8px' }}>
                  {validationErrors.map((err, idx) => {
                    const bg = err.level === 'critical' ? 'rgba(225, 29, 72, 0.04)' : err.level === 'warning' ? 'rgba(245, 158, 11, 0.04)' : 'rgba(0, 121, 193, 0.04)';
                    const border = err.level === 'critical' ? 'rgba(225, 29, 72, 0.15)' : err.level === 'warning' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(0, 121, 193, 0.15)';
                    const color = err.level === 'critical' ? 'var(--accent-danger)' : err.level === 'warning' ? 'var(--accent-warning)' : 'var(--accent-primary)';
                    
                    return (
                      <div key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '12px', background: bg, border: `1px solid ${border}`, borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '2px 8px', borderRadius: '4px', background: color, color: '#ffffff', minWidth: '55px', textAlign: 'center' }}>
                          {err.level.toUpperCase()}
                        </span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>Fila {err.row} — Columna: <span style={{ fontFamily: 'monospace' }}>{err.column}</span></div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{err.message}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Validation Actions Panel */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Database size={16} color="var(--accent-primary)" />
                  Destino e Integridad
                </h3>
                
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TIPO DE IMPORTACION</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {importType === 'gantt' 
                      ? '📅 Cronograma WBS Gantt' 
                      : importType === 'equipment' 
                        ? '🩺 Equipamiento Clínico' 
                        : '🔬 Matriz de Analitos de Laboratorio'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>PROYECTO DESTINO</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                    {importType === 'gantt' || linkProjectOption === 'new' 
                      ? projectName 
                      : importType === 'analyte'
                        ? 'Sedes Clínicas (Cascada)'
                        : projects.find(p => p.id === selectedProjectId)?.name || 'Proyecto Seleccionado'}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <button 
                  className="btn btn-primary" 
                  onClick={handleConfirmImport}
                  style={{ 
                    width: '100%', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    gap: '8px', 
                    padding: '12px 0', 
                    fontSize: '0.95rem',
                    background: importType === 'analyte' ? '#7c3aed' : undefined,
                    borderColor: importType === 'analyte' ? '#7c3aed' : undefined
                  }}
                >
                  <Sparkles size={18} /> Confirmar e Importar a DB
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setStep(2)}
                  style={{ width: '100%', fontSize: '0.9rem' }}
                >
                  Ajustar Mapeo
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* STEP 4: IMPORTING & SUCCESS PANEL */}
      {step === 4 && (
        <div style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', animation: 'fadeIn 0.3s ease' }}>
          
          {isImporting ? (
            <div className="glass-panel" style={{ padding: '50px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
              <Loader2 className="animate-spin" size={48} color={importType === 'analyte' ? '#7c3aed' : 'var(--accent-primary)'} />
              <div>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 6px 0' }}>Procesando Importación Corporativa</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{statusMessage}</p>
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                <div style={{ height: '8px', width: '100%', background: 'var(--border-subtle)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', 
                    width: `${importProgress}%`, 
                    background: importType === 'analyte' ? '#7c3aed' : 'var(--gradient-primary)', 
                    borderRadius: '99px', 
                    transition: 'width 0.4s ease' 
                  }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 800, alignSelf: 'flex-end' }}>{importProgress}% completado</div>
              </div>
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: '50px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '50%', 
                background: importType === 'analyte' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(16, 185, 129, 0.1)', 
                color: importType === 'analyte' ? '#7c3aed' : 'var(--accent-success)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                boxShadow: importType === 'analyte' ? '0 8px 24px rgba(124, 58, 237, 0.2)' : '0 8px 24px rgba(16, 185, 129, 0.2)' 
              }}>
                <CheckCircle2 size={36} />
              </div>
              
              <div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: 'var(--text-primary)', margin: '0 0 8px 0' }}>¡Importación Completada con Éxito!</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', margin: 0, lineHeight: 1.5 }}>
                  Los datos de tu archivo se han analizado, formateado y guardado de forma segura en la base de datos local SQLite.
                </p>
              </div>

              {/* Analytical Summary Card */}
              <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '20px', width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'left' }}>
                <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Resumen del impacto en DB</h4>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Registros Creados Exitosamente:</span>
                  <strong style={{ color: 'var(--accent-success)' }}>+{importSummary.success}</strong>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                  <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Filas Excluidas / Filtradas por Errores:</span>
                  <strong style={{ color: importSummary.failed > 0 ? 'var(--accent-danger)' : 'var(--text-muted)' }}>{importSummary.failed}</strong>
                </div>

                {importType === 'equipment' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Nuevos Recintos/Ubicaciones Creados:</span>
                    <strong style={{ color: 'var(--accent-primary)' }}>+{importSummary.recintosCreated}</strong>
                  </div>
                )}

                {importType === 'analyte' && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Nuevos Equipos Clínicos Auto-creados:</span>
                    <strong style={{ color: '#7c3aed' }}>+{importSummary.recintosCreated}</strong>
                  </div>
                )}
              </div>

              <button 
                className="btn btn-primary" 
                onClick={() => {
                  if (importType === 'gantt') {
                    router.push('/gantt');
                  } else if (importType === 'analyte') {
                    router.push('/equipment?tab=analytes');
                  } else {
                    router.push('/equipment');
                  }
                }}
                style={{ 
                  padding: '12px 40px', 
                  fontSize: '0.95rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginTop: '8px',
                  background: importType === 'analyte' ? '#7c3aed' : undefined,
                  borderColor: importType === 'analyte' ? '#7c3aed' : undefined
                }}
              >
                Ir a Ver mis Datos <ArrowRight size={18} />
              </button>
            </div>
          )}

        </div>
      )}

    </div>
  );
}
