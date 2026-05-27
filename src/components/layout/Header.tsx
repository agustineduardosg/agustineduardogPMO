import React from "react";
import { Bell, Search, User } from "lucide-react";
import { SyncStatusBadge } from "../SyncStatusBadge";
import "./layout.css";

export const Header = () => {
  return (
    <header className="header glass-panel">
      <div className="header-search">
        <Search size={18} className="search-icon" />
        <input 
          type="text" 
          placeholder="Search projects, tasks, or resources..." 
          className="search-input"
        />
      </div>
      
      <div className="header-actions">
        <SyncStatusBadge />
        <button className="icon-btn" aria-label="Notifications">
          <Bell size={20} />
          <span className="badge"></span>
        </button>
        <div className="user-profile">
          <div className="avatar">
            <User size={20} />
          </div>
          <div className="user-info">
            <span className="user-name">Agustin Eduardo</span>
            <span className="user-role">Project Manager</span>
          </div>
        </div>
      </div>
    </header>
  );
};
