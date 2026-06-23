import React, { useRef, useEffect, useState } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  FileText, 
  Code,
  Sparkles,
  ChevronDown
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  projectId?: string;
  readOnly?: boolean;
}

export default function RichTextEditor({ value, onChange, placeholder, readOnly = false }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showPlaceholders, setShowPlaceholders] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sync value from prop to innerHTML, but only if it's different to prevent cursor jumping
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value || '';
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      onChange(html);

      // Check if there is an open '{{' in the innerText
      const text = editorRef.current.innerText || '';
      const lastOpenIndex = text.lastIndexOf('{{');
      const lastCloseIndex = text.lastIndexOf('}}');
      if (lastOpenIndex !== -1 && lastOpenIndex > lastCloseIndex) {
        setShowSuggestions(true);
      } else {
        setShowSuggestions(false);
      }
    }
  };

  const execCommand = (command: string, arg = '') => {
    if (readOnly) return;
    document.execCommand(command, false, arg);
    handleInput();
    // Return focus to editor
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  const insertHtmlAtCursor = (html: string) => {
    if (readOnly) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    
    let sel, range;
    if (window.getSelection) {
      sel = window.getSelection();
      if (sel && sel.getRangeAt && sel.rangeCount) {
        range = sel.getRangeAt(0);
        
        // Ensure range is inside editor
        let node: Node | null = range.commonAncestorContainer;
        let isInside = false;
        while (node) {
          if (node === editorRef.current) {
            isInside = true;
            break;
          }
          node = node.parentNode;
        }
        
        if (isInside) {
          range.deleteContents();
          const el = document.createElement('div');
          el.innerHTML = html;
          const frag = document.createDocumentFragment();
          let childNode, lastNode;
          while ((childNode = el.firstChild)) {
            lastNode = frag.appendChild(childNode);
          }
          range.insertNode(frag);
          
          if (lastNode) {
            range = range.cloneRange();
            range.setStartAfter(lastNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          handleInput();
          return;
        }
      }
    }
    
    // Fallback: append to end
    if (editorRef.current) {
      editorRef.current.innerHTML += html;
      handleInput();
    }
  };

  const insertSuggestion = (tagValue: string) => {
    if (readOnly || !editorRef.current) return;
    editorRef.current.focus();

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      let range = sel.getRangeAt(0);
      const textNode = range.startContainer;

      if (textNode.nodeType === Node.TEXT_NODE && textNode.nodeValue) {
        const val = textNode.nodeValue;
        const offset = range.startOffset;
        const openIndex = val.lastIndexOf('{{', offset);
        if (openIndex !== -1) {
          range.setStart(textNode, openIndex);
          range.setEnd(textNode, offset);
          range.deleteContents();

          const el = document.createElement('span');
          el.innerHTML = tagValue;

          const frag = document.createDocumentFragment();
          let childNode, lastNode;
          while ((childNode = el.firstChild)) {
            lastNode = frag.appendChild(childNode);
          }
          range.insertNode(frag);

          if (lastNode) {
            range = range.cloneRange();
            range.setStartAfter(lastNode);
            range.collapse(true);
            sel.removeAllRanges();
            sel.addRange(range);
          }
          setShowSuggestions(false);
          handleInput();
          return;
        }
      }
    }

    // Fallback: replace last '{{' in innerHTML
    let html = editorRef.current.innerHTML;
    const lastOpenIdx = html.lastIndexOf('{{');
    if (lastOpenIdx !== -1) {
      html = html.substring(0, lastOpenIdx) + tagValue;
      editorRef.current.innerHTML = html;
      // Put cursor at the end
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    setShowSuggestions(false);
    handleInput();
  };

  const templates = [
    {
      name: 'Lecciones Aprendidas (Bupa PMO)',
      html: `<h3>1. ¿Qué funcionó de forma excelente?</h3>
<ul>
  <li><strong>Gestión de Proveedores:</strong> Coordinación temprana con el proveedor de analizadores clínicos.</li>
  <li><strong>Integración LIS:</strong> El pre-mapeo del importador redujo el tiempo de configuración en 3 días.</li>
</ul>
<h3>2. ¿Qué fallas ocurrieron y cómo mitigarlas?</h3>
<ul>
  <li><strong>Capacitación:</strong> Falta de asistencia del personal de laboratorio en turnos de noche. <em>Mitigación:</em> Planificar capacitaciones duplicadas en turnos de relevo.</li>
</ul>
<h3>3. Recomendaciones de Portafolio</h3>
<p>Homologar planillas de calibradores antes de iniciar fase de validaciones.</p>`
    },
    {
      name: 'Traspaso a Soporte LIS',
      html: `<h3>1. Lista de Control de Traspaso (Checklist)</h3>
<ul>
  <li>[x] Matriz de analitos y códigos de transmisión firmada por Jefatura Médica.</li>
  <li>[x] Servidores de comunicación LIS vinculados en producción.</li>
  <li>[x] SLAs de soporte de Nivel 1 y 2 definidos con mesa de ayuda.</li>
</ul>
<h3>2. Estado de Capacitación Operativa</h3>
<p>Se capacitó a un total de <strong>{{PM}}</strong> y equipo técnico asignado para dar continuidad operativa.</p>`
    },
    {
      name: 'Criterios de Aceptación Oficiales',
      html: `<p>Se certifica que el proyecto <strong>{{Proyecto}}</strong> cumple formalmente con los siguientes criterios:</p>
<ol>
  <li><strong>Funcionalidad Biomédica:</strong> Equipos médicos parametrizados al 100%.</li>
  <li><strong>Control de Calidad:</strong> Cero incidentes críticos pendientes de resolución.</li>
  <li><strong>Respaldo:</strong> Manuales técnicos y de usuario cargados en el índice de entregables.</li>
</ol>`
    }
  ];

  const placeholders = [
    { name: 'Nombre Proyecto', value: '{{Proyecto}}' },
    { name: 'Director / PM', value: '{{PM}}' },
    { name: 'Sponsor', value: '{{Sponsor}}' },
    { name: 'Fecha Go-Live', value: '{{GoLive}}' },
    { name: 'Días Desviación', value: '{{Desviacion}}' }
  ];

  return (
    <div style={{ border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', background: 'var(--bg-primary)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      
      {/* TOOLBAR */}
      {!readOnly && (
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-tertiary)', flexWrap: 'wrap', zIndex: 50 }}>
          
          {/* Basic formatting */}
          <button type="button" onClick={() => execCommand('bold')} style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--text-primary)' }} title="Negrita"><Bold size={15} /></button>
          <button type="button" onClick={() => execCommand('italic')} style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--text-primary)' }} title="Cursiva"><Italic size={15} /></button>
          <button type="button" onClick={() => execCommand('underline')} style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--text-primary)' }} title="Subrayado"><Underline size={15} /></button>
          
          <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 4px' }} />
          
          {/* Lists */}
          <button type="button" onClick={() => execCommand('insertUnorderedList')} style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--text-primary)' }} title="Lista con viñetas"><List size={15} /></button>
          <button type="button" onClick={() => execCommand('insertOrderedList')} style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--text-primary)' }} title="Lista numerada"><ListOrdered size={15} /></button>
          
          <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 4px' }} />
  
          {/* Alignment */}
          <button type="button" onClick={() => execCommand('justifyLeft')} style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--text-primary)' }} title="Alinear a la izquierda"><AlignLeft size={15} /></button>
          <button type="button" onClick={() => execCommand('justifyCenter')} style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--text-primary)' }} title="Centrar"><AlignCenter size={15} /></button>
          <button type="button" onClick={() => execCommand('justifyRight')} style={{ padding: '6px', borderRadius: '4px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', color: 'var(--text-primary)' }} title="Alinear a la derecha"><AlignRight size={15} /></button>
          
          <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 4px' }} />
  
          {/* Templates dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              type="button" 
              onClick={() => { setShowTemplates(!showTemplates); setShowPlaceholders(false); }}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: '#004B87' }}
            >
              <FileText size={14} /> Plantillas PMO <ChevronDown size={12} />
            </button>
            
            {showTemplates && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', width: '240px', zIndex: 100, overflow: 'hidden' }}>
                {templates.map((tpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      insertHtmlAtCursor(tpl.html);
                      setShowTemplates(false);
                    }}
                    style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.72rem', cursor: 'pointer', borderBottom: i < templates.length - 1 ? '1px solid var(--border-light)' : 'none', color: 'var(--text-primary)', fontWeight: 500 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            )}
          </div>
  
          {/* Placeholders dropdown */}
          <div style={{ position: 'relative' }}>
            <button 
              type="button" 
              onClick={() => { setShowPlaceholders(!showPlaceholders); setShowTemplates(false); }}
              style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--border-subtle)', background: 'var(--bg-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}
            >
              <Sparkles size={14} /> Variables <ChevronDown size={12} />
            </button>
            
            {showPlaceholders && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: '4px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', boxShadow: '0 10px 25px rgba(0,0,0,0.15)', width: '180px', zIndex: 100, overflow: 'hidden' }}>
                {placeholders.map((p, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      insertHtmlAtCursor(` ${p.value} `);
                      setShowPlaceholders(false);
                    }}
                    style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'transparent', textAlign: 'left', fontSize: '0.72rem', cursor: 'pointer', borderBottom: i < placeholders.length - 1 ? '1px solid var(--border-light)' : 'none', color: 'var(--text-primary)', fontWeight: 600 }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    {p.name} <span style={{ fontSize: '0.62rem', color: '#0079C1', marginLeft: 'auto', float: 'right' }}>{p.value}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
  
        </div>
      )}

      {/* EDITABLE DIV */}
      <style>{`
        .rich-text-editor-editable:empty::before {
          content: attr(data-placeholder);
          color: var(--text-secondary);
          opacity: 0.6;
          pointer-events: none;
          display: block;
        }
      `}</style>
      <div 
        ref={editorRef}
        contentEditable={!readOnly}
        onInput={handleInput}
        className="rich-text-editor-editable"
        style={{ 
          minHeight: readOnly ? '80px' : '140px', 
          padding: '16px', 
          outline: 'none', 
          background: readOnly ? 'var(--bg-secondary)' : 'var(--bg-primary)', 
          color: 'var(--text-primary)', 
          fontSize: '0.85rem', 
          lineHeight: 1.6, 
          fontFamily: 'inherit',
          overflowY: 'auto',
          border: readOnly ? '1px solid var(--border-subtle)' : 'none',
          borderRadius: readOnly ? '4px' : '0'
        }}
        data-placeholder={placeholder}
        onBlur={handleInput}
      />

      {/* AUTO-SUGGEST HELPER */}
      {showSuggestions && !readOnly && (
        <div className="no-print" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '8px', 
          padding: '8px 12px', 
          borderTop: '1px solid var(--border-subtle)', 
          background: 'rgba(0, 75, 135, 0.04)', 
          flexWrap: 'wrap' 
        }}>
          <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#004B87', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Asistente PMO:
          </span>
          {placeholders.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => insertSuggestion(p.value)}
              style={{
                padding: '4px 8px',
                fontSize: '0.7rem',
                fontWeight: 600,
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                color: '#0079C1',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#004B87';
                e.currentTarget.style.background = '#E0F2FE';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border-subtle)';
                e.currentTarget.style.background = 'var(--bg-primary)';
              }}
            >
              {p.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setShowSuggestions(false)}
            style={{
              marginLeft: 'auto',
              border: 'none',
              background: 'transparent',
              fontSize: '0.68rem',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontWeight: 500
            }}
          >
            Omitir
          </button>
        </div>
      )}
    </div>
  );
}
