export default async function handler(req, res) {
  const { lat, lon } = req.query;
  if (!lat || !lon) {
    return res.status(400).json({ error: 'lat and lon required' });
  }
  const key = process.env.YANDEX_WEATHER_KEY;
  if (!key) {
    return res.status(500).json({ error: 'API key not configured' });
  }
  try {
    const url = `https://api.weather.yandex.ru/v2/forecast?lat=${lat}&lon=${lon}&lang=ru_RU`;
    const response = await fetch(url, {
      headers: { 'X-Yandex-Weather-Key': key }
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Yandex API error' });
    }
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
}
