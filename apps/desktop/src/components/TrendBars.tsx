interface Props {
  label: string;
  values: (number | null)[];
  max: number;
  accent?: boolean;
  unit?: string;
}

// Mini-tendance sobre en barres. Les jours sans donnée sont grisés.
export function TrendBars({ label, values, max, accent, unit }: Props) {
  const present = values.filter((v): v is number => v !== null);
  const avg = present.length ? present.reduce((a, b) => a + b, 0) / present.length : null;

  return (
    <div className="trend-row">
      <span className="trend-label">{label}</span>
      <div className="trend-bars">
        {values.map((v, i) => (
          <div
            key={i}
            className={`trend-bar ${v === null ? "empty" : accent ? "accent" : ""}`}
            style={{ height: v === null ? "3px" : `${Math.max((v / max) * 100, 6)}%` }}
            title={v === null ? "—" : `${v}${unit ?? ""}`}
          />
        ))}
      </div>
      <span className="trend-scale-cap">
        {avg === null ? "—" : `${Math.round(avg * 10) / 10}${unit ?? ""}`}
      </span>
    </div>
  );
}
