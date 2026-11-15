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
    // Запрос текущей погоды к Actigator API
    const url = `https://api.actigator.com/v1/weather?lat=${lat}&lon=${lon}&lang=ru&units=metric`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${key}`,
        'X-API-Key': key,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).json({
        error: 'Actigator API error',
        status: response.status,
        details: errText
      });
    }

    const raw = await response.json();

    // Универсальный разбор полей (учитывает варианты структуры ответа Actigator: current / data / fact / корень)
    const cur = raw.current || raw.data?.current || raw.fact || raw.data || raw;

    const temp = cur.temp ?? cur.temperature ?? cur.temp_c ?? cur.t;
    const windSpeed = cur.wind_speed ?? cur.wind ?? cur.wind_mps ?? (cur.wind_kph != null ? +(cur.wind_kph / 3.6).toFixed(1) : undefined);

    // Давление: если Actigator отдал в гПа/мбар (> 900), переводим в мм рт. ст.
    let pressureMm = cur.pressure_mm ?? cur.pressure_mmhg;
    if (pressureMm == null) {
      const pRaw = cur.pressure ?? cur.pressure_hpa ?? cur.pressure_mb;
      if (pRaw != null) {
        pressureMm = pRaw > 900 ? Math.round(pRaw * 0.750062) : Math.round(pRaw);
      }
    }

    const tempWater = cur.temp_water ?? cur.water_temp ?? cur.water_temperature ?? null;

    // Возвращаем данные в едином формате для index.html
    return res.status(200).json({
      fact: {
        temp,
        pressure_mm: pressureMm,
        wind_speed: windSpeed,
        temp_water: tempWater
      },
      info: {
        def_pressure_mm: 752
      },
      _raw: raw
    });
  } catch (e) {
    return res.status(500).json({ error: 'Server error', message: e.message });
  }
}
