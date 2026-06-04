const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'app', 'equipment', 'page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                        🔬 {equipName}
                                      </span>
                                      <span style={{
                                        fontSize: '0.72rem',
                                        fontWeight: 800,
                                        padding: '2px 8px',
                                        borderRadius: '99px',
                                        background: 'rgba(124, 58, 237, 0.08)',
                                        color: '#7c3aed'
                                      }}>
                                        {eqTotal} {eqTotal === 1 ? 'Analito' : 'Analitos'}
                                      </span>
                                    </div>`;

const replacementStr = `                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                                          🔬 {equipName}
                                        </span>
                                        <span style={{
                                          fontSize: '0.72rem',
                                          fontWeight: 800,
                                          padding: '2px 8px',
                                          borderRadius: '99px',
                                          background: 'rgba(124, 58, 237, 0.08)',
                                          color: '#7c3aed'
                                        }}>
                                          {eqTotal} {eqTotal === 1 ? 'Analito' : 'Analitos'}
                                        </span>
                                      </div>

                                      {/* Cambiar Sede Selector (Rectificación en caliente) */}
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700 }}>SEDE:</span>
                                        <select
                                          value={rec.id}
                                          onChange={async (e) => {
                                            const newRecId = e.target.value;
                                            if (!newRecId || newRecId === rec.id) return;
                                            const targetRec = recintos.find(r => r.id === newRecId);
                                            if (!targetRec) return;
                                            
                                            if (confirm(\`⚠️ ¿Deseas rectificar la ubicación de "\${equipName}" y trasladar sus \${eqTotal} analitos en cascada al recinto "\${targetRec.name}"?\`)) {
                                              setSaveStatus('saving');
                                              const res = await useEquipmentStore.getState().assignRecintoToInstrument(equipName, newRecId, rec.id);
                                              if (res.success) {
                                                setSaveStatus('saved');
                                                setTimeout(() => setSaveStatus('idle'), 1500);
                                              } else {
                                                alert(\`Error: \${res.message}\`);
                                                setSaveStatus('idle');
                                              }
                                            }
                                          }}
                                          style={{
                                            padding: '3px 8px',
                                            background: 'var(--bg-primary)',
                                            border: '1px solid rgba(124, 58, 237, 0.25)',
                                            borderRadius: '6px',
                                            color: '#7c3aed',
                                            fontSize: '0.72rem',
                                            fontWeight: 'bold',
                                            outline: 'none',
                                            cursor: 'pointer'
                                          }}
                                        >
                                          {recintos.map(r => (
                                            <option key={r.id} value={r.id}>
                                              {r.name}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    </div>`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replacementStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ Inyección completada exitosamente.');
} else {
  console.error('❌ No se encontró el bloque objetivo en el archivo.');
}
