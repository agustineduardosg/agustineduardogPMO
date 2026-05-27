"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useEquipmentStore, ClinicalEquipment } from '@/store/equipmentStore';
import { useProjectStore } from '@/store/projectStore';
import { X, FileSpreadsheet, Printer, TrendingUp, Layers, CheckCircle2, RefreshCw, BarChart3, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportViewerProps {
  isOpen: boolean;
  onClose: () => void;
  filterProjectId?: string; // Filtro de proyecto activo
}

export default function ReportViewer({ isOpen, onClose, filterProjectId = 'all' }: ReportViewerProps) {
  const recintos = useEquipmentStore(state => state.recintos);
  const equipments = useEquipmentStore(state => state.equipments);
  const projects = useProjectStore(state => state.projects);
  const fetchEquipmentData = useEquipmentStore(state => state.fetchEquipmentData);
  const fetchProjects = useProjectStore(state => state.fetchProjects);

  // Columnas personalizadas y del sistema cargadas de localStorage para mantener sincronía
  const [defaultColNames, setDefaultColNames] = useState<Record<string, string>>({
    name: 'Equipo Biomédico',
    section: 'Sección',
    levantamiento: 'Levantamiento',
    parametrizacion: 'Parametrización',
    pruebas: 'Pruebas',
    capacitacion: 'Capacitación',
    validacion: 'Validación',
    golive: 'Go-live',
    responsable: 'Responsable',
    compromisoDate: 'F. Compromiso',
    observaciones: 'Observaciones / Historial',
    pendienteDe: 'Pendiente de'
  });
  const [hiddenDefaultCols, setHiddenDefaultCols] = useState<string[]>([]);
  const [customColumns, setCustomColumns] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchEquipmentData();
      fetchProjects();

      // Cargar configuraciones de columnas
      const savedDefaultNames = localStorage.getItem('default_cols_names_equipments');
      if (savedDefaultNames) {
        try {
          setDefaultColNames(prev => ({ ...prev, ...JSON.parse(savedDefaultNames) }));
        } catch (e) {
          console.error(e);
        }
      }
      const savedHiddenCols = localStorage.getItem('hidden_cols_equipments');
      if (savedHiddenCols) {
        try {
          setHiddenDefaultCols(JSON.parse(savedHiddenCols));
        } catch (e) {
          console.error(e);
        }
      }
      const savedCustomCols = localStorage.getItem('custom_cols_equipments');
      if (savedCustomCols) {
        try {
          setCustomColumns(JSON.parse(savedCustomCols));
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [isOpen]);

  // Proyecto seleccionado
  const selectedProject = useMemo(() => {
    if (filterProjectId === 'all' || filterProjectId === 'none') return null;
    return projects.find(p => p.id === filterProjectId) || null;
  }, [projects, filterProjectId]);

  // Equipos filtrados por el proyecto seleccionado
  const reportEquipments = useMemo(() => {
    return equipments.filter(eq => {
      if (filterProjectId === 'all') return true;
      if (filterProjectId === 'none') return !eq.projectId;
      return eq.projectId === filterProjectId;
    });
  }, [equipments, filterProjectId]);

  // Recintos que tienen equipos en este proyecto
  const reportRecintos = useMemo(() => {
    const activeRecintoIds = new Set(reportEquipments.map(e => e.recintoId));
    return recintos.filter(r => r.isActive && activeRecintoIds.has(r.id));
  }, [recintos, reportEquipments]);

  // Estadísticas y porcentajes calculados del reporte
  const reportStats = useMemo(() => {
    const total = reportEquipments.length;
    if (total === 0) return { completion: 0, completedCount: 0, progressCount: 0, notStartedCount: 0, totalActivePhases: 0 };

    let totalActivePhases = 0;
    let weightedCompletionSum = 0;
    let progressCount = 0;
    let completedCount = 0;
    let notStartedCount = 0;

    reportEquipments.forEach(eq => {
      const phasesList = [
        { key: 'levantamiento', val: eq.levantamiento },
        { key: 'parametrizacion', val: eq.parametrizacion },
        { key: 'pruebas', val: eq.pruebas },
        { key: 'capacitacion', val: eq.capacitacion },
        { key: 'validacion', val: eq.validacion },
        { key: 'golive', val: eq.golive }
      ];

      phasesList.forEach(ph => {
        if (hiddenDefaultCols.includes(ph.key)) return;

        const p = ph.val;
        if (p === 'Descartado' || p === 'Desestimado') return;

        totalActivePhases++;
        if (p === 'Completado') {
          weightedCompletionSum += 1.0;
          completedCount++;
        } else if (p === 'En progreso') {
          weightedCompletionSum += 0.5;
          progressCount++;
        } else {
          notStartedCount++;
        }
      });
    });

    const completion = totalActivePhases === 0 ? 100 : Math.round((weightedCompletionSum / totalActivePhases) * 100);

    return {
      completion,
      completedCount,
      progressCount,
      notStartedCount,
      totalActivePhases
    };
  }, [reportEquipments, hiddenDefaultCols]);

  // Avance específico por Recinto en este reporte
  const recintoProgressList = useMemo(() => {
    return reportRecintos.map(recinto => {
      const recintoEquips = reportEquipments.filter(e => e.recintoId === recinto.id);
      
      let totalActivePhases = 0;
      let weightedCompletionSum = 0;
      let completedCount = 0;

      recintoEquips.forEach(eq => {
        const phasesList = [
          { key: 'levantamiento', val: eq.levantamiento },
          { key: 'parametrizacion', val: eq.parametrizacion },
          { key: 'pruebas', val: eq.pruebas },
          { key: 'capacitacion', val: eq.capacitacion },
          { key: 'validacion', val: eq.validacion },
          { key: 'golive', val: eq.golive }
        ];

        phasesList.forEach(ph => {
          if (hiddenDefaultCols.includes(ph.key)) return;

          const p = ph.val;
          if (p === 'Descartado' || p === 'Desestimado') return;

          totalActivePhases++;
          if (p === 'Completado') {
            weightedCompletionSum += 1.0;
            completedCount++;
          } else if (p === 'En progreso') {
            weightedCompletionSum += 0.5;
          }
        });
      });

      const completion = totalActivePhases === 0 ? 100 : Math.round((weightedCompletionSum / totalActivePhases) * 100);

      return {
        ...recinto,
        equipmentsCount: recintoEquips.length,
        completion,
        completedCount
      };
    });
  }, [reportRecintos, reportEquipments, hiddenDefaultCols]);

  // Exportar a Excel Formateado
  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();

    // 1. Hoja de Resumen Ejecutivo
    const summaryData = [
      ["INFORME EJECUTIVO DE MONITOREO DE EQUIPAMIENTO CLÍNICO"],
      ["BUPA CHILE - DIRECCIÓN DE PROYECTOS Y TECNOLOGÍA"],
      [],
      ["Fecha de Reporte:", new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })],
      ["Proyecto de Origen:", selectedProject?.name || (filterProjectId === 'none' ? 'Equipos sin Proyecto Asociado' : 'Todos los Proyectos')],
      ["Área / Unidad:", selectedProject?.area || 'N/A'],
      ["Director / PM responsable:", selectedProject?.manager || 'Sin asignar'],
      ["Rango de Proyecto:", selectedProject ? `${new Date(selectedProject.startDate).toLocaleDateString()} al ${new Date(selectedProject.endDate).toLocaleDateString()}` : 'N/A'],
      [],
      ["INDICADORES CLAVE DE RENDIMIENTO (KPIs) DE IMPLEMENTACIÓN"],
      ["Métrica", "Valor", "Detalle"],
      ["Avance de Implementación Global (Promedio)", `${reportStats.completion}%`, "Ponderación porcentual de hitos completados y en progreso."],
      ["Total de Sodes Clínicas (Recintos)", reportRecintos.length, "Número de sedes prestadoras evaluadas en este reporte."],
      ["Total de Equipos Biomédicos Monitoreados", reportEquipments.length, "Cantidad total de equipamiento médico físico mapeado."],
      ["Hitos de Calibración Completados", reportStats.completedCount, "Acciones marcadas al 100% de éxito."],
      ["Hitos de Calibración En Progreso", reportStats.progressCount, "Procesos de calibración, pruebas o validación activos."],
      [],
      ["PORCENTAJE DE AVANCE DETALLADO POR SEDE CLÍNICA"],
      ["Código Sede", "Nombre del Recinto", "Equipos Mapeados", "Avance de Implementación"]
    ];

    recintoProgressList.forEach(r => {
      summaryData.push([r.code, r.name, r.equipmentsCount, `${r.completion}%`]);
    });

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Ejecutivo");

    // 2. Hoja de Detalle de Equipos
    const headers = ["Recinto", "Código Sede"];
    const colKeys: string[] = [];

    if (!hiddenDefaultCols.includes('name')) {
      headers.push(defaultColNames.name);
      colKeys.push('name');
    }
    if (!hiddenDefaultCols.includes('section')) {
      headers.push(defaultColNames.section);
      colKeys.push('section');
    }
    headers.push("Proyecto Asociado");

    const phasesKeys = ['levantamiento', 'parametrizacion', 'pruebas', 'capacitacion', 'validacion', 'golive'];
    phasesKeys.forEach(k => {
      if (!hiddenDefaultCols.includes(k)) {
        headers.push(defaultColNames[k]);
        colKeys.push(k);
      }
    });

    if (!hiddenDefaultCols.includes('responsable')) {
      headers.push(defaultColNames.responsable);
      colKeys.push('responsable');
    }
    if (!hiddenDefaultCols.includes('compromisoDate')) {
      headers.push(defaultColNames.compromisoDate);
      colKeys.push('compromisoDate');
    }
    if (!hiddenDefaultCols.includes('observaciones')) {
      headers.push(defaultColNames.observaciones);
      colKeys.push('observaciones');
    }
    if (!hiddenDefaultCols.includes('pendienteDe')) {
      headers.push(defaultColNames.pendienteDe);
      colKeys.push('pendienteDe');
    }

    // Columnas personalizadas
    customColumns.forEach(c => {
      headers.push(c);
      colKeys.push(`custom_${c}`);
    });

    const detailRows = [headers];
    reportEquipments.forEach(eq => {
      const row: any[] = [];
      const recinto = recintos.find(r => r.id === eq.recintoId);
      row.push(recinto?.name || 'Sede Desconocida');
      row.push(recinto?.code || '');

      if (!hiddenDefaultCols.includes('name')) row.push(eq.name);
      if (!hiddenDefaultCols.includes('section')) row.push(eq.section);
      
      const project = projects.find(p => p.id === eq.projectId);
      row.push(project?.name || 'Sin Proyecto');

      phasesKeys.forEach(k => {
        if (!hiddenDefaultCols.includes(k)) {
          row.push(eq[k as keyof ClinicalEquipment] || 'No iniciado');
        }
      });

      if (!hiddenDefaultCols.includes('responsable')) row.push(eq.responsable);
      if (!hiddenDefaultCols.includes('compromisoDate')) row.push(eq.compromisoDate || '');
      if (!hiddenDefaultCols.includes('observaciones')) row.push(eq.observaciones);
      if (!hiddenDefaultCols.includes('pendienteDe')) row.push(eq.pendienteDe);

      customColumns.forEach(c => {
        const customFields = eq.customFields ? JSON.parse(eq.customFields) : {};
        row.push(customFields[c] || '');
      });

      detailRows.push(row);
    });

    const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
    XLSX.utils.book_append_sheet(wb, wsDetail, "Detalle de Equipos");

    // Guardar archivo
    const namePrefix = selectedProject?.name ? selectedProject.name.replace(/\s+/g, '_') : 'General';
    XLSX.writeFile(wb, `Informe_Seguimiento_Equipos_${namePrefix}_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // Imprimir a PDF
  const triggerPrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="report-viewer-fullscreen">
      <div className="report-viewer-backdrop" onClick={onClose} />
      
      {/* Panel de Contenido */}
      <div className="report-container-card">
        {/* Cabecera del Visor - No se imprime */}
        <div className="report-header-toolbar no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BarChart3 className="text-bupa-blue" size={24} />
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#004B87' }}>Consola de Reportabilidad Multicanal</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Visualiza, exporta a Excel estructurado o genera el memo en PDF Bupa</span>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="report-btn btn-excel" onClick={exportToExcel}>
              <FileSpreadsheet size={16} />
              <span>Exportar Excel</span>
            </button>
            <button className="report-btn btn-pdf" onClick={triggerPrint}>
              <Printer size={16} />
              <span>Imprimir PDF / Memo</span>
            </button>
            <button className="report-btn btn-close" onClick={onClose}>
              <X size={16} />
              <span>Cerrar</span>
            </button>
          </div>
        </div>

        {/* CONTENIDO DEL INFORME (Se visualiza y se imprime) */}
        <div className="report-printable-document">
          {/* Encabezado Corporativo BUPA (Visible en Impresión y Visor) */}
          <div className="report-print-header">
            <div className="header-brand-line">
              <img src="/Bupa-logo.png" alt="Bupa Logo" className="bupa-print-logo" />
              <div className="header-meta-details">
                <span className="corporate-text">Bupa Chile • Área de Implementación y Proyectos</span>
                <span className="doc-date">Fecha de Emisión: {new Date().toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
              </div>
            </div>
            
            <div className="report-title-block">
              <h1>INFORME DE CONTROL: MONITOREO DE EQUIPAMIENTO CLÍNICO</h1>
              <p className="subtitle">Estado actual de calibración, pruebas funcionales, puesta en marcha y habilitación sanitaria</p>
            </div>

            <div className="report-metadata-grid">
              <div className="meta-item">
                <span className="label">Proyecto:</span>
                <span className="value">{selectedProject?.name || (filterProjectId === 'none' ? 'Equipos sin Proyecto Asociado' : 'Todos los Proyectos')}</span>
              </div>
              <div className="meta-item">
                <span className="label">Área de Negocio:</span>
                <span className="value">{selectedProject?.area || 'Unidad de Apoyo Clínico'}</span>
              </div>
              <div className="meta-item">
                <span className="label">Director de Proyecto / PM:</span>
                <span className="value">{selectedProject?.manager || 'Dirección de Tecnología Biomédica'}</span>
              </div>
              <div className="meta-item">
                <span className="label">Sedes Clínicas Mapeadas:</span>
                <span className="value">{reportRecintos.length} Recintos Activos</span>
              </div>
            </div>
          </div>

          {/* CUERPO A: KPIs EJECUTIVOS */}
          <div className="report-section-block">
            <h3 className="section-title">
              <TrendingUp size={16} />
              <span>Resumen de Avance Ejecutivo</span>
            </h3>
            
            <div className="kpi-row-container">
              <div className="kpi-card-mini">
                <span className="kpi-label">Avance Ponderado Global</span>
                <span className="kpi-value">{reportStats.completion}%</span>
                <div className="kpi-progress-bar-container">
                  <div className="kpi-progress-fill" style={{ width: `${reportStats.completion}%` }} />
                </div>
                <span className="kpi-subtext">Hitos completados y en progreso</span>
              </div>
              
              <div className="kpi-card-mini">
                <span className="kpi-label">Equipos Médicos Totales</span>
                <span className="kpi-value">{reportEquipments.length}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                  <Layers size={10} />
                  <span>Mapeados en base de datos</span>
                </div>
                <span className="kpi-subtext">Inventariado general activo</span>
              </div>

              <div className="kpi-card-mini">
                <span className="kpi-label">Acciones Completadas</span>
                <span className="kpi-value text-teal">{reportStats.completedCount}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: '#10b981', fontSize: '0.7rem' }}>
                  <CheckCircle2 size={10} />
                  <span>100% Calibrados / Habilitados</span>
                </div>
                <span className="kpi-subtext">Hitos con firma de conformidad</span>
              </div>

              <div className="kpi-card-mini">
                <span className="kpi-label">Acciones en Progreso</span>
                <span className="kpi-value text-orange">{reportStats.progressCount}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px', color: '#f59e0b', fontSize: '0.7rem' }}>
                  <RefreshCw size={10} />
                  <span>Pruebas funcionales y TI</span>
                </div>
                <span className="kpi-subtext">Calibración en ejecución</span>
              </div>
            </div>
          </div>

          {/* CUERPO B: DESGLOSE POR SEDE CLINICA (RECINTO) */}
          <div className="report-section-block page-break-before">
            <h3 className="section-title">
              <BarChart3 size={16} />
              <span>Avance de Implementación por Sede Clínica</span>
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Detalle de cumplimiento ponderado individual por cada recinto para aislar retrasos operacionales.
            </p>
            
            <table className="report-custom-table">
              <thead>
                <tr>
                  <th style={{ width: '120px' }}>Código Sede</th>
                  <th>Nombre del Recinto Clínico</th>
                  <th style={{ width: '150px', textAlign: 'center' }}>Equipos Mapeados</th>
                  <th style={{ width: '350px' }}>Porcentaje de Avance y Cumplimiento</th>
                </tr>
              </thead>
              <tbody>
                {recintoProgressList.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                      No hay datos de recintos registrados para mostrar.
                    </td>
                  </tr>
                ) : (
                  recintoProgressList.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 800 }}>{r.code}</td>
                      <td style={{ fontWeight: 700, color: '#004B87' }}>{r.name}</td>
                      <td style={{ textAlign: 'center', fontWeight: 'bold' }}>{r.equipmentsCount} Equipos</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: 800, width: '40px', fontSize: '0.8rem' }}>{r.completion}%</span>
                          <div className="table-bar-container">
                            <div className="table-bar-fill" style={{ width: `${r.completion}%`, background: r.completion === 100 ? '#10b981' : (r.completion > 30 ? '#f59e0b' : '#ef4444') }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* CUERPO C: MATRIZ DE CALOR (HEATMAP) DE HITOS POR RECINTO */}
          <div className="report-section-block page-break-before">
            <h3 className="section-title">
              <Layers size={16} />
              <span>Matriz de Control de Fases (Heatmap)</span>
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Matriz visual que mapea el estado del equipamiento en las fases del ciclo clínico.
            </p>

            <div style={{ overflowX: 'auto' }}>
              <table className="report-custom-table border-grid" style={{ minWidth: '700px' }}>
                <thead>
                  <tr>
                    <th>Recinto</th>
                    {!hiddenDefaultCols.includes('levantamiento') && <th style={{ textAlign: 'center' }}>{defaultColNames.levantamiento}</th>}
                    {!hiddenDefaultCols.includes('parametrizacion') && <th style={{ textAlign: 'center' }}>{defaultColNames.parametrizacion}</th>}
                    {!hiddenDefaultCols.includes('pruebas') && <th style={{ textAlign: 'center' }}>{defaultColNames.pruebas}</th>}
                    {!hiddenDefaultCols.includes('capacitacion') && <th style={{ textAlign: 'center' }}>{defaultColNames.capacitacion}</th>}
                    {!hiddenDefaultCols.includes('validacion') && <th style={{ textAlign: 'center' }}>{defaultColNames.validacion}</th>}
                    {!hiddenDefaultCols.includes('golive') && <th style={{ textAlign: 'center' }}>{defaultColNames.golive}</th>}
                  </tr>
                </thead>
                <tbody>
                  {recintoProgressList.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>No hay recintos para mapear.</td>
                    </tr>
                  ) : (
                    recintoProgressList.map(r => {
                      // Obtener estado promedio/predominante de cada fase para este recinto
                      const recintoEquips = reportEquipments.filter(e => e.recintoId === r.id);
                      
                      const getPhaseSummaryStyle = (phaseKey: string) => {
                        if (recintoEquips.length === 0) return 'cell-empty';
                        
                        let completed = 0;
                        let progress = 0;
                        let notStarted = 0;
                        let discarded = 0;

                        recintoEquips.forEach(eq => {
                          const val = eq[phaseKey as keyof ClinicalEquipment] as string;
                          if (val === 'Completado') completed++;
                          else if (val === 'En progreso') progress++;
                          else if (val === 'Descartado' || val === 'Desestimado') discarded++;
                          else notStarted++;
                        });

                        const activeTotal = recintoEquips.length - discarded;
                        if (activeTotal <= 0) return 'cell-empty';
                        
                        if (completed === activeTotal) return 'cell-completed';
                        if (completed > 0 || progress > 0) return 'cell-progress';
                        return 'cell-not-started';
                      };

                      const getPhaseLabel = (phaseKey: string) => {
                        if (recintoEquips.length === 0) return '-';
                        
                        let completed = 0;
                        let discarded = 0;
                        recintoEquips.forEach(eq => {
                          const val = eq[phaseKey as keyof ClinicalEquipment] as string;
                          if (val === 'Completado') completed++;
                          else if (val === 'Descartado' || val === 'Desestimado') discarded++;
                        });

                        const activeTotal = recintoEquips.length - discarded;
                        if (activeTotal <= 0) return 'N/A';
                        return `${completed}/${activeTotal}`;
                      };

                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700, background: 'var(--bg-secondary)', width: '180px' }}>{r.name}</td>
                          {!hiddenDefaultCols.includes('levantamiento') && (
                            <td className={`heatmap-cell ${getPhaseSummaryStyle('levantamiento')}`}>
                              <span className="heatmap-text">{getPhaseLabel('levantamiento')}</span>
                            </td>
                          )}
                          {!hiddenDefaultCols.includes('parametrizacion') && (
                            <td className={`heatmap-cell ${getPhaseSummaryStyle('parametrizacion')}`}>
                              <span className="heatmap-text">{getPhaseLabel('parametrizacion')}</span>
                            </td>
                          )}
                          {!hiddenDefaultCols.includes('pruebas') && (
                            <td className={`heatmap-cell ${getPhaseSummaryStyle('pruebas')}`}>
                              <span className="heatmap-text">{getPhaseLabel('pruebas')}</span>
                            </td>
                          )}
                          {!hiddenDefaultCols.includes('capacitacion') && (
                            <td className={`heatmap-cell ${getPhaseSummaryStyle('capacitacion')}`}>
                              <span className="heatmap-text">{getPhaseLabel('capacitacion')}</span>
                            </td>
                          )}
                          {!hiddenDefaultCols.includes('validacion') && (
                            <td className={`heatmap-cell ${getPhaseSummaryStyle('validacion')}`}>
                              <span className="heatmap-text">{getPhaseLabel('validacion')}</span>
                            </td>
                          )}
                          {!hiddenDefaultCols.includes('golive') && (
                            <td className={`heatmap-cell ${getPhaseSummaryStyle('golive')}`}>
                              <span className="heatmap-text">{getPhaseLabel('golive')}</span>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            
            <div className="heatmap-legend" style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.72rem', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', background: 'rgba(16, 185, 129, 0.2)', border: '1px solid #10b981', borderRadius: '3px' }} />
                <span>Completo (100% de Equipos Completados)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid #f59e0b', borderRadius: '3px' }} />
                <span>En progreso (Calibración parcial activa)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-light)', borderRadius: '3px' }} />
                <span>No iniciado / Pendiente</span>
              </div>
            </div>
          </div>

          {/* NOTAS AL FINAL DE FIRMA - SOLO IMPRESION */}
          <div className="report-print-footer">
            <div className="footer-memo-grid">
              <div className="memo-notes">
                <h4><Info size={12} /> Notas del Reporte Clínico</h4>
                <p>El porcentaje global del proyecto contempla únicamente las fases del sistema declaradas como aplicables y activas por la gerencia de ingeniería clínica. Hitos de capacitación u otros desestimados han sido excluidos de la ponderación matemática para evitar falsas desalineaciones del estado de avance real.</p>
              </div>
              <div className="signature-box">
                <div className="signature-line" />
                <span className="signature-name">Firma Dirección de Proyectos</span>
                <span className="signature-title">Área de Control de Procesos e Infraestructura - Bupa Chile</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .report-viewer-fullscreen {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        .report-viewer-backdrop {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 30, 60, 0.45);
          backdrop-filter: blur(8px);
        }

        .report-container-card {
          position: relative;
          width: 100%;
          max-width: 1100px;
          height: 100%;
          max-height: 90vh;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(12px) saturate(160%);
          border: 1px solid rgba(255, 255, 255, 0.4);
          box-shadow: var(--shadow-2xl);
          border-radius: var(--radius-lg);
          display: flex;
          flex-direction: column;
          overflow: hidden;
          animation: scaleUpReport 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes scaleUpReport {
          from { transform: scale(0.96); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .report-header-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: rgba(255, 255, 255, 0.8);
          border-bottom: 1px solid var(--border-light);
          padding: 14px 24px;
          flex-shrink: 0;
        }

        .text-bupa-blue {
          color: #004B87;
        }

        .report-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          border: none;
          padding: 9px 16px;
          border-radius: 8px;
          font-size: 0.82rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-excel {
          background: #10b981;
          color: white;
        }
        .btn-excel:hover {
          background: #059669;
          transform: translateY(-1px);
        }

        .btn-pdf {
          background: #004B87;
          color: white;
        }
        .btn-pdf:hover {
          background: #00335c;
          transform: translateY(-1px);
        }

        .btn-close {
          background: var(--bg-tertiary);
          color: var(--text-primary);
          border: 1px solid var(--border-light);
        }
        .btn-close:hover {
          background: var(--border-light);
        }

        .report-printable-document {
          flex: 1;
          overflow-y: auto;
          padding: 40px;
          background: white;
          color: #333333;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* DISEÑO MEMBRETE BUPA */
        .report-print-header {
          border-bottom: 3px solid #004B87;
          padding-bottom: 16px;
          margin-bottom: 24px;
        }

        .header-brand-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .bupa-print-logo {
          height: 40px;
          object-fit: contain;
        }

        .header-meta-details {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          text-align: right;
        }

        .corporate-text {
          font-size: 0.72rem;
          font-weight: 800;
          color: #004B87;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .doc-date {
          font-size: 0.72rem;
          color: var(--text-secondary);
        }

        .report-title-block h1 {
          font-size: 1.6rem;
          font-weight: 900;
          color: #003B64;
          margin: 0;
          letter-spacing: -0.3px;
        }

        .report-title-block .subtitle {
          font-size: 0.85rem;
          color: var(--text-secondary);
          margin: 6px 0 0;
        }

        .report-metadata-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-top: 18px;
          background: var(--bg-secondary);
          padding: 12px 18px;
          border-radius: 8px;
          border: 1px solid var(--border-light);
        }

        .meta-item {
          display: flex;
          gap: 8px;
          font-size: 0.78rem;
        }

        .meta-item .label {
          font-weight: 700;
          color: var(--text-secondary);
        }

        .meta-item .value {
          color: var(--text-primary);
          font-weight: 600;
        }

        /* SECCIONES Y CONTENEDORES */
        .report-section-block {
          margin-bottom: 32px;
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1rem;
          font-weight: 800;
          color: #004B87;
          margin: 0 0 14px;
          border-bottom: 2px solid rgba(0, 75, 135, 0.1);
          padding-bottom: 6px;
        }

        /* KPIs EJECUTIVOS */
        .kpi-row-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
        }

        .kpi-card-mini {
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          padding: 14px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
        }

        .kpi-card-mini .kpi-label {
          font-size: 0.68rem;
          font-weight: 800;
          color: var(--text-secondary);
          text-transform: uppercase;
        }

        .kpi-card-mini .kpi-value {
          font-size: 1.6rem;
          font-weight: 900;
          color: #004B87;
          margin: 6px 0;
        }

        .kpi-card-mini .text-teal {
          color: #10b981;
        }
        .kpi-card-mini .text-orange {
          color: #f59e0b;
        }

        .kpi-progress-bar-container {
          width: 100%;
          height: 5px;
          background: var(--bg-tertiary);
          border-radius: 3px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .kpi-progress-fill {
          height: 100%;
          background: #004B87;
        }

        .kpi-card-mini .kpi-subtext {
          font-size: 0.65rem;
          color: var(--text-muted);
          margin-top: auto;
        }

        /* TABLAS REPORTABILIDAD */
        .report-custom-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.78rem;
          text-align: left;
        }

        .report-custom-table th {
          background: rgba(0, 75, 135, 0.05);
          color: #004B87;
          font-weight: 800;
          padding: 10px 12px;
          border-bottom: 2px solid rgba(0, 75, 135, 0.15);
        }

        .report-custom-table td {
          padding: 10px 12px;
          border-bottom: 1px solid var(--border-subtle);
          color: var(--text-primary);
        }

        .report-custom-table.border-grid th, 
        .report-custom-table.border-grid td {
          border: 1px solid var(--border-light);
        }

        .table-bar-container {
          flex: 1;
          height: 8px;
          background: var(--bg-tertiary);
          border-radius: 4px;
          overflow: hidden;
        }

        .table-bar-fill {
          height: 100%;
          border-radius: 4px;
        }

        /* HEATMAP CELDA ESTILOS */
        .heatmap-cell {
          text-align: center;
          vertical-align: middle;
          padding: 8px !important;
          transition: all 0.15s ease;
        }

        .heatmap-text {
          font-weight: 800;
          font-size: 0.75rem;
        }

        .cell-completed {
          background: rgba(16, 185, 129, 0.15) !important;
          color: #059669 !important;
          border: 1px solid rgba(16, 185, 129, 0.25) !important;
        }

        .cell-progress {
          background: rgba(245, 158, 11, 0.15) !important;
          color: #d97706 !important;
          border: 1px solid rgba(245, 158, 11, 0.25) !important;
        }

        .cell-not-started {
          background: var(--bg-tertiary) !important;
          color: var(--text-muted) !important;
        }

        .cell-empty {
          background: #fafafa !important;
          color: #cccccc !important;
        }

        /* SECCIÓN DE FIRMAS Y PIE */
        .report-print-footer {
          margin-top: 40px;
          border-top: 1px dashed var(--border-light);
          padding-top: 24px;
        }

        .footer-memo-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 40px;
          align-items: flex-end;
        }

        .memo-notes h4 {
          margin: 0 0 6px;
          font-size: 0.75rem;
          color: #004B87;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .memo-notes p {
          font-size: 0.65rem;
          color: var(--text-secondary);
          line-height: 1.4;
          margin: 0;
          text-align: justify;
        }

        .signature-box {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .signature-line {
          width: 100%;
          border-top: 1.5px solid var(--text-secondary);
          margin-bottom: 8px;
        }

        .signature-name {
          font-size: 0.75rem;
          font-weight: 800;
          color: var(--text-primary);
        }

        .signature-title {
          font-size: 0.65rem;
          color: var(--text-secondary);
          margin-top: 2px;
        }

        /* CONTROL DE IMPRESIÓN EXCLUSIVA */
        @media print {
          body * {
            visibility: hidden;
          }
          
          /* Solo imprimir el contenedor del reporte */
          .report-viewer-fullscreen {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            padding: 0;
            z-index: 99999;
            background: white !important;
          }

          .report-viewer-backdrop {
            display: none !important;
          }

          .report-container-card {
            border: none !important;
            box-shadow: none !important;
            max-height: none !important;
            height: auto !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
          }

          .report-printable-document {
            visibility: visible;
            overflow: visible !important;
            padding: 0px !important;
            width: 100% !important;
          }

          .report-printable-document * {
            visibility: visible;
          }

          .no-print {
            display: none !important;
          }

          /* Control de cortes incómodos */
          .page-break-before {
            page-break-before: always;
            margin-top: 40px;
          }

          .report-section-block {
            page-break-inside: avoid;
          }

          .report-custom-table tr {
            page-break-inside: avoid;
          }

          /* Ajuste de colores en PDF */
          .report-custom-table th {
            background: #e6eff7 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .cell-completed {
            background-color: #d1fae5 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .cell-progress {
            background-color: #fef3c7 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .table-bar-fill {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />
    </div>
  );
}
