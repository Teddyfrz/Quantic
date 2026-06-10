interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
  max?: number;
}

// Sélecteur doux 1..max. Recliquer la valeur active la désélectionne.
export function Scale({ value, onChange, max = 5 }: Props) {
  return (
    <div className="scale">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          className={value === n ? "on" : ""}
          onClick={() => onChange(value === n ? null : n)}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
