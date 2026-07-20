import { useState } from "react";
import { riskForPlace } from "../api.js";
import { plannedCostOnDate, stopForDate } from "../store.js";
import { fmtMoney, fmtDay, todayStr, tripDates, uid } from "../util.js";

// Itinerary is the spine: each place carries a cost (in the currency of the
// country you'll be in that day) and indoor/outdoor for the weather check.
export default function Plan({ store, fx, wx, stop }) {
  const { trip, addPlace, updatePlace, removePlace } = store;
  const rates = fx?.rates ?? null;
  const dates = tripDates(trip);
  const today = todayStr();
  const [day, setDay] = useState(
    dates.includes(today) ? today : dates[0] || today
  );
  const [editing, setEditing] = useState(null); // null | "new" | place

  const dayStop = stopForDate(trip, day) || stop;
  const places = trip.places
    .filter((p) => p.date === day)
    .sort((a, b) => ((a.time || "99") < (b.time || "99") ? -1 : 1));
  const planned = plannedCostOnDate(trip, day, rates);

  return (
    <div className="screen stack-lg">
      <header>
        <p className="eyebrow">Your day, connected</p>
        <h1>Plan</h1>
      </header>

      <div className="hours" role="tablist">
        {dates.map((d) => (
          <button
            key={d}
            className={"chip" + (d === day ? " on" : "")}
            style={{ flex: "none" }}
            onClick={() => setDay(d)}
          >
            {d === today ? "Today" : fmtDay(d, { weekday: undefined })}
          </button>
        ))}
      </div>

      <section className="card stack">
        <div className="row-between">
          <div>
            <strong>{day === today ? "Today" : fmtDay(day)}</strong>
            {dayStop?.destination && (
              <span className="small muted"> · 📍 {dayStop.destination.name}</span>
            )}
          </div>
          <span className="small muted amount">
            {planned != null && planned > 0 &&
              `planned ${fmtMoney(planned, trip.homeCurrency)}` +
                (trip.dailyBudget
                  ? ` / ${fmtMoney(trip.dailyBudget, trip.homeCurrency)}`
                  : "")}
          </span>
        </div>

        {places.length === 0 ? (
          <p className="empty">
            No places yet for this day.
            <br />
            Add what you found on blogs, Instagram, anywhere.
          </p>
        ) : (
          <div className="list">
            {places.map((p) => (
              <PlaceRow
                key={p.id}
                p={p}
                wx={wx}
                onToggle={() => updatePlace(p.id, { done: !p.done })}
                onEdit={() => setEditing(p)}
              />
            ))}
          </div>
        )}

        <button className="btn btn-ghost" onClick={() => setEditing("new")}>
          + Add a place
        </button>
      </section>

      {editing && (
        <PlaceSheet
          place={editing === "new" ? null : editing}
          day={day}
          trip={trip}
          onSave={(data) => {
            if (editing === "new") addPlace({ id: uid(), done: false, ...data });
            else updatePlace(editing.id, data);
            setEditing(null);
          }}
          onDelete={
            editing !== "new"
              ? () => {
                  removePlace(editing.id);
                  setEditing(null);
                }
              : null
          }
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

export function PlaceRow({ p, wx, onToggle, onEdit }) {
  const risk = p.outdoor ? riskForPlace(wx?.hours, p.date, p.time) : null;
  const rainy = risk && risk.pop != null && risk.pop >= 50;
  return (
    <div className="list-item row" style={{ alignItems: "flex-start" }}>
      <button
        onClick={onToggle}
        aria-label={p.done ? "Mark not done" : "Mark done"}
        style={{ background: "none", fontSize: "1.25rem", lineHeight: 1.3 }}
      >
        {p.done ? "✅" : "⬜"}
      </button>
      <div className="grow" onClick={onEdit} style={{ cursor: "pointer" }}>
        <div className="row" style={{ flexWrap: "wrap", gap: 6 }}>
          <strong style={p.done ? { textDecoration: "line-through", opacity: 0.6 } : null}>
            {p.time ? `${p.time} · ` : ""}
            {p.name}
          </strong>
        </div>
        <div className="row" style={{ flexWrap: "wrap", gap: 6, marginTop: 4 }}>
          <span className={"badge " + (p.outdoor ? "badge-out" : "badge-in")}>
            {p.outdoor ? "🌳 outdoor" : "🏠 indoor"}
          </span>
          {rainy && (
            <span className="badge badge-rain">🌧 {risk.pop}% rain</span>
          )}
          {p.outdoor && risk && !rainy && risk.pop != null && (
            <span className="badge badge-ok">☀️ {risk.pop}% rain</span>
          )}
          {Number(p.cost) > 0 && (
            <span className="badge badge-in amount">
              ~{fmtMoney(Number(p.cost), p.costCurrency || "USD")}
            </span>
          )}
        </div>
        {p.note && <div className="small muted" style={{ marginTop: 4 }}>{p.note}</div>}
      </div>
    </div>
  );
}

function PlaceSheet({ place, day, trip, onSave, onDelete, onClose }) {
  const [name, setName] = useState(place?.name || "");
  const [time, setTime] = useState(place?.time || "");
  const [cost, setCost] = useState(place?.cost ?? "");
  const [outdoor, setOutdoor] = useState(place?.outdoor ?? false);
  const [note, setNote] = useState(place?.note || "");
  const [date, setDate] = useState(place?.date || day);

  // Cost is captured in the money of wherever you are that day.
  const costCurrency =
    place?.costCurrency ||
    stopForDate(trip, date)?.localCurrency ||
    trip.homeCurrency;

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet stack" onClick={(e) => e.stopPropagation()}>
        <h2>{place ? "Edit place" : "Add a place"}</h2>
        <label className="field">
          <span className="label">Place</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Tirta Empul temple"
            autoFocus={!place}
          />
        </label>
        <div className="row">
          <label className="field grow">
            <span className="label">Day</span>
            <input
              type="date"
              value={date}
              min={trip.startDate}
              max={trip.endDate}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
          <label className="field grow">
            <span className="label">Time (optional)</span>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span className="label">Cost estimate in {costCurrency} (optional)</span>
          <input
            type="number"
            step="any"
            inputMode="decimal"
            min="0"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="entry fee, meal, ticket…"
          />
        </label>
        <div className="chips">
          <button
            type="button"
            className={"chip" + (!outdoor ? " on" : "")}
            onClick={() => setOutdoor(false)}
          >
            🏠 Indoor
          </button>
          <button
            type="button"
            className={"chip" + (outdoor ? " on" : "")}
            onClick={() => setOutdoor(true)}
          >
            🌳 Outdoor
          </button>
        </div>
        <label className="field">
          <span className="label">Note (optional)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="booking code, tips from the blog…"
          />
        </label>
        <button
          className="btn"
          disabled={!name.trim()}
          onClick={() =>
            onSave({
              name: name.trim(),
              time,
              cost: cost === "" ? null : Number(cost),
              costCurrency,
              outdoor,
              note: note.trim(),
              date,
            })
          }
        >
          Save
        </button>
        {onDelete && (
          <button className="btn-danger-quiet" onClick={onDelete}>
            Delete this place
          </button>
        )}
      </div>
    </div>
  );
}
