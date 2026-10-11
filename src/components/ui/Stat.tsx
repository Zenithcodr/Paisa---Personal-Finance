import type { ReactNode } from "react";

export function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="meta-item">
      <span className="meta-label">{label}</span>
      <span className="meta-value">{children}</span>
    </div>
  );
}
