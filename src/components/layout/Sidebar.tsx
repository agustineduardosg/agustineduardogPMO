"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Users
} from "lucide-react";
import { BupaLogo } from "../common/BupaLogo";
import "./layout.css";

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

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

            {/* Section: Administración */}
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

            <li className="nav-item">
              <Link href="/masters" className={`nav-link ${isActive("/masters") ? "active" : ""}`} title={collapsed ? "Maestros" : undefined}>
                <Settings2 size={20} />
                {!collapsed && <span>Maestros</span>}
              </Link>
            </li>
            <li className="nav-item">
              <Link href="/import" className={`nav-link highlight ${isActive("/import") ? "active" : ""}`} title={collapsed ? "Importar" : undefined}>
                <UploadCloud size={20} />
                {!collapsed && <span>Importador Central</span>}
              </Link>
            </li>
          </ul>
        </nav>
   
        <div className="sidebar-footer">
          <Link href="/settings" className={`nav-link ${isActive("/settings") ? "active" : ""}`} title={collapsed ? "Ajustes" : undefined}>
            <Settings size={20} />
            {!collapsed && <span>Ajustes</span>}
          </Link>
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
