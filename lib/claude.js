// Claude API integration. Turns the gathered signals (weather, budget, places)
// into one concrete, budget-aware, weather-aware plan.

// Opus 4.8 for best reasoning. For a cheaper public demo, use "claude-haiku-4-5".
const MODEL = "claude-opus-4-8";

async function planWithClaude(ctx) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set on the server.");

  const placeList = ctx.places.length
    ? ctx.places.map((p) => `- ${p.name} (${p.category})${p.address ? " — " + p.address : ""}`).join("\n")
    : "(no live place data — use your own knowledge of well-known spots in this city)";

  const system = `You are a friendly local travel companion. Given a traveller's city, today's weather, their budget in local currency, and a list of candidate places, produce ONE concrete afternoon plan.

Rules:
- Start with a single sentence reading the situation (weather + budget).
- Recommend 2-3 specific stops. If it's likely to rain, favour indoor options.
- Keep the whole plan realistically within the stated local-currency budget, and note a rough cost per stop.
- Be warm and concise. No preamble, no markdown headers. Plain sentences and a short list.`;

  const userMsg =
    `City: ${ctx.city}, ${ctx.country}\n` +
    `Weather today: ${ctx.weather.label}, ${ctx.weather.tempC}°C (high ${ctx.weather.highC}°C)` +
    `${ctx.weather.rainChance !== null ? `, ${ctx.weather.rainChance}% chance of rain` : ""}.\n` +
    `Budget: about ${ctx.budgetLocal.amount} ${ctx.budgetLocal.to} ` +
    `(${ctx.budgetHome.amount} ${ctx.budgetHome.currency}).\n` +
    `${ctx.interests ? `Traveller is into: ${ctx.interests}.\n` : ""}` +
    `Candidate places nearby:\n${placeList}\n\n` +
    `Give me a plan for this afternoon.`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 800,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText;
    throw new Error(`Claude API error (${res.status}): ${msg}`);
  }
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

module.exports = { planWithClaude, MODEL };
