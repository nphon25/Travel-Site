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
console.log('log');
// Fetch OAuth token with caching
const getToken = async () => {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return cachedToken;
  }

  try {
    const response = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Token fetch failed: ${errorData.error_description || 'Unknown error'}`);
    }

    const data = await response.json();

    if (!data.access_token) {
      throw new Error('No access_token returned from Amadeus');
    }

    cachedToken = data.access_token;
    tokenExpiry = now + (data.expires_in * 1000) - 60000; // renew 1 minute early

    return cachedToken;
  } catch (error) {
    console.error('Error fetching OAuth token:', error);
    throw error;
  }
};

app.post('/recommendations', async (req, res) => {
  try {
    const { city, budget, weather, activities, startDate, endDate, distance } = req.body;

    // Validate required fields
    if (!city || !budget || !weather || !startDate || !endDate || !distance) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    if (!Array.isArray(activities) || activities.length === 0) {
      return res.status(400).json({ error: 'At least one activity must be selected' });
    }

    // Get OAuth token
    const token = await getToken();

    // Fetch city data to get coordinates
    const cityRes = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(city)}&subType=CITY`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!cityRes.ok) {
      const errData = await cityRes.json();
      return res.status(cityRes.status).json({ error: errData.error || 'Failed to fetch city data' });
    }

    const cityData = await cityRes.json();
    if (!cityData.data || cityData.data.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    const { latitude: lat, longitude: lng } = cityData.data[0].geoCode;

    // Fetch activities near the city
    const activitiesRes = await fetch(
      `https://test.api.amadeus.com/v1/shopping/activities?latitude=${lat}&longitude=${lng}&radius=${distance}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!activitiesRes.ok) {
      const errData = await activitiesRes.json();
      return res.status(activitiesRes.status).json({ error: errData.error || 'Failed to fetch activities' });
    }

    const activitiesData = await activitiesRes.json();

    // Filter activities by user interests (case-insensitive)
    let filteredActivities = activitiesData.data || [];
    if (activities.length > 0) {
      filteredActivities = filteredActivities.filter(act =>
        activities.some(userAct =>
          act.name.toLowerCase().includes(userAct.toLowerCase())
        )
      );
    }

    // TODO: You can extend filtering by budget or weather if API supports or add your own logic here.

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
