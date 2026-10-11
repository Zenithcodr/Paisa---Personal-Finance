import { useState } from "react";
import { useAppState } from "../../hooks/useStore";
import {
  projectState,
  getState,
  addExpense,
  addSubscription,
  toggleSubscription,
  addIncomeOneTime,
  takeLoan,
  addUnexpected
} from "../../core/store";
import { selectDerived } from "../../core/selectors";
import { verdict } from "../../core/verdict";
import { expectedTrajectory } from "../../core/helpers";
import { drawForecast } from "../../core/charts";
import { inr } from "../../core/constants";
import type { AppState } from "../../types/state";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, SelectField } from "../../components/ui/Field";
import { Canvas } from "../../components/charts/Canvas";

type SimAction =
  | "expense"
  | "subscription"
  | "cancelSubscription"
  | "skipExpense"
  | "income"
  | "loan"
  | "unexpected";

interface DeltaRow {
  label: string;
  from: string;
  to: string;
  chg: number;
  chgText: string;
}

interface Projection {
  verdictLabel: "smart" | "caution" | "avoid";
  verdictText: string;
  deltas: DeltaRow[];
  currentLine: number[];
  projectedLine: number[];
}

const simId = () => "sim_" + Math.random().toString(36).slice(2);

function buildMutator(action: SimAction, amount: number, subId: string): (s: AppState) => void {
  switch (action) {
    case "expense":
      return (s) =>
        s.transactions.push({
          id: simId(),
          day: s.day,
          amount,
          category: "Misc",
          note: "Simulated expense",
          ts: Date.now(),
          source: "manual"
        });
    case "subscription":
      return (s) =>
        s.subscriptions.push({
          id: simId(),
          name: "New subscription",
          amount,
          cycle: "monthly",
          renewalDay: Math.min(30, s.day + 30),
          active: true
        });
    case "cancelSubscription":
      return (s) => {
        const sub = s.subscriptions.find((x) => x.id === subId);
        if (sub) sub.active = false;
      };
    case "skipExpense":
      return (s) =>
        s.transactions.push({
          id: simId(),
          day: s.day,
          amount: -amount,
          category: "Income",
          note: "Simulated savings (skip)",
          ts: Date.now(),
          source: "income"
        });
    case "income":
      return (s) => {
        s.income.oneTime.push({
          id: simId(),
          label: "Simulated income",
          amount,
          day: s.day,
          applied: true
        });
        s.transactions.push({
          id: simId(),
          day: s.day,
          amount: -amount,
          category: "Income",
          note: "Simulated income",
          ts: Date.now(),
          source: "income"
        });
      };
    case "loan":
      return (s) => {
        const repay = Math.max(1, Math.round(amount / 30));
        s.debts.push({
          id: simId(),
          label: "Simulated loan",
          principal: amount,
          remaining: amount,
          apr: 24,
          repayPerDay: repay,
          takenDay: s.day
        });
        s.transactions.push({
          id: simId(),
          day: s.day,
          amount: -amount,
          category: "Loan",
          note: "Simulated loan",
          ts: Date.now(),
          source: "loan"
        });
      };
    case "unexpected":
      return (s) => {
        s.unexpected.push({ id: simId(), label: "Simulated unexpected", amount, day: s.day });
        s.transactions.push({
          id: simId(),
          day: s.day,
          amount,
          category: "Unexpected",
          note: "Simulated unexpected",
          ts: Date.now(),
          source: "unexpected"
        });
      };
    default:
      return () => {};
  }
}

const VERDICT_LABEL: Record<Projection["verdictLabel"], string> = {
  smart: "✓ Smart",
  caution: "! Caution",
  avoid: "✕ Avoid"
};

