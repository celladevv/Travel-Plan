// City name -> coordinates + country. Uses Open-Meteo's free geocoding API (no key).

// Minimal ISO country-code -> currency map (enough for a demo; falls back to USD).
const COUNTRY_CURRENCY = {
  TH: "THB", MY: "MYR", SG: "SGD", ID: "IDR", VN: "VND", PH: "PHP",
  KH: "KHR", LA: "LAK", MM: "MMK", BN: "BND", JP: "JPY", KR: "KRW",
  CN: "CNY", HK: "HKD", TW: "TWD", IN: "INR", US: "USD", GB: "GBP",
  AU: "AUD", NZ: "NZD", CH: "CHF", AE: "AED", TR: "TRY", CA: "CAD",
  FR: "EUR", DE: "EUR", ES: "EUR", IT: "EUR", NL: "EUR", PT: "EUR",
  IE: "EUR", GR: "EUR", AT: "EUR", BE: "EUR",
};

async function geocode(city) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&format=json&name=" +
    encodeURIComponent(city);
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results || !data.results.length) {
    throw new Error(`Couldn't find a place called "${city}".`);
  }
  const r = data.results[0];
  return {
    name: r.name,
    country: r.country,
    countryCode: r.country_code,
    lat: r.latitude,
    lon: r.longitude,
    localCurrency: COUNTRY_CURRENCY[r.country_code] || "USD",
  };
}

module.exports = { geocode };
