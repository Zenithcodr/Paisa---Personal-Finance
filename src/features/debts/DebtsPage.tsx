import { useState } from "react";
import { useAppState } from "../../hooks/useStore";
import { takeLoan, repayExtra, removeDebt } from "../../core/store";
import { inrPlain } from "../../core/constants";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field } from "../../components/ui/Field";

export function DebtsPage() {
  const state = useAppState();
  const [label, setLabel] = useState("Quick loan");
  const [amount, setAmount] = useState("");
  const [apr, setApr] = useState("24");

  const submit = () => {
    const amt = Number(amount);
    if (!(amt > 0)) return;
    takeLoan({
      label: label.trim() || "Loan",
      amount: amt,
      apr: Number(apr) || 0,
      repayPerDay: Math.max(1, Math.round(amt / 30))
    });
    setAmount("");
  };

  return (
    <Card id="debts" kicker="Debts" title="Loans & repayment drag" ariaLabel="Debts and loans">
      <div className="sim-form">
        <Field
          label="Label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Field
          label="Amount (₹)"
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="2000"
        />
        <Field
          label="APR %"
          type="number"
          min={0}
          value={apr}
          onChange={(e) => setApr(e.target.value)}
        />
      </div>
      <div className="sim-actions">
        <Button variant="primary" onClick={submit}>
          + Take loan
        </Button>
      </div>

      <div className="list">
        {state.debts.length === 0 ? (
          <div className="empty">No loans.</div>
        ) : (
          state.debts.map((db) => (
            <div className="row" key={db.id}>
              <div className="ico" aria-hidden="true">
                💳
              </div>
              <div>
                <div className="label">{db.label}</div>
                <div className="sub">
                  Principal ₹{inrPlain(db.principal)} · APR {db.apr}% · ₹{Math.round(db.repayPerDay)}
                  /day
                </div>
              </div>
              <div className="amt neg">₹{inrPlain(db.remaining)} left</div>
              <div className="actions-cell">
                <button
                  className="icon-btn"
                  onClick={() => repayExtra(db.id, 500)}
                  aria-label={"Repay 500 rupees toward " + db.label}
                >
                  Repay ₹500
                </button>
                <button
                  className="icon-btn danger"
                  onClick={() => removeDebt(db.id)}
                  aria-label={"Delete loan " + db.label}
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
