let cachedToken = null;
let tokenExpiry = 0;

const getToken = async () => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || 'Failed to get access token');
  }

  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in * 1000) - 60000;
  return cachedToken;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { city } = req.body;
  if (!city) {
    return res.status(400).json({ error: 'Missing required field: city' });
  }

  try {
    const token = await getToken();

    const cityRes = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(city)}&subType=CITY`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const cityData = await cityRes.json();

    if (!cityRes.ok || !cityData.data?.length) {
      return res.status(404).json({ error: 'City not found' });
    }

    const location = cityData.data[0];
    const latitude = location.geoCode?.latitude;
    const longitude = location.geoCode?.longitude;
    const cityName = location.name;

    if (!latitude || !longitude) {
      return res.status(404).json({ error: 'Coordinates not found for city' });
    }

    const actRes = await fetch(
      `https://test.api.amadeus.com/v1/shopping/activities?latitude=${latitude}&longitude=${longitude}&radius=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const actData = await actRes.json();
    if (!actRes.ok) {
      return res.status(actRes.status).json({ error: actData.error || 'Failed to fetch activities' });
    }

    return res.status(200).json({
      city: cityName,
      activities: actData.data || [],
    });

  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
