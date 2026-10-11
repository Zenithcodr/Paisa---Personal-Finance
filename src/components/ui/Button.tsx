import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "ghost" | "danger" | "";
}

export function Button({ children, variant = "", className, ...rest }: ButtonProps) {
  const cls = ["btn", variant, className].filter(Boolean).join(" ");
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}
