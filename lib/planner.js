// The reusable core. Orchestrates every provider + Claude into one plan.
// This module has no knowledge of HTTP — a web server OR a future mobile
// backend can both call planTrip() the same way.

const { geocode } = require("./providers/geocode");
const { getWeather } = require("./providers/weather");
const { convert } = require("./providers/currency");
const { findPlaces } = require("./providers/places");
const { planWithClaude } = require("./claude");

/**
 * @param {{ city: string, budget: number, currency: string, interests?: string }} input
 * @returns {Promise<object>} the plan plus the raw signals used to build it
 */
async function planTrip(input) {
  const city = (input.city || "").trim();
  const budget = Number(input.budget);
  const currency = (input.currency || "MYR").trim().toUpperCase();

  if (!city) throw new Error("Please enter a city.");
  if (!budget || budget <= 0) throw new Error("Please enter a budget amount.");

  // 1. Where is it? (also tells us the local currency)
  const place = await geocode(city);

  // 2. Gather weather, budget conversion, and nearby places in parallel.
  const [weather, budgetLocal, placeResult] = await Promise.all([
    getWeather(place.lat, place.lon),
    convert(budget, currency, place.localCurrency),
    findPlaces(place.lat, place.lon),
  ]);

  // 3. Let Claude turn the signals into one concrete plan.
  const plan = await planWithClaude({
    city: place.name,
    country: place.country,
    weather,
    budgetLocal,
    budgetHome: { amount: budget, currency },
    places: placeResult.places,
    interests: (input.interests || "").trim(),
  });

  return {
    plan,
    signals: {
      place: { name: place.name, country: place.country },
      weather,
      budget: {
        home: `${budget} ${currency}`,
        local: `${budgetLocal.amount} ${budgetLocal.to}`,
      },
      places: placeResult.places,
      placesSource: placeResult.source,
    },
  };
}

module.exports = { planTrip };
