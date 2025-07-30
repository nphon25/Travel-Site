import fetch from 'node-fetch';

let cachedToken = null;
let tokenExpiry = 0;

const { CLIENT_ID, CLIENT_SECRET } = process.env;
if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('CLIENT_ID and CLIENT_SECRET must be defined in environment variables.');
}

// Retrieve and cache Amadeus API token
const getToken = async () => {
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

  const data = await res.json();
  if (!data.access_token) {
    throw new Error('Failed to retrieve access token from Amadeus');
  }

  cachedToken = data.access_token;
  tokenExpiry = now + data.expires_in * 1000 - 60000;
  return cachedToken;
};

// Main handler
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { city, budget, weather, activities, startDate, endDate, distance } = req.body;

    // Basic validation
    if (!city || !budget || !weather || !startDate || !endDate || !distance || !Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({ error: 'Missing required fields or activities' });
    }

    const token = await getToken();

    // Fetch geo-coordinates for the given city
    const cityRes = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(city)}&subType=CITY`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const cityData = await cityRes.json();
    const cityInfo = cityData.data?.[0];
    if (!cityInfo || !cityInfo.geoCode) {
      return res.status(404).json({ error: 'City not found' });
    }

    const { latitude, longitude } = cityInfo.geoCode;

    // Fetch nearby activities
    const activitiesRes = await fetch(
      `https://test.api.amadeus.com/v1/shopping/activities?latitude=${latitude}&longitude=${longitude}&radius=${distance}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const activitiesData = await activitiesRes.json();
    let filteredActivities = activitiesData.data || [];

    // Match with user-selected activity keywords
    if (activities.length > 0) {
      filteredActivities = filteredActivities.filter(act =>
        activities.some(keyword =>
          act.name?.toLowerCase().includes(keyword.toLowerCase())
        )
      );
    }

    return res.status(200).json({
      city: cityInfo.name,
      activities: filteredActivities,
      userPreferences: { budget, weather, startDate, endDate, distance, activities },
    });

  } catch (err) {
    console.error('Server error:', err.stack || err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