export function SimulatorPage() {
  const state = useAppState();
  const [action, setAction] = useState<SimAction>("expense");
  const [amount, setAmount] = useState("");
  const [subId, setSubId] = useState("");
  const [projection, setProjection] = useState<Projection | null>(null);

  const activeSubs = state.subscriptions.filter((s) => s.active);
  const needsAmount = action !== "cancelSubscription";

  const applyPreset = (preset: string) => {
    setProjection(null);
    switch (preset) {
      case "buy1499":
        setAction("subscription");
        setAmount("1499");
        break;
      case "cancelSpotify": {
        setAction("cancelSubscription");
        const sp = state.subscriptions.find((s) => /spotify/i.test(s.name) && s.active);
        setSubId(sp ? sp.id : (activeSubs[0]?.id ?? ""));
        break;
      }
      case "skipDinner":
        setAction("skipExpense");
        setAmount("600");
        break;
      case "freelance":
        setAction("income");
        setAmount("3000");
        break;
      case "unexpected":
        setAction("unexpected");
        setAmount("2000");
        break;
      case "loan":
        setAction("loan");
        setAmount("2000");
        break;
    }
  };

  const project = () => {
    const amt = Number(amount);
    if (needsAmount && !(amt > 0)) return;
    if (action === "cancelSubscription" && !subId) return;

    const current = getState();
    const projected = projectState(current, buildMutator(action, amt, subId));
    const curD = selectDerived(current);
    const projD = selectDerived(projected);
    const v = verdict(curD, projD);

    const num = (n: number) => Math.round(n).toString();
    const deltas: DeltaRow[] = [
      {
        label: "Balance",
        from: inr(curD.balance),
        to: inr(projD.balance),
        chg: projD.balance - curD.balance,
        chgText: inr(projD.balance - curD.balance)
      },
      {
        label: "Daily allowance",
        from: inr(curD.dailyAllowance),
        to: inr(projD.dailyAllowance),
        chg: projD.dailyAllowance - curD.dailyAllowance,
        chgText: inr(projD.dailyAllowance - curD.dailyAllowance)
      },
      {
        label: "Risk",
        from: num(curD.riskScore),
        to: num(projD.riskScore),
        chg: projD.riskScore - curD.riskScore,
        chgText: num(projD.riskScore - curD.riskScore)
      },
      {
        label: "Health",
        from: `${curD.grade} (${curD.healthScore})`,
        to: `${projD.grade} (${projD.healthScore})`,
        chg: projD.healthScore - curD.healthScore,
        chgText: num(projD.healthScore - curD.healthScore)
      },
      {
        label: "Forecast end",
        from: inr(curD.forecast.expected),
        to: inr(projD.forecast.expected),
        chg: projD.forecast.expected - curD.forecast.expected,
        chgText: inr(projD.forecast.expected - curD.forecast.expected)
      }
    ];

    setProjection({
      verdictLabel: v.label,
      verdictText: v.text,
      deltas,
      currentLine: expectedTrajectory(current),
      projectedLine: expectedTrajectory(projected)
    });
  };

  const confirm = () => {
    const amt = Number(amount);
    const day = getState().day;
    switch (action) {
      case "expense":
        addExpense({ day, amount: amt, category: "Misc", note: "From simulator" });
        break;
      case "subscription":
        addSubscription({
          name: "New subscription",
          amount: amt,
          cycle: "monthly",
          renewalDay: Math.min(30, day + 30)
        });
        break;
      case "cancelSubscription":
        toggleSubscription(subId, false);
        break;
      case "skipExpense":
        addIncomeOneTime({ day, amount: amt, label: "Skipped expense (savings)" });
        break;
      case "income":
        addIncomeOneTime({ day, amount: amt, label: "Simulated income" });
        break;
      case "loan":
        takeLoan({
          label: "Simulated loan",
          amount: amt,
          apr: 24,
          repayPerDay: Math.max(1, Math.round(amt / 30))
        });
        break;
      case "unexpected":
        addUnexpected({ label: "Simulated unexpected", amount: amt, day });
        break;
    }
    setProjection(null);
    setAmount("");
  };

  return (
    <Card id="simulate" className="simulator" ariaLabel="Decision simulator">
      <header className="card-head">
        <div>
          <span className="kicker">Simulate a decision</span>
          <h2 className="card-title">What if you…</h2>
        </div>
        <span className="muted small">Projections never change saved data until you confirm.</span>
      </header>

      <div className="sim-presets" role="group" aria-label="Preset scenarios">
        <button className="chip" type="button" onClick={() => applyPreset("buy1499")}>
          Buy ₹1,499 subscription
        </button>
        <button className="chip" type="button" onClick={() => applyPreset("cancelSpotify")}>
          Cancel Spotify ₹119
        </button>
        <button className="chip" type="button" onClick={() => applyPreset("skipDinner")}>
          Skip tonight's dinner out
        </button>
        <button className="chip" type="button" onClick={() => applyPreset("freelance")}>
          Get freelance +₹3,000
        </button>
        <button className="chip" type="button" onClick={() => applyPreset("unexpected")}>
          Unexpected −₹2,000
        </button>
        <button className="chip" type="button" onClick={() => applyPreset("loan")}>
          Take ₹2,000 loan
        </button>
      </div>

      <div className="sim-form">
        <SelectField
          label="Action"
          value={action}
          onChange={(e) => {
            setAction(e.target.value as SimAction);
            setProjection(null);
          }}
        >
          <option value="expense">Add one-time expense</option>
          <option value="subscription">Add new monthly subscription</option>
          <option value="cancelSubscription">Cancel a subscription</option>
          <option value="skipExpense">Skip a planned expense (savings)</option>
          <option value="income">Receive one-time income</option>
          <option value="loan">Take a loan</option>
          <option value="unexpected">Unexpected expense</option>
        </SelectField>
        {needsAmount ? (
          <Field
            label="Amount (₹)"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setProjection(null);
            }}
            placeholder="0"
          />
        ) : (
          <SelectField
            label="Pick subscription"
            value={subId}
            onChange={(e) => {
              setSubId(e.target.value);
              setProjection(null);
            }}
          >
            <option value="">
              {activeSubs.length ? "Select…" : "(no active subscriptions)"}
            </option>
            {activeSubs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} — ₹{s.amount}/mo
              </option>
            ))}
          </SelectField>
        )}
      </div>

      <div className="sim-actions">
        <Button variant="primary" onClick={project}>
          Project impact
        </Button>
        {projection && (
          <Button variant="ghost" onClick={() => setProjection(null)}>
            Discard
          </Button>
        )}
      </div>

      {projection && (
        <div className="sim-projection">
          <div className="verdict">
            <span className={"verdict-label " + projection.verdictLabel}>
              {VERDICT_LABEL[projection.verdictLabel]}
            </span>
            <span className="verdict-reason">{projection.verdictText}</span>
          </div>
          <div className="delta-grid">
            {projection.deltas.map((dr) => {
              const dir = dr.chg > 0.5 ? "up" : dr.chg < -0.5 ? "down" : "flat";
              const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "•";
              return (
                <div className="delta" key={dr.label}>
                  <div className="label">{dr.label}</div>
                  <div className="values">
                    {dr.from} → {dr.to}
                  </div>
                  <div className={"chg " + dir}>
                    {arrow} {dr.chg > 0 ? "+" : ""}
                    {dr.chgText}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="sim-forecast">
            <Canvas
              draw={(c) => drawForecast(c, projection.currentLine, projection.projectedLine)}
              width={640}
              height={200}
              ariaLabel="Forecast comparison: do nothing versus do this"
            />
            <div className="legend">
              <span>
                <i className="dot dot-current" /> If you do nothing
              </span>
              <span>
                <i className="dot dot-projected" /> If you do this
              </span>
            </div>
          </div>
          <Button variant="primary" onClick={confirm}>
            Confirm &amp; apply
          </Button>
        </div>
      )}
    </Card>
  );
}
