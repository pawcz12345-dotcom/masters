export function MastersLogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      aria-label="Masters 2026"
    >
      {/* Outer ring */}
      <circle cx="40" cy="40" r="38" fill="#006747" />
      <circle cx="40" cy="40" r="35" fill="none" stroke="#F2C029" strokeWidth="1.5" />

      {/* Flag pin */}
      <line x1="40" y1="18" x2="40" y2="48" stroke="#F2C029" strokeWidth="2" strokeLinecap="round" />
      {/* Flag */}
      <path d="M40 18 L56 24 L40 30 Z" fill="#F2C029" />
      {/* Pin base / hole */}
      <ellipse cx="40" cy="49" rx="5" ry="2" fill="#004F38" />

      {/* Text: THE */}
      <text
        x="40"
        y="60"
        textAnchor="middle"
        fill="#F2C029"
        fontSize="7"
        fontFamily="Georgia, serif"
        letterSpacing="3"
      >
        THE
      </text>
      {/* Text: MASTERS */}
      <text
        x="40"
        y="70"
        textAnchor="middle"
        fill="#FFFFFF"
        fontSize="9.5"
        fontFamily="Georgia, serif"
        letterSpacing="1.5"
        fontWeight="600"
      >
        MASTERS
      </text>
    </svg>
  );
}

export function MastersFlagSmall({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 36"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      {/* Pin */}
      <line x1="7" y1="2" x2="7" y2="34" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      {/* Flag */}
      <path d="M7 2 L22 8 L7 14 Z" fill="currentColor" />
      {/* Cup */}
      <ellipse cx="7" cy="34" rx="4" ry="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}
