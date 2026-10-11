import type { ReactNode } from "react";

interface CardProps {
  title?: string;
  kicker?: string;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
  ariaLabel?: string;
}

export function Card({ title, kicker, actions, children, id, className, ariaLabel }: CardProps) {
  const hasHead = Boolean(title || kicker || actions);
  return (
    <article
      className={["card", className].filter(Boolean).join(" ")}
      id={id}
      aria-label={ariaLabel}
    >
      {hasHead && (
        <header className="card-head">
          <div>
            {kicker && <span className="kicker">{kicker}</span>}
            {title && <h2 className="card-title">{title}</h2>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </article>
  );
}
