import { useState } from "react";
import { fmtDay, todayStr, uid } from "../util.js";

// A trip can have many stays — a hostel night, then a villa, a hotel per
// city. Each gets a full-screen card: huge address, readable offline,
// ready whenever a form or a front desk asks.
export default function Stay({ store }) {
  const { trip, addStay, updateStay, removeStay } = store;
  const today = todayStr();

  const stays = [...trip.stays].sort((a, b) =>
    (a.checkIn || "9999") < (b.checkIn || "9999") ? -1 : 1
  );
  const [editing, setEditing] = useState(null); // null | "new" | stay
  const [showCard, setShowCard] = useState(null); // stay | null

  // "Tonight" = you sleep there tonight (checkout day doesn't count).
  const isCurrent = (s) =>
    s.checkIn && s.checkOut && s.checkIn <= today && today < s.checkOut;

  if (showCard)
    return (
      <div className="overlay" onClick={() => setShowCard(null)}>
        <p className="kicker">I'M STAYING AT</p>
        <div className="big">{showCard.hotel || "—"}</div>
        <div className="addr">{showCard.address}</div>
        {(showCard.checkIn || showCard.checkOut) && (
          <div className="sub">
            {showCard.checkIn && fmtDay(showCard.checkIn)} →{" "}
            {showCard.checkOut && fmtDay(showCard.checkOut)}
          </div>
        )}
        {showCard.note && <div className="sub">📝 {showCard.note}</div>}
        <div className="sub" style={{ marginTop: 28 }}>
          tap anywhere to close
        </div>
      </div>
    );

  return (
    <div className="screen stack-lg">
      <header>
        <p className="eyebrow">Where you're sleeping</p>
        <h1>Your stays</h1>
      </header>

      {stays.length === 0 ? (
        <p className="empty">
          No stays yet. Add your hotel so the name and address are ready the
          moment a form or front desk asks for them.
        </p>
      ) : (
        stays.map((s) => (
          <section key={s.id} className="card stack">
            <div className="row-between">
              <div className="grow">
                <strong>{s.hotel || "Unnamed stay"}</strong>
                {isCurrent(s) && (
                  <span className="badge badge-ok" style={{ marginLeft: 8 }}>
                    🛏 tonight
                  </span>
                )}
                {(s.checkIn || s.checkOut) && (
                  <div className="small muted">
                    {s.checkIn && fmtDay(s.checkIn)} →{" "}
                    {s.checkOut && fmtDay(s.checkOut)}
                  </div>
                )}
                {s.address && (
                  <div className="small muted" style={{ marginTop: 2 }}>
                    {s.address}
                  </div>
                )}
              </div>
            </div>
            <div className="row">
              <button
                className="btn btn-ghost grow"
                onClick={() => setShowCard(s)}
              >
                🛂 Show card
              </button>
              <button
                className="btn btn-ghost grow"
                onClick={() => setEditing(s)}
              >
                Edit
              </button>
            </div>
          </section>
        ))
      )}

      <button className="btn btn-ghost" onClick={() => setEditing("new")}>
        + Add a stay
      </button>

      <p className="tiny center">
        Stored on your phone — readable offline at any desk.
      </p>

      {editing && (
        <StaySheet
          stay={editing === "new" ? null : editing}
          trip={trip}
          onSave={(data) => {
            if (editing === "new") addStay({ id: uid(), ...data });
            else updateStay(editing.id, data);
            setEditing(null);
          }}
          onDelete={
            editing !== "new"
              ? () => {
                  removeStay(editing.id);
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

function StaySheet({ stay, trip, onSave, onDelete, onClose }) {
  const [hotel, setHotel] = useState(stay?.hotel || "");
  const [address, setAddress] = useState(stay?.address || "");
  const [checkIn, setCheckIn] = useState(stay?.checkIn || trip.startDate || "");
  const [checkOut, setCheckOut] = useState(stay?.checkOut || "");
  const [note, setNote] = useState(stay?.note || "");

  return (
    <div className="sheet-back" onClick={onClose}>
      <div className="sheet stack" onClick={(e) => e.stopPropagation()}>
        <h2>{stay ? "Edit stay" : "Add a stay"}</h2>
        <label className="field">
          <span className="label">Hotel / stay name</span>
          <input
            value={hotel}
            onChange={(e) => setHotel(e.target.value)}
            placeholder="e.g. Ubud Garden Villa"
            autoFocus={!stay}
          />
        </label>
        <label className="field">
          <span className="label">Address</span>
          <textarea
            rows={3}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="street, area, city — as the booking shows it"
          />
        </label>
        <div className="row">
          <label className="field grow">
            <span className="label">Check-in</span>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
            />
          </label>
          <label className="field grow">
            <span className="label">Check-out</span>
            <input
              type="date"
              value={checkOut}
              min={checkIn || undefined}
              onChange={(e) => setCheckOut(e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span className="label">Note — booking code, deposit, wifi…</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Booking.com #2831 · paid deposit 500k"
          />
        </label>
        <button
          className="btn"
          disabled={!hotel.trim() && !address.trim()}
          onClick={() =>
            onSave({
              hotel: hotel.trim(),
              address: address.trim(),
              checkIn,
              checkOut,
              note: note.trim(),
            })
          }
        >
          Save
        </button>
        {onDelete && (
          <button className="btn-danger-quiet" onClick={onDelete}>
            Delete this stay
          </button>
        )}
      </div>
    </div>
  );
}
