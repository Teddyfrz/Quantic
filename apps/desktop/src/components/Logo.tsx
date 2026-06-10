interface Props {
  size?: number;
  className?: string;
}

// Marque Quantic : un « Q » épuré (anneau + queue).
export function Logo({ size = 40, className }: Props) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      aria-label="Quantic"
      role="img"
    >
      <circle cx="50" cy="50" r="33" stroke="currentColor" strokeWidth="12" />
      <line
        x1="60"
        y1="60"
        x2="80"
        y2="80"
        stroke="currentColor"
        strokeWidth="12"
        strokeLinecap="round"
      />
    </svg>
  );
}
