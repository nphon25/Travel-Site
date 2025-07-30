let cachedToken = null;
let tokenExpiry = 0;

const getToken = async () => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  console.log('[API] Fetching new OAuth token...');
  const resp = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    }),
  });
  const data = await resp.json();
  console.log('[API] Token response:', resp.status, data);
  if (!resp.ok || !data.access_token) {
    throw new Error(data.error_description || 'Failed to obtain access token');
  }

  cachedToken = data.access_token;
  tokenExpiry = now + data.expires_in * 1000 - 60000;
  return cachedToken;
};

export default async function handler(req, res) {
  console.log('[API] Incoming request:', req.method, req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST is allowed' });
  }

  const { city, budget, weather, activities, startDate, endDate, distance } = req.body;
  console.log('[API] Payload:', { city, budget, weather, activities, startDate, endDate, distance });

  if (
    !city ||
    !budget ||
    !weather ||
    !Array.isArray(activities) ||
    activities.length === 0 ||
    !startDate ||
    !endDate ||
    !distance
  ) {
    console.log('[API] Validation failed');
    return res.status(400).json({ error: 'Missing required fields or activities' });
  }

  try {
    const token = await getToken();
    console.log('[API] Token obtained.');

    const cityRes = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(city)}&subType=CITY`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const cityData = await cityRes.json();
    console.log('[API] City lookup:', cityRes.status, cityData);

    if (!cityRes.ok || !Array.isArray(cityData.data) || cityData.data.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    const { latitude, longitude } = cityData.data[0].geoCode;
    console.log('[API] Coordinates:', latitude, longitude);

    const actRes = await fetch(
      `https://test.api.amadeus.com/v1/shopping/activities?latitude=${latitude}&longitude=${longitude}&radius=${distance}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const actData = await actRes.json();
    console.log('[API] Activities lookup:', actRes.status, actData);

    if (!actRes.ok) {
      return res.status(actRes.status).json({ error: actData.error || 'Failed to fetch activities' });
    }

    const filtered = (actData.data || []).filter(act =>
      activities.some(a => act.name.toLowerCase().includes(a.toLowerCase()))
    );

    return res.status(200).json({
      city: cityData.data[0].name,
      activities: filtered,
      preferences: { budget, weather, startDate, endDate, distance, activities },
    });
  } catch (err) {
    console.error('[API] Error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
