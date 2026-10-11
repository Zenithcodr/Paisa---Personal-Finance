import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Field({
  label,
  ...rest
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input {...rest} />
    </label>
  );
}

export function SelectField({
  label,
  children,
  ...rest
}: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <select {...rest}>{children}</select>
    </label>
  );
}
