import { useState } from "react";
import { useAppState, useDerived } from "../../hooks/useStore";
import { addGoal, contributeGoal, removeGoal } from "../../core/store";
import { inrPlain } from "../../core/constants";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { ProgressBar } from "../../components/ui/ProgressBar";
import { Field } from "../../components/ui/Field";

export function GoalsPage() {
  const state = useAppState();
  const d = useDerived();
  const [label, setLabel] = useState("Trip to Goa");
  const [target, setTarget] = useState("");
  const [targetDay, setTargetDay] = useState("30");

  const submit = () => {
    const t = Number(target);
    if (!label.trim() || !(t > 0)) return;
    addGoal({ label: label.trim(), target: t, targetDay: Number(targetDay) || 30 });
    setTarget("");
  };

  return (
    <Card id="goals" kicker="Goals" title="What you're saving for" ariaLabel="Savings goals">
      <div className="sim-form">
        <Field
          label="Label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Field
          label="Target (₹)"
          type="number"
          min={0}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="3000"
        />
        <Field
          label="Target day"
          type="number"
          min={1}
          max={30}
          value={targetDay}
          onChange={(e) => setTargetDay(e.target.value)}
        />
      </div>
      <div className="sim-actions">
        <Button variant="primary" onClick={submit}>
          + Add goal
        </Button>
      </div>

      {state.goals.length === 0 ? (
        <div className="empty">No goals yet. Add one to start tracking.</div>
      ) : (
        <div className="grid-goals">
          {state.goals.map((g) => {
            const gp = d.goalProjections.find((p) => p.id === g.id);
            const pct = Math.min(100, (g.saved / g.target) * 100);
            const status = gp?.status ?? "reachable";
            const tone =
              status === "reachable" || status === "done"
                ? "reachable"
                : status === "at-risk"
                  ? "at-risk"
                  : "unreachable";
            const need =
              gp && gp.remaining > 0
                ? `Need ₹${Math.round(gp.requiredPerDay)}/day · on track for ₹${Math.round(gp.perDay)}/day`
                : "Goal reached 🎉";
            return (
              <div className="goal" key={g.id}>
                <h4>{g.label}</h4>
                <ProgressBar value={pct} />
                <div className="meta">
                  <span>
                    ₹{inrPlain(g.saved)} / ₹{inrPlain(g.target)}
                  </span>
                  <span>Day {g.targetDay}</span>
                </div>
                <div className={"eta " + tone}>{need}</div>
                <div className="actions-cell" style={{ display: "flex", gap: 6 }}>
                  <button
                    className="icon-btn"
                    onClick={() => contributeGoal(g.id, 100)}
                    aria-label={"Contribute 100 rupees to " + g.label}
                  >
                    + ₹100
                  </button>
                  <button
                    className="icon-btn"
                    onClick={() => contributeGoal(g.id, 500)}
                    aria-label={"Contribute 500 rupees to " + g.label}
                  >
                    + ₹500
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() => removeGoal(g.id)}
                    aria-label={"Delete goal " + g.label}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
