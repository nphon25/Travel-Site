import fetch from 'node-fetch';

let cachedToken = null;
let tokenExpiry = 0;

const { CLIENT_ID, CLIENT_SECRET } = process.env;
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('Missing API credentials');
}

async function getToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const res = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('No access_token in response');
  }

  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in || 0) * 1000 - 60000;
  return cachedToken;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let body;
  try {
    body = req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const { city, budget, weather, activities, startDate, endDate, distance } = body || {};

  if (!city || !budget || !weather || !startDate || !endDate || !distance || !Array.isArray(activities) || activities.length === 0) {
    return res.status(400).json({ error: 'Missing required fields or activities' });
  }

  if (new Date(startDate) > new Date(endDate)) {
    return res.status(400).json({ error: 'Start date must be before end date' });
  }

  try {
    const token = await getToken();

    // Fetch city coordinates
    const cityRes = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(city)}&subType=CITY`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!cityRes.ok) {
      const txt = await cityRes.text();
      throw new Error(`City lookup failed: ${cityRes.status} - ${txt}`);
    }
    const cityJson = await cityRes.json();
    const cityData = cityJson.data?.[0];
    if (!cityData || !cityData.geoCode) {
      return res.status(404).json({ error: 'City not found or missing geo coordinates' });
    }
    const { latitude, longitude } = cityData.geoCode;

    // Fetch activities
    const actRes = await fetch(
      `https://test.api.amadeus.com/v1/shopping/activities?latitude=${latitude}&longitude=${longitude}&radius=${Number(distance)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!actRes.ok) {
      const txt = await actRes.text();
      throw new Error(`Activities fetch failed: ${actRes.status} - ${txt}`);
    }
    const actJson = await actRes.json();
    const allActs = Array.isArray(actJson.data) ? actJson.data : [];

    const filtered = allActs.filter(a =>
      activities.some(pref =>
        a.name?.toLowerCase().includes(pref.toLowerCase())
      )
    );

    res.status(200).json({
      city: cityData.name,
      activities: filtered,
      userPreferences: { budget, weather, startDate, endDate, distance, activities },
    });
  } catch (err) {
    console.error('Handler error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
