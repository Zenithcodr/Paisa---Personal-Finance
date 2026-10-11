import { useState } from "react";
import { useAppState } from "../../hooks/useStore";
import { addExpense, getState, setState } from "../../core/store";
import { inrPlain, CATEGORY_ICONS } from "../../core/constants";
import type { Category } from "../../types/state";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Field, SelectField } from "../../components/ui/Field";

const EXPENSE_CATEGORIES: Category[] = [
  "Food",
  "Transport",
  "Shopping",
  "Entertainment",
  "Bills",
  "Health",
  "Misc"
];

export function TransactionsPage() {
  const state = useAppState();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category>("Food");
  const [note, setNote] = useState("");

  const submit = () => {
    const amt = Number(amount);
    if (!(amt > 0)) return;
    addExpense({ day: getState().day, amount: amt, category, note });
    setAmount("");
    setNote("");
  };

  const remove = (id: string) => {
    const s = structuredClone(getState());
    s.transactions = s.transactions.filter((t) => t.id !== id);
    setState(s);
  };

  const txs = [...state.transactions].sort((a, b) => b.day - a.day || b.ts - a.ts);

  return (
    <Card
      id="transactions"
      kicker="Transactions"
      title="What you spent, where it went"
      ariaLabel="Transactions"
    >
      <div className="sim-form">
        <Field
          label="Amount (₹)"
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
        <SelectField
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as Category)}
        >
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </SelectField>
        <Field
          label="Note"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="optional"
        />
      </div>
      <div className="sim-actions">
        <Button variant="primary" onClick={submit}>
          + Log expense
        </Button>
      </div>

      <div className="list">
        {txs.length === 0 ? (
          <div className="empty">No transactions yet. Log an expense or load the demo.</div>
        ) : (
          txs.slice(0, 40).map((t) => {
            const income = t.amount < 0;
            return (
              <div className="row" key={t.id}>
                <div className="ico" aria-hidden="true">
                  {CATEGORY_ICONS[t.category] || "•"}
                </div>
                <div>
                  <div className="label">{t.note || t.category}</div>
                  <div className="sub">
                    Day {t.day} · {t.category}
                    {t.source !== "manual" ? " · " + t.source : ""}
                  </div>
                </div>
                <div className={"amt " + (income ? "pos" : "neg")}>
                  {income ? "+" : ""}₹{inrPlain(Math.abs(t.amount))}
                </div>
                <div className="actions-cell">
                  <button
                    className="icon-btn danger"
                    onClick={() => remove(t.id)}
                    aria-label={"Delete transaction " + (t.note || t.category)}
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
