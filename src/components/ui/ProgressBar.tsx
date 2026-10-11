export function ProgressBar({ value, tone }: { value: number; tone?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div
      className={["progress", tone].filter(Boolean).join(" ")}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <i style={{ width: pct + "%" }} />
    </div>
  );
}
