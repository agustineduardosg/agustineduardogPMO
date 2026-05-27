import React from 'react';

interface BupaLogoProps {
  collapsed?: boolean;
  size?: number;
}

export const BupaLogo: React.FC<BupaLogoProps> = ({ 
  collapsed = false,
  size = 50
}) => {
  // Determine size based on state
  const logoSize = collapsed ? 36 : 64;

  return (
    <div 
      style={{ 
        width: `${logoSize}px`, 
        height: `${logoSize}px`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <svg 
        width="100%" 
        height="100%" 
        viewBox="0 0 100 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{
          boxShadow: '0 8px 16px rgba(0, 121, 193, 0.15)',
          borderRadius: '4px' // Subtle premium rounded corners for the corporate UI
        }}
      >
        {/* Solid official Bupa blue square background */}
        <rect width="100%" height="100%" fill="#0079C1" />

        {/* Wordmark "Bupa" in white, bold, italicized */}
        <text
          x="12"
          y="38"
          fill="white"
          style={{
            fontFamily: 'var(--font-outfit), "Outfit", "Inter", sans-serif',
            fontWeight: 800,
            fontSize: '28px',
            fontStyle: 'italic',
            letterSpacing: '-0.04em'
          }}
        >
          Bupa
        </text>

        {/* Heartbeat pulse line starting underneath the word and exiting the right edge */}
        <path
          d="M42,56 L60,56 C64,56 65,58 66,54 L69,18 L73,72 L77,50 L81,56 L100,56"
          stroke="white"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};
export default BupaLogo;
