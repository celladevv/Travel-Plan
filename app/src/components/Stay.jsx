import { useEffect, useState } from "react";
import { fmtDay } from "../util.js";

// The immigration moment — one stay card per stop, huge and readable
// offline. Defaults to the stop you're in right now.
export default function Stay({ store, stop }) {
  const { trip, updateStop } = store;
  const [stopId, setStopId] = useState(stop?.id || trip.stops[0]?.id);
  const current = trip.stops.find((s) => s.id === stopId) || trip.stops[0];

  const [form, setForm] = useState(current?.stay || {});
  const [showCard, setShowCard] = useState(false);
  const [saved, setSaved] = useState(false);

  // Switching stops loads that stop's stay
  useEffect(() => {
    setForm(current?.stay || {});
    setSaved(false);
  }, [stopId]);

  if (!current)
    return (
      <div className="screen stack-lg">
        <header>
          <p className="eyebrow">Ready at immigration</p>
          <h1>Your stay</h1>
        </header>
        <p className="empty">Add a stop in Trip settings first.</p>
      </div>
    );

  const stay = current.stay || {};
  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setSaved(false);
  };
  const save = () => {
    updateStop(current.id, { stay: form });
    setSaved(true);
  };
  const hasCard = (stay.hotel || "").trim() || (stay.address || "").trim();

  if (showCard)
    return (
      <div className="overlay" onClick={() => setShowCard(false)}>
        <p className="kicker">I'M STAYING AT · {current.destination?.name?.toUpperCase()}</p>
        <div className="big">{stay.hotel || "—"}</div>
        <div className="addr">{stay.address}</div>
        {(stay.checkIn || stay.checkOut) && (
          <div className="sub">
            {stay.checkIn && fmtDay(stay.checkIn)} →{" "}
            {stay.checkOut && fmtDay(stay.checkOut)}
          </div>
        )}
        {stay.note && <div className="sub">📝 {stay.note}</div>}
        <div className="sub" style={{ marginTop: 28 }}>
          tap anywhere to close
        </div>
      </div>
    );

  return (
    <div className="screen stack-lg">
      <header>
        <p className="eyebrow">Ready at immigration</p>
        <h1>Your stay</h1>
      </header>

      {trip.stops.length > 1 && (
        <div className="chips">
          {trip.stops.map((s) => (
            <button
              key={s.id}
              className={"chip" + (s.id === current.id ? " on" : "")}
              onClick={() => setStopId(s.id)}
            >
              {s.destination?.name || "?"}
            </button>
          ))}
        </div>
      )}

      {hasCard && (
        <button className="btn" onClick={() => setShowCard(true)}>
          🛂 Show stay card
        </button>
      )}

      <section className="card stack">
        <label className="field">
          <span className="label">
            Hotel / stay in {current.destination?.name || "this stop"}
          </span>
          <input
            value={form.hotel || ""}
            onChange={set("hotel")}
            placeholder="e.g. Ubud Garden Villa"
          />
        </label>
        <label className="field">
          <span className="label">Address</span>
          <textarea
            rows={3}
            value={form.address || ""}
            onChange={set("address")}
            placeholder="street, area, city — as the booking shows it"
          />
        </label>
        <div className="row">
          <label className="field grow">
            <span className="label">Check-in</span>
            <input type="date" value={form.checkIn || ""} onChange={set("checkIn")} />
          </label>
          <label className="field grow">
            <span className="label">Check-out</span>
            <input type="date" value={form.checkOut || ""} onChange={set("checkOut")} />
          </label>
        </div>
        <label className="field">
          <span className="label">Note — booking code, deposit, wifi…</span>
          <input
            value={form.note || ""}
            onChange={set("note")}
            placeholder="e.g. Booking.com #2831 · paid deposit 500k"
          />
        </label>
        <button className="btn" onClick={save}>
          {saved ? "Saved ✓" : "Save"}
        </button>
      </section>

      <p className="tiny center">
        Stored on your phone — readable offline at the immigration desk.
      </p>
    </div>
  );
}
