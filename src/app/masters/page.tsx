"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useEquipmentStore, Recinto } from '@/store/equipmentStore';
import { useUserStore, MasterUser } from '@/store/userStore';
import { useProjectStore } from '@/store/projectStore';
import { Plus, Trash2, UserPlus, Building, Users, X, Settings, ShieldAlert, CheckCircle2, AlertTriangle, Play, HelpCircle } from 'lucide-react';

export default function MastersPage() {
  // Conexión con los stores persistentes utilizando selectores atómicos
  const recintos = useEquipmentStore(state => state.recintos);
  const addRecinto = useEquipmentStore(state => state.addRecinto);
  const deleteRecinto = useEquipmentStore(state => state.deleteRecinto);
  const fetchEquipmentData = useEquipmentStore(state => state.fetchEquipmentData);

  const users = useUserStore(state => state.users);
  const addUser = useUserStore(state => state.addUser);
  const deleteUser = useUserStore(state => state.deleteUser);
  const fetchUsers = useUserStore(state => state.fetchUsers);

  const projects = useProjectStore(state => state.projects);
  const fetchProjects = useProjectStore(state => state.fetchProjects);

  useEffect(() => {
    fetchEquipmentData();
    fetchUsers();
    fetchProjects();
  }, []);

  const [activeTab, setActiveTab] = useState<'recintos' | 'colaboradores'>('recintos');

  // Form states de creación
  const [showRecintoModal, setShowRecintoModal] = useState(false);
  const [recintoForm, setRecintoForm] = useState({ name: '', code: '' });

  const [showUserModal, setShowUserModal] = useState(false);
  const [userForm, setUserForm] = useState<{
    name: string;
    email: string;
    role: MasterUser['role'];
    maxTasksLimit: number;
  }>({
    name: '',
    email: '',
    role: 'Project Manager',
    maxTasksLimit: 5
  });

  // Cálculo de Carga de Trabajo de Colaboradores en Tiempo Real
  const workloadStats = useMemo(() => {
    const stats: Record<string, { total: number; active: number; completed: number; overdue: number; notStarted: number }> = {};
    
    // Inicializar mapa de estadísticas para todos los colaboradores registrados
    users.forEach(u => {
      stats[u.name] = { total: 0, active: 0, completed: 0, overdue: 0, notStarted: 0 };
    });

    const today = new Date();

    // Escanear recursivamente todos los proyectos, fases y tareas
    projects.forEach(proj => {
      proj.phases.forEach(phase => {
        phase.tasks.forEach(task => {
          const assigneeName = task.assignee;
          
          // Si el responsable está en nuestro maestro de colaboradores, sumar sus métricas
          if (stats[assigneeName]) {
            stats[assigneeName].total++;
            
            if (task.status === 'In Progress' || task.status === 'At Risk') {
              stats[assigneeName].active++;
            } else if (task.status === 'Completed' || task.progress === 100) {
              stats[assigneeName].completed++;
            } else {
              stats[assigneeName].notStarted++;
            }

            // Detección de tareas Atrasadas (fecha término menor que hoy y avance menor al 100%)
            const isOverdue = new Date(task.endDate) < today && task.progress < 100;
            if (isOverdue) {
              stats[assigneeName].overdue++;
            }
          }
        });
      });
    });

    return stats;
  }, [users, projects]);

  // Obtener opciones dinámicas de roles ingresadas por otros usuarios
  const uniqueUserRoles = useMemo(() => {
    const defaults = ['Project Manager', 'Ingeniero Biomédico', 'Físico Médico', 'Técnico de TI', 'Mantenimiento Climatización'];
    const uniques = new Set<string>();
    users.forEach(u => {
      if (u.role && !defaults.includes(u.role)) {
        uniques.add(u.role);
      }
    });
    return Array.from(uniques);
  }, [users]);

  // Manejo de Recintos
  const handleSaveRecinto = () => {
    if (!recintoForm.name.trim() || !recintoForm.code.trim()) return;
    const newRecinto: Recinto = {
      id: `rec-${Date.now()}`,
      name: recintoForm.name,
      code: `ID: ${recintoForm.code}`,
      isActive: true
    };
    addRecinto(newRecinto);
    setShowRecintoModal(false);
    setRecintoForm({ name: '', code: '' });
  };

  // Manejo de Colaboradores
  const handleSaveUser = () => {
    if (!userForm.name.trim() || !userForm.email.trim()) return;
    const newUser: MasterUser = {
      id: `usr-${Date.now()}`,
      ...userForm
    };
    addUser(newUser);
    setShowUserModal(false);
    setUserForm({
      name: '',
      email: '',
      role: 'Project Manager',
      maxTasksLimit: 5
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={28} style={{ color: 'var(--accent-primary)' }} /> Consola de Maestros
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>Administra los datos maestros globales del sistema (Sedes Clínicas y Capacidad de Colaboradores)</p>
      </div>

      {/* Tabs Select */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', gap: '8px' }}>
        <button
          onClick={() => setActiveTab('recintos')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'recintos' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'recintos' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Building size={16} /> Sedes Clínicas Bupa
        </button>
        <button
          onClick={() => setActiveTab('colaboradores')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'colaboradores' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'colaboradores' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease'
          }}
        >
          <Users size={16} /> Capacidad de Colaboradores (H-H Tareas)
        </button>
      </div>

      {/* Content Area */}
      <div className="glass-panel" style={{ padding: '24px', flex: 1 }}>
        {activeTab === 'recintos' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Sedes y Recintos Prestadores</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>Sedes autorizadas para la instalación y certificación de equipos médicos</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowRecintoModal(true)} style={{ gap: '8px' }}>
                <Plus size={16} /> Agregar Sede
              </button>
            </div>

            {/* List */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-light)' }}>
                    <th style={{ padding: '12px 16px' }}>Código Sede</th>
                    <th style={{ padding: '12px 16px' }}>Nombre Sede / Centro de Salud</th>
                    <th style={{ padding: '12px 16px' }}>Estado Operativo</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '100px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {recintos.map(recinto => (
                    <tr key={recinto.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{recinto.code}</td>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>{recinto.name}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                          Activo
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <button 
                          onClick={() => { if(confirm('¿Eliminar esta sede? Se borrarán todos sus equipos asociados.')) deleteRecinto(recinto.id); }} 
                          style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Carga y Disponibilidad de Colaboradores</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>Monitoreo en tiempo real de tareas asignadas para prevenir sobrecarga de trabajo</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowUserModal(true)} style={{ gap: '8px' }}>
                <UserPlus size={16} /> Agregar Colaborador
              </button>
            </div>

            {/* List */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left', minWidth: '1000px' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-light)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '12px 16px' }}>Colaborador / Especialidad</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Tareas Totales</th>
                    <th style={{ padding: '12px 16px', width: '220px' }}>Capacidad Tareas Activas (Semáforo)</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Distribución de Estado</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--accent-danger)' }}>Atrasadas</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '100px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => {
                    const stats = workloadStats[user.name] || { total: 0, active: 0, completed: 0, overdue: 0, notStarted: 0 };
                    
                    const isOverloaded = stats.active > user.maxTasksLimit;
                    const progressPercent = Math.min((stats.active / user.maxTasksLimit) * 100, 100);
                    
                    // Colores del semáforo
                    const loadColor = isOverloaded 
                      ? '#ef4444' // Rojo sobrecarga
                      : stats.active === user.maxTasksLimit 
                        ? '#f59e0b' // Naranja límite
                        : '#0079C1'; // Azul normal
                    
                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        {/* Nombre, Rol, Email */}
                        <td style={{ padding: '16px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: isOverloaded ? 'rgba(239,68,68,0.1)' : 'rgba(0,121,193,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isOverloaded ? '#ef4444' : 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.9rem' }}>
                              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{user.name}</div>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '2px' }}>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user.email}</span>
                                <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>{user.role}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Tareas Totales */}
                        <td style={{ padding: '16px 16px', textAlign: 'center', fontWeight: 'bold', fontSize: '1rem' }}>
                          {stats.total}
                        </td>

                        {/* Semáforo de Capacidad */}
                        <td style={{ padding: '16px 16px' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              <span style={{ color: loadColor }}>
                                {stats.active} de {user.maxTasksLimit} activas
                              </span>
                              {isOverloaded && (
                                <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem' }}>
                                  <ShieldAlert size={12} /> Sobrecarga
                                </span>
                              )}
                            </div>
                            <div style={{ height: '6px', background: 'var(--border-light)', borderRadius: '99px', overflow: 'hidden' }}>
                              <div 
                                style={{ 
                                  height: '100%', 
                                  width: `${progressPercent}%`, 
                                  background: loadColor, 
                                  borderRadius: '99px',
                                  transition: 'width 0.4s ease'
                                }} 
                              />
                            </div>
                          </div>
                        </td>

                        {/* Distribución de Estados */}
                        <td style={{ padding: '16px 16px' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <span title="Sin Iniciar" style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                              {stats.notStarted}
                            </span>
                            <span title="En Progreso" style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(2, 132, 199, 0.1)', color: 'var(--accent-primary)' }}>
                              {stats.active}
                            </span>
                            <span title="Completadas" style={{ fontSize: '0.7rem', fontWeight: 'bold', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                              {stats.completed}
                            </span>
                          </div>
                        </td>

                        {/* Atrasadas */}
                        <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                          {stats.overdue > 0 ? (
                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', padding: '3px 8px', borderRadius: '4px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <AlertTriangle size={12} /> {stats.overdue} atrasada{stats.overdue !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>0</span>
                          )}
                        </td>

                        {/* Acciones */}
                        <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                          <button 
                            onClick={() => { if(confirm('¿Eliminar colaborador de la nómina?')) deleteUser(user.id); }} 
                            style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.7 }}
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showRecintoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '400px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Registrar Nueva Sede</h3>
              <button className="icon-btn" onClick={() => setShowRecintoModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Código Sede (ej: 4057)</label>
                <input type="text" value={recintoForm.code} onChange={e => setRecintoForm({...recintoForm, code: e.target.value})} placeholder="4057"
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Nombre Sede</label>
                <input type="text" value={recintoForm.name} onChange={e => setRecintoForm({...recintoForm, name: e.target.value})} placeholder="Ej: BUPA CLA"
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <button className="btn btn-primary" onClick={handleSaveRecinto} style={{ marginTop: '10px', justifyContent: 'center' }}>
                Guardar Sede
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '450px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Registrar Colaborador</h3>
              <button className="icon-btn" onClick={() => setShowUserModal(false)}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Nombre Completo</label>
                <input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} placeholder="Ej: Agustín Eduardo"
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Email Corporativo</label>
                <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} placeholder="nombre@bupa.cl"
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Rol Especialista</label>
                <select 
                  value={userForm.role} 
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '__custom__') {
                      const customVal = prompt("Ingrese rol especialista personalizado:");
                      if (customVal && customVal.trim()) {
                        setUserForm({...userForm, role: customVal.trim()});
                      }
                    } else {
                      setUserForm({...userForm, role: val});
                    }
                  }}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
                  <option value="Project Manager">Project Manager</option>
                  <option value="Ingeniero Biomédico">Ingeniero Biomédico</option>
                  <option value="Físico Médico">Físico Médico</option>
                  <option value="Técnico de TI">Técnico de TI</option>
                  <option value="Mantenimiento Climatización">Mantenimiento Climatización</option>
                  {uniqueUserRoles.map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                  {!['Project Manager', 'Ingeniero Biomédico', 'Físico Médico', 'Técnico de TI', 'Mantenimiento Climatización'].includes(userForm.role) && !uniqueUserRoles.includes(userForm.role) && userForm.role && (
                    <option value={userForm.role}>{userForm.role}</option>
                  )}
                  <option value="__custom__">➕ Otro...</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Límite de Tareas Activas Recomendadas</label>
                <input type="number" value={userForm.maxTasksLimit} onChange={e => setUserForm({...userForm, maxTasksLimit: Number(e.target.value)})}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <button className="btn btn-primary" onClick={handleSaveUser} style={{ marginTop: '10px', justifyContent: 'center' }}>
                Guardar Colaborador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
