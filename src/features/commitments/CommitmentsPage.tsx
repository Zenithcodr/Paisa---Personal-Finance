import { useState } from "react";
import { useAppState } from "../../hooks/useStore";
import { addCommitment, removeCommitment, getState } from "../../core/store";
import { inrPlain } from "../../core/constants";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, SelectField } from "../../components/ui/Field";

export function CommitmentsPage() {
  const state = useAppState();
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"monthly" | "weekly">("monthly");

  const submit = () => {
    const amt = Number(amount);
    if (!label.trim() || !(amt > 0)) return;
    addCommitment({
      label: label.trim(),
      amount: amt,
      frequency,
      nextDueDay: getState().day
    });
    setLabel("");
    setAmount("");
  };

  return (
    <Card
      id="commitments"
      kicker="Commitments"
      title="Bills & EMIs you owe"
      ariaLabel="Commitments"
    >
      <div className="sim-form">
        <Field
          label="Label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Phone EMI"
        />
        <Field
          label="Amount (₹)"
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="600"
        />
        <SelectField
          label="Frequency"
          value={frequency}
          onChange={(e) => setFrequency(e.target.value as "monthly" | "weekly")}
        >
          <option value="monthly">Monthly</option>
          <option value="weekly">Weekly</option>
        </SelectField>
      </div>
      <div className="sim-actions">
        <Button variant="primary" onClick={submit}>
          + Add commitment
        </Button>
      </div>

      <div className="list">
        {state.commitments.length === 0 ? (
          <div className="empty">No recurring commitments yet.</div>
        ) : (
          state.commitments.map((c) => (
            <div className="row" key={c.id}>
              <div className="ico" aria-hidden="true">
                📅
              </div>
              <div>
                <div className="label">{c.label}</div>
                <div className="sub">
                  {c.frequency} · next Day {c.nextDueDay}
                </div>
              </div>
              <div className="amt neg">₹{inrPlain(c.amount)}</div>
              <div className="actions-cell">
                <button
                  className="icon-btn danger"
                  onClick={() => removeCommitment(c.id)}
                  aria-label={"Delete commitment " + c.label}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
