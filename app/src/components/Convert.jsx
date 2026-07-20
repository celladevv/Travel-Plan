import { useMemo, useState } from "react";
import { fmtNum, CURRENCIES } from "../util.js";

// The till moment: type either side, the other follows. Any currency pair —
// every rate derives from the one cached home-currency table, so switching
// pairs costs nothing and works offline. Defaults to where you are ↔ home.
export default function Convert({ trip, fx, stop }) {
  const local = stop?.localCurrency || trip.homeCurrency;
  const [from, setFrom] = useState(local); // what the till says
  const [to, setTo] = useState(trip.homeCurrency); // your money
  const [top, setTop] = useState("");
  const [bottom, setBottom] = useState("");

  // X→Y from the home-based table: rate = r[to] / r[from]
  const rate = useMemo(() => {
    const r = fx?.rates;
    if (!r || !r[from] || !r[to]) return null;
    return r[to] / r[from];
  }, [fx, from, to]);

  const editTop = (v, rr = rate) => {
    setTop(v);
    const n = parseFloat(String(v).replace(/,/g, ""));
    setBottom(rr == null || isNaN(n) ? "" : fmtNum(n * rr));
  };
  const editBottom = (v, rr = rate) => {
    setBottom(v);
    const n = parseFloat(String(v).replace(/,/g, ""));
    setTop(rr == null || isNaN(n) ? "" : fmtNum(n / rr));
  };

  const changeFrom = (c) => {
    setFrom(c);
    const r = fx?.rates;
    if (r && r[c] && r[to]) editTop(top.replace(/,/g, ""), r[to] / r[c]);
  };
  const changeTo = (c) => {
    setTo(c);
    const r = fx?.rates;
    if (r && r[from] && r[c]) editTop(top.replace(/,/g, ""), r[c] / r[from]);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setTop(bottom.replace(/,/g, ""));
    setBottom(top.replace(/,/g, ""));
  };

  const big = rate != null && rate < 0.01; // weak-unit side quick amounts
  const quick = big || from === local && local !== trip.homeCurrency
    ? bigUnits(from)
    : [5, 10, 50, 100];

  return (
    <div className="screen stack-lg">
      <header>
        <p className="eyebrow">At the till{stop ? ` · ${stop.destination?.name}` : ""}</p>
        <h1>Instant converter</h1>
      </header>

      <section className="card stack">
        <div className="row conv-amount">
          <input
            className="grow"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={top}
            onChange={(e) => editTop(e.target.value)}
            aria-label={`Amount in ${from}`}
            autoFocus
          />
          <select
            className="conv-cur"
            value={from}
            onChange={(e) => changeFrom(e.target.value)}
            aria-label="From currency"
          >
            {options(trip, stop, from)}
          </select>
        </div>

        <button className="conv-swap" onClick={swap} aria-label="Swap currencies">
          ⇅
        </button>

        <div className="row conv-amount">
          <input
            className="grow"
            type="text"
            inputMode="decimal"
            placeholder="0"
            value={bottom}
            onChange={(e) => editBottom(e.target.value)}
            aria-label={`Amount in ${to}`}
          />
          <select
            className="conv-cur"
            value={to}
            onChange={(e) => changeTo(e.target.value)}
            aria-label="To currency"
          >
            {options(trip, stop, to)}
          </select>
        </div>

        <p className="tiny center">
          {fx == null
            ? "Getting live rates…"
            : rate == null
              ? "No rate for this pair."
              : `1 ${from} = ${fmtRate(rate)} ${to}` +
                (fx.stale ? ` · offline, rates as of ${shortDate(fx.updated)}` : "")}
        </p>
      </section>

      <section className="stack">
        <span className="label">Quick amounts ({from})</span>
        <div className="chips">
          {quick.map((q) => (
            <button key={q} className="chip" onClick={() => editTop(String(q))}>
              {q.toLocaleString()}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

// Local + home first, then everything else.
function options(trip, stop, current) {
  const first = [
    ...new Set(
      [stop?.localCurrency, trip.homeCurrency, current].filter(Boolean)
    ),
  ];
  const rest = CURRENCIES.filter((c) => !first.includes(c));
  return [...first, ...rest].map((c) => <option key={c}>{c}</option>);
}

function bigUnits(cur) {
  if (cur === "JPY" || cur === "THB" || cur === "PHP") return [100, 500, 1000, 5000];
  if (cur === "KRW") return [1000, 5000, 10000, 50000];
  return [10000, 50000, 100000, 500000];
}

// Rates can be tiny (1 IDR = 0.00023 MYR) — keep significant digits.
function fmtRate(rate) {
  return new Intl.NumberFormat(undefined, {
    maximumSignificantDigits: 4,
  }).format(rate);
}

function shortDate(s) {
  if (!s) return "earlier";
  const d = new Date(s);
  return isNaN(d) ? "earlier" : d.toLocaleDateString();
}
