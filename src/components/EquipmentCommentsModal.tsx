"use client";

import React, { useState, useMemo } from 'react';
import { X, Plus, Calendar, User, MessageSquare, Clock, Shield } from 'lucide-react';
import { parseComments, CommentEntry } from '@/utils/commentUtils';
import { format } from 'date-fns';

interface EquipmentCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipmentName: string;
  observaciones: string;
  onSaveComments: (updatedJson: string) => Promise<void>;
  availableUsers: { name: string; role: string }[];
}

export const EquipmentCommentsModal: React.FC<EquipmentCommentsModalProps> = ({
  isOpen,
  onClose,
  equipmentName,
  observaciones,
  onSaveComments,
  availableUsers
}) => {
  const comments = useMemo(() => parseComments(observaciones), [observaciones]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newComment, setNewComment] = useState('');
  const [selectedAuthor, setSelectedAuthor] = useState(availableUsers[0]?.name || 'Ingeniero Biomédico');
  const [isSaving, setIsSaving] = useState(false);

  const filteredComments = useMemo(() => {
    if (!searchQuery.trim()) return comments;
    const q = searchQuery.toLowerCase();
    return comments.filter(c => 
      c.text.toLowerCase().includes(q) || 
      c.author.toLowerCase().includes(q) || 
      c.role.toLowerCase().includes(q)
    );
  }, [comments, searchQuery]);

  if (!isOpen) return null;

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSaving(true);
    try {
      const userObj = availableUsers.find(u => u.name === selectedAuthor);
      const newEntry: CommentEntry = {
        id: `comment-${Date.now()}`,
        author: selectedAuthor,
        role: userObj?.role || 'Personal Técnico',
        text: newComment.trim(),
        timestamp: new Date().toISOString()
      };

      const updatedList = [...comments, newEntry];
      await onSaveComments(JSON.stringify(updatedList));
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (confirm('¿Está seguro de eliminar este comentario del historial?')) {
      setIsSaving(true);
      try {
        const updatedList = comments.filter(c => c.id !== commentId);
        await onSaveComments(JSON.stringify(updatedList));
      } catch (err) {
        console.error(err);
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="custom-modal-backdrop" style={backdropStyle}>
      <div className="custom-modal-card" style={modalCardStyle}>
        
        {/* Header */}
        <div style={headerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <MessageSquare size={22} style={{ color: '#004B87' }} />
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#003B64', fontWeight: 800 }}>
                Historial de Observaciones
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                {equipmentName}
              </span>
            </div>
          </div>
          <button onClick={onClose} style={closeBtnStyle}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, overflowY: 'auto', padding: '4px' }}>
          
          {/* Form to add a new comment */}
          <form onSubmit={handleAddComment} style={formStyle}>
            <span style={formTitleStyle}>+ Agregar Nuevo Comentario</span>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '12px', alignItems: 'flex-end' }}>
              <div>
                <label style={labelStyle}>Responsable del Comentario</label>
                <select
                  value={selectedAuthor}
                  onChange={(e) => setSelectedAuthor(e.target.value)}
                  style={selectStyle}
                >
                  {availableUsers.length > 0 ? (
                    availableUsers.map((u) => (
                      <option key={u.name} value={u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="Ingeniero Clínico">Ingeniero Clínico</option>
                      <option value="Jefe de Proyectos">Jefe de Proyectos</option>
                      <option value="PMO Admin">PMO Admin</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div style={{ marginTop: '10px' }}>
              <label style={labelStyle}>Comentario / Avance Clínico</label>
              <textarea
                rows={3}
                placeholder="Escriba los detalles de calibración, pruebas, problemas o puesta en marcha..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                style={textareaStyle}
                required
              />
            </div>

            <button type="submit" style={submitBtnStyle} disabled={isSaving}>
              {isSaving ? 'Registrando...' : '➕ Registrar Comentario'}
            </button>
          </form>

          {/* Timeline of Comments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', border: 'none', padding: 0 }}>
                Historial Cronológico ({comments.length})
              </span>
              {comments.length > 0 && (
                <input 
                  type="text" 
                  placeholder="🔍 Buscar comentario..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    border: '1px solid var(--border-light)',
                    borderRadius: '20px',
                    outline: 'none',
                    width: '160px',
                    background: 'white',
                    transition: 'all 0.15s ease'
                  }}
                  className="cell-input"
                />
              )}
            </div>
            
            {filteredComments.length === 0 ? (
              <div style={emptyStateStyle}>
                {comments.length === 0 ? 'No hay comentarios registrados. Comience agregando uno arriba.' : 'No se encontraron comentarios que coincidan con la búsqueda.'}
              </div>
            ) : (
              <div style={timelineContainerStyle}>
                {filteredComments.slice().reverse().map((comment) => (
                  <div key={comment.id} style={commentCardStyle}>
                    
                    <div style={commentHeaderStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <User size={14} style={{ color: '#004B87' }} />
                        <span style={authorStyle}>{comment.author}</span>
                        <span style={roleBadgeStyle}>{comment.role}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                        <Clock size={12} />
                        <span style={dateStyle}>
                          {format(new Date(comment.timestamp), 'dd/MM/yyyy HH:mm')}
                        </span>
                        {comment.id !== 'legacy' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteComment(comment.id)}
                            style={deleteCommentBtnStyle}
                            title="Eliminar comentario"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={commentBodyStyle}>{comment.text}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

// Inline premium Bupa corporate styling
const backdropStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0, left: 0, width: '100vw', height: '100vh',
  background: 'rgba(0, 59, 100, 0.4)',
  backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 1050
};

const modalCardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary, white)',
  borderRadius: '12px',
  padding: '24px',
  width: '540px',
  maxHeight: '85vh',
  display: 'flex', flexDirection: 'column',
  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.15)',
  border: '1px solid var(--border-light)',
  overflow: 'hidden'
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  marginBottom: '18px', borderBottom: '1px solid var(--border-subtle)',
  paddingBottom: '14px'
};

const closeBtnStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)'
};

const formStyle: React.CSSProperties = {
  background: 'var(--bg-primary, #f8fafc)',
  padding: '14px', borderRadius: '8px',
  border: '1px solid var(--border-subtle)'
};

const formTitleStyle: React.CSSProperties = {
  fontSize: '0.75rem', fontWeight: 800, color: '#004B87',
  textTransform: 'uppercase', display: 'block', marginBottom: '8px'
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.75rem', fontWeight: 700,
  color: 'var(--text-secondary)', marginBottom: '4px'
};

const selectStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: '0.8rem',
  border: '1px solid var(--border-light)', borderRadius: '6px',
  outline: 'none', background: 'white'
};

const textareaStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', fontSize: '0.82rem',
  border: '1px solid var(--border-light)', borderRadius: '6px',
  outline: 'none', background: 'white', resize: 'vertical',
  fontFamily: 'inherit'
};

const submitBtnStyle: React.CSSProperties = {
  marginTop: '10px', background: '#004B87', color: 'white',
  border: 'none', padding: '8px 16px', borderRadius: '6px',
  fontSize: '0.8rem', fontWeight: 'bold', display: 'flex',
  alignItems: 'center', gap: '6px', cursor: 'pointer'
};

const timelineTitleStyle: React.CSSProperties = {
  fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-secondary)',
  textTransform: 'uppercase', borderBottom: '1px solid var(--border-subtle)',
  paddingBottom: '6px', display: 'block'
};

const emptyStateStyle: React.CSSProperties = {
  fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center',
  padding: '24px', background: 'var(--bg-primary)', borderRadius: '8px'
};

const timelineContainerStyle: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', gap: '12px',
  maxHeight: '300px', overflowY: 'auto'
};

const commentCardStyle: React.CSSProperties = {
  background: 'var(--bg-primary, #ffffff)',
  padding: '12px', borderRadius: '8px',
  border: '1px solid var(--border-subtle)',
  position: 'relative'
};

const commentHeaderStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '6px',
  marginBottom: '8px'
};

const authorStyle: React.CSSProperties = {
  fontWeight: 700, fontSize: '0.78rem', color: 'var(--text-primary)'
};

const roleBadgeStyle: React.CSSProperties = {
  fontSize: '0.65rem', background: 'rgba(0, 121, 193, 0.08)',
  color: '#0079C1', padding: '2px 6px', borderRadius: '4px',
  fontWeight: 'bold'
};

const dateStyle: React.CSSProperties = {
  fontSize: '0.7rem'
};

const deleteCommentBtnStyle: React.CSSProperties = {
  border: 'none', background: 'transparent', cursor: 'pointer',
  color: 'red', display: 'flex', alignItems: 'center', padding: '2px'
};

const commentBodyStyle: React.CSSProperties = {
  fontSize: '0.8rem', color: 'var(--text-secondary)',
  lineHeight: 1.4, whiteSpace: 'pre-wrap'
};
