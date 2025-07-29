import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const { CLIENT_ID, CLIENT_SECRET } = process.env;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('CLIENT_ID and CLIENT_SECRET must be defined in .env');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('../public'));

let cachedToken = null;
let tokenExpiry = 0;

// Fetch OAuth token with caching
const getToken = async () => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

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
    console.error('Failed to fetch access token:', data);
    throw new Error('Failed to get access token from Amadeus');
  }

  cachedToken = data.access_token;
  tokenExpiry = now + data.expires_in * 1000 - 60000; // Renew 1 min before expiry

  return cachedToken;
};

app.post('/recommendations', async (req, res) => {
  try {
    const { city, budget, weather, activities, startDate, endDate, distance } = req.body;

    if (!city || !budget || !weather || !startDate || !endDate || !distance) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const token = await getToken();

    // Get city geo coordinates
    const cityRes = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(city)}&subType=CITY`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const cityData = await cityRes.json();

    if (!cityData.data || cityData.data.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    const location = cityData.data[0].geoCode;
    const lat = location.latitude;
    const lng = location.longitude;

    // Compose activity query params for filtering if possible (Amadeus API may not support all filters directly)
    // We'll pass radius=distance (km)
    const activitiesRes = await fetch(
      `https://test.api.amadeus.com/v1/shopping/activities?latitude=${lat}&longitude=${lng}&radius=${distance}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    const activitiesData = await activitiesRes.json();

    // Filter activities by user interests if possible (basic keyword matching)
    let filteredActivities = activitiesData.data || [];
    if (Array.isArray(activities) && activities.length > 0) {
      filteredActivities = filteredActivities.filter(act =>
        activities.some(userAct =>
          act.name.toLowerCase().includes(userAct.toLowerCase())
        )
      );
    }

    // You can extend filtering by budget or weather here if API supports or with your own logic

    res.json({
      city: cityData.data[0].name,
      activities: filteredActivities,
      userPreferences: { budget, weather, startDate, endDate, distance, activities },
    });
  } catch (error) {
    console.error('Error in /recommendations:', error.stack || error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

const PORT = process.env.PORT || 5500;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
