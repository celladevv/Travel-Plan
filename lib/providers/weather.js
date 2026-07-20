// Current weather + today's outlook from Open-Meteo (free, no key).

// Minimal WMO weather-code -> human label + rain flag.
const CODES = {
  0: ["Clear sky", false], 1: ["Mainly clear", false], 2: ["Partly cloudy", false],
  3: ["Overcast", false], 45: ["Foggy", false], 48: ["Foggy", false],
  51: ["Light drizzle", true], 53: ["Drizzle", true], 55: ["Heavy drizzle", true],
  61: ["Light rain", true], 63: ["Rain", true], 65: ["Heavy rain", true],
  71: ["Light snow", true], 73: ["Snow", true], 75: ["Heavy snow", true],
  80: ["Rain showers", true], 81: ["Rain showers", true], 82: ["Heavy showers", true],
  95: ["Thunderstorm", true], 96: ["Thunderstorm", true], 99: ["Thunderstorm", true],
};

async function getWeather(lat, lon) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
    `&timezone=auto&forecast_days=1`;
  const res = await fetch(url);
  const data = await res.json();

  const code = data.current?.weather_code ?? 0;
  const [label, codeRain] = CODES[code] || ["Unknown", false];
  const rainChance = data.daily?.precipitation_probability_max?.[0] ?? null;
  const rainLikely = codeRain || (rainChance !== null && rainChance >= 50);

  return {
    label,
    tempC: Math.round(data.current?.temperature_2m ?? 0),
    highC: Math.round(data.daily?.temperature_2m_max?.[0] ?? 0),
    lowC: Math.round(data.daily?.temperature_2m_min?.[0] ?? 0),
    rainChance, // percent or null
    rainLikely, // boolean the planner uses to bias indoor vs outdoor
  };
}

module.exports = { getWeather };
