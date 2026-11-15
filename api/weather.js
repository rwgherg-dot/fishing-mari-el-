export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon required' });
  }

  const key = process.env.ACTIGATOR_API_KEY || process.env.YANDEX_WEATHER_KEY;
  if (!key) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    // 1. Правильный адрес Actigator API (/v1/forecast и параметр lng)
    const actigatorUrl = `https://api.actigator.com/v1/forecast?api_key=${encodeURIComponent(key)}&fish_id=14&lat=${lat}&lng=${lon}&lang=ru`;
    const actRes = await fetch(actigatorUrl);
    const actData = actRes.ok ? await actRes.json() : null;

    // 2. Текущая погода (температура, давление, ветер)
    const meteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,surface_pressure,wind_speed_10m&wind_speed_unit=ms`;
    const meteoRes = await fetch(meteoUrl);
    const meteoData = meteoRes.ok ? await meteoRes.json() : null;
    const cur = meteoData?.current;

    const fIndex = actData?.forecast?.today?.f_index ?? null;
    const fishName = actData?.fish?.name ?? 'Окунь';

    return res.status(200).json({
      fact: {
        temp: cur?.temperature_2m ?? null,
        pressure_mm: cur?.surface_pressure != null ? Math.round(cur.surface_pressure * 0.750062) : null,
        wind_speed: cur?.wind_speed_10m ?? null,
        temp_water: null
      },
      info: {
        def_pressure_mm: 752
      },
      actigator: {
        f_index: fIndex,
        fish: fishName,
        today: actData?.forecast?.today ?? null
      }
    });
  } catch (e) {
    return res.status(500).json({ error: 'Server error', message: e.message });
  }
}
