import { useState } from "react";
import { useAppState } from "../../hooks/useStore";
import { addIncomeOneTime, addRecurringIncome, removeRecurringIncome, getState } from "../../core/store";
import { inrPlain } from "../../core/constants";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, SelectField } from "../../components/ui/Field";

export function IncomePage() {
  const state = useAppState();
  const [otLabel, setOtLabel] = useState("Freelance gig");
  const [otAmount, setOtAmount] = useState("");
  const [recLabel, setRecLabel] = useState("Part-time stipend");
  const [recAmount, setRecAmount] = useState("");
  const [cadence, setCadence] = useState<"monthly" | "weekly">("monthly");

  const addOneTime = () => {
    const amt = Number(otAmount);
    if (!(amt > 0)) return;
    addIncomeOneTime({ day: getState().day, amount: amt, label: otLabel.trim() || "Income" });
    setOtAmount("");
  };

  const addRecurring = () => {
    const amt = Number(recAmount);
    if (!(amt > 0)) return;
    addRecurringIncome({
      label: recLabel.trim() || "Recurring income",
      amount: amt,
      cadence,
      startDay: getState().day
    });
    setRecAmount("");
  };

  return (
    <Card id="income" kicker="Income" title="What's coming in" ariaLabel="Income">
      <div className="sim-form">
        <Field
          label="One-time label"
          type="text"
          value={otLabel}
          onChange={(e) => setOtLabel(e.target.value)}
        />
        <Field
          label="One-time amount (₹)"
          type="number"
          min={0}
          value={otAmount}
          onChange={(e) => setOtAmount(e.target.value)}
          placeholder="3000"
        />
        <div className="field" style={{ justifyContent: "flex-end" }}>
          <Button variant="primary" onClick={addOneTime}>
            + One-time income
          </Button>
        </div>
      </div>

      <div className="sim-form">
        <Field
          label="Recurring label"
          type="text"
          value={recLabel}
          onChange={(e) => setRecLabel(e.target.value)}
        />
        <Field
          label="Recurring amount (₹)"
          type="number"
          min={0}
          value={recAmount}
          onChange={(e) => setRecAmount(e.target.value)}
          placeholder="2500"
        />
        <SelectField
          label="Cadence"
          value={cadence}
          onChange={(e) => setCadence(e.target.value as "monthly" | "weekly")}
        >
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </SelectField>
      </div>
      <div className="sim-actions">
        <Button variant="primary" onClick={addRecurring}>
          + Recurring income
        </Button>
      </div>

      <div className="list">
        {state.income.recurring.length === 0 && state.income.oneTime.length === 0 ? (
          <div className="empty">No income set. Add it to model paydays.</div>
        ) : (
          <>
            {state.income.recurring.map((r) => (
              <div className="row" key={r.id}>
                <div className="ico" aria-hidden="true">
                  💵
                </div>
                <div>
                  <div className="label">{r.label}</div>
                  <div className="sub">
                    {r.cadence} · starts Day {r.startDay}
                  </div>
                </div>
                <div className="amt pos">+₹{inrPlain(r.amount)}</div>
                <div className="actions-cell">
                  <button
                    className="icon-btn danger"
                    onClick={() => removeRecurringIncome(r.id)}
                    aria-label={"Delete recurring income " + r.label}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {state.income.oneTime.map((o) => (
              <div className="row" key={o.id}>
                <div className="ico" aria-hidden="true">
                  💰
                </div>
                <div>
                  <div className="label">{o.label}</div>
                  <div className="sub">
                    One-time · Day {o.day}
                    {o.applied ? " · applied" : ""}
                  </div>
                </div>
                <div className="amt pos">+₹{inrPlain(o.amount)}</div>
                <div className="actions-cell" />
              </div>
            ))}
          </>
        )}
      </div>
    </Card>
  );
}
