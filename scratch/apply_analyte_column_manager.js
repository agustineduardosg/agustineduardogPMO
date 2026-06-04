const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'equipment', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Inyectar estado de hiddenAnalyteCols
const stateTarget = "  const [currentTab, setCurrentTab] = useState<'tracking' | 'analytes'>('tracking');";
const stateInjection = `  const [currentTab, setCurrentTab] = useState<'tracking' | 'analytes'>('tracking');
  const [hiddenAnalyteCols, setHiddenAnalyteCols] = useState<string[]>([]);`;

if (content.includes(stateTarget) && !content.includes('hiddenAnalyteCols')) {
  content = content.replace(stateTarget, stateInjection);
}

// 2. Inyectar carga/guardado de hiddenAnalyteCols
const loadTarget = "    const savedHiddenCols = localStorage.getItem('hidden_cols_equipments');";
const loadInjection = `    const savedHiddenCols = localStorage.getItem('hidden_cols_equipments');
    const savedHiddenAnalytes = localStorage.getItem('hidden_cols_analytes');
    if (savedHiddenAnalytes) {
      try {
        setHiddenAnalyteCols(JSON.parse(savedHiddenAnalytes));
      } catch (e) {
        console.error('Error loading hidden analyte columns', e);
      }
    }`;

if (content.includes(loadTarget) && !content.includes('savedHiddenAnalytes')) {
  content = content.replace(loadTarget, loadInjection);
}

const saveTarget = "  const saveDefaultColNames = (names: Record<string, string>) => {";
const saveInjection = `  const saveHiddenAnalyteCols = (cols: string[]) => {
    setHiddenAnalyteCols(cols);
    localStorage.setItem('hidden_cols_analytes', JSON.stringify(cols));
  };

  const saveDefaultColNames = (names: Record<string, string>) => {`;

if (content.includes(saveTarget) && !content.includes('saveHiddenAnalyteCols')) {
  content = content.replace(saveTarget, saveInjection);
}

// 3. Modificar el Modal de Columnas para alternar según la pestaña activa
const modalTarget = `      {/* Modal de Administración de Columnas */}
      {isAddingCol && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card" style={{ width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#003B64', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} />
                Administrar Columnas
              </h3>
              <button onClick={() => setIsAddingCol(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* 1. SECCIÓN COLUMNAS PREDETERMINADAS DEL SISTEMA */}`;

const modalReplacement = `      {/* Modal de Administración de Columnas */}
      {isAddingCol && (
        <div className="custom-modal-backdrop">
          <div className="custom-modal-card" style={{ width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: currentTab === 'analytes' ? '#7c3aed' : '#003B64', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sliders size={18} />
                {currentTab === 'analytes' ? 'Administrar Columnas de Analitos' : 'Administrar Columnas'}
              </h3>
              <button onClick={() => setIsAddingCol(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {currentTab === 'analytes' ? (
              /* SECCIÓN COLUMNAS DE ANALITOS */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#7c3aed', textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px', display: 'block' }}>
                    Columnas de la Matriz de Analitos
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                    {[
                      { key: 'transmissionCode', name: 'Código de Transmisión' },
                      { key: 'testCode', name: 'Código de Test / Código Analito' },
                      { key: 'description', name: 'Descripción Extensa' },
                      { key: 'section', name: 'Sección / Laboratorio' },
                      { key: 'state', name: 'Estado de Transmisión' }
                    ].map(({ key, name }) => {
                      const isHidden = hiddenAnalyteCols.includes(key);
                      return (
                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: isHidden ? 'var(--bg-tertiary)' : 'var(--bg-primary)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)', opacity: isHidden ? 0.6 : 1 }}>
                          <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textDecoration: isHidden ? 'line-through' : 'none' }}>
                            {name} {isHidden && <span style={{ fontSize: '0.7rem', color: 'red', fontWeight: 'normal' }}>(Oculta)</span>}
                          </span>
                          {isHidden ? (
                            <button 
                              type="button"
                              onClick={() => {
                                const updated = hiddenAnalyteCols.filter(c => c !== key);
                                saveHiddenAnalyteCols(updated);
                              }}
                              className="btn"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Mostrar
                            </button>
                          ) : (
                            <button 
                              type="button"
                              onClick={() => {
                                const updated = [...hiddenAnalyteCols, key];
                                saveHiddenAnalyteCols(updated);
                              }}
                              className="btn"
                              style={{ padding: '4px 8px', fontSize: '0.72rem', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              Ocultar
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* 1. SECCIÓN COLUMNAS PREDETERMINADAS DEL SISTEMA */`;

