// Keyless data providers. Everything is cached in localStorage so the app
// keeps working offline with the last good data (with an "as of" note).

const cacheGet = (key, maxAgeMs) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (maxAgeMs && Date.now() - ts > maxAgeMs) return { data, stale: true };
    return { data, stale: false };
  } catch {
    return null;
  }
};

const cacheSet = (key, data) => {
  try {
    localStorage.setItem(key, JSON.stringify({ ts: Date.now(), data }));
  } catch {}
};

// ---- Geocoding (Open-Meteo, no key) ------------------------------------

const COUNTRY_CURRENCY = {
  TH: "THB", MY: "MYR", SG: "SGD", ID: "IDR", VN: "VND", PH: "PHP",
  KH: "KHR", LA: "LAK", MM: "MMK", BN: "BND", JP: "JPY", KR: "KRW",
  CN: "CNY", HK: "HKD", TW: "TWD", IN: "INR", LK: "LKR", NP: "NPR",
  US: "USD", GB: "GBP", AU: "AUD", NZ: "NZD", CH: "CHF", AE: "AED",
  TR: "TRY", CA: "CAD", BR: "BRL", MX: "MXN", ZA: "ZAR", EG: "EGP",
  MA: "MAD", FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR",
  PT: "EUR", IE: "EUR", GR: "EUR", AT: "EUR", BE: "EUR", FI: "EUR",
  HR: "EUR", SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR",
  LU: "EUR", MT: "EUR", CY: "EUR",
};

export async function searchCity(query) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?count=5&language=en&format=json&name=" +
    encodeURIComponent(query);
  const res = await fetch(url);
  const data = await res.json();
  return (data.results || []).map((r) => ({
    name: r.name,
    region: r.admin1 || "",
    country: r.country || "",
    countryCode: r.country_code || "",
    lat: r.latitude,
    lon: r.longitude,
    localCurrency: COUNTRY_CURRENCY[r.country_code] || "USD",
  }));
}

// ---- FX rate (open.er-api.com, no key) ----------------------------------
// Fetched once per base currency, then multiplied client-side as you type.

const RATE_TTL = 12 * 60 * 60 * 1000; // refresh twice a day

// Whole rate table for one base currency (1 base = rates[X] X). One fetch
// covers every conversion in the app: X→Y = rates[Y] / rates[X].
export async function getRatesTable(base) {
  if (!base) throw new Error("Missing currency");
  const key = `ct.rates.${base}`;
  const cached = cacheGet(key, RATE_TTL);
  if (cached && !cached.stale)
    return { rates: { ...cached.data.rates, [base]: 1 }, updated: cached.data.updated, stale: false };
  try {
    const res = await fetch(
      `https://open.er-api.com/v6/latest/${encodeURIComponent(base)}`
    );
    const data = await res.json();
    if (data.result !== "success" || !data.rates)
      throw new Error(`No rates for ${base}`);
    const payload = {
      rates: data.rates,
      updated: data.time_last_update_utc || new Date().toUTCString(),
    };
    cacheSet(key, payload);
    return { rates: { ...payload.rates, [base]: 1 }, updated: payload.updated, stale: false };
  } catch (err) {
    if (cached?.data?.rates)
      return { rates: { ...cached.data.rates, [base]: 1 }, updated: cached.data.updated, stale: true };
    throw err;
  }
}

export async function getRate(from, to) {
  if (!from || !to) throw new Error("Missing currency");
  if (from === to) return { rate: 1, from, to, updated: null, stale: false };
  const key = `ct.rates.${from}`;
  const cached = cacheGet(key, RATE_TTL);
  if (cached && !cached.stale && cached.data.rates?.[to]) {
    return {
      rate: cached.data.rates[to],
      from,
      to,
      updated: cached.data.updated,
      stale: false,
    };
  }
  try {
    const res = await fetch(
      `https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`
    );
    const data = await res.json();
    if (data.result !== "success" || !data.rates?.[to])
      throw new Error(`No rate for ${from} → ${to}`);
    cacheSet(key, {
      rates: data.rates,
      updated: data.time_last_update_utc || new Date().toUTCString(),
    });
    return {
      rate: data.rates[to],
      from,
      to,
      updated: data.time_last_update_utc,
      stale: false,
    };
  } catch (err) {
    // Offline or API down: fall back to the last stored rate, marked stale.
    if (cached?.data?.rates?.[to])
      return {
        rate: cached.data.rates[to],
        from,
        to,
        updated: cached.data.updated,
        stale: true,
      };
    throw err;
  }
}

