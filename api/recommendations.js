import fetch from 'node-fetch';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { CLIENT_ID, CLIENT_SECRET } = process.env;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return res.status(500).json({ error: 'Missing Amadeus credentials' });
  }

  try {
    const { city } = req.body;

    if (!city) {
      return res.status(400).json({ error: 'City is required' });
    }

    // Get OAuth token
    const tokenRes = await fetch('https://test.api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
    });

    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;

    if (!token) {
      return res.status(500).json({ error: 'Failed to get access token' });
    }

    // Get city geolocation
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

    // Get activities
    const activitiesRes = await fetch(`https://test.api.amadeus.com/v1/shopping/activities?latitude=${lat}&longitude=${lng}&radius=10`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const activitiesData = await activitiesRes.json();

    res.status(200).json({
      city: cityData.data[0].name,
      activities: activitiesData,
    });

  } catch (error) {
    console.error('Serverless error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}
