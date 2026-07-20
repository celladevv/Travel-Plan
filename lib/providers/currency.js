// Convert a budget between currencies using open.er-api.com (free, no key).

async function convert(amount, from, to) {
  if (from === to) return { amount, rate: 1, from, to };
  const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
  const data = await res.json();
  if (data.result !== "success" || !data.rates || !data.rates[to]) {
    throw new Error(`Couldn't convert ${from} to ${to}.`);
  }
  const rate = data.rates[to];
  return {
    amount: Math.round(amount * rate),
    rate,
    from,
    to,
  };
}

// Just the live rate for a pair — used by the instant converter.
// The client fetches this once per currency pair, then multiplies as you type,
// so conversion is real-time without an API call per keystroke.
async function getRate(from, to) {
  from = (from || "").toUpperCase();
  to = (to || "").toUpperCase();
  if (from === to) return { rate: 1, from, to, updated: "now" };
  const res = await fetch(`https://open.er-api.com/v6/latest/${encodeURIComponent(from)}`);
  const data = await res.json();
  if (data.result !== "success" || !data.rates || !data.rates[to]) {
    throw new Error(`Couldn't get a rate for ${from} → ${to}.`);
  }
  return { rate: data.rates[to], from, to, updated: data.time_last_update_utc || "" };
}

module.exports = { convert, getRate };
