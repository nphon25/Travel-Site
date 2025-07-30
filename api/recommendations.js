import fetch from 'node-fetch';

let cachedToken = null;
let tokenExpiry = 0;

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('CLIENT_ID and CLIENT_SECRET must be defined in environment variables.');
}

// Function to get OAuth token
const getToken = async () => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;

  const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  const data = await response.json();

  if (!data.access_token) {
    console.error('Token response:', data);
    throw new Error('Failed to retrieve access token from Amadeus');
  }

  cachedToken = data.access_token;
  tokenExpiry = now + data.expires_in * 1000 - 60000; // Renew 1 minute before expiry

  return cachedToken;
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { city, budget, weather, activities, startDate, endDate, distance } = req.body;

    // Basic validation
    if (!city || !budget || !weather || !startDate || !endDate || !distance) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({ error: 'At least one activity must be selected' });
    }

    const token = await getToken();

    // Get city geo-coordinates
    const cityRes = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(city)}&subType=CITY`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const cityData = await cityRes.json();
    if (!cityData.data || cityData.data.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    const { latitude, longitude } = cityData.data[0].geoCode;

    // Get activities
    const activitiesRes = await fetch(
      `https://test.api.amadeus.com/v1/shopping/activities?latitude=${latitude}&longitude=${longitude}&radius=${distance}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const activitiesData = await activitiesRes.json();
    let filteredActivities = activitiesData.data || [];

    // Filter based on selected interests
    if (activities.length > 0) {
      filteredActivities = filteredActivities.filter(act =>
        activities.some(userAct =>
          act.name.toLowerCase().includes(userAct.toLowerCase())
        )
      );
    }

    return res.status(200).json({
      city: cityData.data[0].name,
      activities: filteredActivities,
      userPreferences: { budget, weather, startDate, endDate, distance, activities },
    });

  } catch (err) {
    console.error('Serverless error:', err.stack || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}