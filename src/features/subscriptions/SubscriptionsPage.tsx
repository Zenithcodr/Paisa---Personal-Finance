import { useState } from "react";
import { useAppState, useDerived } from "../../hooks/useStore";
import { addSubscription, toggleSubscription, removeSubscription, getState } from "../../core/store";
import { inr, inrPlain } from "../../core/constants";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, SelectField } from "../../components/ui/Field";

export function SubscriptionsPage() {
  const state = useAppState();
  const d = useDerived();
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [cycle, setCycle] = useState<"monthly" | "annual">("monthly");

  const submit = () => {
    const amt = Number(amount);
    if (!name.trim() || !(amt > 0)) return;
    addSubscription({
      name: name.trim(),
      amount: amt,
      cycle,
      renewalDay: Math.min(30, getState().day + 30)
    });
    setName("");
    setAmount("");
  };

  return (
    <Card
      id="subscriptions"
      kicker="Subscriptions"
      title="The recurring drag"
      ariaLabel="Subscriptions"
      actions={
        <span className="muted small">
          Monthly <strong>{inr(d.subMonthly)}</strong> · Annual <strong>{inr(d.subAnnual)}</strong>
        </span>
      }
    >
      <div className="sim-form">
        <Field
          label="Name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Spotify"
        />
        <Field
          label="Monthly cost (₹)"
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="119"
        />
        <SelectField
          label="Cycle"
          value={cycle}
          onChange={(e) => setCycle(e.target.value as "monthly" | "annual")}
        >
          <option value="monthly">Monthly</option>
          <option value="annual">Annual</option>
        </SelectField>
      </div>
      <div className="sim-actions">
        <Button variant="primary" onClick={submit}>
          + Add subscription
        </Button>
      </div>

      <div className="list">
        {state.subscriptions.length === 0 ? (
          <div className="empty">No subscriptions yet.</div>
        ) : (
          state.subscriptions.map((s) => (
            <div className="row" key={s.id}>
              <div className="ico" aria-hidden="true">
                📺
              </div>
              <div>
                <div className="label">{s.name}</div>
                <div className="sub">
                  {s.cycle} · renews Day {s.renewalDay > 30 ? s.renewalDay - 30 : s.renewalDay}
                  {s.active ? "" : " · canceled"}
                </div>
              </div>
              <div className={"amt " + (s.active ? "neg" : "muted")}>₹{inrPlain(s.amount)}</div>
              <div className="actions-cell">
                <button
                  className="icon-btn"
                  onClick={() => toggleSubscription(s.id, !s.active)}
                  aria-label={(s.active ? "Cancel" : "Restart") + " subscription " + s.name}
                >
                  {s.active ? "Cancel" : "Restart"}
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => removeSubscription(s.id)}
                  aria-label={"Delete subscription " + s.name}
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
