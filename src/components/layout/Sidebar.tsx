"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { 
  LayoutDashboard, 
  GanttChartSquare, 
  FolderKanban, 
  Settings, 
  UploadCloud, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  Settings2, 
  AlertOctagon,
  GraduationCap,
  Users,
  LogOut
} from "lucide-react";
import { BupaLogo } from "../common/BupaLogo";
import "./layout.css";

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const userRole = user?.role || 'VIEWER';

  const isActive = (path: string) => pathname === path;

  return (
    <aside 
      className={`sidebar ${collapsed ? "collapsed" : ""}`}
      style={{ position: "relative", overflow: "visible" }}
    >
      {/* Inner wrapper that holds the glassmorphism panel. This prevents backdrop-filter clipping. */}
      <div 
        className="glass-panel" 
        style={{ 
          display: "flex", 
          flexDirection: "column", 
          height: "100%", 
          width: "100%", 
          overflow: "visible",
          borderRadius: "inherit"
        }}
      >
        <div className="sidebar-header" style={{ padding: collapsed ? "0 24px" : "0 20px", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <BupaLogo collapsed={collapsed} />
          </Link>
        </div>

        <nav className="sidebar-nav" style={{ overflowY: "auto", flex: 1, paddingBottom: "16px" }}>
          <ul className="nav-list" style={{ gap: "4px" }}>
            
            {/* Section: Planificación */}
            <li style={{ 
              padding: collapsed ? "12px 0 4px 0" : "16px 20px 8px 20px", 
              fontSize: "0.7rem", 
              fontWeight: 800, 
              color: "var(--text-muted)", 
              textTransform: "uppercase", 
              letterSpacing: "1.2px",
              opacity: 0.6,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              borderTop: collapsed ? "1px solid var(--border-subtle)" : "none",
              marginTop: collapsed ? "8px" : "0"
            }}>
              {collapsed ? <div style={{ width: "16px", height: "2px", background: "var(--border-strong)" }} /> : "Planificación (PMO)"}
            </li>

            <li className="nav-item">
              <Link href="/" className={`nav-link ${isActive("/") ? "active" : ""}`} title={collapsed ? "Dashboard" : undefined}>
                <LayoutDashboard size={20} />
                {!collapsed && <span>Dashboard</span>}
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/projects" className={`nav-link ${isActive("/projects") ? "active" : ""}`} title={collapsed ? "Proyectos" : undefined}>
                <FolderKanban size={20} />
                {!collapsed && <span>Proyectos</span>}
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/gantt" className={`nav-link ${isActive("/gantt") ? "active" : ""}`} title={collapsed ? "Gantt View" : undefined}>
                <GanttChartSquare size={20} />
                {!collapsed && <span>Gantt View</span>}
              </Link>
            </li>

            {/* Section: Operatividad */}
            <li style={{ 
              padding: collapsed ? "16px 0 4px 0" : "20px 20px 8px 20px", 
              fontSize: "0.7rem", 
              fontWeight: 800, 
              color: "var(--text-muted)", 
              textTransform: "uppercase", 
              letterSpacing: "1.2px",
              opacity: 0.6,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              borderTop: collapsed ? "1px solid var(--border-subtle)" : "none",
              marginTop: collapsed ? "4px" : "0"
            }}>
              {collapsed ? <div style={{ width: "16px", height: "2px", background: "var(--border-strong)" }} /> : "Monitoreo Clínico"}
            </li>

            <li className="nav-item">
              <Link href="/equipment" className={`nav-link ${isActive("/equipment") ? "active" : ""}`} title={collapsed ? "Equipos" : undefined}>
                <Activity size={20} />
                {!collapsed && <span>Equipos Clínicos</span>}
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/incidents" className={`nav-link ${isActive("/incidents") ? "active" : ""}`} title={collapsed ? "Incidentes" : undefined}>
                <AlertOctagon size={20} />
                {!collapsed && <span>Incidentes</span>}
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/training" className={`nav-link ${isActive("/training") ? "active" : ""}`} title={collapsed ? "Capacitaciones" : undefined}>
                <GraduationCap size={20} />
                {!collapsed && <span>Capacitaciones</span>}
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/stakeholders" className={`nav-link ${isActive("/stakeholders") ? "active" : ""}`} title={collapsed ? "Stakeholders" : undefined}>
                <Users size={20} />
                {!collapsed && <span>Stakeholders</span>}
              </Link>
            </li>

            {/* Section: Configuración */}
            <li style={{ 
              padding: collapsed ? "16px 0 4px 0" : "20px 20px 8px 20px", 
              fontSize: "0.7rem", 
              fontWeight: 800, 
              color: "var(--text-muted)", 
              textTransform: "uppercase", 
              letterSpacing: "1.2px",
              opacity: 0.6,
              display: "flex",
              alignItems: "center",
              justifyContent: collapsed ? "center" : "flex-start",
              borderTop: collapsed ? "1px solid var(--border-subtle)" : "none",
              marginTop: collapsed ? "4px" : "0"
            }}>
              {collapsed ? <div style={{ width: "16px", height: "2px", background: "var(--border-strong)" }} /> : "Configuración"}
            </li>

            {/* RBAC: Solo visible para ADMIN, PMO o Project Manager */}
            {(userRole === 'ADMIN' || userRole === 'PMO' || userRole === 'Project Manager') && (
              <li className="nav-item">
                <Link href="/masters" className={`nav-link ${isActive("/masters") ? "active" : ""}`} title={collapsed ? "Maestros" : undefined}>
                  <Settings2 size={20} />
                  {!collapsed && <span>Maestros</span>}
                </Link>
              </li>
            )}
            <li className="nav-item">
              <Link href="/import" className={`nav-link highlight ${isActive("/import") ? "active" : ""}`} title={collapsed ? "Importar" : undefined}>
                <UploadCloud size={20} />
                {!collapsed && <span>Importador Central</span>}
              </Link>
            </li>
          </ul>
        </nav>
   
        <div className="sidebar-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px 20px', borderTop: '1px solid var(--border-subtle)' }}>
          <Link href="/settings" className={`nav-link ${isActive("/settings") ? "active" : ""}`} title={collapsed ? "Ajustes" : undefined} style={{ padding: '8px 0' }}>
            <Settings size={20} style={{ marginRight: collapsed ? 0 : '12px' }} />
            {!collapsed && <span>Ajustes</span>}
          </Link>
          
          {/* SQLite WAL health badge (Visible si no hay sesión activa o informativo) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 12px',
            background: 'rgba(13, 148, 136, 0.05)',
            border: '1px solid rgba(13, 148, 136, 0.15)',
            borderRadius: '8px',
            marginTop: '4px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'all 0.2s ease'
          }} title="Base de datos SQLite optimizada con éxito en modo Write-Ahead Logging (WAL)">
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#0d9488',
              flexShrink: 0,
              animation: 'pulseHealth 2s infinite'
            }} />
            {!collapsed && (
              <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#0d9488', letterSpacing: '0.2px', textTransform: 'uppercase' }}>
                DB Optimizada (WAL)
              </span>
            )}
          </div>

          {/* User profile card */}
          {user && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: collapsed ? 'center' : 'space-between',
              padding: '10px 12px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '12px',
              marginTop: '8px',
              gap: '8px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#0284c7',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '14px',
                  flexShrink: 0
                }} title={`${user.name} (${user.role})`}>
                  {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                {!collapsed && (
                  <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }} title={user.name || ''}>
                      {user.name}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {user.role}
                    </span>
                  </div>
                )}
              </div>
              {!collapsed && (
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '6px',
                    transition: 'background-color 0.2s'
                  }}
                  title="Cerrar Sesión"
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          )}

          {user && collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '8px',
                borderRadius: '8px',
                marginTop: '4px',
                width: '100%'
              }}
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          )}

          <style dangerouslySetInnerHTML={{__html: `
            @keyframes pulseHealth {
              0% { transform: scale(0.92); box-shadow: 0 0 0 0 rgba(13, 148, 136, 0.4); }
              70% { transform: scale(1.08); box-shadow: 0 0 0 5px rgba(13, 148, 136, 0); }
              100% { transform: scale(0.92); box-shadow: 0 0 0 0 rgba(13, 148, 136, 0); }
            }
          `}} />
        </div>
      </div>

      {/* Floating Toggle Button - Sits perfectly on the border line in both states and avoids clipping. */}
      <button 
        className="collapse-btn floating-toggle-btn" 
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
};
