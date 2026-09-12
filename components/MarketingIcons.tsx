/**
 * Small hand-drawn line-icon set for the public marketing site (home,
 * services, contact). Deliberately plain inline SVG — same "no external
 * asset, no icon-library dependency" approach as Logo.tsx — so the
 * marketing pages don't need a new package installed.
 */
type IconProps = { className?: string };

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
};

export function WalletIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h11A2.5 2.5 0 0 1 19 7.5V8H5.5A2.5 2.5 0 0 1 3 5.5" />
      <path d="M3 7.5v9A2.5 2.5 0 0 0 5.5 19h13a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 18.5 8H5.5A2.5 2.5 0 0 1 3 5.5" />
      <circle cx="16.25" cy="13" r="1.25" />
    </svg>
  );
}

export function BoltIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M13 3 5 13.5h5.5L11 21l8-11h-5.5L13 3Z" />
    </svg>
  );
}

export function PhoneIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="7" y="2.5" width="10" height="19" rx="2.25" />
      <path d="M11 18.25h2" />
    </svg>
  );
}

export function GraduationCapIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="m12 4 9 4.5-9 4.5-9-4.5 9-4.5Z" />
      <path d="M6.5 10.75V16c0 1.1 2.46 2 5.5 2s5.5-.9 5.5-2v-5.25" />
      <path d="M21 8.5v5" />
    </svg>
  );
}

export function SchoolIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M4 21V9.5L12 4l8 5.5V21" />
      <path d="M4 21h16" />
      <path d="M9.5 21v-6a2.5 2.5 0 0 1 5 0v6" />
      <path d="M8 12h.01M16 12h.01M8 15h.01M16 15h.01" />
    </svg>
  );
}

export function BanknoteIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="2.5" y="6" width="19" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6 9v.01M18 15v.01" />
    </svg>
  );
}

export function ShieldCheckIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3.5 5 6v6c0 4.2 2.9 7.4 7 8.5 4.1-1.1 7-4.3 7-8.5V6l-7-2.5Z" />
      <path d="m9.25 12 1.9 1.9L15 10" />
    </svg>
  );
}

export function ClockIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

export function UserGuestIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1-3.6 4-5.5 7.5-5.5s6.5 1.9 7.5 5.5" />
      <path d="m17 4 1.3 1.3L21 2.5" />
    </svg>
  );
}

export function ReceiptIcon({ className = 'h-6 w-6' }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}
