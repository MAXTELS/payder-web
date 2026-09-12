'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Scroll-triggered fade/rise-in wrapper for the public marketing pages.
 * Deliberately dependency-free (no framer-motion etc.) — a plain
 * IntersectionObserver flips one boolean once, then disconnects.
 *
 * Server and the client's first render both produce the "hidden" state
 * (opacity-0, shifted down slightly), so there's nothing for React to
 * complain about at hydration — the same pattern RoleGuard uses elsewhere
 * in this app to avoid a hydration mismatch (see project doc's "hydration
 * mismatch" bug fix): only flip state inside an effect, never in the
 * initial render.
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}
