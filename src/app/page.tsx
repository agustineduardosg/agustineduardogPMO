"use client";

import React, { useEffect, useMemo } from "react";
import { 
  FolderKanban, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  AlertOctagon, 
  Calendar,
  User,
  ArrowRight,
  TrendingUp,
  Activity
} from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useProjectStore } from "@/store/projectStore";
import { useUserStore } from "@/store/userStore";
import { useIncidentStore } from "@/store/incidentStore";
import { SCurveChart } from "@/components/SCurveChart";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function Home() {
  const projects = useProjectStore(state => state.projects);
  const fetchProjects = useProjectStore(state => state.fetchProjects);
  const loadingProjects = useProjectStore(state => state.isLoading);

  const users = useUserStore(state => state.users);
  const fetchUsers = useUserStore(state => state.fetchUsers);
  const loadingUsers = useUserStore(state => state.isLoading);

  const incidents = useIncidentStore(state => state.incidents);
  const fetchIncidents = useIncidentStore(state => state.fetchIncidents);
  const loadingIncidents = useIncidentStore(state => state.isLoading);

  // Cargar datos en el montaje para persistencia real y evitar datos falsos
  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchIncidents();
  }, []);

  // 1. KPIs de Proyectos
  const metrics = useMemo(() => {
    const totalProjects = projects.length;
    let totalTasks = 0;
    let completedTasks = 0;
    let upcomingTasks = 0;
    let atRiskTasks = 0;

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const today = new Date();

    projects.forEach((proj) => {
      proj.phases.forEach((ph) => {
        ph.tasks.forEach((t) => {
          totalTasks++;
          if (t.status === "Completed" || t.progress === 100) {
            completedTasks++;
          } else {
            if (t.status === "At Risk" || t.priority === "Alta") {
              atRiskTasks++;
            }
            // Upcoming: no completada y vence en los próximos 7 días
            const tEnd = new Date(t.endDate);
            if (tEnd >= today && tEnd <= sevenDaysFromNow) {
              upcomingTasks++;
            }
          }
        });
      });
    });

    const generalProgress = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;

    return {
      totalProjects,
      totalTasks,
      completedTasks,
      upcomingTasks,
      atRiskTasks,
      generalProgress
    };
  }, [projects]);

  // 2. Mapear Carga de Colaboradores (Tareas asignadas vs. Límite)
  const userWorkload = useMemo(() => {
    if (users.length === 0) return [];

    // Contar tareas no completadas asignadas a cada colaborador
    const workloadMap: Record<string, number> = {};
    users.forEach((u) => {
      workloadMap[u.name] = 0;
    });

    projects.forEach((proj) => {
      proj.phases.forEach((ph) => {
        ph.tasks.forEach((t) => {
          if (t.status !== "Completed" && t.progress < 100 && t.assignee) {
            const assigneeName = t.assignee.trim();
            // Buscar coincidencia parcial o exacta
            const foundUser = users.find(u => u.name.toLowerCase() === assigneeName.toLowerCase());
            if (foundUser) {
              workloadMap[foundUser.name] = (workloadMap[foundUser.name] || 0) + 1;
            }
          }
        });
      });
    });

    return users.map((u) => {
      const activeTasks = workloadMap[u.name] || 0;
      const limit = u.maxTasksLimit || 5;
      const ratio = activeTasks / limit;
      let status: "safe" | "warning" | "overloaded" = "safe";
      
      if (ratio > 1) status = "overloaded";
      else if (ratio >= 0.7) status = "warning";

      return {
        ...u,
        activeTasks,
        ratio,
        status
      };
    }).sort((a, b) => b.activeTasks - a.activeTasks);
  }, [users, projects]);

  // 3. Incidentes Críticos Activos (Abierto / En proceso + Impacto Crítico)
  const criticalIncidents = useMemo(() => {
    return incidents
      .filter((i) => i.estado !== "Cerrado" && i.impacto === "Crítico")
      .slice(0, 5); // Mostrar los 5 principales
  }, [incidents]);

  // 4. Próxima entrega o hito crítico (Tarea no completada con fecha de término más cercana)
  const nextMilestone = useMemo(() => {
    let nearestTask: any = null;
    const today = new Date();

    projects.forEach((proj) => {
      proj.phases.forEach((ph) => {
        ph.tasks.forEach((t) => {
          if (t.status !== "Completed" && t.progress < 100) {
            const tEnd = new Date(t.endDate);
            if (tEnd >= today) {
              if (!nearestTask || tEnd < new Date(nearestTask.endDate)) {
                nearestTask = {
                  ...t,
                  projectName: proj.name,
                  endDate: tEnd
                };
              }
            }
          }
        });
      });
    });

    return nearestTask;
  }, [projects]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 100 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
    >
      {/* HEADER PRINCIPAL EN DEGRADADO CORPORATIVO BUPA */}
      <motion.header 
        variants={itemVariants}
        style={{ 
          background: "linear-gradient(135deg, #004B87, #0079C1)",
          padding: "24px",
          borderRadius: "var(--radius-lg)",
          color: "#FFFFFF",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 8px 20px rgba(0, 75, 135, 0.15)",
          position: "relative",
          overflow: "hidden"
        }}
      >
        {/* Decoración abstracta de fondo */}
        <div style={{
          position: "absolute",
          top: "-50px",
          right: "-50px",
          width: "200px",
          height: "200px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.08)",
          pointerEvents: "none"
        }} />
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', zIndex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ 
              background: "rgba(255, 255, 255, 0.2)", 
              padding: "4px 8px", 
              borderRadius: "var(--radius-sm)", 
              fontSize: "0.75rem", 
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em"
            }}>
              Torre de Control PMO
            </span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>•</span>
            <span style={{ fontSize: "0.75rem", opacity: 0.8 }}>Bupa Chile</span>
          </div>
          <h1 style={{ color: "#FFFFFF", fontSize: "2rem", marginTop: "4px" }}>
            Smart Project Manager
          </h1>
          <p style={{ color: "rgba(255, 255, 255, 0.85)", fontSize: "0.9rem", marginTop: "4px" }}>
            Monitoreo en tiempo real de implementaciones clínicas y capacidad de colaboradores.
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px", zIndex: 1 }}>
          <Link href="/gantt" className="btn" style={{ background: "rgba(255, 255, 255, 0.2)", color: "#FFFFFF", border: "1px solid rgba(255,255,255,0.3)" }}>
            <Activity size={16} />
            Ver Carta Gantt
          </Link>
          <Link href="/projects" className="btn btn-primary" style={{ background: "#FFFFFF", color: "var(--accent-primary)", boxShadow: "none" }}>
            <FolderKanban size={16} />
            Gestión de Proyectos
          </Link>
        </div>
      </motion.header>

      {/* SECCIÓN DE METRICAS PRINCIPALES */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
        
        {/* PROYECTOS */}
        <motion.div 
          variants={itemVariants}
          className="glass-panel" 
          style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: "4px solid var(--accent-primary)" }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(0, 121, 193, 0.08)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FolderKanban size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.9rem', fontWeight: 800 }}>{metrics.totalProjects}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Proyectos Activos</p>
          </div>
        </motion.div>

        {/* PROGRESO GLOBAL */}
        <motion.div 
          variants={itemVariants}
          className="glass-panel" 
          style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: "4px solid var(--accent-success)" }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(13, 148, 136, 0.08)', color: 'var(--accent-success)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={24} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: '1.9rem', fontWeight: 800 }}>{metrics.generalProgress}%</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500, display: "flex", justifyContent: "space-between" }}>
              <span>Avance del Portafolio</span>
            </p>
            {/* Barra de Progreso */}
            <div style={{ width: '100%', height: '6px', background: 'var(--border-subtle)', borderRadius: '3px', marginTop: '6px', overflow: 'hidden' }}>
              <div style={{ width: `${metrics.generalProgress}%`, height: '100%', background: 'var(--accent-success)', borderRadius: '3px', transition: 'width 0.8s ease-out' }} />
            </div>
          </div>
        </motion.div>

        {/* PRÓXIMAS A VENCER */}
        <motion.div 
          variants={itemVariants}
          className="glass-panel" 
          style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: "4px solid var(--accent-warning)" }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(245, 158, 11, 0.08)', color: 'var(--accent-warning)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Clock size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.9rem', fontWeight: 800 }}>{metrics.upcomingTasks}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Vencimientos (7 días)</p>
          </div>
        </motion.div>

        {/* CRÍTICOS / ALTA PRIORIDAD */}
        <motion.div 
          variants={itemVariants}
          className="glass-panel" 
          style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderLeft: "4px solid var(--accent-danger)" }}
        >
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(225, 29, 72, 0.08)', color: 'var(--accent-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={24} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.9rem', fontWeight: 800 }}>{metrics.atRiskTasks}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Tareas Críticas / Riesgo</p>
          </div>
        </motion.div>

      </section>

      {/* CUERPO CENTRAL: CURVA S & HEATMAP DE COLABORADORES */}
      <section className="dashboard-grid-1">
        
        {/* GRÁFICO CURVA S */}
        <motion.div 
          variants={itemVariants}
          className="glass-panel" 
          style={{ padding: '24px', minHeight: '360px', display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
          {loadingProjects ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px", color: "var(--text-muted)" }}>
              Cargando Curva S...
            </div>
          ) : (
            <SCurveChart projects={projects} />
          )}
        </motion.div>

        {/* HEATMAP DE CARGA DE COLABORADORES (HH) */}
        <motion.div 
          variants={itemVariants}
          className="glass-panel" 
          style={{ padding: '24px', display: 'flex', flexDirection: "column", gap: "16px" }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Carga y Capacidad (H-H)</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: "4px" }}>
              Visualización en tiempo real de tareas activas vs. límite recomendado.
            </p>
          </div>

          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "14px", 
            maxHeight: "300px", 
            overflowY: "auto",
            paddingRight: "4px" 
          }}>
            {loadingUsers ? (
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Cargando colaboradores...</span>
            ) : userWorkload.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                No hay colaboradores registrados en el sistema.
              </div>
            ) : (
              userWorkload.map((u) => {
                // Color semántico de capacidad
                let barColor = "var(--accent-success)";
                let badgeBg = "rgba(13, 148, 136, 0.1)";
                let badgeText = "var(--accent-success)";
                let label = "Óptima";

                if (u.status === "overloaded") {
                  barColor = "var(--accent-danger)";
                  badgeBg = "rgba(225, 29, 72, 0.1)";
                  badgeText = "var(--accent-danger)";
                  label = "Sobrecargado";
                } else if (u.status === "warning") {
                  barColor = "var(--accent-warning)";
                  badgeBg = "rgba(245, 158, 11, 0.1)";
                  badgeText = "var(--accent-warning)";
                  label = "Al Límite";
                }

                return (
                  <div key={u.id} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ 
                          width: "32px", 
                          height: "32px", 
                          borderRadius: "50%", 
                          background: "var(--bg-tertiary)", 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "center",
                          color: "var(--text-secondary)",
                          fontSize: "0.85rem",
                          fontWeight: 700
                        }}>
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>{u.name}</div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{u.role}</div>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ 
                          fontSize: "0.7rem", 
                          fontWeight: 700, 
                          padding: "2px 6px", 
                          borderRadius: "var(--radius-sm)",
                          background: badgeBg,
                          color: badgeText
                        }}>
                          {label}
                        </span>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-primary)" }}>
                          {u.activeTasks} / {u.maxTasksLimit}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Capacidad */}
                    <div style={{ width: "100%", height: "6px", background: "var(--border-subtle)", borderRadius: "3px", overflow: "hidden" }}>
                      <div style={{ 
                        width: `${Math.min(100, (u.activeTasks / u.maxTasksLimit) * 100)}%`, 
                        height: "100%", 
                        background: barColor, 
                        borderRadius: "3px",
                        transition: "width 0.5s ease-out" 
                      }} />
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <Link href="/masters" style={{ 
            fontSize: "0.8rem", 
            color: "var(--accent-primary)", 
            fontWeight: 600, 
            display: "flex", 
            alignItems: "center", 
            gap: "4px",
            marginTop: "auto",
            alignSelf: "flex-end"
          }}>
            Gestionar Colaboradores <ArrowRight size={14} />
          </Link>
        </motion.div>
      </section>

      {/* SECCIÓN INFERIOR: PRÓXIMO HITO Y FEED DE INCIDENTES CRÍTICOS */}
      <section className="dashboard-grid-2">
        
        {/* MILESTONE / PRÓXIMO HITO CRÍTICO */}
        <motion.div 
          variants={itemVariants}
          className="glass-panel" 
          style={{ padding: '24px', display: 'flex', flexDirection: "column", gap: "16px", justifyContent: "space-between" }}
        >
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>Próximo Hito de Entrega</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: "4px" }}>
              La entrega más próxima que requiere atención inmediata.
            </p>
          </div>

          {nextMilestone ? (
            <div style={{ 
              background: "linear-gradient(135deg, rgba(0, 121, 193, 0.03), rgba(14, 165, 233, 0.03))",
              border: "1px dashed var(--border-light)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "12px"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", color: "var(--accent-primary)", fontWeight: 700, textTransform: "uppercase" }}>
                    {nextMilestone.projectName}
                  </span>
                  <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginTop: "2px" }}>{nextMilestone.name}</h4>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--accent-danger)", fontSize: "0.8rem", fontWeight: 600 }}>
                  <Clock size={14} />
                  <span>Vence {formatDistanceToNow(nextMilestone.endDate, { addSuffix: true, locale: es })}</span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <User size={14} />
                  <span>Responsable: <strong>{nextMilestone.assignee}</strong></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <Calendar size={14} />
                  <span>Fecha: <strong>{nextMilestone.endDate.toLocaleDateString("es-ES")}</strong></span>
                </div>
              </div>

              {/* Barra de progreso de la tarea */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", fontWeight: 600, marginBottom: "4px" }}>
                  <span>Progreso Actual</span>
                  <span>{nextMilestone.progress}%</span>
                </div>
                <div style={{ width: "100%", height: "6px", background: "var(--border-subtle)", borderRadius: "3px", overflow: "hidden" }}>
                  <div style={{ width: `${nextMilestone.progress}%`, height: "100%", background: "var(--accent-primary)", borderRadius: "3px" }} />
                </div>
              </div>
            </div>
          ) : (
            <div style={{ 
              textAlign: "center", 
              padding: "40px 10px", 
              color: "var(--text-muted)", 
              fontSize: "0.85rem",
              border: "1px dashed var(--border-light)",
              borderRadius: "var(--radius-md)",
            }}>
              No hay hitos activos próximos registrados.
            </div>
          )}

          <Link href="/gantt" className="btn btn-secondary" style={{ width: "100%", fontSize: "0.8rem" }}>
            Planificar Nuevos Hitos
          </Link>
        </motion.div>

        {/* FEED DE INCIDENTES CRÍTICOS */}
        <motion.div 
          variants={itemVariants}
          className="glass-panel" 
          style={{ padding: '24px', display: 'flex', flexDirection: "column", gap: "16px" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}>
                <AlertOctagon size={18} color="var(--accent-danger)" />
                Incidentes Críticos Activos
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: "4px" }}>
                Eventos abiertos con impacto crítico que amenazan las fechas de entrega.
              </p>
            </div>
            {criticalIncidents.length > 0 && (
              <span style={{ 
                background: "rgba(225, 29, 72, 0.1)", 
                color: "var(--accent-danger)", 
                fontSize: "0.75rem", 
                fontWeight: 700, 
                padding: "2px 8px", 
                borderRadius: "var(--radius-full)" 
              }}>
                {criticalIncidents.length} Críticos
              </span>
            )}
          </div>

          <div style={{ 
            display: "flex", 
            flexDirection: "column", 
            gap: "12px", 
            maxHeight: "260px", 
            overflowY: "auto" 
          }}>
            {loadingIncidents ? (
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Cargando incidentes...</span>
            ) : criticalIncidents.length === 0 ? (
              <div style={{ 
                textAlign: "center", 
                padding: "40px 10px", 
                color: "var(--text-success)", 
                fontSize: "0.85rem",
                background: "rgba(13, 148, 136, 0.03)",
                border: "1px dashed rgba(13, 148, 136, 0.3)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px"
              }}>
                <CheckCircle2 size={24} />
                <span>¡Excelente! No hay incidentes críticos abiertos en el portafolio.</span>
              </div>
            ) : (
              criticalIncidents.map((inc) => (
                <div 
                  key={inc.id} 
                  style={{ 
                    border: "1px solid rgba(225, 29, 72, 0.2)",
                    background: "rgba(225, 29, 72, 0.02)",
                    borderRadius: "var(--radius-md)",
                    padding: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    transition: "transform var(--transition-fast) ease-in-out"
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--accent-danger)" }}>
                      #{inc.indexId} - {inc.recintoName} ({inc.equipmentName})
                    </span>
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", fontWeight: 500 }}>
                      Fase: {inc.faseAfectada}
                    </span>
                  </div>

                  <p style={{ fontSize: "0.8rem", color: "var(--text-primary)", fontWeight: 500, margin: 0 }}>
                    {inc.descripcion}
                  </p>

                  {inc.planDeAccion && (
                    <div style={{ 
                      fontSize: "0.75rem", 
                      color: "var(--text-secondary)", 
                      background: "rgba(0,0,0,0.02)", 
                      padding: "6px 10px", 
                      borderRadius: "var(--radius-sm)",
                      borderLeft: "2.5px solid var(--text-muted)"
                    }}>
                      <strong>Acción:</strong> {inc.planDeAccion}
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.7rem", color: "var(--text-muted)" }}>
                    <span>Reportado el {inc.fecha}</span>
                    <span>Responsable: <strong style={{ color: "var(--text-secondary)" }}>{inc.responsable}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link href="/incidents" style={{ 
            fontSize: "0.8rem", 
            color: "var(--accent-primary)", 
            fontWeight: 600, 
            display: "flex", 
            alignItems: "center", 
            gap: "4px",
            marginTop: "auto",
            alignSelf: "flex-end"
          }}>
            Ver Todos los Incidentes <ArrowRight size={14} />
          </Link>
        </motion.div>

      </section>
    </motion.div>
  );
}
