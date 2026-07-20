// Nearby cafes / attractions from Geoapify Places (free tier, no credit card).
// Falls back gracefully: if GEOAPIFY_API_KEY is unset, returns an empty list and
// the planner tells Claude to use its own knowledge of the city instead.

// Map Geoapify's raw category prefixes to a friendly label.
function label(categories = []) {
  const joined = categories.join(" ");
  if (joined.includes("catering")) return "Cafe / Food";
  if (joined.includes("tourism")) return "Attraction";
  if (joined.includes("leisure") || joined.includes("park")) return "Park";
  if (joined.includes("entertainment")) return "Entertainment";
  return "Place";
}

async function findPlaces(lat, lon) {
  const key = process.env.GEOAPIFY_API_KEY;
  if (!key) return { places: [], source: "none" };

  const categories = "catering.cafe,tourism.sights,leisure.park,entertainment";
  const url =
    `https://api.geoapify.com/v2/places?categories=${categories}` +
    `&filter=circle:${lon},${lat},4000&bias=proximity:${lon},${lat}` +
    `&limit=20&apiKey=${key}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok || !data.features) return { places: [], source: "none" };

    const seen = new Set();
    const places = data.features
      .map((f) => f.properties)
      .filter((p) => p.name && !seen.has(p.name) && seen.add(p.name)) // dedup by name
      .sort((a, b) => (a.distance ?? 9e9) - (b.distance ?? 9e9))       // nearest first
      .slice(0, 10)
      .map((p) => ({
        name: p.name,
        category: label(p.categories),
        address: p.address_line2 || p.formatted || "",
      }));

    return { places, source: "geoapify" };
  } catch {
    // Never let a places failure break the whole plan.
    return { places: [], source: "none" };
  }
}

module.exports = { findPlaces };
