import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const getToken = async () => {
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
  return data.access_token;
};

app.post('/recommendations', async (req, res) => {
  try {
    const token = await getToken();
    const { city } = req.body;

    // 1. Get city lat/lng from Amadeus Location API
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

    // 2. Fetch activities using lat/lng
    const activitiesRes = await fetch(`https://test.api.amadeus.com/v1/shopping/activities?latitude=${lat}&longitude=${lng}&radius=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const activitiesData = await activitiesRes.json();

    res.json({ city: cityData.data[0].name, activities: activitiesData });
  } catch (error) {
    console.error('Error in /recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
