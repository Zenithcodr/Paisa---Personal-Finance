import { Link } from "react-router-dom";
import { useAppState, useDerived } from "../../hooks/useStore";
import { advanceDay } from "../../core/store";
import { inrPlain } from "../../core/constants";
import { drawGauge } from "../../core/charts";
import { Card } from "../../components/ui/Card";
import { Badge } from "../../components/ui/Badge";
import { Button } from "../../components/ui/Button";
import { Stat } from "../../components/ui/Stat";
import { Canvas } from "../../components/charts/Canvas";

export function DashboardPage() {
  const state = useAppState();
  const d = useDerived();

  const balanceTone = d.balance < 0 ? "tone-red" : d.balance < 1500 ? "tone-amber" : "tone-balance";
  const balanceLabel = d.balance < 0 ? "Overdrawn" : d.balance < 1500 ? "Tight" : "In the green";
  const riskTone =
    d.riskBand === "high" ? "tone-red" : d.riskBand === "medium" ? "tone-amber" : "tone-green";
  const riskLabel = d.riskBand === "high" ? "High" : d.riskBand === "medium" ? "Moderate" : "Low";
  const balPct = Math.max(0, Math.min(100, (d.balance / state.budget) * 100));

  return (
    <section className="grid-hero" aria-label="Overview">
      <article className="card hero-card" aria-label="Balance">
        <div className="hero-top">
          <span className="kicker">Remaining balance</span>
          <Badge tone={balanceTone}>{balanceLabel}</Badge>
        </div>
        <div className="hero-amount">
          <span className="currency">₹</span>
          <span className="num">{inrPlain(d.balance)}</span>
        </div>
        <div className="hero-meta">
          <div className="meta-item">
            <span className="meta-label">of ₹10,000 budget</span>
            <div className="bar">
              <div className="bar-fill" style={{ width: balPct + "%" }} />
            </div>
          </div>
          <Stat label="Daily allowance">
            <span className="currency">₹</span>
            {Math.round(d.dailyAllowance)}
            <span className="muted">/day</span>
          </Stat>
          <Stat label="Buffer (rolled over)">
            <span className="currency">₹</span>
            {inrPlain(d.allowanceBuffer)}
          </Stat>
          <Stat label="Spent so far">
            <span className="currency">₹</span>
            {inrPlain(d.spent)}
          </Stat>
          <Stat label="Days left">{d.daysLeft}</Stat>
        </div>
        <div className="hero-actions">
          <Link className="btn primary" to="/transactions">
            + Log expense
          </Link>
          <Link className="btn" to="/income">
            + Income
          </Link>
          <Link className="btn" to="/simulate">
            Simulate a decision
          </Link>
          <Button variant="ghost" onClick={() => advanceDay()} disabled={state.day >= 30}>
            Advance to next day
          </Button>
        </div>
      </article>

      <Card className="risk-card" ariaLabel="Financial risk">
        <header className="card-head">
          <span className="kicker">Risk</span>
          <Badge tone={riskTone}>{riskLabel}</Badge>
        </header>
        <Canvas
          draw={(c) => drawGauge(c, d.riskScore)}
          width={180}
          height={110}
          ariaLabel={`Risk score ${d.riskScore} out of 100, ${d.riskBand} risk`}
          className="gauge"
        />
        <ul className="factor-list">
          {[...d.riskFactors]
            .sort((a, b) => b.contribution - a.contribution)
            .map((f) => (
              <li className="factor" key={f.name}>
                <span className="name">{f.name}</span>
                <span className="mini">
                  <i style={{ width: Math.round(f.value * 100) + "%" }} />
                </span>
                <span className="val">+{Math.round(f.contribution)}</span>
              </li>
            ))}
        </ul>
      </Card>

      <Card className="health-card" ariaLabel="Financial health">
        <header className="card-head">
          <span className="kicker">Health</span>
          <Badge tone="tone-health">{d.grade}</Badge>
        </header>
        <div className="health-display">
          <div className="health-letter">{d.grade}</div>
          <div className="health-score">
            <span>{d.healthScore}</span>
            <span className="muted">/100</span>
          </div>
        </div>
        <ul className="factor-list">
          {d.healthFactors.map((f) => (
            <li className="factor" key={f.name}>
              <span className="name">{f.name}</span>
              <span className="mini">
                <i style={{ width: Math.round(f.value * 100) + "%" }} />
              </span>
              <span className="val">{Math.round(f.value * 100)}%</span>
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
