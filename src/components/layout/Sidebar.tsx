import { NavLink } from "react-router-dom";

const LINKS: Array<{ to: string; label: string }> = [
  { to: "/", label: "Overview" },
  { to: "/simulate", label: "Simulate" },
  { to: "/transactions", label: "Transactions" },
  { to: "/subscriptions", label: "Subscriptions" },
  { to: "/commitments", label: "Commitments" },
  { to: "/income", label: "Income" },
  { to: "/goals", label: "Goals" },
  { to: "/debts", label: "Debts" },
  { to: "/forecast", label: "Forecast" },
  { to: "/insights", label: "Coaching" }
];

export function Sidebar() {
  return (
    <aside className="rail">
      <nav className="rail-nav" aria-label="Sections">
        {LINKS.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            className={({ isActive }) => "rail-link" + (isActive ? " active" : "")}
          >
            {l.label}
          </NavLink>
        ))}
      </nav>
      <div className="rail-help">
        <p>
          Every action you take updates <strong>all</strong> metrics in one cycle — balance,
          allowance, risk, health, forecast.
        </p>
      </div>
    </aside>
  );
}
