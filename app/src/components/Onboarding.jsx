import { useEffect, useRef, useState } from "react";
import { searchCity } from "../api.js";
import { emptyTrip, emptyStop } from "../store.js";
import { CURRENCIES, todayStr, addDays } from "../util.js";

// Trip setup AND the config screen ("Edit trip"): home currency, daily
// budget (in home money), and one stop per country/city you'll be in —
// each stop drives currency, weather and the stay card while you're there.
export default function Onboarding({ existing, onDone, onCancel }) {
  const base = existing || emptyTrip();
  const [homeCurrency, setHomeCurrency] = useState(base.homeCurrency);
  const [dailyBudget, setDailyBudget] = useState(base.dailyBudget ?? "");
  const [stops, setStops] = useState(
    base.stops.length
      ? base.stops
      : [{ ...emptyStop(), startDate: todayStr(), endDate: addDays(todayStr(), 4) }]
  );
  const [currentStopId, setCurrentStopId] = useState(base.currentStopId);

  const setStop = (id, patch) =>
    setStops((ss) => ss.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const addStop = () => {
    const last = stops[stops.length - 1];
    const start = last?.endDate ? addDays(last.endDate, 1) : todayStr();
    setStops((ss) => [
      ...ss,
      { ...emptyStop(), startDate: start, endDate: addDays(start, 3) },
    ]);
  };

  const removeStop = (id) => setStops((ss) => ss.filter((s) => s.id !== id));

  // Backup: the trip is one JSON record — export/import is the no-backend
  // way to move it between devices or keep it safe.
  const fileRef = useRef(null);

  const exportTrip = () => {
    const blob = new Blob([JSON.stringify(existing, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tripmelo-backup-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importTrip = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || !Array.isArray(data.stops) || !data.homeCurrency)
          throw new Error("not a TripMelo backup");
        onDone({ ...emptyTrip(), ...data });
      } catch {
        alert("That file doesn't look like a TripMelo backup (.json).");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const valid =
    homeCurrency &&
    stops.length > 0 &&
    stops.every(
      (s) => s.destination && s.startDate && s.endDate && s.endDate >= s.startDate
    );

  const save = () => {
    const sorted = [...stops].sort((a, b) =>
      a.startDate < b.startDate ? -1 : 1
    );
    onDone({
      ...base,
      homeCurrency,
      dailyBudget: dailyBudget === "" ? null : Number(dailyBudget),
      stops: sorted,
      currentStopId: currentStopId && sorted.some((s) => s.id === currentStopId)
        ? currentStopId
        : null,
      startDate: sorted[0].startDate,
      endDate: sorted[sorted.length - 1].endDate,
    });
  };

  return (
    <div className="screen stack-lg">
      <header className="row" style={{ gap: 12 }}>
        <span className="logo-dot">🧭</span>
        <div>
          <h1>{existing ? "Trip settings" : "TripMelo"}</h1>
          {!existing && (
            <p className="small muted">
              One home for your whole trip. Set it up in a minute.
            </p>
          )}
        </div>
      </header>

      <section className="card stack">
        <div className="row">
          <label className="field grow">
            <span className="label">Your money (totals &amp; budget)</span>
            <select
              value={homeCurrency}
              onChange={(e) => setHomeCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field grow">
            <span className="label">Daily budget in {homeCurrency}</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={dailyBudget}
              onChange={(e) => setDailyBudget(e.target.value)}
              placeholder="optional"
            />
          </label>
        </div>
        <p className="tiny">
          Spends in any currency are totalled in {homeCurrency}. You pick the
          currency each time you log — it just defaults to where you are.
        </p>
      </section>

      {stops.map((s, i) => (
        <StopCard
          key={s.id}
          stop={s}
          index={i}
          canRemove={stops.length > 1}
          isCurrent={currentStopId === s.id}
          onCurrent={() =>
            setCurrentStopId(currentStopId === s.id ? null : s.id)
          }
          onChange={(patch) => setStop(s.id, patch)}
          onRemove={() => removeStop(s.id)}
        />
      ))}

      <button className="btn btn-ghost" onClick={addStop}>
        + Add another stop (new country or city)
      </button>

      <div className="stack">
        <button className="btn" disabled={!valid} onClick={save}>
          {existing ? "Save changes" : "Start my trip"}
        </button>
        {onCancel && (
          <button className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>

      <section className="card stack">
        <span className="label">Backup</span>
        <p className="tiny">
          Your trip lives on this phone. Export a file to back it up or move it
          to another device — import it there to restore everything.
        </p>
        <div className="row">
          {existing && (
            <button className="btn btn-ghost grow" onClick={exportTrip}>
              ⬇ Export trip
            </button>
          )}
          <button
            className="btn btn-ghost grow"
            onClick={() => fileRef.current?.click()}
          >
            ⬆ {existing ? "Import" : "Restore a backup"}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          style={{ display: "none" }}
          onChange={importTrip}
        />
      </section>

      {!existing && (
        <p className="tiny center">
          Everything stays on your phone — no account, works offline.
        </p>
      )}
    </div>
  );
}

function StopCard({ stop, index, canRemove, isCurrent, onCurrent, onChange, onRemove }) {
  const [query, setQuery] = useState(stop.destination?.name || "");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (stop.destination && query === stop.destination.name) return;
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      searchCity(query.trim())
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 350);
    return () => clearTimeout(timer.current);
  }, [query]);

  const pick = (r) => {
    onChange({ destination: r, localCurrency: r.localCurrency });
    setQuery(r.name);
    setResults([]);
  };

  return (
    <section className="card stack">
      <div className="row-between">
        <span className="label" style={{ marginBottom: 0 }}>
          STOP {index + 1}
          {stop.destination ? ` · ${stop.destination.name}` : ""}
        </span>
        <div className="row" style={{ gap: 6 }}>
          <button
            type="button"
            className={"chip" + (isCurrent ? " on" : "")}
            onClick={onCurrent}
            title="Use this stop for today's currency & weather"
          >
            📍 I'm here
          </button>
          {canRemove && (
            <button className="btn-danger-quiet" onClick={onRemove}>
              remove
            </button>
          )}
        </div>
      </div>

      <label className="field">
        <span className="label">City</span>
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange({ destination: null });
          }}
          placeholder="e.g. Tokyo, Ubud, Bangkok"
        />
      </label>
      {searching && <p className="tiny">Searching…</p>}
      {results.length > 0 && (
        <div className="suggest">
          {results.map((r, i) => (
            <button key={i} onClick={() => pick(r)}>
              <strong>{r.name}</strong>
              <span className="muted small">
                {" "}
                {r.region ? r.region + ", " : ""}
                {r.country}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="row">
        <label className="field grow">
          <span className="label">Arrive</span>
          <input
            type="date"
            value={stop.startDate || ""}
            onChange={(e) => onChange({ startDate: e.target.value })}
          />
        </label>
        <label className="field grow">
          <span className="label">Leave</span>
          <input
            type="date"
            value={stop.endDate || ""}
            min={stop.startDate || undefined}
            onChange={(e) => onChange({ endDate: e.target.value })}
          />
        </label>
        <label className="field" style={{ width: 92 }}>
          <span className="label">Money</span>
          <select
            value={stop.localCurrency}
            onChange={(e) => onChange({ localCurrency: e.target.value })}
          >
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
