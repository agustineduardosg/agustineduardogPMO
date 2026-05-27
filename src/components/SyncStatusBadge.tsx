"use client";

import React, { useMemo } from "react";
import { CloudCheck, CloudLightning, RefreshCw, Check } from "lucide-react";
import { useProjectStore } from "@/store/projectStore";
import { useUserStore } from "@/store/userStore";
import { useIncidentStore } from "@/store/incidentStore";
import { useEquipmentStore } from "@/store/equipmentStore";

export const SyncStatusBadge: React.FC = () => {
  const isProjectLoading = useProjectStore((s) => s.isLoading);
  const isUserLoading = useUserStore((s) => s.isLoading);
  const isIncidentLoading = useIncidentStore((s) => s.isLoading);
  const isEquipmentLoading = useEquipmentStore((s) => s.isLoading);

  const isSyncing = useMemo(() => {
    return isProjectLoading || isUserLoading || isIncidentLoading || isEquipmentLoading;
  }, [isProjectLoading, isUserLoading, isIncidentLoading, isEquipmentLoading]);

  return (
    <div 
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "4px 10px",
        borderRadius: "var(--radius-full)",
        background: isSyncing ? "rgba(245, 158, 11, 0.08)" : "rgba(13, 148, 136, 0.08)",
        border: `1px solid ${isSyncing ? "rgba(245, 158, 11, 0.2)" : "rgba(13, 148, 136, 0.2)"}`,
        color: isSyncing ? "var(--accent-warning)" : "var(--accent-success)",
        fontSize: "0.75rem",
        fontWeight: 600,
        transition: "all var(--transition-normal) ease-in-out",
        boxShadow: "0 2px 4px rgba(0,0,0,0.01)"
      }}
    >
      {isSyncing ? (
        <>
          <RefreshCw size={12} className="animate-spin" />
          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Sincronizando...</span>
        </>
      ) : (
        <>
          <span style={{ 
            width: "6px", 
            height: "6px", 
            borderRadius: "50%", 
            background: "var(--accent-success)",
            boxShadow: "0 0 8px var(--accent-success)",
            display: "inline-block" 
          }}></span>
          <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>Nube Sincronizada</span>
        </>
      )}
    </div>
  );
};
