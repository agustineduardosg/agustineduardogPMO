import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  FileText, 
  Save, 
  Printer, 
  FileDown, 
  CheckCircle, 
  ShieldAlert, 
  Award, 
  FileSpreadsheet, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Activity, 
  Info,
  DollarSign,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  Edit2
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useIncidentStore } from '@/store/incidentStore';
import { useEquipmentStore } from '@/store/equipmentStore';
import RichTextEditor from '@/components/RichTextEditor';

interface ClosureActTabProps {
  projectId: string;
  project: any;
  users: any[];
  equipments: any[];
}

export default function ClosureActTab({ projectId, project, users, equipments }: ClosureActTabProps) {
  const { data: session } = useSession();
  
  // ZUSTAND STORES
  const incidents = useIncidentStore(state => state.incidents);
  const fetchIncidents = useIncidentStore(state => state.fetchIncidents);
  
  const recintos = useEquipmentStore(state => state.recintos);
  const fetchEquipmentData = useEquipmentStore(state => state.fetchEquipmentData);

  // Section item type definition
  interface SectionItem {
    id: string;
    title: string;
    content: string;
    type: 'predefined' | 'custom';
  }

  const [sections, setSections] = useState<SectionItem[]>([]);
  const [signedByPm, setSignedByPm] = useState<string | null>(null);
  const [signedBySponsor, setSignedBySponsor] = useState<string | null>(null);
  const [signedByPmo, setSignedByPmo] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);

  // States for inline renaming of custom sections
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [tempSectionTitle, setTempSectionTitle] = useState('');

  // Fetch recintos data if not loaded
  useEffect(() => {
    if (recintos.length === 0) {
      fetchEquipmentData();
    }
  }, [recintos.length, fetchEquipmentData]);

  // Load data
  useEffect(() => {
    async function loadClosureAct() {
      try {
        const res = await fetch(`/api/projects/${projectId}/closure-act`);
        if (res.ok) {
          const data = await res.json();
          
          let parsedCustomSections: any[] = [];
          if (data.customSections) {
            try {
              parsedCustomSections = JSON.parse(data.customSections);
            } catch (e) {
              console.error('Error parsing customSections:', e);
            }
          }

          // Check if customSections already contains predefined sections metadata
          const hasPredefined = parsedCustomSections.some((sec: any) =>
            ['acceptanceCriteria', 'lessonsLearned', 'handoverNotes', 'pendingItems'].includes(sec.id)
          );

          const loadedSections: SectionItem[] = [];

          if (hasPredefined) {
            parsedCustomSections.forEach((sec: any) => {
              if (sec.id === 'acceptanceCriteria') {
                if (data.acceptanceCriteria !== '[DELETED]') {
                  loadedSections.push({
                    id: 'acceptanceCriteria',
                    title: sec.title || 'Objetivos y Criterios de Aceptación',
                    content: data.acceptanceCriteria || '',
                    type: 'predefined'
                  });
                }
              } else if (sec.id === 'lessonsLearned') {
                if (data.lessonsLearned !== '[DELETED]') {
                  loadedSections.push({
                    id: 'lessonsLearned',
                    title: sec.title || 'Lecciones Aprendidas',
                    content: data.lessonsLearned || '',
                    type: 'predefined'
                  });
                }
              } else if (sec.id === 'handoverNotes') {
                if (data.handoverNotes !== '[DELETED]') {
                  loadedSections.push({
                    id: 'handoverNotes',
                    title: sec.title || 'Traspaso Operativo y Soporte',
                    content: data.handoverNotes || '',
                    type: 'predefined'
                  });
                }
              } else if (sec.id === 'pendingItems') {
                if (data.pendingItems !== '[DELETED]') {
                  loadedSections.push({
                    id: 'pendingItems',
                    title: sec.title || 'Pendientes / Próximos Pasos',
                    content: data.pendingItems || '',
                    type: 'predefined'
                  });
                }
              } else {
                loadedSections.push({
                  id: sec.id,
                  title: sec.title || '',
                  content: sec.content || '',
                  type: 'custom'
                });
              }
            });
          } else {
            // Legacy load: build standard pre-defined list first, then append custom sections
            if (data.acceptanceCriteria !== '[DELETED]') {
              loadedSections.push({
                id: 'acceptanceCriteria',
                title: 'Objetivos y Criterios de Aceptación',
                content: data.acceptanceCriteria || '',
                type: 'predefined'
              });
            }
            if (data.lessonsLearned !== '[DELETED]') {
              loadedSections.push({
                id: 'lessonsLearned',
                title: 'Lecciones Aprendidas',
                content: data.lessonsLearned || '',
                type: 'predefined'
              });
            }
            if (data.handoverNotes !== '[DELETED]') {
              loadedSections.push({
                id: 'handoverNotes',
                title: 'Traspaso Operativo y Soporte',
                content: data.handoverNotes || '',
                type: 'predefined'
              });
            }
            if (data.pendingItems !== '[DELETED]') {
              loadedSections.push({
                id: 'pendingItems',
                title: 'Pendientes / Próximos Pasos',
                content: data.pendingItems || '',
                type: 'predefined'
              });
            }
            parsedCustomSections.forEach((sec: any) => {
              if (!['acceptanceCriteria', 'lessonsLearned', 'handoverNotes', 'pendingItems'].includes(sec.id)) {
                loadedSections.push({
                  id: sec.id,
                  title: sec.title || '',
                  content: sec.content || '',
                  type: 'custom'
                });
              }
            });
          }
          
          setSections(loadedSections);
          setSignedByPm(data.signedByPm);
          setSignedBySponsor(data.signedBySponsor);
          setSignedByPmo(data.signedByPmo);
          setUpdatedAt(data.updatedAt || null);
        }
      } catch (err) {
        console.error('Error loading closure act:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClosureAct();
    if (incidents.length === 0) {
      fetchIncidents();
    }
  }, [projectId, fetchIncidents, incidents.length]);

  // Project-specific incidents
  const projectIncidents = useMemo(() => {
    return incidents.filter((inc: any) => inc.projectId === projectId);
  }, [incidents, projectId]);

  // Fuzzy recinto discovery logic
  const recintoName = useMemo(() => {
    const counts: Record<string, number> = {};

    // 1. Count from equipments
    if (equipments && equipments.length > 0) {
      equipments.forEach((eq: any) => {
        const rec = recintos.find(r => r.id === eq.recintoId);
        const name = rec?.name || eq.recintoName;
        if (name) {
          counts[name] = (counts[name] || 0) + 1;
        }
      });
    }

    // 2. Count from incidents
    if (projectIncidents && projectIncidents.length > 0) {
      projectIncidents.forEach((inc: any) => {
        if (inc.recintoName) {
          counts[inc.recintoName] = (counts[inc.recintoName] || 0) + 1;
        }
      });
    }

    // Find the most frequent recinto name
    let bestName = '';
    let maxCount = 0;
    Object.entries(counts).forEach(([name, count]) => {
      if (count > maxCount) {
        maxCount = count;
        bestName = name;
      }
    });

    if (bestName) return bestName;

    // 3. Fallback to project name keywords
    const projName = project?.name || '';
    if (/reñaca/i.test(projName)) return 'Clínica Reñaca';
    if (/cla/i.test(projName)) return 'Bupa CLA';
    if (/santiago/i.test(projName)) return 'Bupa Santiago';
    if (/san bernardo/i.test(projName)) return 'Bupa San Bernardo';
    if (/antofagasta/i.test(projName)) return 'Clínica Bupa Antofagasta';

    return 'Bupa Chile'; // default fallback
  }, [equipments, projectIncidents, recintos, project]);

  // Predefined descriptions for tooltips/labels
  const predefinedDescriptions: Record<string, string> = {
    acceptanceCriteria: 'Describa los criterios y condiciones pactados con el sponsor para el cierre y la recepción conforme de la entrega.',
    lessonsLearned: 'Registre lecciones clave: qué funcionó de forma óptima, qué falló y cuáles son las recomendaciones específicas para el portafolio.',
    handoverNotes: 'Describa las condiciones acordadas para la transferencia de la operación (ej: manuales de usuario, SLAs de soporte de analizadores o configuración LIS).',
    pendingItems: 'Indique tareas menores pendientes, compromisos post Go-Live o plazos de revisiones del sistema.'
  };

  // Find missing predefined sections to display restoration buttons
  const missingPredefined = useMemo(() => {
    const predefinedIds = ['acceptanceCriteria', 'lessonsLearned', 'handoverNotes', 'pendingItems'];
    const activeIds = sections.map(s => s.id);
    const missing = predefinedIds.filter(id => !activeIds.includes(id));
    
    const defaultTitles: Record<string, string> = {
      acceptanceCriteria: 'Objetivos y Criterios de Aceptación',
      lessonsLearned: 'Lecciones Aprendidas',
      handoverNotes: 'Traspaso Operativo y Soporte',
      pendingItems: 'Temas Pendientes y Responsables'
    };
    
    return missing.map(id => ({
      id,
      title: defaultTitles[id]
    }));
  }, [sections]);

  const handleRestorePredefinedSection = (id: string) => {
    if (isLocked) return;
    
    const defaultTitles: Record<string, string> = {
      acceptanceCriteria: 'Objetivos y Criterios de Aceptación',
      lessonsLearned: 'Lecciones Aprendidas',
      handoverNotes: 'Traspaso Operativo y Soporte',
      pendingItems: 'Temas Pendientes y Responsables'
    };

    const defaultContents: Record<string, string> = {
      acceptanceCriteria: 'Todos los entregables definidos en el alcance del proyecto han sido revisados y aceptados formalmente. Las pruebas funcionales y de conectividad fueron completadas de forma satisfactoria.',
      lessonsLearned: '1. ¿Qué funcionó bien?:\n- Excelente coordinación entre el equipo clínico y de TI.\n- El pre-mapeo del importador redujo el tiempo de configuración inicial.\n\n2. ¿Qué se puede mejorar?:\n- Planificar las capacitaciones de usuarios clave con mayor anticipación para asegurar disponibilidad de turnos.\n\n3. Recomendaciones para futuros proyectos:\n- Homologar plantillas de Excel con los proveedores clínicos previo a la etapa de desarrollo.',
      handoverNotes: 'Traspaso formal a operaciones completado. Se capacitó a los usuarios clínicos clave, se entregó la matriz de analitos configurada y se completó la integración con el sistema de transmisión LIS.',
      pendingItems: 'Ninguno. Proyecto cerrado al 100% sin pendientes críticos.'
    };

    const newSection: SectionItem = {
      id,
      title: defaultTitles[id],
      content: defaultContents[id],
      type: 'predefined'
    };

    setSections(prev => [...prev, newSection]);
  };

  // Calculations
  const progress = useMemo(() => {
    if (!project) return 0;
    const rootTasks = project.phases.flatMap((ph: any) => ph.tasks).filter((t: any) => !t.parentId);
    if (rootTasks.length === 0) return 0;
    
    let totalWeightedProgress = 0;
    let totalDuration = 0;
    
    rootTasks.forEach((t: any) => {
      totalDuration += t.duration;
      totalWeightedProgress += t.progress * t.duration;
    });
    
    return totalDuration > 0 ? Math.round(totalWeightedProgress / totalDuration) : 0;
  }, [project]);

  // Gantt tasks status count
  const ganttStats = useMemo(() => {
    const allTasks = project?.phases?.flatMap((ph: any) => ph.tasks) || [];
    const total = allTasks.length;
    const completed = allTasks.filter((t: any) => t.progress === 100).length;
    const inProgress = allTasks.filter((t: any) => t.progress > 0 && t.progress < 100).length;
    const pending = allTasks.filter((t: any) => t.progress === 0).length;
    return { total, completed, inProgress, pending };
  }, [project]);

  const costSummary = useMemo(() => {
    let totalBudget = 0;
    let totalExecuted = 0;
    (project?.costItems || []).forEach((c: any) => {
      totalBudget += c.approvedBudget || 0;
      totalExecuted += c.realCost || 0;
    });
    return {
      totalBudget,
      totalExecuted,
      deviation: totalBudget - totalExecuted
    };
  }, [project]);

  // Collect attachments
  const attachments = useMemo(() => {
    const list: any[] = [];
    (project?.phases || []).forEach((ph: any) => {
      (ph.tasks || []).forEach((t: any) => {
        (t.attachments || []).forEach((att: any) => {
          list.push({
            ...att,
            taskName: t.name,
            phaseName: ph.name
          });
        });
      });
    });
    return list;
  }, [project]);

  // Executive Semaphores
  const semaphores = useMemo(() => {
    const delay = project?.delayDays || 0;
    const timeStatus = delay > 0 ? 'red' : 'green';
    
    const costStatus = costSummary.totalExecuted > costSummary.totalBudget ? 'red' : 'green';
    
    const activeRisksCount = (project?.risks || []).filter((r: any) => r.status === 'Activo').length;
    const riskStatus = activeRisksCount > 0 ? 'red' : 'green';

    const activeIncidentsCount = projectIncidents.filter((inc: any) => inc.estado !== 'Cerrado').length;
    const incidentStatus = activeIncidentsCount > 0 ? 'red' : 'green';

    return { timeStatus, costStatus, riskStatus, incidentStatus };
  }, [project, costSummary, projectIncidents]);

  // Helper to replace placeholders dynamically
  const resolvePlaceholders = (htmlStr: string) => {
    if (!htmlStr) return '';
    const formattedGoLive = project?.goLiveDate ? format(new Date(project.goLiveDate), 'dd/MM/yyyy') : 'No programada';
    const delay = project?.delayDays || 0;

    return htmlStr
      .replaceAll('{{Proyecto}}', project?.name || '')
      .replaceAll('{{PM}}', project?.manager || 'No asignado')
      .replaceAll('{{Sponsor}}', project?.sponsor || 'No asignado')
      .replaceAll('{{GoLive}}', formattedGoLive)
      .replaceAll('{{Desviacion}}', `${delay} días`);
  };

  // Helper to strip HTML tags for Excel export
  const stripHtml = (html: string) => {
    if (!html) return '';
    let text = html.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<[^>]*>/g, '');
    text = text.replaceAll('&nbsp;', ' ').replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>');
    return text.trim();
  };

  const isLocked = useMemo(() => {
    return !!(signedByPm && signedBySponsor && signedByPmo);
  }, [signedByPm, signedBySponsor, signedByPmo]);

  // Custom sections handlers
  const handleAddCustomSection = () => {
    if (isLocked) return;
    const title = prompt('Ingrese el título de la nueva sección:');
    if (!title || !title.trim()) return;
    
    const newSection: SectionItem = {
      id: `cs_${Date.now()}`,
      title: title.trim(),
      content: '',
      type: 'custom'
    };
    
    setSections([...sections, newSection]);
  };

  const handleUpdateSectionContent = (id: string, content: string) => {
    if (isLocked) return;
    setSections(
      sections.map(sec => sec.id === id ? { ...sec, content } : sec)
    );
  };

  const handleRemoveSection = (id: string) => {
    if (isLocked) return;
    const target = sections.find(sec => sec.id === id);
    if (!target) return;
    
    const confirmMsg = target.type === 'predefined'
      ? `¿Está seguro de que desea eliminar la sección predefinida "${target.title}"? Podrá restaurarla más adelante desde los controles de la página.`
      : `¿Está seguro de que desea eliminar la sección personalizada "${target.title}"? Todo su contenido se perderá permanentemente.`;
      
    if (confirm(confirmMsg)) {
      setSections(sections.filter(sec => sec.id !== id));
    }
  };

  const handleMoveSectionUp = (index: number) => {
    if (isLocked || index === 0) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setSections(updated);
  };

  const handleMoveSectionDown = (index: number) => {
    if (isLocked || index === sections.length - 1) return;
    const updated = [...sections];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setSections(updated);
  };

  const startEditingTitle = (id: string, currentTitle: string) => {
    if (isLocked) return;
    setEditingSectionId(id);
    setTempSectionTitle(currentTitle);
  };

  const saveSectionTitle = (id: string) => {
    if (!tempSectionTitle.trim()) return;
    setSections(
      sections.map(sec => sec.id === id ? { ...sec, title: tempSectionTitle.trim() } : sec)
    );
    setEditingSectionId(null);
  };

  const handleSave = async () => {
    if (isLocked) {
      alert('El acta está aprobada y bloqueada. No se pueden realizar cambios.');
      return;
    }
    setSaving(true);
    try {
      const getSectionContent = (id: string) => {
        const sec = sections.find(s => s.id === id);
        return sec ? sec.content : '[DELETED]';
      };

      const acceptanceCriteriaVal = getSectionContent('acceptanceCriteria');
      const lessonsLearnedVal = getSectionContent('lessonsLearned');
      const handoverNotesVal = getSectionContent('handoverNotes');
      const pendingItemsVal = getSectionContent('pendingItems');

      const customSectionsMetadata = sections.map(sec => {
        if (sec.type === 'predefined') {
          return { id: sec.id, title: sec.title, type: 'predefined' };
        } else {
          return { id: sec.id, title: sec.title, content: sec.content, type: 'custom' };
        }
      });

      const res = await fetch(`/api/projects/${projectId}/closure-act`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptanceCriteria: acceptanceCriteriaVal,
          lessonsLearned: lessonsLearnedVal,
          handoverNotes: handoverNotesVal,
          pendingItems: pendingItemsVal,
          customSections: JSON.stringify(customSectionsMetadata),
          signedByPm,
          signedBySponsor,
          signedByPmo
        })
      });
      if (res.ok) {
        const data = await res.json();
        setUpdatedAt(data.updatedAt || null);
        alert('Acta de Cierre guardada con éxito.');
      } else {
        alert('Error al guardar el Acta de Cierre.');
      }
    } catch (err) {
      console.error(err);
      alert('Error en la comunicación con el servidor.');
    } finally {
      setSaving(false);
    }
  };

  const handleUnlockAct = async () => {
    if (confirm('¿Está seguro de destrabar el acta? Se eliminarán las firmas digitales de aprobación, permitiendo editar nuevamente.')) {
      setSaving(true);
      try {
        const getSectionContent = (id: string) => {
          const sec = sections.find(s => s.id === id);
          return sec ? sec.content : '[DELETED]';
        };

        const acceptanceCriteriaVal = getSectionContent('acceptanceCriteria');
        const lessonsLearnedVal = getSectionContent('lessonsLearned');
        const handoverNotesVal = getSectionContent('handoverNotes');
        const pendingItemsVal = getSectionContent('pendingItems');

        const customSectionsMetadata = sections.map(sec => {
          if (sec.type === 'predefined') {
            return { id: sec.id, title: sec.title, type: 'predefined' };
          } else {
            return { id: sec.id, title: sec.title, content: sec.content, type: 'custom' };
          }
        });

        const res = await fetch(`/api/projects/${projectId}/closure-act`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            acceptanceCriteria: acceptanceCriteriaVal,
            lessonsLearned: lessonsLearnedVal,
            handoverNotes: handoverNotesVal,
            pendingItems: pendingItemsVal,
            customSections: JSON.stringify(customSectionsMetadata),
            signedByPm: null,
            signedBySponsor: null,
            signedByPmo: null
          })
        });
        if (res.ok) {
          const data = await res.json();
          setSignedByPm(null);
          setSignedBySponsor(null);
          setSignedByPmo(null);
          setUpdatedAt(data.updatedAt || null);
          alert('El acta ha sido destrabada y está lista para edición.');
        } else {
          alert('Error al destrabar el acta en el servidor.');
        }
      } catch (err) {
        console.error(err);
        alert('Error en la comunicación con el servidor.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleResetAct = () => {
    if (isLocked) return;
    if (confirm('¿Está seguro de reiniciar el acta de cierre? Se restaurarán los textos por defecto originales de PMO, se eliminarán todas las secciones personalizadas y las firmas digitales. Esta acción no se puede deshacer.')) {
      const defaultSections: SectionItem[] = [
        {
          id: 'acceptanceCriteria',
          title: 'Objetivos y Criterios de Aceptación',
          content: 'Todos los entregables definidos en el alcance del proyecto han sido revisados y aceptados formalmente. Las pruebas funcionales y de conectividad fueron completadas de forma satisfactoria.',
          type: 'predefined'
        },
        {
          id: 'lessonsLearned',
          title: 'Lecciones Aprendidas',
          content: '1. ¿Qué funcionó bien?:\n- Excelente coordinación entre el equipo clínico y de TI.\n- El pre-mapeo del importador redujo el tiempo de configuración inicial.\n\n2. ¿Qué se puede mejorar?:\n- Planificar las capacitaciones de usuarios clave con mayor anticipación para asegurar disponibilidad de turnos.\n\n3. Recomendaciones para futuros proyectos:\n- Homologar plantillas de Excel con los proveedores clínicos previo a la etapa de desarrollo.',
          type: 'predefined'
        },
        {
          id: 'handoverNotes',
          title: 'Traspaso Operativo y Soporte',
          content: 'Traspaso formal a operaciones completado. Se capacitó a los usuarios clínicos clave, se entregó la matriz de analitos configurada y se completó la integración con el sistema de transmisión LIS.',
          type: 'predefined'
        },
        {
          id: 'pendingItems',
          title: 'Temas Pendientes y Responsables',
          content: 'Ninguno. Proyecto cerrado al 100% sin pendientes críticos.',
          type: 'predefined'
        }
      ];
      setSections(defaultSections);
      setSignedByPm(null);
      setSignedBySponsor(null);
      setSignedByPmo(null);
      alert('Acta reiniciada localmente. Presione "Guardar Acta" para aplicar los cambios de forma permanente en la base de datos.');
    }
  };

  const toggleSignature = (role: 'pm' | 'sponsor' | 'pmo') => {
    if (isLocked) return;
    const userName = session?.user?.name || 'Usuario PMO Bupa';
    const stamp = `${userName} (${format(new Date(), 'dd/MM/yyyy HH:mm')})`;

    if (role === 'pm') {
      setSignedByPm(signedByPm ? null : stamp);
    } else if (role === 'sponsor') {
      setSignedBySponsor(signedBySponsor ? null : stamp);
    } else if (role === 'pmo') {
      setSignedByPmo(signedByPmo ? null : stamp);
    }
  };

  // Export handlers
  const handlePrintPDF = () => {
    window.print();
  };

  const handleExportWord = () => {
    const formattedStart = project?.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : '-';
    const formattedEnd = project?.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : '-';
    const formattedGoLive = project?.goLiveDate ? format(new Date(project.goLiveDate), 'dd/MM/yyyy') : 'No programada';

    const htmlContent = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Acta de Cierre - ${project?.name}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 10pt; line-height: 1.4; color: #333333; }
          h1 { color: #004B87; font-size: 16pt; text-align: center; margin-bottom: 2px; text-transform: uppercase; font-weight: bold; }
          .subtitle { text-align: center; font-size: 8.5pt; color: #666666; margin-bottom: 20px; font-weight: bold; letter-spacing: 1px; }
          h2 { color: #004B87; font-size: 11pt; border-bottom: 2px solid #0079C1; padding-bottom: 3px; margin-top: 20px; text-transform: uppercase; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px; }
          th, td { border: 1px solid #cccccc; padding: 5px 8px; text-align: left; font-size: 9pt; }
          th { background-color: #f1f5f9; color: #004B87; font-weight: bold; }
          .text-block { background-color: #f8fafc; border-left: 3px solid #0079C1; padding: 8px 12px; margin: 8px 0; font-size: 9pt; color: #475569; }
          .sig-table { margin-top: 30px; border: none; }
          .sig-table td { border: none; text-align: center; width: 33%; vertical-align: top; position: relative; }
          .sig-line { border-top: 1px solid #333333; width: 80%; margin: 40px auto 5px auto; }
          .sig-title { font-size: 8pt; color: #666666; }
          .stamp-box { border: 2px double #0d9488; color: #0d9488; background-color: rgba(13,148,136,0.05); padding: 4px; border-radius: 4px; font-size: 7.5pt; font-weight: bold; text-transform: uppercase; margin: 5px auto; width: 85%; }
        </style>
      </head>
      <body>
        <h1>ACTA DE CIERRE DE PROYECTO</h1>
        <div class="subtitle">${recintoName.toUpperCase()}</div>

        <h2>1. INFORMACIÓN GENERAL DEL PROYECTO</h2>
        <table>
          <tr><th style="width:30%">Nombre del Proyecto</th><td>${project?.name || ''}</td></tr>
          <tr><th>ID del Proyecto</th><td>${project?.id || ''}</td></tr>
          <tr><th>Director / PM</th><td>${project?.manager || 'No asignado'}</td></tr>
          <tr><th>Sponsor del Proyecto</th><td>${project?.sponsor || 'No asignado'}</td></tr>
          <tr><th>Área de Negocio</th><td>${project?.area || 'Sin Área'}</td></tr>
          <tr><th>Tipo / Metodología</th><td>${project?.type || 'Proyecto SCL'} / ${project?.methodology || 'Tradicional'}</td></tr>
          <tr><th>Fecha Inicio</th><td>${formattedStart}</td></tr>
          <tr><th>Fecha Término Plan</th><td>${formattedEnd}</td></tr>
          <tr><th>Fecha Go-Live</th><td>${formattedGoLive}</td></tr>
          <tr><th>Estado de Avance</th><td><b>${progress}% (Completado)</b></td></tr>
          <tr><th>Desviación Tiempo</th><td>${project?.delayDays || 0} días</td></tr>
        </table>

        <h2>2. DESEMPEÑO FINANCIERO (CONSOLIDADO)</h2>
        <table>
          <tr><th style="width:30%">Presupuesto Total Aprobado</th><td>${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(costSummary.totalBudget)} CLP</td></tr>
          <tr><th>Costo Real Ejecutado</th><td>${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(costSummary.totalExecuted)} CLP</td></tr>
          <tr><th>Desviación / Saldo</th><td>${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(costSummary.deviation)} CLP</td></tr>
        </table>

        <h2>3. DESEMPEÑO DEL CRONOGRAMA (RESUMEN GANTT)</h2>
        <p style="font-size: 9pt; margin: 4px 0;"><strong>Resumen de Actividades:</strong> Total Tareas: ${ganttStats.total} | Completadas: ${ganttStats.completed} | En Progreso: ${ganttStats.inProgress} | Pendientes: ${ganttStats.pending}</p>
        <table>
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="width: 15%">WBS</th>
              <th style="width: 50%">Fase / Actividad</th>
              <th style="width: 20%">Responsable</th>
              <th style="width: 15%">Avance</th>
            </tr>
          </thead>
          <tbody>
            ${(project?.phases || []).map((ph: any) => `
              <tr style="background-color: #e2e8f0; font-weight: bold;">
                <td>${ph.wbsId || ''}</td>
                <td>${ph.name}</td>
                <td>--</td>
                <td>${ph.progress}%</td>
              </tr>
              ${ph.tasks.map((t: any) => `
                <tr>
                  <td>${t.wbsId || ''}</td>
                  <td style="padding-left: 15px;">${t.name}</td>
                  <td>${t.assignee || 'Sin Asignar'}</td>
                  <td>${t.progress}%</td>
                </tr>
              `).join('')}
            `).join('')}
          </tbody>
        </table>

        <h2>4. EQUIPOS MÉDICOS Y ESTADO DE GO-LIVE (6 FASES CLÍNICAS)</h2>
        <table>
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th>Equipo Biomédico</th>
              <th>Sección</th>
              <th>Levant.</th>
              <th>Param.</th>
              <th>Pruebas</th>
              <th>Capac.</th>
              <th>Valid.</th>
              <th>Go-Live</th>
              <th>Responsable</th>
            </tr>
          </thead>
          <tbody>
            ${equipments.length === 0 ? '<tr><td colspan="9" style="text-align: center;">No hay equipos clínicos registrados en este proyecto.</td></tr>' : 
              equipments.map(eq => `
                <tr>
                  <td style="font-weight: bold;">${eq.name}</td>
                  <td>${eq.section}</td>
                  <td>${eq.levantamiento}</td>
                  <td>${eq.parametrizacion}</td>
                  <td>${eq.pruebas}</td>
                  <td>${eq.capacitacion}</td>
                  <td>${eq.validacion}</td>
                  <td>${eq.golive}</td>
                  <td>${eq.responsable}</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>

        <h2>5. REGISTRO DE GESTIÓN DE RIESGOS DE CIERRE</h2>
        <table>
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="width: 10%">ID</th>
              <th style="width: 40%">Descripción del Riesgo</th>
              <th style="width: 15%">Nivel</th>
              <th style="width: 20%">Responsable</th>
              <th style="width: 15%">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${(project?.risks || []).length === 0 ? '<tr><td colspan="5" style="text-align: center;">No se registraron riesgos para este proyecto.</td></tr>' : 
              (project?.risks || []).map((r: any) => `
                <tr>
                  <td>${r.indexId || ''}</td>
                  <td>${r.description}</td>
                  <td>${r.level} (Score: ${r.score})</td>
                  <td>${r.responsible || 'Sin Asignar'}</td>
                  <td><b>${r.status}</b></td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>

        <h2>6. LOG DE INCIDENTES OPERATIVOS</h2>
        <table>
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="width: 10%">ID</th>
              <th style="width: 20%">Recinto / Equipo</th>
              <th style="width: 40%">Descripción / Acción</th>
              <th style="width: 15%">Impacto</th>
              <th style="width: 15%">Estado</th>
            </tr>
          </thead>
          <tbody>
            ${projectIncidents.length === 0 ? '<tr><td colspan="5" style="text-align: center;">No se registraron incidentes en este proyecto.</td></tr>' : 
              projectIncidents.map((inc: any) => `
                <tr>
                  <td>I-${inc.indexId || ''}</td>
                  <td>${inc.recintoName}<br/><span style="font-size: 7.5pt; color: #555;">${inc.equipmentName}</span></td>
                  <td>${inc.descripcion}<br/><b>Acción:</b> ${inc.planDeAccion || 'No definida'}</td>
                  <td>${inc.impacto}</td>
                  <td><b>${inc.estado}</b></td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>

        <h2>7. ÍNDICE DE ENTREGABLES Y RESPALDOS (ANEXOS)</h2>
        <table>
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th>Nombre del Entregable</th>
              <th>Tipo</th>
              <th>Actividad Gantt</th>
              <th>Fecha de Carga</th>
            </tr>
          </thead>
          <tbody>
            ${attachments.length === 0 ? '<tr><td colspan="4" style="text-align: center;">No se han cargado entregables físicos en este proyecto.</td></tr>' : 
              attachments.map(att => `
                <tr>
                  <td>${att.name}</td>
                  <td>${att.type.toUpperCase()}</td>
                  <td>${att.taskName} (${att.phaseName})</td>
                  <td>${format(new Date(att.createdAt), 'dd/MM/yyyy')}</td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>

        ${sections.map((sec, idx) => `
          <h2>${idx + 8}. ${sec.title.toUpperCase()}</h2>
          <div class="text-block">${resolvePlaceholders(sec.content) || 'Sin contenido.'}</div>
        `).join('')}

        <h2>${sections.length + 8}. FIRMAS Y APROBACIONES</h2>
        <table class="sig-table">
          <tr>
            <td>
              <div class="sig-line"></div>
              <b>${project?.manager || 'Alejandra Cabrera'}</b><br/>
              <span class="sig-title">Director / PM del Proyecto</span><br/>
              ${signedByPm ? `<div class="stamp-box">✓ Firmado Digitalmente<br/>${signedByPm}</div>` : '<span style="font-size: 8pt; color: #999;">Pendiente de firma</span>'}
            </td>
            <td>
              <div class="sig-line"></div>
              <b>Sponsor Autorizado</b><br/>
              <span class="sig-title">Sponsor del Proyecto</span><br/>
              ${signedBySponsor ? `<div class="stamp-box">✓ Firmado Digitalmente<br/>${signedBySponsor}</div>` : '<span style="font-size: 8pt; color: #999;">Pendiente de firma</span>'}
            </td>
            <td>
              <div class="sig-line"></div>
              <b>PMO Responsable</b><br/>
              <span class="sig-title">Oficina de Gestión (PMO)</span><br/>
              ${signedByPmo ? `<div class="stamp-box">✓ Aprobado PMO Bupa<br/>${signedByPmo}</div>` : '<span style="font-size: 8pt; color: #999;">Pendiente de firma</span>'}
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Acta_Cierre_${project?.name?.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const formattedStart = project?.startDate ? format(new Date(project.startDate), 'dd/MM/yyyy') : '-';
    const formattedEnd = project?.endDate ? format(new Date(project.endDate), 'dd/MM/yyyy') : '-';
    const formattedGoLive = project?.goLiveDate ? format(new Date(project.goLiveDate), 'dd/MM/yyyy') : 'No programada';

    const wb = XLSX.utils.book_new();

    // Sheet 1: Acta general
    const dataActa = [
      [`ACTA DE CIERRE DE PROYECTO - ${recintoName.toUpperCase()}`],
      [],
      ['1. INFORMACIÓN GENERAL'],
      ['Nombre del Proyecto', project?.name || ''],
      ['ID del Proyecto', project?.id || ''],
      ['Director / PM', project?.manager || 'No asignado'],
      ['Sponsor del Proyecto', project?.sponsor || 'No asignado'],
      ['Área de Negocio', project?.area || 'Sin Área'],
      ['Tipo / Metodología', `${project?.type || 'Proyecto SCL'} / ${project?.methodology || 'Tradicional'}`],
      ['Fecha Inicio', formattedStart],
      ['Fecha Término Plan', formattedEnd],
      ['Fecha Go-Live', formattedGoLive],
      ['Estado de Avance', `${progress}% (Completado)`],
      ['Desviación Cronograma', `${project?.delayDays || 0} días`],
      [],
      ['2. DESEMPEÑO FINANCIERO'],
      ['Presupuesto Aprobado (CLP)', costSummary.totalBudget],
      ['Costo Real Ejecutado (CLP)', costSummary.totalExecuted],
      ['Desviación / Saldo (CLP)', costSummary.deviation]
    ];

    // Append dynamic sections to Sheet 1
    sections.forEach((sec, idx) => {
      dataActa.push(
        [],
        [`${idx + 3}. ${sec.title.toUpperCase()}`],
        [stripHtml(resolvePlaceholders(sec.content)) || 'Sin contenido.']
      );
    });

    // Append signatures at the end
    dataActa.push(
      [],
      [`${sections.length + 3}. FIRMAS Y APROBACIONES DIGITALES`],
      ['Firma Director / PM', signedByPm ? `Firmado: ${signedByPm}` : 'Pendiente'],
      ['Firma Sponsor', signedBySponsor ? `Firmado: ${signedBySponsor}` : 'Pendiente'],
      ['Firma PMO', signedByPmo ? `Firmado: ${signedByPmo}` : 'Pendiente']
    );

    const wsActa = XLSX.utils.aoa_to_sheet(dataActa);
    wsActa['!cols'] = [{ wch: 30 }, { wch: 60 }];
    XLSX.utils.book_append_sheet(wb, wsActa, 'Acta de Cierre');

    // Sheet 2: Cronograma Gantt
    const dataGantt = [
      ['RESUMEN DE ACTIVIDADES REALIZADAS (GANTT)'],
      [],
      ['WBS', 'Tipo', 'Fase / Actividad', 'Responsable', 'Inicio', 'Fin', 'Progreso', 'Estado']
    ];
    (project?.phases || []).forEach((ph: any) => {
      dataGantt.push([
        ph.wbsId || '', 
        'FASE', 
        ph.name, 
        '', 
        format(new Date(ph.startDate), 'dd/MM/yyyy'), 
        format(new Date(ph.endDate), 'dd/MM/yyyy'), 
        `${ph.progress}%`,
        'Completado'
      ]);
      ph.tasks.forEach((t: any) => {
        dataGantt.push([
          t.wbsId || '', 
          'TAREA', 
          t.name, 
          t.assignee || 'Sin Asignar', 
          format(new Date(t.startDate), 'dd/MM/yyyy'), 
          format(new Date(t.endDate), 'dd/MM/yyyy'), 
          `${t.progress}%`,
          t.status
        ]);
      });
    });
    const wsGantt = XLSX.utils.aoa_to_sheet(dataGantt);
    wsGantt['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 45 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsGantt, 'Cronograma WBS');

    // Sheet 3: Equipos Clínicos (6 Fases)
    const dataEquip = [
      ['SEGUIMIENTO DE EQUIPOS MÉDICOS (CICLO CLÍNICO GO-LIVE)'],
      [],
      ['Nombre del Equipo', 'Sección / Servicio', 'Levantamiento', 'Parametrización', 'Pruebas', 'Capacitación', 'Validación', 'Go Live', 'Responsable', 'Fecha Compromiso', 'Pendiente de', 'Observaciones']
    ];
    equipments.forEach(eq => {
      dataEquip.push([
        eq.name, 
        eq.section, 
        eq.levantamiento, 
        eq.parametrizacion, 
        eq.pruebas, 
        eq.capacitacion, 
        eq.validacion, 
        eq.golive, 
        eq.responsable, 
        eq.compromisoDate || '-', 
        eq.pendienteDe || '-', 
        eq.observaciones || ''
      ]);
    });
    const wsEquip = XLSX.utils.aoa_to_sheet(dataEquip);
    wsEquip['!cols'] = [
      { wch: 28 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, 
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 16 }, 
      { wch: 16 }, { wch: 35 }
    ];
    XLSX.utils.book_append_sheet(wb, wsEquip, 'Equipos Clínicos');

    // Sheet 4: Risks
    const dataRisks = [
      ['LOG DE GESTIÓN DE RIESGOS DE CIERRE'],
      [],
      ['ID Correlativo', 'Categoría', 'Descripción del Riesgo', 'Score (P x I)', 'Nivel de Riesgo', 'Plan de Mitigación', 'Responsable', 'Estado']
    ];
    (project?.risks || []).forEach((r: any) => {
      dataRisks.push([
        r.indexId || '',
        r.category || 'General',
        r.description,
        r.score || 0,
        r.level || 'Bajo',
        r.mitigationPlan || '',
        r.responsible || 'Sin Asignar',
        r.status
      ]);
    });
    const wsRisks = XLSX.utils.aoa_to_sheet(dataRisks);
    wsRisks['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 45 }, { wch: 12 }, { wch: 15 }, { wch: 40 }, { wch: 20 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsRisks, 'Riesgos del Proyecto');

    // Sheet 5: Incidents
    const dataInc = [
      ['REGISTRO DE INCIDENTES OPERATIVOS (GO-LIVE)'],
      [],
      ['ID Correlativo', 'Fecha', 'Recinto', 'Equipo Biomédico', 'Fase Afectada', 'Descripción del Incidente', 'Impacto', 'Responsable', 'Estado', 'Plan de Acción / Cierre', 'Fecha de Cierre']
    ];
    projectIncidents.forEach((inc: any) => {
      dataInc.push([
        inc.indexId || '',
        inc.fecha || '',
        inc.recintoName || '',
        inc.equipmentName || '',
        inc.faseAfectada || '',
        inc.descripcion || '',
        inc.impacto || 'Bajo',
        inc.responsable || 'Sin Asignar',
        inc.estado || 'Abierto',
        inc.planDeAccion || '',
        inc.fechaCierre || ''
      ]);
    });
    const wsInc = XLSX.utils.aoa_to_sheet(dataInc);
    wsInc['!cols'] = [
      { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, 
      { wch: 45 }, { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 40 }, 
      { wch: 12 }
    ];
    XLSX.utils.book_append_sheet(wb, wsInc, 'Incidentes de Cierre');

    // Sheet 6: Attachments
    const dataAtt = [
      ['ÍNDICE DE ENTREGABLES Y RESPALDOS (ANEXOS)'],
      [],
      ['Nombre del Archivo', 'Tipo', 'Actividad Gantt', 'Fase', 'Fecha de Carga']
    ];
    attachments.forEach(att => {
      dataAtt.push([att.name, att.type.toUpperCase(), att.taskName, att.phaseName, format(new Date(att.createdAt), 'dd/MM/yyyy')]);
    });
    const wsAtt = XLSX.utils.aoa_to_sheet(dataAtt);
    wsAtt['!cols'] = [{ wch: 40 }, { wch: 10 }, { wch: 35 }, { wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsAtt, 'Entregables');

    XLSX.writeFile(wb, `Acta_Cierre_${project?.name?.replace(/[^a-zA-Z0-9]/g, '_')}.xlsx`);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', gap: '8px' }}>
        <Loader2 className="animate-spin" size={24} color="#004B87" />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cargando Acta de Cierre...</span>
      </div>
    );
  }

  const isCompleted = progress === 100 || project?.status === 'Completado';
  const hasActiveRisks = (project?.risks || []).some((r: any) => r.status === 'Activo');
  const hasActiveIncidents = projectIncidents.some((inc: any) => inc.estado !== 'Cerrado');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
      
      {/* LOCKED ACT WARNING BANNER */}
      {isLocked && (
        <div className="no-print" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px', 
          background: 'rgba(13, 148, 136, 0.08)', 
          border: '1px solid #0d9488', 
          color: '#0d9488', 
          padding: '16px', 
          borderRadius: '8px', 
          fontSize: '0.85rem', 
          fontWeight: 600,
          boxShadow: '0 2px 10px rgba(13,148,136,0.05)'
        }}>
          <ShieldAlert size={20} />
          <div>
            <strong style={{ display: 'block', fontSize: '0.9rem', marginBottom: '2px' }}>🔒 Documento Aprobado y Bloqueado</strong>
            Esta acta de cierre ha sido firmada digitalmente por el PM, Sponsor y PMO. Está cerrada para modificaciones.
          </div>
          <button 
            type="button"
            onClick={handleUnlockAct} 
            style={{ 
              marginLeft: 'auto', 
              background: 'transparent', 
              border: '1px solid #0d9488', 
              color: '#0d9488', 
              borderRadius: '6px', 
              padding: '6px 12px', 
              fontSize: '0.75rem', 
              cursor: 'pointer', 
              fontWeight: 700,
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#0d9488';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = '#0d9488';
            }}
          >
            Destrabar Acta (Deshacer Firmas)
          </button>
        </div>
      )}

      {/* Action panel (buttons) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={20} color="#004B87" />
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Gestor de Acta de Cierre</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Configure, firme y exporte el acta de cierre oficial del proyecto.
              {updatedAt && (
                <span style={{ display: 'inline-block', marginLeft: '12px', fontSize: '0.75rem', color: '#0079C1', fontWeight: 600 }}>
                  ⏱️ Último guardado: {format(new Date(updatedAt), 'dd/MM/yyyy HH:mm')}
                </span>
              )}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {!isLocked && (
            <button 
              onClick={handleResetAct} 
              className="btn btn-secondary" 
              style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '10px 16px', cursor: 'pointer', border: '1px solid var(--border-subtle)' }}
              title="Restaurar textos PMO por defecto y borrar personalizaciones"
            >
              Reiniciar Acta
            </button>
          )}
          {!isLocked && (
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="btn btn-primary" 
              style={{ background: '#004B87', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '10px 16px' }}
            >
              <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Acta'}
            </button>
          )}
          <button 
            onClick={handlePrintPDF} 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '10px 16px' }}
          >
            <Printer size={16} /> Imprimir / PDF
          </button>
          <button 
            onClick={handleExportWord} 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '10px 16px' }}
          >
            <FileDown size={16} /> Exportar Word
          </button>
          <button 
            onClick={handleExportExcel} 
            className="btn btn-secondary" 
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '10px 16px' }}
          >
            <FileSpreadsheet size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Warnings & Alerts */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {!isCompleted && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(245, 158, 11, 0.08)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.15)', color: 'var(--accent-warning)', fontSize: '0.85rem' }}>
            <ShieldAlert size={18} />
            <span><strong>Nota PMO:</strong> Este proyecto se encuentra al {progress}% de avance. El Acta de Cierre se puede configurar, pero se recomienda la firma oficial una vez alcanzado el 100% de cumplimiento en Gantt.</span>
          </div>
        )}
        
        {hasActiveRisks && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239, 68, 68, 0.06)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#e11d48', fontSize: '0.85rem' }}>
            <AlertTriangle size={18} />
            <span><strong>Alerta de Cierre:</strong> Existen riesgos marcados como <strong>Activos</strong> en la matriz. Se aconseja resolverlos o transferirlos formalmente a soporte antes de cerrar.</span>
          </div>
        )}

        {hasActiveIncidents && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(239, 68, 68, 0.06)', padding: '12px 14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.15)', color: '#e11d48', fontSize: '0.85rem' }}>
            <AlertCircle size={18} />
            <span><strong>Alerta de Incidentes:</strong> Existen incidentes operativos sin cerrar. Se deben registrar los planes de acción o fechas de cierre.</span>
          </div>
        )}
      </div>

      {/* Main Printable Document Layout */}
      <div id="closure-act-document" className="closure-act-print-container" style={{ background: 'var(--bg-secondary)', padding: '40px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--panel-shadow)', display: 'flex', flexDirection: 'column', gap: '30px' }}>
        
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid #004B87', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(0, 75, 135, 0.08)', color: '#004B87', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={30} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#004B87', letterSpacing: '0.5px' }}>ACTA DE CIERRE DE PROYECTO</h1>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{recintoName}</span>
            </div>
          </div>
          <div style={{ padding: '6px 12px', borderRadius: '20px', background: isCompleted ? '#e6f4f1' : '#fef3c7', color: isCompleted ? '#0d9488' : '#b45309', fontWeight: 800, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle size={14} /> {isCompleted ? 'ENTREGA 100% COMPLETADA' : 'PROYECTO EN EJECUCIÓN'}
          </div>
        </div>

        {/* SECTION 1: GENERAL INFO */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#004B87', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '6px', marginTop: 0, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>1. Información General del Proyecto</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Nombre del Proyecto</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>{project?.name || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>ID / Código</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{project?.id || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Director / PM</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>{project?.manager || 'No asignado'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Sponsor del Proyecto</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>{project?.sponsor || 'No asignado'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Área de Negocio</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>{project?.area || 'Sin Área'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Tipo / Metodología</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>{project?.type || 'Proyecto SCL'} / {project?.methodology || 'Tradicional'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Plazo Planificado</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800 }}>
                {project?.startDate ? format(new Date(project.startDate), 'dd MMM yyyy', { locale: es }) : ''} — {project?.endDate ? format(new Date(project.endDate), 'dd MMM yyyy', { locale: es }) : ''}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Fecha Real de Salida (Go-Live)</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: project?.goLiveDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {project?.goLiveDate ? format(new Date(project.goLiveDate), 'dd MMM yyyy', { locale: es }) : 'No programada'}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: EXECUTIVE SEMAPHORES */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#004B87', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>2. Semáforos Ejecutivos de Cierre</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
            
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-tertiary)' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: semaphores.timeStatus === 'green' ? '#10b981' : '#ef4444', boxShadow: semaphores.timeStatus === 'green' ? '0 0 8px rgba(16,185,129,0.5)' : '0 0 8px rgba(239,68,68,0.5)' }} />
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Plazo y Cronograma</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                  {project?.delayDays && project.delayDays > 0 ? `Desviación (+${project.delayDays}d)` : 'A Tiempo / Completado'}
                </span>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-tertiary)' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: semaphores.costStatus === 'green' ? '#10b981' : '#ef4444', boxShadow: semaphores.costStatus === 'green' ? '0 0 8px rgba(16,185,129,0.5)' : '0 0 8px rgba(239,68,68,0.5)' }} />
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Desempeño Costos</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                  {semaphores.costStatus === 'green' ? 'Bajo Presupuesto' : 'Sobre-ejecución'}
                </span>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-tertiary)' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: semaphores.riskStatus === 'green' ? '#10b981' : '#ef4444', boxShadow: semaphores.riskStatus === 'green' ? '0 0 8px rgba(16,185,129,0.5)' : '0 0 8px rgba(239,68,68,0.5)' }} />
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gestión de Riesgos</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                  {semaphores.riskStatus === 'green' ? 'Riesgos Mitigados' : 'Riesgos Pendientes'}
                </span>
              </div>
            </div>

            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px', display: 'flex', alignItems: 'center', gap: '14px', background: 'var(--bg-tertiary)' }}>
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: semaphores.incidentStatus === 'green' ? '#10b981' : '#ef4444', boxShadow: semaphores.incidentStatus === 'green' ? '0 0 8px rgba(16,185,129,0.5)' : '0 0 8px rgba(239,68,68,0.5)' }} />
              <div>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 800, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Incidentes Go-Live</span>
                <span style={{ fontSize: '0.82rem', fontWeight: 800 }}>
                  {semaphores.incidentStatus === 'green' ? 'Incidentes Cerrados' : 'Incidentes Activos'}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* SECTION 3: FINANCIAL SUMMARY */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#004B87', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>3. Desempeño Financiero (Consolidado)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><DollarSign size={12} /> Presupuesto Aprobado</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#004B87' }}>
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(costSummary.totalBudget)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Activity size={12} /> Costo Real Ejecutado</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(costSummary.totalExecuted)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}><Info size={12} /> Desviación / Saldo</div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900, color: costSummary.deviation >= 0 ? '#0d9488' : '#ef4444' }}>
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(costSummary.deviation)}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: GANTT SUMMARY & LIST */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '6px', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#004B87', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>4. Resumen de Actividades Realizadas (Gantt)</h3>
            <span className="no-print" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              Tareas: {ganttStats.total} | Completadas: <span style={{ color: '#0d9488', fontWeight: 700 }}>{ganttStats.completed}</span> | En Progreso: <span style={{ color: '#d97706', fontWeight: 700 }}>{ganttStats.inProgress}</span> | Pendientes: <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{ganttStats.pending}</span>
            </span>
          </div>

          <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '8px 12px', width: '12%' }}>WBS</th>
                  <th style={{ padding: '8px 12px', width: '50%' }}>Fase / Actividad</th>
                  <th style={{ padding: '8px 12px', width: '23%' }}>Responsable</th>
                  <th style={{ padding: '8px 12px', width: '15%', textAlign: 'center' }}>Progreso</th>
                </tr>
              </thead>
              <tbody>
                {(project?.phases || []).map((ph: any) => (
                  <React.Fragment key={ph.id}>
                    <tr style={{ background: 'rgba(0, 75, 135, 0.04)', fontWeight: 700, borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '8px 12px' }}>{ph.wbsId || ''}</td>
                      <td style={{ padding: '8px 12px', color: '#004B87' }}>{ph.name}</td>
                      <td style={{ padding: '8px 12px' }}>--</td>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <span style={{ color: '#0d9488', fontWeight: 800 }}>{ph.progress}%</span>
                      </td>
                    </tr>
                    {ph.tasks.map((t: any) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '6px 12px', paddingLeft: '20px', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{t.wbsId || ''}</td>
                        <td style={{ padding: '6px 12px', paddingLeft: '24px' }}>{t.name}</td>
                        <td style={{ padding: '6px 12px', color: 'var(--text-secondary)' }}>{t.assignee || 'Sin Asignar'}</td>
                        <td style={{ padding: '6px 12px', textAlign: 'center' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: t.progress === 100 ? 700 : 500,
                            color: t.progress === 100 ? '#0d9488' : t.progress > 0 ? '#d97706' : 'var(--text-muted)'
                          }}>
                            {t.progress}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 5: CLINICAL EQUIPMENTS GO-LIVE STATUS */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#004B87', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>5. Equipos Médicos y Estado de Go-Live (6 Fases Clínicas)</h3>
          <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '8px 12px', width: '22%' }}>Equipo Biomédico</th>
                  <th style={{ padding: '8px 8px', width: '12%' }}>Sección</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', width: '9%' }}>Levant.</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', width: '9%' }}>Param.</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', width: '9%' }}>Pruebas</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', width: '9%' }}>Capac.</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', width: '9%' }}>Valid.</th>
                  <th style={{ padding: '8px 6px', textAlign: 'center', width: '9%' }}>Go-Live</th>
                  <th style={{ padding: '8px 12px', width: '13%' }}>Responsable</th>
                </tr>
              </thead>
              <tbody>
                {equipments.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No hay equipos clínicos configurados en este proyecto.</td>
                  </tr>
                ) : (
                  equipments.map((eq: any) => {
                    const renderStageBadge = (val: string) => {
                      const isCompleted = val === 'Completado';
                      const isInProgress = val === 'En proceso' || val === 'En progreso';
                      const bg = isCompleted ? '#e6f4f1' : isInProgress ? '#fef3c7' : '#f1f5f9';
                      const fg = isCompleted ? '#0d9488' : isInProgress ? '#d97706' : '#64748b';
                      const label = isCompleted ? 'Completado' : isInProgress ? 'En Proc' : 'No Inic';
                      return (
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 700, 
                          padding: '2px 6px', 
                          borderRadius: '8px', 
                          background: bg, 
                          color: fg,
                          display: 'inline-block',
                          width: '68px',
                          textAlign: 'center'
                        }}>
                          {label}
                        </span>
                      );
                    };

                    return (
                      <tr key={eq.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{eq.name}</div>
                          {eq.pendienteDe && (
                            <div className="no-print" style={{ fontSize: '0.7rem', color: '#e11d48', marginTop: '2px' }}>
                              <strong>Pendiente:</strong> {eq.pendienteDe}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 8px', color: 'var(--text-secondary)' }}>{eq.section}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>{renderStageBadge(eq.levantamiento)}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>{renderStageBadge(eq.parametrizacion)}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>{renderStageBadge(eq.pruebas)}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>{renderStageBadge(eq.capacitacion)}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>{renderStageBadge(eq.validacion)}</td>
                        <td style={{ padding: '8px 6px', textAlign: 'center' }}>{renderStageBadge(eq.golive)}</td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{eq.responsable}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 6: CLOSURE RISKS MATRIX */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#004B87', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>6. Matriz de Cierre de Riesgos</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '8px 12px', width: '10%' }}>ID</th>
                  <th style={{ padding: '8px 12px', width: '45%' }}>Descripción del Riesgo</th>
                  <th style={{ padding: '8px 12px', width: '15%' }}>Severidad</th>
                  <th style={{ padding: '8px 12px', width: '15%' }}>Responsable</th>
                  <th style={{ padding: '8px 12px', width: '15%', textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {(project?.risks || []).length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No se registraron riesgos asociados a este proyecto.</td>
                  </tr>
                ) : (
                  (project.risks || []).map((r: any) => {
                    const isMitigated = r.status === 'Mitigado' || r.status === 'Cerrado';
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'monospace' }}>{r.indexId || 'R-xx'}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <div>{r.description}</div>
                          {r.mitigationPlan && <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}><strong>Mitigación:</strong> {r.mitigationPlan}</div>}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ 
                            color: r.level === 'Crítico' || r.level === 'Alto' ? '#e11d48' : r.level === 'Medio' ? '#d97706' : '#0d9488',
                            fontWeight: 700 
                          }}>
                            {r.level} <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>(Score: {r.score})</span>
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{r.responsible || 'Sin Asignar'}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 700, 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            background: isMitigated ? '#e6f4f1' : '#fecdd3', 
                            color: isMitigated ? '#0d9488' : '#e11d48' 
                          }}>
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 7: INCIDENTS LOG */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#004B87', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>7. Registro de Incidentes Operativos</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '8px 12px', width: '10%' }}>ID</th>
                  <th style={{ padding: '8px 12px', width: '22%' }}>Recinto / Analizador</th>
                  <th style={{ padding: '8px 12px', width: '43%' }}>Descripción y Plan de Acción</th>
                  <th style={{ padding: '8px 12px', width: '10%' }}>Impacto</th>
                  <th style={{ padding: '8px 12px', width: '15%', textAlign: 'center' }}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {projectIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No se registraron incidentes en este proyecto.</td>
                  </tr>
                ) : (
                  projectIncidents.map((inc: any) => {
                    const isClosed = inc.estado === 'Cerrado';
                    return (
                      <tr key={inc.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 700, fontFamily: 'monospace' }}>I-{inc.indexId}</td>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ fontWeight: 600 }}>{inc.recintoName}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{inc.equipmentName}</div>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <div>{inc.descripcion}</div>
                          {inc.planDeAccion && (
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                              <strong>Acción:</strong> {inc.planDeAccion}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <span style={{ 
                            color: inc.impacto === 'Crítico' || inc.impacto === 'Alto' ? '#e11d48' : inc.impacto === 'Medio' ? '#d97706' : '#0d9488',
                            fontWeight: 700 
                          }}>
                            {inc.impacto}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span style={{ 
                            fontSize: '0.7rem', 
                            fontWeight: 700, 
                            padding: '2px 8px', 
                            borderRadius: '12px', 
                            background: isClosed ? '#e6f4f1' : '#fef3c7', 
                            color: isClosed ? '#0d9488' : '#d97706' 
                          }}>
                            {inc.estado}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 8: ATTACHMENTS */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#004B87', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>8. Índice de Entregables y Evidencias (Anexos)</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-tertiary)', borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 10 }}>
                  <th style={{ padding: '8px 12px' }}>Nombre del Documento</th>
                  <th style={{ padding: '8px 12px', width: '10%' }}>Tipo</th>
                  <th style={{ padding: '8px 12px', width: '45%' }}>Actividad Gantt Asociada</th>
                  <th style={{ padding: '8px 12px', width: '15%' }}>Fecha Carga</th>
                </tr>
              </thead>
              <tbody>
                {attachments.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No se han cargado respaldos físicos en este proyecto.</td>
                  </tr>
                ) : (
                  attachments.map((att: any) => (
                    <tr key={att.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                        <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: '#004B87' }} title="Click para abrir">
                          {att.name}
                        </a>
                      </td>
                      <td style={{ padding: '8px 12px', textTransform: 'uppercase', color: 'var(--text-muted)', fontSize: '0.7rem' }}>{att.type}</td>
                      <td style={{ padding: '8px 12px' }}>{att.taskName} <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>({att.phaseName})</span></td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>{format(new Date(att.createdAt), 'dd/MM/yyyy')}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DYNAMIC SECTIONS LIST (PREDEFINED & CUSTOM) */}
        {sections.map((sec, index) => (
          <div key={sec.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginTop: '16px' }}>
              
              {/* Title with inline edit */}
              {editingSectionId === sec.id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#004B87' }}>{index + 9}.</span>
                  <input
                    type="text"
                    value={tempSectionTitle}
                    onChange={(e) => setTempSectionTitle(e.currentTarget.value)}
                    onBlur={() => saveSectionTitle(sec.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveSectionTitle(sec.id);
                      if (e.key === 'Escape') setEditingSectionId(null);
                    }}
                    autoFocus
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: 800,
                      color: '#004B87',
                      border: '1px solid #0079C1',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      outline: 'none',
                      background: 'var(--bg-primary)'
                    }}
                  />
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3 
                    onDoubleClick={() => startEditingTitle(sec.id, sec.title)}
                    style={{ fontSize: '0.95rem', fontWeight: 800, color: '#004B87', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px', cursor: isLocked ? 'default' : 'pointer' }}
                    title={isLocked ? "" : "Doble clic para renombrar"}
                  >
                    {index + 9}. {sec.title}
                  </h3>
                  {!isLocked && (
                    <button
                      type="button"
                      onClick={() => startEditingTitle(sec.id, sec.title)}
                      className="no-print"
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px', display: 'flex', alignItems: 'center' }}
                      title="Renombrar sección"
                    >
                      <Edit2 size={13} />
                    </button>
                  )}
                </div>
              )}

              {/* Actions (Reorder & Delete) */}
              {!isLocked && (
                <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ display: 'flex', gap: '2px' }}>
                    <button
                      type="button"
                      onClick={() => handleMoveSectionUp(index)}
                      disabled={index === 0}
                      style={{
                        padding: '4px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        cursor: index === 0 ? 'not-allowed' : 'pointer',
                        opacity: index === 0 ? 0.4 : 1,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Subir sección"
                    >
                      <ChevronUp size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveSectionDown(index)}
                      disabled={index === sections.length - 1}
                      style={{
                        padding: '4px',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        cursor: index === sections.length - 1 ? 'not-allowed' : 'pointer',
                        opacity: index === sections.length - 1 ? 0.4 : 1,
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                      title="Bajar sección"
                    >
                      <ChevronDown size={13} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveSection(sec.id)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '4px', 
                      padding: '4px 10px', 
                      fontSize: '0.72rem', 
                      background: '#fecdd3', 
                      color: '#e11d48', 
                      border: '1px solid rgba(225,29,72,0.15)', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontWeight: 700 
                    }}
                    title={sec.type === 'predefined' ? "Eliminar sección predefinida" : "Eliminar sección personalizada"}
                  >
                    <Trash2 size={13} /> Eliminar Sección
                  </button>
                </div>
              )}

            </div>
            
            {sec.type === 'predefined' && predefinedDescriptions[sec.id] && (
              <div className="no-print" style={{ marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {predefinedDescriptions[sec.id]}
              </div>
            )}
            
            <div className="no-print" style={{ marginTop: '4px' }}>
              <RichTextEditor 
                value={sec.content} 
                onChange={(val) => handleUpdateSectionContent(sec.id, val)} 
                placeholder={`Escriba el contenido para la sección ${sec.title}...`} 
                readOnly={isLocked}
              />
            </div>
            <div className="print-only-text" style={{ display: 'none', fontSize: '0.85rem', lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: resolvePlaceholders(sec.content) || 'Sin contenido.' }} />
          </div>
        ))}

        {/* RESTORE PREDEFINED SECTIONS & ADD SECTION BUTTONS */}
        {!isLocked && (
          <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '20px', border: '1px dashed var(--border-subtle)', borderRadius: '8px', padding: '20px', background: 'var(--bg-tertiary)' }}>
            {missingPredefined.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Restaurar Secciones Predefinidas:</span>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {missingPredefined.map(sec => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => handleRestorePredefinedSection(sec.id)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.75rem',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: 'var(--text-primary)',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <Plus size={12} /> {sec.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
              <button
                type="button"
                onClick={handleAddCustomSection}
                className="btn"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  fontSize: '0.82rem', 
                  padding: '10px 20px', 
                  background: 'transparent',
                  border: '2px dashed #004B87', 
                  color: '#004B87', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 700 
                }}
              >
                <Plus size={15} /> Agregar Sección Personalizada
              </button>
            </div>
          </div>
        )}

        {/* SECTION 13/LATEST: APPROVALS & SIGNATURES */}
        <div>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#004B87', borderBottom: '1.5px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {sections.length + 9}. Firmas de Cierre y Aprobación
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '10px' }}>
            
            {/* PM Signature Box */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', minHeight: '150px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, display: 'block', color: 'var(--text-primary)' }}>{project?.manager || 'Alejandra Cabrera'}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px', fontWeight: 600, textTransform: 'uppercase' }}>Director / PM de Proyecto</span>
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '12px', zIndex: 2 }}>
                {signedByPm ? (
                  <div style={{ fontSize: '0.72rem', color: '#0d9488', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(13,148,136,0.2)' }}>
                    <CheckCircle2 size={14} /> FIRMADO
                  </div>
                ) : (
                  <button 
                    onClick={() => toggleSignature('pm')} 
                    className="no-print btn" 
                    style={{ padding: '8px 14px', fontSize: '0.75rem', background: '#004B87', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Firmar PM
                  </button>
                )}
                {!signedByPm && <span className="print-only-line" style={{ display: 'none', borderTop: '1px solid #999', width: '80%', marginTop: '30px' }}></span>}
              </div>
              
              {/* Visual Stamp Overlay */}
              {signedByPm && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  border: '3px double #0d9488',
                  color: '#0d9488',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  transform: 'rotate(-8deg)',
                  background: 'rgba(13, 148, 136, 0.04)',
                  letterSpacing: '1px',
                  pointerEvents: 'none',
                  textAlign: 'center',
                  lineHeight: 1.2
                }}>
                  ✓ Aprobado Bupa<br/>
                  <span style={{ fontSize: '0.52rem', fontWeight: 500 }}>{signedByPm.split(' ')[0]}</span><br/>
                  <span style={{ fontSize: '0.48rem', color: 'var(--text-muted)' }}>{signedByPm.substring(signedByPm.indexOf('(') + 1, signedByPm.length - 1)}</span>
                </div>
              )}
            </div>

            {/* Sponsor Signature Box */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', minHeight: '150px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, display: 'block', color: 'var(--text-primary)' }}>{project?.sponsor || 'Sponsor Autorizado'}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px', fontWeight: 600, textTransform: 'uppercase' }}>Sponsor del Proyecto</span>
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '12px', zIndex: 2 }}>
                {signedBySponsor ? (
                  <div style={{ fontSize: '0.72rem', color: '#0d9488', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(13,148,136,0.2)' }}>
                    <CheckCircle2 size={14} /> FIRMADO
                  </div>
                ) : (
                  <button 
                    onClick={() => toggleSignature('sponsor')} 
                    className="no-print btn" 
                    style={{ padding: '8px 14px', fontSize: '0.75rem', background: '#004B87', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Firmar Sponsor
                  </button>
                )}
                {!signedBySponsor && <span className="print-only-line" style={{ display: 'none', borderTop: '1px solid #999', width: '80%', marginTop: '30px' }}></span>}
              </div>

              {/* Visual Stamp Overlay */}
              {signedBySponsor && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  border: '3px double #0d9488',
                  color: '#0d9488',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  transform: 'rotate(-8deg)',
                  background: 'rgba(13, 148, 136, 0.04)',
                  letterSpacing: '1px',
                  pointerEvents: 'none',
                  textAlign: 'center',
                  lineHeight: 1.2
                }}>
                  ✓ Aprobado Sponsor<br/>
                  <span style={{ fontSize: '0.52rem', fontWeight: 500 }}>{signedBySponsor.split(' ')[0]}</span><br/>
                  <span style={{ fontSize: '0.48rem', color: 'var(--text-muted)' }}>{signedBySponsor.substring(signedBySponsor.indexOf('(') + 1, signedBySponsor.length - 1)}</span>
                </div>
              )}
            </div>

            {/* PMO Signature Box */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', minHeight: '150px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, display: 'block', color: 'var(--text-primary)' }}>Oficina PMO</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px', fontWeight: 600, textTransform: 'uppercase' }}>Representante PMO Bupa</span>
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '12px', zIndex: 2 }}>
                {signedByPmo ? (
                  <div style={{ fontSize: '0.72rem', color: '#0d9488', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-primary)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(13,148,136,0.2)' }}>
                    <CheckCircle2 size={14} /> VALIDADO
                  </div>
                ) : (
                  <button 
                    onClick={() => toggleSignature('pmo')} 
                    className="no-print btn" 
                    style={{ padding: '8px 14px', fontSize: '0.75rem', background: '#004B87', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 700 }}
                  >
                    Firmar PMO
                  </button>
                )}
                {!signedByPmo && <span className="print-only-line" style={{ display: 'none', borderTop: '1px solid #999', width: '80%', marginTop: '30px' }}></span>}
              </div>

              {/* Visual Stamp Overlay */}
              {signedByPmo && (
                <div style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  border: '3px double #0d9488',
                  color: '#0d9488',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.58rem',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  transform: 'rotate(-8deg)',
                  background: 'rgba(13, 148, 136, 0.04)',
                  letterSpacing: '1px',
                  pointerEvents: 'none',
                  textAlign: 'center',
                  lineHeight: 1.2
                }}>
                  ✓ PMO ACEPTADO<br/>
                  <span style={{ fontSize: '0.52rem', fontWeight: 500 }}>{signedByPmo.split(' ')[0]}</span><br/>
                  <span style={{ fontSize: '0.48rem', color: 'var(--text-muted)' }}>{signedByPmo.substring(signedByPmo.indexOf('(') + 1, signedByPmo.length - 1)}</span>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          html, body, #__next, [class*="layout"], [class*="wrapper"], [class*="container"], main, section {
            height: auto !important;
            min-height: 0 !important;
            overflow: visible !important;
            position: static !important;
          }
          body * {
            visibility: hidden;
          }
          #closure-act-document, #closure-act-document * {
            visibility: visible;
          }
          #closure-act-document {
            position: absolute !important;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
            height: auto !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          .act-textarea {
            display: none !important;
          }
          .print-only-text {
            display: block !important;
            padding: 8px 12px;
            background: #fafafa !important;
            border-left: 3px solid #004B87 !important;
            color: #333 !important;
            border-radius: 4px;
          }
          .print-only-line {
            display: block !important;
          }
        }
      `}} />
    </div>
  );
}
