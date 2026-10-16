import React from 'react';

const Logo = ({ size = 28 }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Shield / Page Container */}
        <path
          d="M6 6C6 4.89543 6.89543 4 8 4H20L26 10V26C26 27.1046 25.1046 28 24 28H8C6.89543 28 6 27.1046 6 26V6Z"
          fill="url(#logo-grad-bg)"
          stroke="#6366f1"
          strokeWidth="1.5"
        />
        {/* Folded Corner */}
        <path d="M20 4V10H26" fill="#4f46e5" stroke="#6366f1" strokeWidth="1.5" />
        
        {/* AI Brain Nodes / Spark */}
        <path
          d="M12 16L14 18L18 13"
          stroke="#38bdf8"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="22" r="1.5" fill="#38bdf8" />
        <circle cx="20" cy="22" r="1.5" fill="#c084fc" />
        <path d="M13.5 22H18.5" stroke="#818cf8" strokeWidth="1.2" strokeDasharray="1 1" />

        <defs>
          <linearGradient id="logo-grad-bg" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1e293b" />
            <stop offset="1" stopColor="#0f172a" />
          </linearGradient>
        </defs>
      </svg>
      <span style={{
        fontWeight: 800,
        fontSize: '1.2rem',
        letterSpacing: '-0.02em',
        background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 50%, #818cf8 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
      }}>
        Note<span style={{ color: '#818cf8', WebkitTextFillColor: '#818cf8' }}>Wise</span>
      </span>
    </div>
  );
};

export default Logo;