if (content.includes(modalTarget)) {
  content = content.replace(modalTarget, modalReplacement);
}

// Agregar el paréntesis de cierre para la sección de original columnas en el modal
// Busquemos el cierre de la etiqueta form o del div de customColumns para inyectar el cierre del condicional
// En el original:
//       </div>
//       <button className="btn btn-secondary"...
//       ...
//       className="btn btn-primary"...
//       Listo
//       </button>
//     </div>
//   </div>
// )}

const modalEndTarget = `              </div>
            </div>

            <button 
              className="btn btn-primary" 
              onClick={() => setIsAddingCol(false)} 
              style={{ width: '100%', marginTop: '16px', background: '#004B87', color: 'white', border: 'none' }}
            >
              Listo
            </button>
          </div>
        </div>
      )}`;

const modalEndReplacement = `              </div>
            </div>
            )}

            <button 
              className="btn btn-primary" 
              onClick={() => setIsAddingCol(false)} 
              style={{ width: '100%', marginTop: '16px', background: currentTab === 'analytes' ? '#7c3aed' : '#004B87', color: 'white', border: 'none' }}
            >
              Listo
            </button>
          </div>
        </div>
      )}`;

if (content.includes(modalEndTarget)) {
  content = content.replace(modalEndTarget, modalEndReplacement);
}

// 4. Modificar tablas de analitos para ocultar/mostrar columnas
// Tabla de Analitos Asignados
const assignedTableHeader = `<tr style={{ background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                                          <th style={{ padding: '10px 16px' }}>Cód. Transmisión</th>
                                          <th style={{ padding: '10px 12px' }}>Cód. Test / Código Analito</th>
                                          <th style={{ padding: '10px 12px' }}>Nombre del Analito</th>
                                          <th style={{ padding: '10px 12px' }}>Descripción</th>
                                          <th style={{ padding: '10px 12px' }}>Sección / Lab</th>
                                          <th style={{ padding: '10px 16px', width: '150px', textAlign: 'center' }}>Estado Transmisión</th>
                                        </tr>`;

const assignedTableHeaderReplacement = `<tr style={{ background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                                          {!hiddenAnalyteCols.includes('transmissionCode') && <th style={{ padding: '10px 16px' }}>Cód. Transmisión</th>}
                                          {!hiddenAnalyteCols.includes('testCode') && <th style={{ padding: '10px 12px' }}>Cód. Test / Código Analito</th>}
                                          <th style={{ padding: '10px 12px' }}>Nombre del Analito</th>
                                          {!hiddenAnalyteCols.includes('description') && <th style={{ padding: '10px 12px' }}>Descripción</th>}
                                          {!hiddenAnalyteCols.includes('section') && <th style={{ padding: '10px 12px' }}>Sección / Lab</th>}
                                          {!hiddenAnalyteCols.includes('state') && <th style={{ padding: '10px 16px', width: '150px', textAlign: 'center' }}>Estado Transmisión</th>}
                                        </tr>`;

if (content.includes(assignedTableHeader)) {
  content = content.replace(assignedTableHeader, assignedTableHeaderReplacement);
}

const assignedTableRow = `<tr key={analyte.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', background: 'var(--bg-primary)' }} className="table-row-hover">
                                            <td style={{ padding: '10px 16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                              {analyte.transmissionCode}
                                            </td>
                                            <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                              {analyte.testCode}
                                            </td>
                                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#7c3aed' }}>
                                              {analyte.name}
                                            </td>
                                            <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={analyte.description}>
                                              {analyte.description || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Sin descripción</span>}
                                            </td>
                                            <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                              {analyte.section}
                                            </td>
                                            <td style={{ padding: '6px 16px', textAlign: 'center' }}>
                                              <CustomAnalyteSelect 
                                                value={analyte.state}
                                                onChange={(val) => {
                                                  handleUpdateAnalyte(analyte.id, { state: val });
                                                }}
                                              />
                                            </td>
                                          </tr>`;

