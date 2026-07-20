import { useMemo, useState } from "react";
import { spentOnDate, spentTotal, fromHome } from "../store.js";
import { fmtMoney, fmtDay, todayStr, uid, CURRENCIES } from "../util.js";

const CATEGORIES = [
  ["food", "🍜 Food"],
  ["transport", "🛺 Transport"],
  ["tickets", "🎟️ Tickets"],
  ["shopping", "🛍️ Shopping"],
  ["stay", "🛏️ Stay"],
  ["other", "✨ Other"],
];

const catLabel = (id) =>
  (CATEGORIES.find(([c]) => c === id) || [null, "✨ Other"])[1];

// Log in whatever currency the till used (defaults to where you are);
// every total is shown in your home money.
export default function Spend({ store, fx, stop }) {
  const { trip, addExpense, removeExpense } = store;
  const rates = fx?.rates ?? null;
  const home = trip.homeCurrency;
  const local = stop?.localCurrency;
  const today = todayStr();

  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(local || home);
  const [category, setCategory] = useState("food");
  const [note, setNote] = useState("");

  const todaySpent = spentOnDate(trip, today, rates);
  const total = spentTotal(trip, rates);
  const budget = trip.dailyBudget;

  const byDay = useMemo(() => {
    const groups = {};
    for (const e of trip.expenses) (groups[e.date] ??= []).push(e);
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [trip.expenses]);

  const currencyOptions = useMemo(() => {
    const first = [...new Set([local, home].filter(Boolean))];
    return [...first, ...CURRENCIES.filter((c) => !first.includes(c))];
  }, [local, home]);

  const submit = (e) => {
    e.preventDefault();
    const n = parseFloat(amount);
    if (isNaN(n) || n <= 0) return;
    addExpense({
      id: uid(),
      date: today,
      amount: n,
      currency,
      category,
      note: note.trim(),
      ts: Date.now(),
    });
    setAmount("");
    setNote("");
  };

  const localLeft =
    budget != null && todaySpent != null && local && local !== home
      ? fromHome(budget - todaySpent, local, trip, rates)
      : null;

  return (
    <div className="screen stack-lg">
      <header>
        <p className="eyebrow">Am I overspending?</p>
        <h1>Spend</h1>
      </header>

      <section className="card stack">
        <div className="row-between">
          <div>
            <span className="label">Today</span>
            <div className="amount" style={{ fontSize: "1.5rem" }}>
              {todaySpent == null ? "—" : fmtMoney(todaySpent, home)}
            </div>
            {budget ? (
              <p className="small muted">
                {todaySpent != null && todaySpent <= budget
                  ? `${fmtMoney(budget - todaySpent, home)} left of ${fmtMoney(budget, home)}`
                  : todaySpent != null
                    ? `${fmtMoney(todaySpent - budget, home)} over your daily budget`
                    : ""}
              </p>
            ) : (
              <p className="small muted">No daily budget set</p>
            )}
            {localLeft != null && localLeft > 0 && (
              <p className="tiny">≈ {fmtMoney(localLeft, local)} where you are</p>
            )}
          </div>
          <div style={{ textAlign: "right" }}>
            <span className="label">Whole trip</span>
            <div className="amount">
              {total == null ? "—" : fmtMoney(total, home)}
            </div>
          </div>
        </div>
        {budget && todaySpent != null && (
          <div className={"bar" + (todaySpent > budget ? " over" : "")}>
            <div
              style={{ width: Math.min(100, (todaySpent / budget) * 100) + "%" }}
            />
          </div>
        )}
      </section>

      <form className="card stack" onSubmit={submit}>
        <span className="label">Log a spend — any currency</span>
        <div className="row">
          <input
            className="grow"
            type="number"
            step="any"
            inputMode="decimal"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <select
            className="conv-cur"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            aria-label="Currency"
          >
            {currencyOptions.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
        {rates && amount && currency !== home && rates[currency] && (
          <p className="tiny">
            = {fmtMoney(parseFloat(amount) / rates[currency], home)} in your money
          </p>
        )}
        <div className="chips">
          {CATEGORIES.map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={"chip" + (category === id ? " on" : "")}
              onClick={() => setCategory(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          placeholder="Note (optional) — e.g. ramen at the station"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button className="btn" disabled={!amount}>
          Add
        </button>
      </form>

      {byDay.length === 0 ? (
        <p className="empty">
          Nothing logged yet. Log your first spend — it takes 3 seconds.
        </p>
      ) : (
        byDay.map(([date, items]) => (
          <section key={date} className="card">
            <div className="row-between" style={{ marginBottom: 6 }}>
              <strong className="small">
                {date === today ? "Today" : fmtDay(date)}
              </strong>
              <span className="small muted amount">
                {daySum(items, trip, rates)}
              </span>
            </div>
            <div className="list">
              {items.map((e) => (
                <div key={e.id} className="list-item row-between">
                  <div className="grow">
                    <div>{catLabel(e.category)}</div>
                    {e.note && <div className="small muted">{e.note}</div>}
                  </div>
                  <span className="amount">{fmtMoney(e.amount, e.currency)}</span>
                  <button
                    className="btn-danger-quiet"
                    onClick={() => removeExpense(e.id)}
                    aria-label="Delete expense"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function daySum(items, trip, rates) {
  let sum = 0;
  for (const e of items) {
    if (e.currency === trip.homeCurrency) sum += e.amount;
    else if (rates?.[e.currency]) sum += e.amount / rates[e.currency];
    else return "—";
  }
  return fmtMoney(sum, trip.homeCurrency);
}
