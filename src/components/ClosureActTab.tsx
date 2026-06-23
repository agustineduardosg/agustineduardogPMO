import React, { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { FileText, Save, Printer, FileDown, CheckCircle, ShieldAlert, Award, FileSpreadsheet, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ClosureActTabProps {
  projectId: string;
  project: any;
  users: any[];
}

export default function ClosureActTab({ projectId, project, users }: ClosureActTabProps) {
  const { data: session } = useSession();
  const [acceptanceCriteria, setAcceptanceCriteria] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [pendingItems, setPendingItems] = useState('');
  const [signedByPm, setSignedByPm] = useState<string | null>(null);
  const [signedBySponsor, setSignedBySponsor] = useState<string | null>(null);
  const [signedByPmo, setSignedByPmo] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch act from DB
  useEffect(() => {
    async function loadClosureAct() {
      try {
        const res = await fetch(`/api/projects/${projectId}/closure-act`);
        if (res.ok) {
          const data = await res.json();
          setAcceptanceCriteria(data.acceptanceCriteria || '');
          setLessonsLearned(data.lessonsLearned || '');
          setHandoverNotes(data.handoverNotes || '');
          setPendingItems(data.pendingItems || '');
          setSignedByPm(data.signedByPm);
          setSignedBySponsor(data.signedBySponsor);
          setSignedByPmo(data.signedByPmo);
        }
      } catch (err) {
        console.error('Error loading closure act:', err);
      } finally {
        setLoading(false);
      }
    }
    loadClosureAct();
  }, [projectId]);

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

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/closure-act`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptanceCriteria,
          lessonsLearned,
          handoverNotes,
          pendingItems,
          signedByPm,
          signedBySponsor,
          signedByPmo
        })
      });
      if (res.ok) {
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

  const toggleSignature = (role: 'pm' | 'sponsor' | 'pmo') => {
    const userName = session?.user?.name || 'Usuario Bupa';
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
          body { font-family: Arial, sans-serif; font-size: 11pt; line-height: 1.4; color: #333333; }
          h1 { color: #004B87; font-size: 18pt; text-align: center; margin-bottom: 5px; }
          .subtitle { text-align: center; font-size: 10pt; color: #666666; margin-bottom: 25px; }
          h2 { color: #004B87; font-size: 13pt; border-bottom: 2px solid #0079C1; padding-bottom: 4px; margin-top: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
          th, td { border: 1px solid #dddddd; padding: 8px; text-align: left; font-size: 10pt; }
          th { background-color: #f8fafc; color: #004B87; font-weight: bold; width: 30%; }
          .text-block { background-color: #fdfdfd; border-left: 3px solid #0079C1; padding: 10px; margin: 10px 0; font-size: 10pt; white-space: pre-wrap; }
          .sig-table { margin-top: 40px; border: none; }
          .sig-table td { border: none; text-align: center; width: 33%; vertical-align: top; }
          .sig-line { border-top: 1px solid #333333; width: 80%; margin: 40px auto 5px auto; }
          .sig-title { font-size: 9pt; color: #666666; }
        </style>
      </head>
      <body>
        <h1>ACTA DE CIERRE DE PROYECTO</h1>
        <div class="subtitle">SISTEMA PMO BUPA CHILE</div>

        <h2>1. INFORMACIÓN GENERAL DEL PROYECTO</h2>
        <table>
          <tr><th>Nombre del Proyecto</th><td>${project?.name || ''}</td></tr>
          <tr><th>ID del Proyecto</th><td>${project?.id || ''}</td></tr>
          <tr><th>Director / PM</th><td>${project?.manager || 'No asignado'}</td></tr>
          <tr><th>Sponsor del Proyecto</th><td>${project?.sponsor || 'No asignado'}</td></tr>
          <tr><th>Área de Negocio</th><td>${project?.area || 'Sin Área'}</td></tr>
          <tr><th>Tipo / Metodología</th><td>${project?.type || 'Proyecto SCL'} / ${project?.methodology || 'Tradicional'}</td></tr>
          <tr><th>Fecha Inicio</th><td>${formattedStart}</td></tr>
          <tr><th>Fecha Término Plan</th><td>${formattedEnd}</td></tr>
          <tr><th>Fecha Go-Live</th><td>${formattedGoLive}</td></tr>
          <tr><th>Estado de Avance</th><td><b>${progress}% (Completado)</b></td></tr>
        </table>

        <h2>2. DESEMPEÑO FINANCIERO (CONSOLIDADO)</h2>
        <table>
          <tr><th>Presupuesto Total Aprobado</th><td>${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(costSummary.totalBudget)} CLP</td></tr>
          <tr><th>Costo Real Ejecutado</th><td>${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(costSummary.totalExecuted)} CLP</td></tr>
          <tr><th>Desviación / Saldo</th><td>${new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(costSummary.deviation)} CLP</td></tr>
        </table>

        <h2>3. CRITERIOS DE ACEPTACIÓN Y OBJETIVOS ALCANZADOS</h2>
        <div class="text-block">${acceptanceCriteria || 'No se registraron comentarios.'}</div>

        <h2>4. LECCIONES APRENDIDAS</h2>
        <div class="text-block">${lessonsLearned || 'No se registraron comentarios.'}</div>

        <h2>5. TRASPASO OPERATIVO Y SOPORTE</h2>
        <div class="text-block">${handoverNotes || 'No se registraron comentarios.'}</div>

        <h2>6. PENDIENTES / PRÓXIMOS PASOS</h2>
        <div class="text-block">${pendingItems || 'No se registraron pendientes.'}</div>

        <h2>7. FIRMAS Y APROBACIONES</h2>
        <table class="sig-table">
          <tr>
            <td>
              <div class="sig-line"></div>
              <b>Alejandra Cabrera</b><br/>
              <span class="sig-title">Director / PM del Proyecto</span><br/>
              <span style="font-size: 8pt; color: green;">${signedByPm ? `Firmado: ${signedByPm}` : 'Pendiente de firma'}</span>
            </td>
            <td>
              <div class="sig-line"></div>
              <b>Sponsor Autorizado</b><br/>
              <span class="sig-title">Sponsor del Proyecto</span><br/>
              <span style="font-size: 8pt; color: green;">${signedBySponsor ? `Firmado: ${signedBySponsor}` : 'Pendiente de firma'}</span>
            </td>
            <td>
              <div class="sig-line"></div>
              <b>PMO Responsable</b><br/>
              <span class="sig-title">Oficina de Gestión (PMO)</span><br/>
              <span style="font-size: 8pt; color: green;">${signedByPmo ? `Firmado: ${signedByPmo}` : 'Pendiente de firma'}</span>
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

    // 1. Sheet general info
    const data = [
      ['ACTA DE CIERRE DE PROYECTO'],
      ['SISTEMA PMO BUPA CHILE'],
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
      [],
      ['2. DESEMPEÑO FINANCIERO'],
      ['Presupuesto Aprobado (CLP)', costSummary.totalBudget],
      ['Costo Real Ejecutado (CLP)', costSummary.totalExecuted],
      ['Desviación / Saldo (CLP)', costSummary.deviation],
      [],
      ['3. CRITERIOS DE ACEPTACIÓN Y OBJETIVOS ALCANZADOS'],
      [acceptanceCriteria || ''],
      [],
      ['4. LECCIONES APRENDIDAS'],
      [lessonsLearned || ''],
      [],
      ['5. TRASPASO OPERATIVO'],
      [handoverNotes || ''],
      [],
      ['6. PENDIENTES / PRÓXIMOS PASOS'],
      [pendingItems || ''],
      [],
      ['7. FIRMAS Y APROBACIONES'],
      ['Firma Director / PM', signedByPm ? `Firmado: ${signedByPm}` : 'Pendiente'],
      ['Firma Sponsor', signedBySponsor ? `Firmado: ${signedBySponsor}` : 'Pendiente'],
      ['Firma PMO', signedByPmo ? `Firmado: ${signedByPmo}` : 'Pendiente']
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);

    // Style adjustments
    ws['!cols'] = [{ wch: 30 }, { wch: 60 }];

    XLSX.utils.book_append_sheet(wb, ws, 'Acta de Cierre');
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s' }}>
      
      {/* Action panel (buttons) */}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <FileText size={20} color="#004B87" />
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Gestor de Acta de Cierre</h3>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>Configure, firme y exporte el acta de cierre oficial.</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="btn btn-primary" 
            style={{ background: '#004B87', color: 'white', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', padding: '10px 16px' }}
          >
            <Save size={16} /> {saving ? 'Guardando...' : 'Guardar Acta'}
          </button>
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

      {!isCompleted && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(245, 158, 11, 0.08)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid rgba(245, 158, 11, 0.15)', color: 'var(--accent-warning)', fontSize: '0.85rem' }}>
          <ShieldAlert size={18} />
          <span><strong>Nota PMO:</strong> Este proyecto se encuentra al {progress}% de avance. El Acta de Cierre se puede configurar, pero se recomienda la firma oficial una vez alcanzado el 100%.</span>
        </div>
      )}

      {/* Main Printable Document Layout */}
      <div id="closure-act-document" className="closure-act-print-container" style={{ background: 'var(--bg-secondary)', padding: '30px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-light)', boxShadow: 'var(--panel-shadow)', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* Document Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #004B87', paddingBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(0, 75, 135, 0.08)', color: '#004B87', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={26} />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#004B87', letterSpacing: '0.5px' }}>ACTA DE CIERRE DE PROYECTO</h1>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Sistema PMO Bupa Chile</span>
            </div>
          </div>
          <div style={{ padding: '6px 12px', borderRadius: '20px', background: '#e6f4f1', color: '#0d9488', fontWeight: 800, fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={14} /> PROYECTO COMPLETADO
          </div>
        </div>

        {/* SECTION 1: GENERAL INFO */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#004B87', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', marginTop: 0, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>1. Información General del Proyecto</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Nombre del Proyecto</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{project?.name || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>ID / Código</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>{project?.id || ''}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Director / PM</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{project?.manager || 'No asignado'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Sponsor del Proyecto</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{project?.sponsor || 'No asignado'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Área de Negocio</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{project?.area || 'Sin Área'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tipo / Metodología</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>{project?.type || 'Proyecto SCL'} / {project?.methodology || 'Tradicional'}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Plazo Planificado</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                {project?.startDate ? format(new Date(project.startDate), 'dd MMM yyyy', { locale: es }) : ''} — {project?.endDate ? format(new Date(project.endDate), 'dd MMM yyyy', { locale: es }) : ''}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Fecha Real de Salida (Go-Live)</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: project?.goLiveDate ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                {project?.goLiveDate ? format(new Date(project.goLiveDate), 'dd MMM yyyy', { locale: es }) : 'No programada'}
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: FINANCIAL SUMMARY */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#004B87', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>2. Desempeño Financiero (Consolidado)</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', background: 'var(--bg-tertiary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Presupuesto Aprobado</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#004B87' }}>
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(costSummary.totalBudget)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Costo Real Ejecutado</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(costSummary.totalExecuted)}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>Desviación / Saldo</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: costSummary.deviation >= 0 ? '#0d9488' : '#ef4444' }}>
                {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(costSummary.deviation)}
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: OBJECTIVES & ACCEPTANCE CRITERIA */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#004B87', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>3. Objetivos y Criterios de Aceptación</h3>
          <div className="no-print" style={{ marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Describa los criterios utilizados por el cliente o sponsor para aceptar formalmente los entregables.</div>
          <textarea 
            className="act-textarea"
            value={acceptanceCriteria}
            onChange={e => setAcceptanceCriteria(e.target.value)}
            rows={3}
            placeholder="Describa el nivel de aceptación de los entregables del proyecto..."
            style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
          <div className="print-only-text" style={{ display: 'none', fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{acceptanceCriteria || 'No se registraron comentarios.'}</div>
        </div>

        {/* SECTION 4: LESSONS LEARNED */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#004B87', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>4. Lecciones Aprendidas</h3>
          <div className="no-print" style={{ marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Indique qué funcionó bien, qué fallas ocurrieron y qué recomendaciones sugiere para futuros proyectos.</div>
          <textarea 
            className="act-textarea"
            value={lessonsLearned}
            onChange={e => setLessonsLearned(e.target.value)}
            rows={5}
            placeholder="Describa las lecciones aprendidas..."
            style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
          <div className="print-only-text" style={{ display: 'none', fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{lessonsLearned || 'No se registraron lecciones aprendidas.'}</div>
        </div>

        {/* SECTION 5: HANDOVER & SUPPORT */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#004B87', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>5. Traspaso Operativo y Soporte</h3>
          <div className="no-print" style={{ marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Especifique las condiciones de traspaso al área usuaria/operativa (ej: entrega de credenciales, manuales o soporte LIS).</div>
          <textarea 
            className="act-textarea"
            value={handoverNotes}
            onChange={e => setHandoverNotes(e.target.value)}
            rows={3}
            placeholder="Detalle el plan de soporte y traspaso operativo..."
            style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
          <div className="print-only-text" style={{ display: 'none', fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{handoverNotes || 'No se registraron notas de traspaso.'}</div>
        </div>

        {/* SECTION 6: PENDING ITEMS */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#004B87', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>6. Pendientes / Próximos Pasos</h3>
          <div className="no-print" style={{ marginBottom: '8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Describa aquellas tareas no críticas que quedan pendientes de ejecución posterior al cierre formal.</div>
          <textarea 
            className="act-textarea"
            value={pendingItems}
            onChange={e => setPendingItems(e.target.value)}
            rows={3}
            placeholder="Indique las tareas o hitos pendientes..."
            style={{ width: '100%', padding: '12px', background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontSize: '0.85rem', fontFamily: 'inherit', lineHeight: 1.5 }}
          />
          <div className="print-only-text" style={{ display: 'none', fontSize: '0.85rem', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{pendingItems || 'Ninguno.'}</div>
        </div>

        {/* SECTION 7: APPROVALS & SIGNATURES */}
        <div>
          <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#004B87', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', margin: 0, marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>7. Firmas de Cierre y Aprobación</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginTop: '10px' }}>
            
            {/* PM Signature Box */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', minHeight: '130px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, display: 'block', color: 'var(--text-primary)' }}>{project?.manager || 'Alejandra Cabrera'}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Director / PM de Proyecto</span>
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '12px' }}>
                {signedByPm ? (
                  <div style={{ fontSize: '0.72rem', color: '#0d9488', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={13} /> {signedByPm}
                  </div>
                ) : (
                  <button 
                    onClick={() => toggleSignature('pm')} 
                    className="no-print btn" 
                    style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#004B87', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Firmar Acta (PM)
                  </button>
                )}
                {!signedByPm && <span className="print-only-line" style={{ display: 'none', borderTop: '1px solid #999', width: '80%', marginTop: '30px' }}></span>}
              </div>
            </div>

            {/* Sponsor Signature Box */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', minHeight: '130px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, display: 'block', color: 'var(--text-primary)' }}>Sponsor Autorizado</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Sponsor del Proyecto</span>
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '12px' }}>
                {signedBySponsor ? (
                  <div style={{ fontSize: '0.72rem', color: '#0d9488', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={13} /> {signedBySponsor}
                  </div>
                ) : (
                  <button 
                    onClick={() => toggleSignature('sponsor')} 
                    className="no-print btn" 
                    style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#004B87', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Firmar Acta (Sponsor)
                  </button>
                )}
                {!signedBySponsor && <span className="print-only-line" style={{ display: 'none', borderTop: '1px solid #999', width: '80%', marginTop: '30px' }}></span>}
              </div>
            </div>

            {/* PMO Signature Box */}
            <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-tertiary)', minHeight: '130px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, display: 'block', color: 'var(--text-primary)' }}>Oficina PMO</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>Representante PMO Bupa</span>
              </div>
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '12px' }}>
                {signedByPmo ? (
                  <div style={{ fontSize: '0.72rem', color: '#0d9488', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={13} /> {signedByPmo}
                  </div>
                ) : (
                  <button 
                    onClick={() => toggleSignature('pmo')} 
                    className="no-print btn" 
                    style={{ padding: '6px 12px', fontSize: '0.75rem', background: '#004B87', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                    Firmar Acta (PMO)
                  </button>
                )}
                {!signedByPmo && <span className="print-only-line" style={{ display: 'none', borderTop: '1px solid #999', width: '80%', marginTop: '30px' }}></span>}
              </div>
            </div>

          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
          }
          #closure-act-document, #closure-act-document * {
            visibility: visible;
          }
          #closure-act-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            background: white !important;
            color: black !important;
          }
          .no-print {
            display: none !important;
          }
          .act-textarea {
            display: none !important;
          }
          .print-only-text {
            display: block !important;
            padding: 8px;
            background: #fafafa !important;
            border-left: 3px solid #004B87 !important;
          }
          .print-only-line {
            display: block !important;
          }
        }
      `}} />
    </div>
  );
}
