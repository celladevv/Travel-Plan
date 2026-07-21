// All trip data lives in localStorage — no accounts, no backend (PRD:
// "store locally first"). v2 model: a trip is a list of STOPS (each with its
// own country, currency, dates and stay); money is budgeted and totalled in
// the traveller's HOME currency, logged in whatever currency the till used.

import { useEffect, useState } from "react";
import { todayStr, uid } from "./util.js";

const KEY = "tripmelo.v2";
// Previous storage names, migrated forward on load so no saved trip is lost
// across the rename from "Calm Trip" to TripMelo.
const LEGACY_V2 = "calm-trip.v2"; // same shape, old name
const LEGACY_V1 = "calm-trip.v1"; // oldest shape (pre multi-stop)

export const emptyStop = () => ({
  id: uid(),
  destination: null, // { name, region, country, countryCode, lat, lon }
  localCurrency: "USD",
  startDate: null,
  endDate: null,
  stay: { hotel: "", address: "", checkIn: "", checkOut: "", note: "" },
});

export const emptyTrip = () => ({
  homeCurrency: "USD",
  dailyBudget: null, // in homeCurrency
  startDate: null,
  endDate: null,
  stops: [],
  currentStopId: null, // manual "I'm here" override
  places: [], // { id, date, name, time, cost, costCurrency, outdoor, note, done }
  expenses: [], // { id, date, amount, currency, category, note, ts }
});

function migrateV1(old) {
  const stop = {
    ...emptyStop(),
    destination: old.destination || null,
    localCurrency: old.localCurrency || "USD",
    startDate: old.startDate || null,
    endDate: old.endDate || null,
    stay: old.stay || emptyStop().stay,
  };
  return {
    ...emptyTrip(),
    homeCurrency: old.homeCurrency || "USD",
    dailyBudget: null, // old budget was in local currency — meaning changed
    startDate: old.startDate || null,
    endDate: old.endDate || null,
    stops: old.destination ? [stop] : [],
    places: (old.places || []).map((p) => ({
      ...p,
      costCurrency: p.costCurrency || old.localCurrency || "USD",
    })),
    expenses: old.expenses || [],
  };
}

export function getLocalUpdatedAt() {
  return localStorage.getItem(KEY + ".updatedAt") || null;
}

export function loadTrip() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...emptyTrip(), ...JSON.parse(raw) };

    // Same-shape data under the old name → copy it to the new key, then
    // clean up. (The save-effect refreshes the sync timestamp on next edit.)
    const legacyV2 = localStorage.getItem(LEGACY_V2);
    if (legacyV2) {
      const data = { ...emptyTrip(), ...JSON.parse(legacyV2) };
      localStorage.setItem(KEY, JSON.stringify(data));
      localStorage.removeItem(LEGACY_V2);
      localStorage.removeItem(LEGACY_V2 + ".updatedAt");
      return data;
    }

    // Oldest pre-multi-stop shape → run the v1 migration.
    const oldRaw = localStorage.getItem(LEGACY_V1);
    if (oldRaw) {
      const migrated = migrateV1(JSON.parse(oldRaw));
      localStorage.setItem(KEY, JSON.stringify(migrated));
      localStorage.removeItem(LEGACY_V1);
      return migrated;
    }
    return null;
  } catch {
    return null;
  }
}

export function useTrip() {
  const [trip, setTrip] = useState(loadTrip);

  useEffect(() => {
    if (trip === null) {
      localStorage.removeItem(KEY);
      localStorage.removeItem(KEY + ".updatedAt");
    } else {
      localStorage.setItem(KEY, JSON.stringify(trip));
      localStorage.setItem(KEY + ".updatedAt", new Date().toISOString());
    }
  }, [trip]);

  const update = (patch) => setTrip((t) => ({ ...t, ...patch }));

  const addExpense = (e) =>
    setTrip((t) => ({ ...t, expenses: [e, ...t.expenses] }));
  const removeExpense = (id) =>
    setTrip((t) => ({ ...t, expenses: t.expenses.filter((x) => x.id !== id) }));

  const addPlace = (p) => setTrip((t) => ({ ...t, places: [...t.places, p] }));
  const updatePlace = (id, patch) =>
    setTrip((t) => ({
      ...t,
      places: t.places.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  const removePlace = (id) =>
    setTrip((t) => ({ ...t, places: t.places.filter((p) => p.id !== id) }));

  const updateStop = (id, patch) =>
    setTrip((t) => ({
      ...t,
      stops: t.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    }));

  const resetTrip = () => setTrip(null);

  return {
    trip,
    setTrip,
    update,
    addExpense,
    removeExpense,
    addPlace,
    updatePlace,
    removePlace,
    updateStop,
    resetTrip,
  };
}

// ---- Stops ---------------------------------------------------------------

// The stop whose date range covers `date`; used for weather, currency
// defaults and the stay card. Manual override (currentStopId) wins for
// "today"-ish views; date-based lookup wins for planning specific days.
export function stopForDate(trip, date) {
  return (
    trip.stops.find(
      (s) => s.startDate && s.endDate && s.startDate <= date && date <= s.endDate
    ) || null
  );
}

export function activeStop(trip) {
  if (trip.currentStopId) {
    const s = trip.stops.find((s) => s.id === trip.currentStopId);
    if (s) return s;
  }
  return stopForDate(trip, todayStr()) || trip.stops[0] || null;
}

// ---- Money math (all totals in HOME currency) -----------------------------

// rates: table with 1 home = rates[X] of currency X (rates[home] = 1).
export function toHome(amount, currency, trip, rates) {
  if (currency === trip.homeCurrency) return amount;
  const r = rates?.[currency];
  if (!r) return null;
  return amount / r;
}

export function fromHome(amount, currency, trip, rates) {
  if (currency === trip.homeCurrency) return amount;
  const r = rates?.[currency];
  if (!r) return null;
  return amount * r;
}

export function spentOnDate(trip, date, rates) {
  let total = 0;
  for (const e of trip.expenses.filter((e) => e.date === date)) {
    const v = toHome(e.amount, e.currency, trip, rates);
    if (v == null) return null; // missing rate — can't total honestly
    total += v;
  }
  return total;
}

export function spentTotal(trip, rates) {
  let total = 0;
  for (const e of trip.expenses) {
    const v = toHome(e.amount, e.currency, trip, rates);
    if (v == null) return null;
    total += v;
  }
  return total;
}

export function plannedCostOnDate(trip, date, rates, { remainingOnly = false } = {}) {
  let total = 0;
  for (const p of trip.places.filter(
    (p) => p.date === date && (!remainingOnly || !p.done)
  )) {
    const c = Number(p.cost) || 0;
    if (!c) continue;
    const v = toHome(c, p.costCurrency || trip.homeCurrency, trip, rates);
    if (v == null) return null;
    total += v;
  }
  return total;
}
