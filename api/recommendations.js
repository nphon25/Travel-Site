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
  tokenExpiry = now + (data.expires_in * 1000) - 60000; // 1 min before expiration
  return cachedToken;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { city, budget, weather, activities, startDate, endDate, distance } = req.body;

  if (!city || !budget || !weather || !startDate || !endDate || !distance || !Array.isArray(activities) || activities.length === 0) {
    return res.status(400).json({ error: 'Missing required fields or activities' });
  }

  try {
    const token = await getToken();

    // 1. Get city coordinates
    const cityRes = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(city)}&subType=CITY`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const cityData = await cityRes.json();

    if (!cityRes.ok || !cityData.data?.length) {
      return res.status(404).json({ error: 'City not found' });
    }

    const { latitude, longitude } = cityData.data[0].geoCode;

    // 2. Fetch nearby activities
    const actRes = await fetch(
      `https://test.api.amadeus.com/v1/shopping/activities?latitude=${latitude}&longitude=${longitude}&radius=${distance}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const actData = await actRes.json();

    if (!actRes.ok) {
      return res.status(actRes.status).json({ error: actData.error || 'Failed to fetch activities' });
    }

    const matchedActivities = (actData.data || []).filter(activity =>
      activities.some(a => activity.name.toLowerCase().includes(a.toLowerCase()))
    );

    return res.status(200).json({
      city: cityData.data[0].name,
      activities: matchedActivities,
      userPreferences: { budget, weather, startDate, endDate, distance, activities },
    });

  } catch (err) {
    console.error('Error in handler:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
export default async function handler(req, res) {
  console.log('[API] Request received:', req.method, req.body);

  if (req.method !== 'POST') {
    console.log('[API] Invalid method');
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  const { city, budget, weather, activities, startDate, endDate, distance } = req.body;
  console.log('[API] Body params:', { city, budget, weather, activities, startDate, endDate, distance });

  if (!city || !budget || !weather || !startDate || !endDate || !distance || !Array.isArray(activities) || activities.length === 0) {
    console.log('[API] Validation failed');
    return res.status(400).json({ error: 'Missing required fields or activities' });
  }

  try {
    const token = await getToken();
    console.log('[API] Token fetched');

    const cityRes = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(city)}&subType=CITY`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('[API] City lookup status:', cityRes.status);

    const cityData = await cityRes.json();
    if (!cityRes.ok || !cityData.data?.length) {
      console.log('[API] City lookup error data:', cityData);
      return res.status(404).json({ error: 'City not found' });
    }

    const { latitude, longitude } = cityData.data[0].geoCode;
    console.log('[API] Coordinates:', { latitude, longitude });

    const actRes = await fetch(
      `https://test.api.amadeus.com/v1/shopping/activities?latitude=${latitude}&longitude=${longitude}&radius=${distance}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('[API] Activities status:', actRes.status);

    const actData = await actRes.json();
    if (!actRes.ok) {
      console.log('[API] Activities error data:', actData);
      return res.status(actRes.status).json({ error: actData.error || 'Failed to fetch activities' });
    }

    const matched = (actData.data || []).filter(act =>
      activities.some(a => act.name.toLowerCase().includes(a.toLowerCase()))
    );

    return res.status(200).json({
      city: cityData.data[0].name,
      activities: matched,
      userPreferences: { budget, weather, startDate, endDate, distance, activities }
    });

  } catch (err) {
    console.error('[API] Handler error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