// ---- Hourly weather (Open-Meteo, no key) --------------------------------

const WEATHER_TTL = 30 * 60 * 1000;

const WMO = {
  0: ["Clear", "☀️"], 1: ["Mostly clear", "🌤️"], 2: ["Partly cloudy", "⛅"],
  3: ["Overcast", "☁️"], 45: ["Fog", "🌫️"], 48: ["Fog", "🌫️"],
  51: ["Drizzle", "🌦️"], 53: ["Drizzle", "🌦️"], 55: ["Drizzle", "🌧️"],
  61: ["Light rain", "🌧️"], 63: ["Rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  66: ["Freezing rain", "🌧️"], 67: ["Freezing rain", "🌧️"],
  71: ["Light snow", "🌨️"], 73: ["Snow", "🌨️"], 75: ["Heavy snow", "❄️"],
  77: ["Snow", "🌨️"], 80: ["Showers", "🌦️"], 81: ["Showers", "🌧️"],
  82: ["Heavy showers", "⛈️"], 85: ["Snow showers", "🌨️"],
  86: ["Snow showers", "❄️"], 95: ["Thunderstorm", "⛈️"],
  96: ["Thunderstorm", "⛈️"], 99: ["Thunderstorm", "⛈️"],
};

export function wmoLabel(code) {
  return (WMO[code] || ["—", "🌡️"])[0];
}
// Night-aware: clear/partly-cloudy skies get moon/cloud icons after dark.
export function wmoIcon(code, isDay = 1) {
  if (!isDay) {
    if (code <= 1) return "🌙";
    if (code === 2) return "☁️";
  }
  return (WMO[code] || ["—", "🌡️"])[1];
}

// Returns { hours: [{time:"2026-07-15T14:00", hour:14, date:"2026-07-15",
//   temp, pop, code}], fetchedAt, stale }
export async function getHourly(lat, lon) {
  const key = `ct.weather.v2.${lat.toFixed(2)},${lon.toFixed(2)}`;
  const cached = cacheGet(key, WEATHER_TTL);
  if (cached && !cached.stale) return { ...cached.data, stale: false };
  try {
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&hourly=temperature_2m,precipitation_probability,weather_code,is_day` +
      `&forecast_days=7&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    const t = data.hourly?.time || [];
    const hours = t.map((time, i) => ({
      time,
      date: time.slice(0, 10),
      hour: parseInt(time.slice(11, 13), 10),
      temp: Math.round(data.hourly.temperature_2m?.[i] ?? 0),
      pop: data.hourly.precipitation_probability?.[i] ?? null,
      code: data.hourly.weather_code?.[i] ?? 0,
      isDay: data.hourly.is_day?.[i] ?? 1,
    }));
    const payload = { hours, fetchedAt: Date.now(), tz: data.timezone };
    cacheSet(key, payload);
    return { ...payload, stale: false };
  } catch (err) {
    if (cached?.data) return { ...cached.data, stale: true };
    throw err;
  }
}

// Rain risk for an itinerary place on a date. If it has a time ("HH:MM"),
// use that hour's precipitation probability; otherwise the max across the
// waking day (09–21). Returns { pop, code, temp } or null if no forecast.
export function riskForPlace(hours, date, time) {
  if (!hours?.length) return null;
  const day = hours.filter((h) => h.date === date);
  if (!day.length) return null;
  if (time) {
    const hr = parseInt(time.slice(0, 2), 10);
    const match = day.find((h) => h.hour === hr);
    if (match) return { pop: match.pop, code: match.code, temp: match.temp };
  }
  const daytime = day.filter((h) => h.hour >= 9 && h.hour <= 21);
  const worst = (daytime.length ? daytime : day).reduce((a, b) =>
    (b.pop ?? 0) > (a.pop ?? 0) ? b : a
  );
  return { pop: worst.pop, code: worst.code, temp: worst.temp };
}