const assignedTableRowReplacement = `<tr key={analyte.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', background: 'var(--bg-primary)' }} className="table-row-hover">
                                            {!hiddenAnalyteCols.includes('transmissionCode') && <td style={{ padding: '10px 16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                              {analyte.transmissionCode}
                                            </td>}
                                            {!hiddenAnalyteCols.includes('testCode') && <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                              {analyte.testCode}
                                            </td>}
                                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#7c3aed' }}>
                                              {analyte.name}
                                            </td>
                                            {!hiddenAnalyteCols.includes('description') && <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={analyte.description}>
                                              {analyte.description || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Sin descripción</span>}
                                            </td>}
                                            {!hiddenAnalyteCols.includes('section') && <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                              {analyte.section}
                                            </td>}
                                            {!hiddenAnalyteCols.includes('state') && <td style={{ padding: '6px 16px', textAlign: 'center' }}>
                                              <CustomAnalyteSelect 
                                                value={analyte.state}
                                                onChange={(val) => {
                                                  handleUpdateAnalyte(analyte.id, { state: val });
                                                }}
                                              />
                                            </td>}
                                          </tr>`;

if (content.includes(assignedTableRow)) {
  content = content.replace(assignedTableRow, assignedTableRowReplacement);
}

// Tabla de Analitos Pendientes (Sin Sede)
const unassignedTableHeader = `<tr style={{ background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                                      <th style={{ padding: '10px 16px' }}>Cód. Transmisión</th>
                                      <th style={{ padding: '10px 12px' }}>Cód. Test</th>
                                      <th style={{ padding: '10px 12px' }}>Nombre del Analito</th>
                                      <th style={{ padding: '10px 12px' }}>Descripción</th>
                                      <th style={{ padding: '10px 12px' }}>Sección / Lab</th>
                                    </tr>`;

const unassignedTableHeaderReplacement = `<tr style={{ background: 'rgba(0,0,0,0.01)', borderBottom: '1px solid var(--border-light)', color: 'var(--text-secondary)', fontWeight: 700 }}>
                                      {!hiddenAnalyteCols.includes('transmissionCode') && <th style={{ padding: '10px 16px' }}>Cód. Transmisión</th>}
                                      {!hiddenAnalyteCols.includes('testCode') && <th style={{ padding: '10px 12px' }}>Cód. Test</th>}
                                      <th style={{ padding: '10px 12px' }}>Nombre del Analito</th>
                                      {!hiddenAnalyteCols.includes('description') && <th style={{ padding: '10px 12px' }}>Descripción</th>}
                                      {!hiddenAnalyteCols.includes('section') && <th style={{ padding: '10px 12px' }}>Sección / Lab</th>}
                                    </tr>`;

if (content.includes(unassignedTableHeader)) {
  content = content.replace(unassignedTableHeader, unassignedTableHeaderReplacement);
}

const unassignedTableRow = `<tr key={analyte.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', background: 'var(--bg-primary)' }}>
                                        <td style={{ padding: '10px 16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                          {analyte.transmissionCode}
                                        </td>
                                        <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                          {analyte.testCode}
                                        </td>
                                        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--accent-warning)' }}>
                                          {analyte.name}
                                        </td>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={analyte.description}>
                                          {analyte.description || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Sin descripción</span>}
                                        </td>
                                        <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                          {analyte.section}
                                        </td>
                                      </tr>`;

const unassignedTableRowReplacement = `<tr key={analyte.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.02)', background: 'var(--bg-primary)' }}>
                                        {!hiddenAnalyteCols.includes('transmissionCode') && <td style={{ padding: '10px 16px', fontWeight: 700, fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                          {analyte.transmissionCode}
                                        </td>}
                                        {!hiddenAnalyteCols.includes('testCode') && <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                          {analyte.testCode}
                                        </td>}
                                        <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--accent-warning)' }}>
                                          {analyte.name}
                                        </td>
                                        {!hiddenAnalyteCols.includes('description') && <td style={{ padding: '10px 12px', color: 'var(--text-muted)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={analyte.description}>
                                          {analyte.description || <span style={{ fontStyle: 'italic', opacity: 0.6 }}>Sin descripción</span>}
                                        </td>}
                                        {!hiddenAnalyteCols.includes('section') && <td style={{ padding: '10px 12px', color: 'var(--text-secondary)' }}>
                                          {analyte.section}
                                        </td>}
                                      </tr>`;

if (content.includes(unassignedTableRow)) {
  content = content.replace(unassignedTableRow, unassignedTableRowReplacement);
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('✅ Inyección y configuración de columnas de analitos completada.');
