"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useEquipmentStore, Recinto } from '@/store/equipmentStore';
import { useUserStore, MasterUser } from '@/store/userStore';
import { useProjectStore } from '@/store/projectStore';
import { useMasterEquipmentStore, MasterEquipment } from '@/store/masterEquipmentStore';
import { 
  Plus, Trash2, UserPlus, Building, Users, X, Settings, 
  ShieldAlert, AlertTriangle, Edit2, Search, SlidersHorizontal, Stethoscope, 
  HelpCircle, HeartPulse, Check, Folder, Layers, Loader2
} from 'lucide-react';

export default function MastersPage() {
  // Conexión con los stores persistentes utilizando selectores atómicos
  const recintos = useEquipmentStore(state => state.recintos);
  const equipments = useEquipmentStore(state => state.equipments);
  const addRecinto = useEquipmentStore(state => state.addRecinto);
  const updateRecinto = useEquipmentStore(state => state.updateRecinto);
  const deleteRecinto = useEquipmentStore(state => state.deleteRecinto);
  const fetchEquipmentData = useEquipmentStore(state => state.fetchEquipmentData);
  const isRecintosLoading = useEquipmentStore(state => state.isLoading);

  const users = useUserStore(state => state.users);
  const addUser = useUserStore(state => state.addUser);
  const updateUser = useUserStore(state => state.updateUser);
  const deleteUser = useUserStore(state => state.deleteUser);
  const fetchUsers = useUserStore(state => state.fetchUsers);
  const isUsersLoading = useUserStore(state => state.isLoading);

  const projects = useProjectStore(state => state.projects);
  const fetchProjects = useProjectStore(state => state.fetchProjects);
  const parentProjects = useProjectStore(state => state.parentProjects);
  const fetchParentProjects = useProjectStore(state => state.fetchParentProjects);
  const addParentProject = useProjectStore(state => state.addParentProject);
  const updateParentProject = useProjectStore(state => state.updateParentProject);
  const deleteParentProject = useProjectStore(state => state.deleteParentProject);
  const isProjectsLoading = useProjectStore(state => state.isLoading);

  const masterEquipments = useMasterEquipmentStore(state => state.masterEquipments);
  const fetchMasterEquipments = useMasterEquipmentStore(state => state.fetchMasterEquipments);
  const addMasterEquipment = useMasterEquipmentStore(state => state.addMasterEquipment);
  const updateMasterEquipment = useMasterEquipmentStore(state => state.updateMasterEquipment);
  const deleteMasterEquipment = useMasterEquipmentStore(state => state.deleteMasterEquipment);
  const isMasterEqLoading = useMasterEquipmentStore(state => state.isLoading);

  const releasePhases = useEquipmentStore(state => state.releasePhases);
  const fetchReleasePhases = useEquipmentStore(state => state.fetchReleasePhases);
  const createReleasePhase = useEquipmentStore(state => state.createReleasePhase);
  const updateReleasePhase = useEquipmentStore(state => state.updateReleasePhase);
  const deleteReleasePhase = useEquipmentStore(state => state.deleteReleasePhase);

  useEffect(() => {
    fetchEquipmentData();
    fetchUsers();
    fetchProjects();
    fetchMasterEquipments();
    fetchParentProjects();
    fetchReleasePhases();
  }, []);

  const [activeTab, setActiveTab] = useState<'recintos' | 'colaboradores' | 'equipos' | 'programas' | 'olas'>('recintos');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncFromInventory = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/master-equipments/sync', {
        method: 'POST'
      });
      if (!response.ok) throw new Error('Error al sincronizar');
      const data = await response.json();
      alert(`¡Sincronización Exitosa! ${data.message}`);
      await fetchMasterEquipments();
      await fetchEquipmentData();
    } catch (e: any) {
      console.error(e);
      alert('Ocurrió un error al sincronizar los equipos desde el inventario.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Búsquedas y filtros locales
  const [recintoSearch, setRecintoSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [equipmentFilterSection, setEquipmentFilterSection] = useState('all');
  const [ppSearch, setPpSearch] = useState('');
  const [rpSearch, setRpSearch] = useState('');

  // Form states de creación / edición
  const [showRecintoModal, setShowRecintoModal] = useState(false);
  const [editingRecinto, setEditingRecinto] = useState<Recinto | null>(null);
  const [recintoForm, setRecintoForm] = useState({ name: '', code: '' });

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<MasterUser | null>(null);
  const [userForm, setUserForm] = useState<{
    name: string;
    email: string;
    role: string;
    maxTasksLimit: number;
    password?: string;
  }>({
    name: '',
    email: '',
    role: 'Project Manager',
    maxTasksLimit: 5,
    password: ''
  });

  const [showEqModal, setShowEqModal] = useState(false);
  const [editingEq, setEditingEq] = useState<MasterEquipment | null>(null);
  const [eqForm, setEqForm] = useState({
    name: '',
    section: 'General',
    category: 'Clínico'
  });

  const [showPpModal, setShowPpModal] = useState(false);
  const [editingPp, setEditingPp] = useState<any | null>(null);
  const [ppForm, setPpForm] = useState({ name: '', description: '' });

  const [showRpModal, setShowRpModal] = useState(false);
  const [editingRp, setEditingRp] = useState<any | null>(null);
  const [rpForm, setRpForm] = useState({ name: '', description: '', isActive: true });

  // Filtros aplicados a los Recintos
  const filteredRecintos = useMemo(() => {
    return recintos.filter(r => 
      r.name.toLowerCase().includes(recintoSearch.toLowerCase()) || 
      r.code.toLowerCase().includes(recintoSearch.toLowerCase())
    );
  }, [recintos, recintoSearch]);

  // Filtros aplicados a los Colaboradores
  const filteredUsers = useMemo(() => {
    return users.filter(u => 
      u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.email.toLowerCase().includes(userSearch.toLowerCase()) || 
      u.role.toLowerCase().includes(userSearch.toLowerCase())
    );
  }, [users, userSearch]);

  // Filtros aplicados a los Proyectos Padres
  const filteredParentProjects = useMemo(() => {
    return parentProjects.filter(pp => 
      pp.name.toLowerCase().includes(ppSearch.toLowerCase()) || 
      (pp.description && pp.description.toLowerCase().includes(ppSearch.toLowerCase()))
    );
  }, [parentProjects, ppSearch]);

  // Filtros aplicados a las Fases de Liberación
  const filteredReleasePhases = useMemo(() => {
    return releasePhases.filter(rp => 
      rp.name.toLowerCase().includes(rpSearch.toLowerCase()) || 
      (rp.description && rp.description.toLowerCase().includes(rpSearch.toLowerCase()))
    );
  }, [releasePhases, rpSearch]);

  // Filtros aplicados a los Equipos del Catálogo
  const filteredMasterEquipments = useMemo(() => {
    return masterEquipments.filter(eq => {
      const matchesSearch = eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
                            eq.section.toLowerCase().includes(equipmentSearch.toLowerCase());
      const matchesSection = equipmentFilterSection === 'all' || eq.section === equipmentFilterSection;
      return matchesSearch && matchesSection;
    });
  }, [masterEquipments, equipmentSearch, equipmentFilterSection]);

  // Secciones únicas de equipos médicos cargados
  const uniqueEqSections = useMemo(() => {
    const sections = new Set<string>();
    masterEquipments.forEach(eq => {
      if (eq.section) sections.add(eq.section);
    });
    return Array.from(sections).sort();
  }, [masterEquipments]);

  // Estadísticas de Equipamiento Activo en Clínicas Bupa
  const activeInstallationsCount = useMemo(() => {
    const counts: Record<string, number> = {};
    equipments.forEach(eq => {
      if (eq.name) {
        const name = eq.name.trim();
        counts[name] = (counts[name] || 0) + 1;
      }
    });
    return counts;
  }, [equipments]);

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

  // Manejo de Recintos (Sedes) - Crear / Editar
  const handleOpenRecintoModal = (recinto?: Recinto) => {
    if (recinto) {
      setEditingRecinto(recinto);
      setRecintoForm({ name: recinto.name, code: recinto.code.replace('ID: ', '') });
    } else {
      setEditingRecinto(null);
      setRecintoForm({ name: '', code: '' });
    }
    setShowRecintoModal(true);
  };

  const handleSaveRecinto = async () => {
    if (!recintoForm.name.trim() || !recintoForm.code.trim()) return;
    
    if (editingRecinto) {
      // Editar
      await updateRecinto(editingRecinto.id, {
        name: recintoForm.name,
        code: `ID: ${recintoForm.code}`
      });
    } else {
      // Agregar
      const newRecinto: Recinto = {
        id: `rec-${Date.now()}`,
        name: recintoForm.name,
        code: `ID: ${recintoForm.code}`,
        isActive: true
      };
      await addRecinto(newRecinto);
    }
    
    setShowRecintoModal(false);
    setRecintoForm({ name: '', code: '' });
    setEditingRecinto(null);
  };

  // Manejo de Colaboradores - Crear / Editar
  const handleOpenUserModal = (user?: MasterUser) => {
    if (user) {
      setEditingUser(user);
      setUserForm({
        name: user.name,
        email: user.email,
        role: user.role,
        maxTasksLimit: user.maxTasksLimit,
        password: '' // En blanco para mantener contraseña
      });
    } else {
      setEditingUser(null);
      setUserForm({
        name: '',
        email: '',
        role: 'Project Manager',
        maxTasksLimit: 5,
        password: ''
      });
    }
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.name.trim() || !userForm.email.trim()) return;
    if (!editingUser && !userForm.password?.trim()) {
      alert('La contraseña es obligatoria para nuevos colaboradores.');
      return;
    }

    const payload = {
      ...userForm,
      password: userForm.password?.trim() ? userForm.password : undefined
    };

    if (editingUser) {
      // Editar
      await updateUser(editingUser.id, payload);
    } else {
      // Agregar
      const newUser: MasterUser = {
        id: `usr-${Date.now()}`,
        ...payload
      };
      await addUser(newUser);
    }
    
    setShowUserModal(false);
    setUserForm({
      name: '',
      email: '',
      role: 'Project Manager',
      maxTasksLimit: 5,
      password: ''
    });
    setEditingUser(null);
  };

  // Manejo de Programas (Proyectos Padres)
  const handleOpenPpModal = (pp?: any) => {
    if (pp) {
      setEditingPp(pp);
      setPpForm({ name: pp.name, description: pp.description || '' });
    } else {
      setEditingPp(null);
      setPpForm({ name: '', description: '' });
    }
    setShowPpModal(true);
  };

  const handleSavePp = async () => {
    if (!ppForm.name.trim()) return;
    if (editingPp) {
      await updateParentProject(editingPp.id, ppForm.name, ppForm.description);
    } else {
      await addParentProject(ppForm.name, ppForm.description);
    }
    setShowPpModal(false);
    setPpForm({ name: '', description: '' });
    setEditingPp(null);
  };

  // Manejo de Olas (Fases de Liberación)
  const handleOpenRpModal = (rp?: any) => {
    if (rp) {
      setEditingRp(rp);
      setRpForm({ name: rp.name, description: rp.description || '', isActive: rp.isActive });
    } else {
      setEditingRp(null);
      setRpForm({ name: '', description: '', isActive: true });
    }
    setShowRpModal(true);
  };

  const handleSaveRp = async () => {
    if (!rpForm.name.trim()) return;
    if (editingRp) {
      await updateReleasePhase(editingRp.id, rpForm.name, rpForm.description, rpForm.isActive);
    } else {
      const res = await createReleasePhase(rpForm.name, rpForm.description);
      if (res && !res.success) {
        alert(`Error: ${res.error}`);
        return;
      }
    }
    setShowRpModal(false);
    setRpForm({ name: '', description: '', isActive: true });
    setEditingRp(null);
  };

  // Manejo de Catálogo de Equipos - Crear / Editar
  const handleOpenEqModal = (eq?: MasterEquipment) => {
    if (eq) {
      setEditingEq(eq);
      setEqForm({
        name: eq.name,
        section: eq.section,
        category: eq.category
      });
    } else {
      setEditingEq(null);
      setEqForm({
        name: '',
        section: 'General',
        category: 'Clínico'
      });
    }
    setShowEqModal(true);
  };

  const handleSaveEq = async () => {
    if (!eqForm.name.trim()) return;

    if (editingEq) {
      // Editar (con renombrado en cascada automático por transacción en API)
      await updateMasterEquipment(editingEq.id, eqForm);
      // Recargar datos clínicos por si hubo renombrado en cascada
      await fetchEquipmentData();
    } else {
      // Agregar
      await addMasterEquipment(eqForm);
    }

    setShowEqModal(false);
    setEqForm({ name: '', section: 'General', category: 'Clínico' });
    setEditingEq(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '24px', overflow: 'hidden' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Settings size={28} style={{ color: 'var(--accent-primary)' }} /> Consola de Maestros
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0' }}>Administra los datos maestros globales del sistema (Sedes Clínicas, Catálogo de Equipos y Colaboradores)</p>
      </div>

      {/* Tabs Select */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-light)', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
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
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Building size={16} /> Sedes Clínicas Bupa
        </button>
        
        <button
          onClick={() => setActiveTab('equipos')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'equipos' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'equipos' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Stethoscope size={16} /> Catálogo de Equipamiento Médico
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
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Users size={16} /> Capacidad de Colaboradores
        </button>

        <button
          onClick={() => setActiveTab('programas')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'programas' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'programas' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Folder size={16} /> Programas (Proyectos Padres)
        </button>

        <button
          onClick={() => setActiveTab('olas')}
          style={{
            padding: '12px 20px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'olas' ? '3px solid var(--accent-primary)' : '3px solid transparent',
            color: activeTab === 'olas' ? 'var(--accent-primary)' : 'var(--text-secondary)',
            fontWeight: 700,
            fontSize: '0.95rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Layers size={16} /> Olas (Fases de Liberación)
        </button>
      </div>

      {/* Content Area */}
      <div style={{ padding: '24px', flex: 1, overflowY: 'auto', minHeight: 0, background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', boxShadow: 'var(--panel-shadow)', display: 'flex', flexDirection: 'column' }}>
        
        {/* TAB 1: RECINTOS (SEDES CLINICAS) */}
        {activeTab === 'recintos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Sedes y Recintos Prestadores</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>Sedes autorizadas para la instalación y certificación de equipos médicos</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar sede..."
                    value={recintoSearch}
                    onChange={e => setRecintoSearch(e.target.value)}
                    style={{ padding: '8px 12px 8px 30px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none', width: '200px' }}
                  />
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenRecintoModal()} style={{ gap: '8px', padding: '8px 16px' }}>
                  <Plus size={16} /> Agregar Sede
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-light)' }}>
                    <th style={{ padding: '12px 16px' }}>Código Sede</th>
                    <th style={{ padding: '12px 16px' }}>Nombre Sede / Centro de Salud</th>
                    <th style={{ padding: '12px 16px' }}>Estado Operativo</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isRecintosLoading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '36px', textAlign: 'center', color: 'var(--accent-primary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Loader2 className="animate-spin" size={24} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Cargando sedes clínicas...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRecintos.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No se encontraron sedes que coincidan con la búsqueda.
                      </td>
                    </tr>
                  ) : (
                    filteredRecintos.map(recinto => (
                      <tr key={recinto.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{recinto.code}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{recinto.name}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                            Activo
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleOpenRecintoModal(recinto)} 
                              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}
                              title="Editar Sede"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button 
                              onClick={() => { if(confirm('¿Eliminar esta sede? Se borrarán todos sus equipos asociados de forma irreversible.')) deleteRecinto(recinto.id); }} 
                              style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}
                              title="Eliminar Sede"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: CATALOGO DE EQUIPAMIENTO MEDICO */}
        {activeTab === 'equipos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HeartPulse size={20} style={{ color: '#ef4444' }} /> Catálogo Maestro de Equipos Clínicos
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>Especificaciones de marcas, modelos y tecnologías clínicas autorizadas en Bupa Chile</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar equipo..."
                    value={equipmentSearch}
                    onChange={e => setEquipmentSearch(e.target.value)}
                    style={{ padding: '8px 12px 8px 30px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none', width: '200px' }}
                  />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <SlidersHorizontal size={14} style={{ color: 'var(--text-muted)' }} />
                  <select
                    value={equipmentFilterSection}
                    onChange={e => setEquipmentFilterSection(e.target.value)}
                    style={{ padding: '8px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none' }}
                  >
                    <option value="all">Todas las especialidades</option>
                    {uniqueEqSections.map(sec => (
                      <option key={sec} value={sec}>{sec}</option>
                    ))}
                  </select>
                </div>

                <button 
                  className="btn btn-secondary shadow-sm" 
                  onClick={handleSyncFromInventory} 
                  disabled={isSyncing}
                  style={{ 
                    gap: '8px', 
                    border: '1px dashed #10b981', 
                    background: 'rgba(16, 185, 129, 0.05)', 
                    color: '#10b981',
                    fontWeight: 700,
                    padding: '8px 16px'
                  }}
                >
                  {isSyncing ? 'Cargando...' : '🔄 Cargar desde Inventario'}
                </button>

                <button className="btn btn-primary" onClick={() => handleOpenEqModal()} style={{ gap: '8px', padding: '8px 16px' }}>
                  <Plus size={16} /> Registrar Equipo
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-light)' }}>
                    <th style={{ padding: '12px 16px' }}>Nombre del Modelo / Equipo</th>
                    <th style={{ padding: '12px 16px' }}>Sección / Especialidad</th>
                    <th style={{ padding: '12px 16px' }}>Tipo de Categoría</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Instalaciones Activas en Bupa</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isMasterEqLoading ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: 'var(--accent-primary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Loader2 className="animate-spin" size={24} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Cargando catálogo maestro...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredMasterEquipments.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No se encontraron equipos biomédicos en el catálogo maestro.
                      </td>
                    </tr>
                  ) : (
                    filteredMasterEquipments.map(eq => {
                      const count = activeInstallationsCount[eq.name] || 0;
                      return (
                        <tr key={eq.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{eq.name}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                              {eq.section}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>{eq.category}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            {count > 0 ? (
                              <span style={{ fontSize: '0.78rem', fontWeight: 'bold', padding: '3px 10px', borderRadius: '12px', background: 'rgba(0,121,193,0.1)', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                <Check size={12} /> {count} clínica{count !== 1 ? 's' : ''} activa{count !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Sin implementaciones</span>
                            )}
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => handleOpenEqModal(eq)} 
                                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}
                                title="Editar Especificación"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button 
                                onClick={() => { if(confirm('¿Eliminar este equipo del catálogo? Conservará los equipos instalados pero no constará en la nómina maestra.')) deleteMasterEquipment(eq.id); }} 
                                style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}
                                title="Eliminar del Catálogo"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: COLABORADORES (USERS) */}
        {activeTab === 'colaboradores' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Carga y Disponibilidad de Colaboradores</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>Monitoreo en tiempo real de tareas asignadas para prevenir sobrecarga de trabajo</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar colaborador..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    style={{ padding: '8px 12px 8px 30px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none', width: '200px' }}
                  />
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenUserModal()} style={{ gap: '8px', padding: '8px 16px' }}>
                  <UserPlus size={16} /> Agregar Colaborador
                </button>
              </div>
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
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isUsersLoading ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--accent-primary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Loader2 className="animate-spin" size={24} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Cargando nómina de colaboradores...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No se encontraron colaboradores en la nómina.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map(user => {
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
                            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                              <button 
                                onClick={() => handleOpenUserModal(user)} 
                                style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}
                                title="Editar Colaborador"
                              >
                                <Edit2 size={15} />
                              </button>
                              <button 
                                onClick={() => { if(confirm('¿Eliminar colaborador de la nómina?')) deleteUser(user.id); }} 
                                style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer', opacity: 0.7 }}
                                title="Eliminar Colaborador"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: PROGRAMAS (PROYECTOS PADRES) */}
        {activeTab === 'programas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Programas / Proyectos Padres</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>Agrupadores lógicos de proyectos del portafolio PMO</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar programa..."
                    value={ppSearch}
                    onChange={e => setPpSearch(e.target.value)}
                    style={{ padding: '8px 12px 8px 30px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none', width: '200px' }}
                  />
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenPpModal()} style={{ gap: '8px', padding: '8px 16px' }}>
                  <Plus size={16} /> Crear Programa
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-light)' }}>
                    <th style={{ padding: '12px 16px' }}>Nombre del Programa / Portafolio</th>
                    <th style={{ padding: '12px 16px' }}>Descripción</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Proyectos Vinculados</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isProjectsLoading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '36px', textAlign: 'center', color: 'var(--accent-primary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Loader2 className="animate-spin" size={24} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Cargando programas de proyectos...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredParentProjects.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No se encontraron programas de proyectos.
                      </td>
                    </tr>
                  ) : (
                    filteredParentProjects.map(pp => (
                      <tr key={pp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{pp.name}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{pp.description || 'Sin descripción'}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: '12px', background: 'rgba(0,121,193,0.1)', color: 'var(--accent-primary)' }}>
                            {pp.projects?.length || 0} proyecto(s)
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleOpenPpModal(pp)} 
                              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}
                              title="Editar Programa"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button 
                              onClick={() => { if(confirm('¿Eliminar este programa? Los proyectos asociados no se borrarán, pero perderán su agrupación.')) deleteParentProject(pp.id); }} 
                              style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}
                              title="Eliminar Programa"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: OLAS (FASES DE LIBERACION) */}
        {activeTab === 'olas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Olas / Fases de Liberación (Go-Live)</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '4px 0 0' }}>Planificación de olas incrementales de puesta en marcha para equipamiento clínico</p>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    placeholder="Buscar ola..."
                    value={rpSearch}
                    onChange={e => setRpSearch(e.target.value)}
                    style={{ padding: '8px 12px 8px 30px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: '6px', fontSize: '0.82rem', color: 'var(--text-primary)', outline: 'none', width: '200px' }}
                  />
                </div>
                <button className="btn btn-primary" onClick={() => handleOpenRpModal()} style={{ gap: '8px', padding: '8px 16px' }}>
                  <Plus size={16} /> Crear Ola
                </button>
              </div>
            </div>

            {/* List */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-light)' }}>
                    <th style={{ padding: '12px 16px' }}>Nombre de la Ola / Fase</th>
                    <th style={{ padding: '12px 16px' }}>Descripción / Comentarios</th>
                    <th style={{ padding: '12px 16px' }}>Estado</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center', width: '120px' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isRecintosLoading ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '36px', textAlign: 'center', color: 'var(--accent-primary)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <Loader2 className="animate-spin" size={24} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>Cargando olas de liberación...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredReleasePhases.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No se encontraron olas de liberación.
                      </td>
                    </tr>
                  ) : (
                    filteredReleasePhases.map(rp => (
                      <tr key={rp.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 'bold', color: 'var(--accent-primary)' }}>{rp.name}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{rp.description || 'Sin descripción'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 700, 
                            padding: '3px 8px', 
                            borderRadius: '12px', 
                            background: rp.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(107,114,128,0.1)', 
                            color: rp.isActive ? '#10b981' : '#6b7280' 
                          }}>
                            {rp.isActive ? 'Activa' : 'Inactiva'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button 
                              onClick={() => handleOpenRpModal(rp)} 
                              style={{ background: 'none', border: 'none', color: 'var(--accent-primary)', cursor: 'pointer' }}
                              title="Editar Ola"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button 
                              onClick={() => { if(confirm('¿Eliminar esta ola de liberación? Equipos y analitos asociados perderán su ola pero no se eliminarán.')) deleteReleasePhase(rp.id); }} 
                              style={{ background: 'none', border: 'none', color: 'var(--accent-danger)', cursor: 'pointer' }}
                              title="Eliminar Ola"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: REGISTRAR / EDITAR RECINTO */}
      {showRecintoModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '400px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {editingRecinto ? 'Editar Sede Clínica' : 'Registrar Nueva Sede'}
              </h3>
              <button className="icon-btn" onClick={() => setShowRecintoModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
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
                {editingRecinto ? 'Guardar Cambios' : 'Guardar Sede'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR COLABORADOR */}
      {showUserModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '450px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                {editingUser ? 'Editar Colaborador' : 'Registrar Colaborador'}
              </h3>
              <button className="icon-btn" onClick={() => setShowUserModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
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
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Contraseña {editingUser ? '(Opcional)' : '*'}</label>
                <input 
                  type="password" 
                  value={userForm.password || ''} 
                  onChange={e => setUserForm({...userForm, password: e.target.value})} 
                  placeholder={editingUser ? 'Dejar en blanco para mantener contraseña' : 'Mínimo 6 caracteres'}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Rol Especialista / Acceso</label>
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
                  <option value="ADMIN">Administrador (ADMIN)</option>
                  <option value="Project Manager">Project Manager (PM)</option>
                  <option value="VIEWER">Visualizador (VIEWER)</option>
                  <option value="Ingeniero Biomédico">Ingeniero Biomédico</option>
                  <option value="Físico Médico">Físico Médico</option>
                  <option value="Técnico de TI">Técnico de TI</option>
                  <option value="Mantenimiento Climatización">Mantenimiento Climatización</option>
                  {uniqueUserRoles.map(opt => (
                    opt !== 'ADMIN' && opt !== 'Project Manager' && opt !== 'VIEWER' && opt !== 'Ingeniero Biomédico' && opt !== 'Físico Médico' && opt !== 'Técnico de TI' && opt !== 'Mantenimiento Climatización' && (
                      <option key={opt} value={opt}>{opt}</option>
                    )
                  ))}
                  {!['ADMIN', 'Project Manager', 'VIEWER', 'Ingeniero Biomédico', 'Físico Médico', 'Técnico de TI', 'Mantenimiento Climatización'].includes(userForm.role) && !uniqueUserRoles.includes(userForm.role) && userForm.role && (
                    <option value={userForm.role}>{userForm.role}</option>
                  )}
                  <option value="__custom__">➕ Otro rol personalizado...</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Límite de Tareas Activas Recomendadas</label>
                <input type="number" value={userForm.maxTasksLimit} onChange={e => setUserForm({...userForm, maxTasksLimit: Number(e.target.value)})}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <button className="btn btn-primary" onClick={handleSaveUser} style={{ marginTop: '10px', justifyContent: 'center' }}>
                {editingUser ? 'Guardar Cambios' : 'Guardar Colaborador'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR EQUIPO DEL CATALOGO */}
      {showEqModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '420px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Stethoscope size={18} />
                {editingEq ? 'Editar Modelo del Catálogo' : 'Añadir Modelo al Catálogo'}
              </h3>
              <button className="icon-btn" onClick={() => setShowEqModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Nombre / Modelo del Equipo</label>
                <input 
                  type="text" 
                  value={eqForm.name} 
                  onChange={e => setEqForm({...eqForm, name: e.target.value})} 
                  placeholder="Ej: Advia 2120 o Monitor Multiparámetro"
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} 
                />
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Sección / Especialidad</label>
                <select 
                  value={eqForm.section} 
                  onChange={e => {
                    const val = e.target.value;
                    if (val === '__custom__') {
                      const customVal = prompt("Ingrese especialidad / sección personalizada:");
                      if (customVal && customVal.trim()) {
                        setEqForm({...eqForm, section: customVal.trim()});
                      }
                    } else {
                      setEqForm({...eqForm, section: val});
                    }
                  }}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
                  <option value="General">General</option>
                  <option value="Hematología">Hematología</option>
                  <option value="Química">Química</option>
                  <option value="Orinas">Orinas</option>
                  <option value="Gases">Gases</option>
                  <option value="Inmunología">Inmunología</option>
                  <option value="Microbiología">Microbiología</option>
                  {uniqueEqSections.map(opt => (
                    opt !== 'General' && opt !== 'Hematología' && opt !== 'Química' && opt !== 'Orinas' && opt !== 'Gases' && opt !== 'Inmunología' && opt !== 'Microbiología' && (
                      <option key={opt} value={opt}>{opt}</option>
                    )
                  ))}
                  <option value="__custom__">➕ Otra especialidad...</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Tipo de Categoría</label>
                <select 
                  value={eqForm.category} 
                  onChange={e => setEqForm({...eqForm, category: e.target.value})}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }}>
                  <option value="Clínico">Clínico (Biomédico)</option>
                  <option value="No Clínico">No Clínico (Soporte / TI)</option>
                </select>
              </div>

              {editingEq && (
                <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px', borderRadius: '6px', fontSize: '0.78rem', color: '#b45309', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>Aviso de Edición en Cascada:</strong> Renombrar este modelo actualizará automáticamente el nombre en todas las instalaciones activas de todas las sedes clínicas asociadas en Bupa Chile.
                  </div>
                </div>
              )}

              <button className="btn btn-primary" onClick={handleSaveEq} style={{ marginTop: '10px', justifyContent: 'center' }}>
                {editingEq ? 'Guardar Cambios' : 'Guardar en Catálogo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR PROGRAMA */}
      {showPpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '420px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Folder size={18} />
                {editingPp ? 'Editar Programa' : 'Crear Programa / Portafolio'}
              </h3>
              <button className="icon-btn" onClick={() => setShowPpModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Nombre del Programa *</label>
                <input 
                  type="text" 
                  value={ppForm.name} 
                  onChange={e => setPpForm({...ppForm, name: e.target.value})} 
                  placeholder="Ej: Portafolio Clínicas Bupa 2026"
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Descripción</label>
                <textarea 
                  value={ppForm.description} 
                  onChange={e => setPpForm({...ppForm, description: e.target.value})} 
                  placeholder="Descripción del agrupador..."
                  rows={3}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} 
                />
              </div>
              <button className="btn btn-primary" onClick={handleSavePp} style={{ marginTop: '10px', justifyContent: 'center' }}>
                {editingPp ? 'Guardar Cambios' : 'Crear Programa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR / EDITAR OLA DE LIBERACION */}
      {showRpModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(3px)' }}>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', width: '420px', padding: '24px', border: '1px solid var(--border-light)', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} />
                {editingRp ? 'Editar Ola de Liberación' : 'Crear Ola de Liberación (Wave)'}
              </h3>
              <button className="icon-btn" onClick={() => setShowRpModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Nombre de la Ola (ej: Ola 1 - Q1) *</label>
                <input 
                  type="text" 
                  value={rpForm.name} 
                  onChange={e => setRpForm({...rpForm, name: e.target.value})} 
                  placeholder="Ej: Ola 1"
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none' }} 
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>Descripción / Objetivos</label>
                <textarea 
                  value={rpForm.description} 
                  onChange={e => setRpForm({...rpForm, description: e.target.value})} 
                  placeholder="Descripción de la ola..."
                  rows={3}
                  style={{ width: '100%', padding: '10px', background: 'var(--bg-primary)', border: '1px solid var(--border-light)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }} 
                />
              </div>
              {editingRp && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input 
                    type="checkbox" 
                    id="rp-active" 
                    checked={rpForm.isActive} 
                    onChange={e => setRpForm({...rpForm, isActive: e.target.checked})} 
                  />
                  <label htmlFor="rp-active" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Fase de Liberación Activa</label>
                </div>
              )}
              <button className="btn btn-primary" onClick={handleSaveRp} style={{ marginTop: '10px', justifyContent: 'center' }}>
                {editingRp ? 'Guardar Cambios' : 'Crear Ola'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
