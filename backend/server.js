import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { CLIENT_ID, CLIENT_SECRET } = process.env;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('CLIENT_ID and CLIENT_SECRET must be defined in .env');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files from public folder (adjust if needed)
app.use(express.static(path.join(__dirname, '../public')));

// Helper function to get OAuth token from Amadeus
async function getToken() {
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

  return data.access_token;
}

app.post('/recommendations', async (req, res) => {
  try {
    const { city, budget, weather, activity, dates, distance } = req.body;

    if (!city || typeof city !== 'string' || city.trim() === '') {
      return res.status(400).json({ error: 'City name is required and must be a valid string' });
    }

    // Get OAuth token
    const token = await getToken();

    // Step 1: Get city coordinates
    const cityRes = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(city)}&subType=CITY&page[limit]=1`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!cityRes.ok) {
      const errData = await cityRes.json();
      return res.status(cityRes.status).json({ error: errData.error || 'Failed to fetch city data' });
    }

    const cityData = await cityRes.json();

    if (!cityData?.data?.length) {
      return res.status(404).json({ error: 'City not found' });
    }

    const geo = cityData.data[0].geoCode;
    if (!geo) {
      return res.status(500).json({ error: 'Missing geo location data for city' });
    }

    const lat = geo.latitude;
    const lng = geo.longitude;
    const radius = distance && !isNaN(distance) && distance > 0 ? distance : 10;

    // Step 2: Get activities from Amadeus API
    let activitiesUrl = `https://test.api.amadeus.com/v1/shopping/activities?latitude=${lat}&longitude=${lng}&radius=${radius}`;
    if (activity && activity.trim() !== '') {
      activitiesUrl += `&keyword=${encodeURIComponent(activity.trim())}`;
    }

    const activitiesRes = await fetch(activitiesUrl, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!activitiesRes.ok) {
      const errorData = await activitiesRes.json();
      return res.status(activitiesRes.status).json({
        error: errorData?.errors?.[0]?.detail || 'Failed to fetch activities',
      });
    }

    const activitiesData = await activitiesRes.json();
    let filteredActivities = activitiesData.data || [];

    // Step 3: Filter by budget if provided
    if (budget && !isNaN(budget)) {
      filteredActivities = filteredActivities.filter((activity) => {
        // Check if price info exists and is less than or equal to budget
        const price = activity.price?.amount || activity.price?.total || null;
        if (price && !isNaN(price)) {
          return parseFloat(price) <= parseFloat(budget);
        }
        // If no price info, keep it (you can adjust logic here)
        return true;
      });
    }

    // Step 4: Filter by weather (indoor/outdoor) based on description or keywords
    if (weather && weather.trim() !== '') {
      const weatherLower = weather.toLowerCase();
      filteredActivities = filteredActivities.filter((a) => {
        const desc = (a.description?.text || '').toLowerCase() + ' ' + (a.shortDescription || '').toLowerCase();
        // Match indoor/outdoor keywords roughly
        if (weatherLower === 'indoor') {
          return desc.includes('indoor') || desc.includes('museum') || desc.includes('gallery') || desc.includes('exhibit');
        } else if (weatherLower === 'outdoor') {
          return desc.includes('outdoor') || desc.includes('park') || desc.includes('beach') || desc.includes('hiking') || desc.includes('trail');
        }
        return true; // if unknown weather preference, keep all
      });
    }

    // Step 5: Filter by dates - very limited API support, so just check if bookingLink exists as a proxy
    if (Array.isArray(dates) && dates.length === 2) {
      filteredActivities = filteredActivities.filter((a) => !!a.bookingLink);
    }
    
    // Step 6: Send filtered results
    res.json({
      city: cityData.data[0].name,
      activities: { data: filteredActivities },
      filters: { budget, weather, activity, dates, distance: radius },
    });
  } catch (error) {
    console.error('Error in /recommendations:', error.stack || error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

const PORT = process.env.PORT || 5501;
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
