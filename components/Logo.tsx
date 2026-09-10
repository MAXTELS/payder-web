/**
 * Official PAYDER mark: a navy rounded tile with an orange lowercase "p" —
 * the bowl doubles as a coin/ring with a center dot — plus the PAYDER
 * wordmark. Pure SVG/text — no external image asset — so it scales cleanly
 * at any size and needs no network fetch. This same mark is exported as the
 * Android app icon (`mobile/android/app/src/main/res/mipmap-*`) and as the
 * mobile app's `PayderLogo` widget, so all three surfaces share one design.
 * Brand colors: Orange (#ff7a1a) + Navy Blue (#16213a).
 */
export function Logo({
  size = 'md',
  withWordmark = true,
  wordmarkColor = 'navy',
  className = '',
}: {
  size?: 'sm' | 'md' | 'lg';
  withWordmark?: boolean;
  /** 'navy' (default, for light backgrounds) or 'white' (for dark/navy backgrounds). */
  wordmarkColor?: 'navy' | 'white';
  className?: string;
}) {
  const px = size === 'sm' ? 28 : size === 'lg' ? 44 : 34;
  const textSize = size === 'sm' ? 'text-base' : size === 'lg' ? 'text-2xl' : 'text-lg';
  const textColorClass = wordmarkColor === 'white' ? 'text-white' : 'text-[#16213a]';

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={px}
        height={px}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <rect width="40" height="40" rx="8.75" fill="#16213a" />
        <rect x="14.062" y="11.719" width="5.469" height="18.75" rx="2.734" fill="#ff7a1a" />
        <path
          fillRule="evenodd"
          fill="#ff7a1a"
          d="M 16.016,17.969 A 7.422,7.422 0 1,0 30.859,17.969 A 7.422,7.422 0 1,0 16.016,17.969 Z M 19.141,17.969 A 4.297,4.297 0 1,1 27.734,17.969 A 4.297,4.297 0 1,1 19.141,17.969 Z"
        />
        <circle cx="23.438" cy="17.969" r="1.719" fill="#ff7a1a" />
      </svg>
      {withWordmark && (
        <span className={`font-semibold tracking-tight ${textColorClass} ${textSize}`}>
          PAYDER
        </span>
      )}
    </span>
  );
}
