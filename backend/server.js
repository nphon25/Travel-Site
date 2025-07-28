// server.js
import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const { CLIENT_ID, CLIENT_SECRET } = process.env;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ CLIENT_ID and CLIENT_SECRET must be defined in .env');
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('../public')); // Ensure path is correct based on your file structure

// Fetch OAuth token from Amadeus
const getToken = async () => {
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
    console.error('❌ Failed to fetch access token:', data);
    throw new Error('Failed to get access token from Amadeus');
  }

  return data.access_token;
};

// Handle recommendations request
app.post('/recommendations', async (req, res) => {
  try {
    const { city } = req.body;
    console.log('📍 Received city:', city);

    if (!city) {
      return res.status(400).json({ error: 'City name is required' });
    }

    const token = await getToken();

    // Step 1: Get geo coordinates of city
    const cityRes = await fetch(`https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(city)}&subType=CITY`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const cityData = await cityRes.json();
    console.log('🌍 City API response:', cityData);

    if (!cityData.data || cityData.data.length === 0) {
      return res.status(404).json({ error: 'City not found' });
    }

    const location = cityData.data[0].geoCode;
    const lat = location.latitude;
    const lng = location.longitude;

    // Step 2: Fetch activities based on location
    const activitiesRes = await fetch(`https://test.api.amadeus.com/v1/shopping/activities?latitude=${lat}&longitude=${lng}&radius=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const activitiesData = await activitiesRes.json();
    console.log('🎯 Activities API response:', activitiesData);

    res.json({
      city: cityData.data[0].name,
      activities: activitiesData,
    });
  } catch (error) {
    console.error('❌ Error in /recommendations:', error.stack || error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
