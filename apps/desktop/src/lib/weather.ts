// Météo via Open-Meteo (gratuit, sans clé). Géocodage + relevé courant.

export interface Weather {
  city: string;
  temperature: number;
  code: number;
  label: string;
}

const WEATHER_LABELS: Record<number, string> = {
  0: "Ciel dégagé",
  1: "Plutôt dégagé",
  2: "Partiellement nuageux",
  3: "Couvert",
  45: "Brouillard",
  48: "Brouillard givrant",
  51: "Bruine légère",
  53: "Bruine",
  55: "Bruine dense",
  61: "Pluie faible",
  63: "Pluie",
  65: "Pluie forte",
  71: "Neige faible",
  73: "Neige",
  75: "Neige forte",
  80: "Averses",
  81: "Averses",
  82: "Fortes averses",
  95: "Orage",
};

export async function fetchWeather(city: string): Promise<Weather> {
  const geo = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=fr`
  ).then((r) => r.json());
  if (!geo.results || geo.results.length === 0) {
    throw new Error("Ville introuvable.");
  }
  const { latitude, longitude, name } = geo.results[0];
  const wx = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`
  ).then((r) => r.json());
  const code = wx.current.weather_code as number;
  return {
    city: name,
    temperature: Math.round(wx.current.temperature_2m),
    code,
    label: WEATHER_LABELS[code] ?? "—",
  };
}
