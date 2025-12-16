// Brand logo component - COMPOUND with red U arrow
export function BrandLogo({ className, showText = true }: { className?: string; showText?: boolean }) {
  if (!showText) {
    // Just the U icon
    return (
      <svg
        viewBox="0 0 60 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0 0 L0 50 Q0 80 30 80 Q60 80 60 50 L60 0 L45 0 L45 50 Q45 65 30 65 Q15 65 15 50 L15 0 Z M30 8 L18 24 L25 24 L25 55 L35 55 L35 24 L42 24 Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  // Full COMPOUND wordmark with red U
  return (
    <div className={`flex items-center ${className || ''}`}>
      <span className="font-black text-white tracking-tight">COMPO</span>
      <svg
        viewBox="0 0 60 80"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-[1.1em] w-auto -mx-0.5"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M0 0 L0 50 Q0 80 30 80 Q60 80 60 50 L60 0 L45 0 L45 50 Q45 65 30 65 Q15 65 15 50 L15 0 Z M30 8 L18 24 L25 24 L25 55 L35 55 L35 24 L42 24 Z"
          className="fill-primary"
        />
      </svg>
      <span className="font-black text-white tracking-tight">ND</span>
    </div>
  );
}

// Just the icon version for compact spaces
export function BrandIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 60 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M0 0 L0 50 Q0 80 30 80 Q60 80 60 50 L60 0 L45 0 L45 50 Q45 65 30 65 Q15 65 15 50 L15 0 Z M30 8 L18 24 L25 24 L25 55 L35 55 L35 24 L42 24 Z"
        fill="currentColor"
      />
    </svg>
  );
}
