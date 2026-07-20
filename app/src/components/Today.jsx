import { riskForPlace, wmoIcon, wmoLabel } from "../api.js";
import { plannedCostOnDate, spentOnDate, fromHome } from "../store.js";
import { fmtMoney, fmtDay, todayStr, daysBetween } from "../util.js";
import { PlaceRow } from "./Plan.jsx";

// The connected day: itinerary is the spine, money and weather hang off it.
// Everything follows the stop you're in — currency, forecast, headline.
export default function Today({ store, fx, wx, stop, onEditTrip, goTab }) {
  const { trip, update, updatePlace } = store;
  const today = todayStr();
  const rates = fx?.rates ?? null;
  const home = trip.homeCurrency;
  const local = stop?.localCurrency;

  const beforeTrip = trip.startDate && today < trip.startDate;
  const afterTrip = trip.endDate && today > trip.endDate;
  const dayShown = beforeTrip ? trip.startDate : today;

  const places = trip.places
    .filter((p) => p.date === dayShown)
    .sort((a, b) => ((a.time || "99") < (b.time || "99") ? -1 : 1));

  const spent = spentOnDate(trip, today, rates);
  const plannedLeft = plannedCostOnDate(trip, dayShown, rates, { remainingOnly: true });
  const budget = trip.dailyBudget;
  const leftAfterSpend = budget != null && spent != null ? budget - spent : null;
  const leftAfterPlans =
    leftAfterSpend != null && plannedLeft != null
      ? leftAfterSpend - plannedLeft
      : null;

  const alert = findAlert(places, wx, trip, leftAfterSpend, rates);

  // Rolling 24-hour window from "now", crossing midnight — plus a 7-day
  // outlook below it ("will it rain tomorrow?" is a today question too).
  // Forecast dates are destination-local; across timezones the destination
  // can already be on the next calendar day, so fall back gracefully.
  const allHours = wx?.hours || [];
  const nowHour = new Date().getHours();
  let startIdx = allHours.findIndex(
    (h) => h.date > dayShown || (h.date === dayShown && h.hour >= nowHour)
  );
  if (startIdx === -1 && allHours.length) startIdx = 0;
  const hoursToShow = startIdx >= 0 ? allHours.slice(startIdx, startIdx + 24) : [];
  const tzShifted =
    hoursToShow.length > 0 && hoursToShow[0].date !== dayShown;
  const nowWx =
    !tzShifted && hoursToShow[0]?.hour === nowHour ? hoursToShow[0] : null;

  // Daily outlook derived from the same hourly fetch — no extra API call.
  const byDate = {};
  for (const h of allHours) (byDate[h.date] ??= []).push(h);
  const dailyOutlook = Object.entries(byDate)
    .map(([date, hs]) => ({
      date,
      hi: Math.max(...hs.map((h) => h.temp)),
      lo: Math.min(...hs.map((h) => h.temp)),
      pop: Math.max(...hs.map((h) => h.pop ?? 0)),
      code: (hs.find((h) => h.hour === 13) || hs[Math.floor(hs.length / 2)]).code,
    }))
    .slice(0, 7);

  const localLeft =
    leftAfterPlans != null && local && local !== home
      ? fromHome(leftAfterPlans, local, trip, rates)
      : null;

  return (
    <div className="screen stack-lg">
      <header className="row-between">
        <div>
          <p className="eyebrow">
            📍 {stop?.destination?.name || "No stop set"}
            {beforeTrip
              ? ` · in ${daysBetween(today, trip.startDate)} day${daysBetween(today, trip.startDate) === 1 ? "" : "s"}`
              : afterTrip
                ? " · trip ended"
                : ""}
          </p>
          <h1>{beforeTrip ? fmtDay(dayShown) : fmtDay(today)}</h1>
        </div>
        <button className="btn-quiet" onClick={onEditTrip}>
          Trip settings
        </button>
      </header>

      {trip.stops.length > 1 && (
        <div className="chips">
          {trip.stops.map((s) => (
            <button
              key={s.id}
              className={"chip" + (s.id === stop?.id ? " on" : "")}
              onClick={() => update({ currentStopId: s.id })}
            >
              {s.destination?.name || "?"}
            </button>
          ))}
        </div>
      )}

      {alert && (
        <section
          className="card"
          style={{ borderColor: "var(--danger)", background: "var(--danger-soft)" }}
        >
          <strong>🌧 Heads up</strong>
          <p className="small" style={{ marginTop: 4 }}>{alert}</p>
        </section>
      )}

      <section className="card stack">
        <div className="row-between">
          <span className="label">
            Weather in {stop?.destination?.name || "…"}
            {tzShifted && hoursToShow[0] &&
              ` · already ${fmtDay(hoursToShow[0].date)} there`}
          </span>
          {nowWx && (
            <span className="small muted">
              now {wmoIcon(nowWx.code)} {nowWx.temp}° · {wmoLabel(nowWx.code)}
            </span>
          )}
        </div>
        {hoursToShow.length ? (
          <div className="hours">
            {hoursToShow.map((h) => (
              <div
                key={h.time}
                className={"hour-card" + ((h.pop ?? 0) >= 50 ? " wet" : "")}
              >
                <div className="p">
                  {h.hour === 0 ? (
                    <strong>{weekday(h.date)}</strong>
                  ) : (
                    `${String(h.hour).padStart(2, "0")}:00`
                  )}
                </div>
                <div>{wmoIcon(h.code)}</div>
                <div className="t">{h.temp}°</div>
                <div className="p">{h.pop != null ? h.pop + "%" : ""}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty">No forecast available — check your connection.</p>
        )}
        {dailyOutlook.length > 1 && (
          <div className="list">
            {dailyOutlook.map((d) => (
              <div key={d.date} className="list-item row-between">
                <span className="small" style={{ width: 86 }}>
                  {d.date === dayShown ? "Today" : fmtDay(d.date)}
                </span>
                <span>{wmoIcon(d.code)}</span>
                <span
                  className={"small amount " + (d.pop >= 50 ? "" : "muted")}
                  style={d.pop >= 50 ? { color: "var(--danger)" } : null}
                >
                  {d.pop}%
                </span>
                <span className="small amount muted">
                  {d.lo}° <span style={{ opacity: 0.5 }}>/</span>{" "}
                  <strong style={{ color: "var(--text)" }}>{d.hi}°</strong>
                </span>
              </div>
            ))}
          </div>
        )}
        {wx?.stale && <p className="tiny">Offline — showing the last forecast.</p>}
      </section>

      <section className="card stack">
        <span className="label">Money today · in your {home}</span>
        {budget == null ? (
          <p className="small muted">
            {spent != null && spent > 0
              ? `Spent ${fmtMoney(spent, home)} today.`
              : "No spends yet today."}{" "}
            Set a daily budget in Trip settings to see what's left.
          </p>
        ) : (
          <>
            <div className="row-between">
              <span className="small muted">
                spent {spent == null ? "—" : fmtMoney(spent, home)}
                {plannedLeft != null && plannedLeft > 0 &&
                  ` · plans ~${fmtMoney(plannedLeft, home)}`}
              </span>
              <strong className="amount">
                {leftAfterPlans == null
                  ? ""
                  : leftAfterPlans >= 0
                    ? `${fmtMoney(leftAfterPlans, home)} left`
                    : `${fmtMoney(-leftAfterPlans, home)} short`}
              </strong>
            </div>
            {spent != null && plannedLeft != null && (
              <div className={"bar" + (spent + plannedLeft > budget ? " over" : "")}>
                <div
                  style={{
                    width:
                      Math.min(100, ((spent + plannedLeft) / budget) * 100) + "%",
                  }}
                />
              </div>
            )}
            {localLeft != null && (
              <p className="tiny">
                ≈ {fmtMoney(Math.abs(localLeft), local)}{" "}
                {leftAfterPlans >= 0 ? "left" : "over"} in {local}, where you are
              </p>
            )}
          </>
        )}
      </section>

      <section className="card stack">
        <div className="row-between">
          <span className="label">
            {beforeTrip ? `First day's plan` : "Today's plan"}
          </span>
          <button className="btn-quiet" onClick={() => goTab("plan")}>
            Edit plan
          </button>
        </div>
        {places.length === 0 ? (
          <p className="empty">Nothing planned{beforeTrip ? " yet" : " today"}.</p>
        ) : (
          <div className="list">
            {places.map((p) => (
              <PlaceRow
                key={p.id}
                p={p}
                wx={wx}
                onToggle={() => updatePlace(p.id, { done: !p.done })}
                onEdit={() => goTab("plan")}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function weekday(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString(undefined, {
    weekday: "short",
  });
}

// "Your 15:00 temple is outdoors in a 70% rain window — it costs ~¥1,500,
// leaving Rp400,000 for the day."
function findAlert(places, wx, trip, leftAfterSpend, rates) {
  for (const p of places) {
    if (!p.outdoor || p.done) continue;
    const risk = riskForPlace(wx?.hours, p.date, p.time);
    if (!risk || risk.pop == null || risk.pop < 50) continue;
    let s = `Your ${p.time ? p.time + " " : ""}${p.name} is outdoors in a ${risk.pop}% rain window`;
    const cost = Number(p.cost) || 0;
    if (cost > 0) {
      s += ` — and costs ~${fmtMoney(cost, p.costCurrency || trip.homeCurrency)}`;
      const costHome =
        p.costCurrency === trip.homeCurrency
          ? cost
          : rates?.[p.costCurrency]
            ? cost / rates[p.costCurrency]
            : null;
      if (leftAfterSpend != null && costHome != null)
        s += `, leaving ${fmtMoney(Math.max(0, leftAfterSpend - costHome), trip.homeCurrency)} for the day`;
    }
    return s + ". Consider an indoor swap or bring a poncho.";
  }
  return null;
}
