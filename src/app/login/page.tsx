'use client';

import React, { useState, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, AlertTriangle, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(searchParams.get('error') || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor, ingresa tu correo y contraseña.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        if (res.error === 'CredentialsSignin') {
          setError('Correo o contraseña incorrectos.');
        } else {
          setError(res.error);
        }
      } else {
        // Redirigir al dashboard tras un inicio de sesión exitoso
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('Ocurrió un error inesperado. Inténtalo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      {error && (
        <div style={errorBannerStyle}>
          <AlertTriangle size={18} style={{ marginRight: '8px', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      <div style={inputGroupStyle}>
        <label htmlFor="email" style={labelStyle}>Correo Electrónico</label>
        <div style={inputContainerStyle}>
          <Mail size={18} style={iconStyle} />
          <input
            id="email"
            type="email"
            placeholder="usuario@bupa.cl"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
            style={inputStyle}
            required
          />
        </div>
      </div>

      <div style={inputGroupStyle}>
        <label htmlFor="password" style={labelStyle}>Contraseña</label>
        <div style={inputContainerStyle}>
          <Lock size={18} style={iconStyle} />
          <input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
            style={inputStyle}
            required
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        style={isLoading ? buttonDisabledStyle : buttonStyle}
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="spin-animation" style={{ marginRight: '8px' }} />
            Iniciando sesión...
          </>
        ) : (
          'Ingresar al Portal'
        )}
      </button>

      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .spin-animation {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div style={containerStyle}>
      <div style={glowBgStyle}></div>
      <div style={glowBgStyle2}></div>
      
      <div style={cardStyle}>
        <div style={logoHeaderStyle}>
          <div style={logoBadgeStyle}>Bupa</div>
          <h1 style={titleStyle}>Smart Project Manager</h1>
          <p style={subtitleStyle}>Oficina de Proyectos (PMO) — Chile</p>
        </div>

        <Suspense fallback={
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px' }}>
            <Loader2 size={24} className="spin-animation" style={{ color: '#0d9488' }} />
          </div>
        }>
          <LoginForm />
        </Suspense>

        <div style={footerStyle}>
          <p>Cumple con las políticas de Seguridad de la Información corporativa.</p>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// ESTILOS PREMIUM (Aesthetic Custom Styles)
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
  top: '20%',
  left: '10%',
  width: '400px',
  height: '400px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(13, 148, 136, 0.15) 0%, rgba(0,0,0,0) 70%)',
  filter: 'blur(50px)',
  zIndex: 0,
};

const glowBgStyle2: React.CSSProperties = {
  position: 'absolute',
  bottom: '20%',
  right: '10%',
  width: '450px',
  height: '450px',
  borderRadius: '50%',
  background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, rgba(0,0,0,0) 70%)',
  filter: 'blur(60px)',
  zIndex: 0,
};

const cardStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  maxWidth: '440px',
  padding: '40px',
  borderRadius: '24px',
  backgroundColor: 'rgba(15, 23, 42, 0.55)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(255, 255, 255, 0.08)',
  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
  zIndex: 1,
  color: '#f8fafc',
};

const logoHeaderStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  marginBottom: '32px',
  textAlign: 'center',
};

const logoBadgeStyle: React.CSSProperties = {
  backgroundColor: '#0284c7',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold',
  padding: '6px 16px',
  borderRadius: '30px',
  letterSpacing: '0.5px',
  marginBottom: '16px',
  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.3)',
};

const titleStyle: React.CSSProperties = {
  fontSize: '26px',
  fontWeight: 700,
  color: '#ffffff',
  letterSpacing: '-0.5px',
  margin: '0 0 6px 0',
};

const subtitleStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#94a3b8',
  margin: 0,
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '20px',
};

const inputGroupStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 500,
  color: '#94a3b8',
  marginLeft: '4px',
};

const inputContainerStyle: React.CSSProperties = {
  position: 'relative',
  display: 'flex',
  alignItems: 'center',
};

const iconStyle: React.CSSProperties = {
  position: 'absolute',
  left: '16px',
  color: '#64748b',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '14px 16px 14px 46px',
  borderRadius: '12px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  backgroundColor: 'rgba(9, 13, 22, 0.6)',
  color: '#ffffff',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 0.2s, box-shadow 0.2s',
};

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  width: '100%',
  padding: '14px',
  borderRadius: '12px',
  backgroundColor: '#0d9488',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.2s, transform 0.1s',
  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.2)',
  marginTop: '10px',
};

const buttonDisabledStyle: React.CSSProperties = {
  ...buttonStyle,
  backgroundColor: '#1e293b',
  color: '#64748b',
  cursor: 'not-allowed',
  boxShadow: 'none',
};

const errorBannerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  padding: '12px 16px',
  borderRadius: '12px',
  backgroundColor: 'rgba(239, 68, 68, 0.12)',
  border: '1px solid rgba(239, 68, 68, 0.25)',
  color: '#f87171',
  fontSize: '14px',
};

const footerStyle: React.CSSProperties = {
  marginTop: '32px',
  textAlign: 'center',
  fontSize: '12px',
  color: '#475569',
};
