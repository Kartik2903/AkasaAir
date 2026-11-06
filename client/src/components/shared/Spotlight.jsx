// Adapted from Aceternity UI "Spotlight" (https://ui.aceternity.com/components/spotlight).
// Re-coloured through design tokens and driven by CSS only (no extra dependency).
export function Spotlight({ className = '' }) {
  return (
    <svg
      aria-hidden
      className={`animate-spotlight pointer-events-none absolute z-0 h-[169%] w-[138%] lg:w-[84%] ${className}`}
      xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3787 2842" fill="none"
    >
      <g filter="url(#spot-blur)">
        <ellipse cx="1924.71" cy="273.501" rx="1924.71" ry="273.501" transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)" fill="var(--accent)" fillOpacity="0.28" />
      </g>
      <defs>
        <filter id="spot-blur" x="0.860352" y="0.838989" width="3785.16" height="2840.26" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="151" />
        </filter>
      </defs>
    </svg>
  );
}
