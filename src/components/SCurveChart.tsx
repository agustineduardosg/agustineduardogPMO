"use client";

import React, { useState, useRef, useMemo } from "react";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Project, Task } from "@/store/projectStore";

interface SCurveChartProps {
  projects: Project[];
}

interface ChartPoint {
  date: Date;
  dateStr: string;
  planned: number;
  real: number;
}

export const SCurveChart: React.FC<SCurveChartProps> = ({ projects }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 });

  // 1. Obtener todas las tareas de todos los proyectos activos
  const allTasks = useMemo(() => {
    const tasksList: Task[] = [];
    projects.forEach((proj) => {
      proj.phases.forEach((phase) => {
        phase.tasks.forEach((task) => {
          tasksList.push({
            ...task,
            startDate: new Date(task.startDate),
            endDate: new Date(task.endDate),
          });
        });
      });
    });
    return tasksList;
  }, [projects]);

  // 2. Calcular los límites temporales globales del portafolio
  const dateLimits = useMemo(() => {
    if (allTasks.length === 0) return { start: new Date(), end: new Date() };

    let earliest = new Date(allTasks[0].startDate);
    let latest = new Date(allTasks[0].endDate);

    allTasks.forEach((t) => {
      if (t.startDate < earliest) earliest = t.startDate;
      if (t.endDate > latest) latest = t.endDate;
    });

    // Si las fechas son iguales, expandir un poco
    if (earliest.getTime() === latest.getTime()) {
      latest = new Date(latest.getTime() + 24 * 60 * 60 * 1000 * 30); // +30 días
    }

    return { start: earliest, end: latest };
  }, [allTasks]);

  // 3. Generar los puntos de la Curva S (12 puntos a lo largo del tiempo)
  const chartPoints = useMemo<ChartPoint[]>(() => {
    if (allTasks.length === 0) return [];

    const numPoints = 12;
    const startTime = dateLimits.start.getTime();
    const endTime = dateLimits.end.getTime();
    const step = (endTime - startTime) / (numPoints - 1);

    const points: ChartPoint[] = [];

    // Calcular el total de duración acumulada
    const totalDuration = allTasks.reduce((sum, t) => sum + (t.duration || 1), 0);

    for (let i = 0; i < numPoints; i++) {
      const targetTime = startTime + step * i;
      const targetDate = new Date(targetTime);

      let weightedPlannedSum = 0;
      let weightedRealSum = 0;

      allTasks.forEach((task) => {
        const taskStart = task.startDate.getTime();
        const taskEnd = task.endDate.getTime();
        const duration = task.duration || 1;

        // --- CÁLCULO PLANIFICADO % ---
        let pProgress = 0;
        if (targetTime >= taskEnd) {
          pProgress = 100;
        } else if (targetTime < taskStart) {
          pProgress = 0;
        } else {
          // Progreso lineal planificado
          const totalTaskTime = taskEnd - taskStart;
          if (totalTaskTime > 0) {
            pProgress = ((targetTime - taskStart) / totalTaskTime) * 100;
          }
        }

        // --- CÁLCULO REAL % ---
        let rProgress = 0;
        const taskRealProgress = task.progress || 0; // progreso real actual de la tarea (0-100)

        if (targetTime >= taskEnd) {
          rProgress = taskRealProgress;
        } else if (targetTime < taskStart) {
          rProgress = 0;
        } else {
          // Progreso lineal real escalado por el avance actual
          const totalTaskTime = taskEnd - taskStart;
          if (totalTaskTime > 0) {
            rProgress = ((targetTime - taskStart) / totalTaskTime) * taskRealProgress;
          }
        }

        weightedPlannedSum += pProgress * duration;
        weightedRealSum += rProgress * duration;
      });

      const avgPlanned = totalDuration > 0 ? weightedPlannedSum / totalDuration : 0;
      const avgReal = totalDuration > 0 ? weightedRealSum / totalDuration : 0;

      points.push({
        date: targetDate,
        dateStr: format(targetDate, "dd MMM yy", { locale: es }),
        planned: Math.min(100, Math.max(0, Math.round(avgPlanned))),
        real: Math.min(100, Math.max(0, Math.round(avgReal))),
      });
    }

    return points;
  }, [allTasks, dateLimits]);

  // Dimensiones del gráfico
  const width = 600;
  const height = 280;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // 4. Mapear coordenadas SVG
  const svgPoints = useMemo(() => {
    if (chartPoints.length === 0) return { plannedPath: "", realPath: "", plannedPoints: [], realPoints: [] };

    const plannedCoords: { x: number; y: number }[] = [];
    const realCoords: { x: number; y: number }[] = [];

    chartPoints.forEach((p, index) => {
      const x = paddingLeft + (index / (chartPoints.length - 1)) * chartWidth;
      
      // En SVG, y=0 es arriba, por lo que invertimos el porcentaje
      const yPlanned = paddingTop + chartHeight - (p.planned / 100) * chartHeight;
      const yReal = paddingTop + chartHeight - (p.real / 100) * chartHeight;

      plannedCoords.push({ x, y: yPlanned });
      realCoords.push({ x, y: yReal });
    });

    // Crear caminos SVG (Catmull-Rom spline approximation o lineas directas con curvas suaves)
    const createPath = (coords: { x: number; y: number }[]) => {
      if (coords.length === 0) return "";
      let path = `M ${coords[0].x} ${coords[0].y}`;
      for (let i = 1; i < coords.length; i++) {
        const cpX1 = coords[i - 1].x + chartWidth / (chartPoints.length * 2);
        const cpY1 = coords[i - 1].y;
        const cpX2 = coords[i].x - chartWidth / (chartPoints.length * 2);
        const cpY2 = coords[i].y;
        path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${coords[i].x} ${coords[i].y}`;
      }
      return path;
    };

    return {
      plannedPath: createPath(plannedCoords),
      realPath: createPath(realCoords),
      plannedPoints: plannedCoords,
      realPoints: realCoords,
    };
  }, [chartPoints, chartWidth, chartHeight]);

  // Manejador de movimiento del mouse para tooltip interactivo
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!containerRef.current || chartPoints.length === 0) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Calcular qué punto está más cerca en el eje X
    const pctX = (mouseX - paddingLeft) / chartWidth;
    let closestIndex = Math.round(pctX * (chartPoints.length - 1));
    closestIndex = Math.max(0, Math.min(chartPoints.length - 1, closestIndex));

    setHoveredPointIndex(closestIndex);

    // Calcular posición real en px para el tooltip
    const actualX = paddingLeft + (closestIndex / (chartPoints.length - 1)) * chartWidth;
    setHoverPos({ x: actualX, y: mouseY });
  };

  const handleMouseLeave = () => {
    setHoveredPointIndex(null);
  };

  if (projects.length === 0 || allTasks.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-muted)", gap: "12px" }}>
        <p style={{ fontSize: "0.95rem" }}>No hay datos suficientes de tareas para proyectar la Curva S.</p>
        <span style={{ fontSize: "0.85rem", opacity: 0.7 }}>Agregue tareas con duración y fechas en sus proyectos.</span>
      </div>
    );
  }

  const activePoint = hoveredPointIndex !== null ? chartPoints[hoveredPointIndex] : null;

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      {/* Cabecera del gráfico */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div>
          <h3 style={{ fontSize: "1.05rem", fontWeight: 600 }}>Avance Acumulado del Portafolio (Curva S)</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "4px" }}>
            Progreso general ponderado por duración (Planificado vs. Real)
          </p>
        </div>
        
        {/* Leyenda */}
        <div style={{ display: "flex", gap: "16px", fontSize: "0.8rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "3px", borderRadius: "2px", background: "var(--accent-primary)", display: "inline-block" }}></span>
            <span style={{ color: "var(--text-secondary)" }}>Planificado %</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "12px", height: "3px", borderRadius: "2px", background: "var(--accent-success)", display: "inline-block" }}></span>
            <span style={{ color: "var(--text-secondary)" }}>Real %</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ position: "relative", width: "100%", overflow: "visible" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          height="100%"
          style={{ overflow: "visible", cursor: "crosshair" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="plannedAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-primary)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--accent-primary)" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="realAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-success)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="var(--accent-success)" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Líneas horizontales de guía (Grid) */}
          {[0, 25, 50, 75, 100].map((val, idx) => {
            const y = paddingTop + chartHeight - (val / 100) * chartHeight;
            return (
              <g key={val}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="var(--border-subtle)"
                  strokeWidth="1"
                  strokeDasharray={val === 0 || val === 100 ? "0" : "4 4"}
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="9px"
                  fill="var(--text-muted)"
                  fontWeight="600"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Eje X Etiquetas de Fechas (se muestran 4 representativas) */}
          {chartPoints.length > 0 &&
            [0, Math.floor(chartPoints.length * 0.33), Math.floor(chartPoints.length * 0.66), chartPoints.length - 1].map((idx) => {
              const p = chartPoints[idx];
              if (!p) return null;
              const x = paddingLeft + (idx / (chartPoints.length - 1)) * chartWidth;
              return (
                <text
                  key={idx}
                  x={x}
                  y={height - paddingBottom + 18}
                  textAnchor="middle"
                  fontSize="9px"
                  fill="var(--text-secondary)"
                  fontWeight="500"
                >
                  {p.dateStr}
                </text>
              );
            })}

          {/* Áreas rellenas debajo de las curvas */}
          {svgPoints.plannedPath && (
            <path
              d={`${svgPoints.plannedPath} L ${paddingLeft + chartWidth} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`}
              fill="url(#plannedAreaGrad)"
            />
          )}
          {svgPoints.realPath && (
            <path
              d={`${svgPoints.realPath} L ${paddingLeft + chartWidth} ${paddingTop + chartHeight} L ${paddingLeft} ${paddingTop + chartHeight} Z`}
              fill="url(#realAreaGrad)"
            />
          )}

          {/* Líneas de las Curvas */}
          {svgPoints.plannedPath && (
            <motion.path
              d={svgPoints.plannedPath}
              fill="none"
              stroke="var(--accent-primary)"
              strokeWidth="2.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          )}
          {svgPoints.realPath && (
            <motion.path
              d={svgPoints.realPath}
              fill="none"
              stroke="var(--accent-success)"
              strokeWidth="2.5"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          )}

          {/* Puntos y cursor sobrevolados */}
          {hoveredPointIndex !== null && (
            <>
              {/* Línea vertical de tracking */}
              <line
                x1={hoverPos.x}
                y1={paddingTop}
                x2={hoverPos.x}
                y2={paddingTop + chartHeight}
                stroke="var(--border-strong)"
                strokeWidth="1"
                strokeDasharray="3 3"
              />

              {/* Punto indicador de Planificado */}
              <circle
                cx={svgPoints.plannedPoints[hoveredPointIndex].x}
                cy={svgPoints.plannedPoints[hoveredPointIndex].y}
                r="5"
                fill="var(--accent-primary)"
                stroke="white"
                strokeWidth="2"
                style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))" }}
              />

              {/* Punto indicador de Real */}
              <circle
                cx={svgPoints.realPoints[hoveredPointIndex].x}
                cy={svgPoints.realPoints[hoveredPointIndex].y}
                r="5"
                fill="var(--accent-success)"
                stroke="white"
                strokeWidth="2"
                style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.15))" }}
              />
            </>
          )}
        </svg>

        {/* Tooltip flotante interactivo */}
        {hoveredPointIndex !== null && activePoint && (
          <div
            style={{
              position: "absolute",
              left: `${Math.min(width - 150, Math.max(10, hoverPos.x - 70))}px`,
              top: "10px",
              background: "rgba(255, 255, 255, 0.98)",
              border: "1px solid var(--border-light)",
              borderRadius: "var(--radius-sm)",
              padding: "8px 12px",
              boxShadow: "0 10px 15px -3px rgba(0,0,0,0.08)",
              pointerEvents: "none",
              zIndex: 10,
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              backdropFilter: "var(--blur-md)",
            }}
          >
            <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
              {activePoint.dateStr}
            </span>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", fontSize: "0.75rem" }}>
              <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>Planificado:</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{activePoint.planned}%</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px", fontSize: "0.75rem" }}>
              <span style={{ color: "var(--accent-success)", fontWeight: 600 }}>Real:</span>
              <span style={{ color: "var(--text-primary)", fontWeight: 700 }}>{activePoint.real}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
