'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage() {
  const router = useRouter();

  return (
    <div style={containerStyle}>
      <div style={glowBgStyle}></div>
      
      <div style={cardStyle}>
        <div style={iconContainerStyle}>
          <ShieldAlert size={48} style={{ color: '#ef4444' }} />
        </div>

        <h1 style={titleStyle}>Acceso Restringido</h1>
        <p style={descriptionStyle}>
          Tu rol actual no posee los permisos necesarios para visualizar esta sección. 
          Si consideras que esto es un error, por favor contacta a la PMO o administrador de sistemas.
        </p>

        <button 
          onClick={() => router.push('/')} 
          style={buttonStyle}
        >
          <ArrowLeft size={18} style={{ marginRight: '8px' }} />
          Volver al Inicio
        </button>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// ESTILOS
// -------------------------------------------------------------

const containerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  height: '100vh',
  width: '100vw',
  backgroundColor: '#090d16',
  fontFamily: 'var(--font-outfit), sans-serif',
  overflow: 'hidden',
};

const glowBgStyle: React.CSSProperties = {
  position: 'absolute',
  width: '350px',
  height: '350px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, rgba(0,0,0,0) 70%)',
  filter: 'blur(50px)',
  zIndex: 0,
};

const cardStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '100%',
  maxWidth: '460px',
  padding: '48px 40px',
  borderRadius: '24px',
  backgroundColor: 'rgba(15, 23, 42, 0.55)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(239, 68, 68, 0.2)',
  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
  zIndex: 1,
  color: '#f8fafc',
  textAlign: 'center',
};

const iconContainerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '80px',
  height: '80px',
  borderRadius: '50%',
  backgroundColor: 'rgba(239, 68, 68, 0.1)',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  marginBottom: '24px',
};

const titleStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: 700,
  color: '#ffffff',
  margin: '0 0 12px 0',
};

const descriptionStyle: React.CSSProperties = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#94a3b8',
  margin: '0 0 32px 0',
};

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '12px 24px',
  borderRadius: '12px',
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 600,
  border: '1px solid rgba(255, 255, 255, 0.1)',
  cursor: 'pointer',
  transition: 'background-color 0.2s, transform 0.1s',
};
