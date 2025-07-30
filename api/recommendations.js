// Cache variables for OAuth token and expiry time
let cachedToken = null;
let tokenExpiry = 0;

// Function to retrieve a valid access token from Amadeus API
const getToken = async () => {
  const now = Date.now();

  // Return cached token if it's still valid
  if (cachedToken && now < tokenExpiry) return cachedToken;

  // Request a new token using client credentials
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

  // Handle errors if token request fails
  if (!response.ok || !data.access_token) {
    throw new Error(data.error_description || 'Failed to get access token');
  }

  // Cache the token and set its expiry (renew 1 minute early)
  cachedToken = data.access_token;
  tokenExpiry = now + (data.expires_in * 1000) - 60000;

  return cachedToken;
};

// Main API handler function
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST method allowed' });
  }

  // Validate request body
  const { city } = req.body;
  if (!city) {
    return res.status(400).json({ error: 'Missing required field: city' });
  }

  try {
    // Get access token
    const token = await getToken();

    // Step 1: Get coordinates for the given city
    const cityRes = await fetch(
      `https://test.api.amadeus.com/v1/reference-data/locations?keyword=${encodeURIComponent(city)}&subType=CITY`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const cityData = await cityRes.json();

    // Handle errors if city not found
    if (!cityRes.ok || !cityData.data?.length) {
      return res.status(404).json({ error: 'City not found' });
    }

    // Extract geo-coordinates and city name
    const location = cityData.data[0];
    const latitude = location.geoCode?.latitude;
    const longitude = location.geoCode?.longitude;
    const cityName = location.name;

    // Return error if coordinates are missing
    if (!latitude || !longitude) {
      return res.status(404).json({ error: 'Coordinates not found for city' });
    }

    // Step 2: Fetch tourist activities near the coordinates (default radius 50km)
    const actRes = await fetch(
      `https://test.api.amadeus.com/v1/shopping/activities?latitude=${latitude}&longitude=${longitude}&radius=50`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const actData = await actRes.json();

    // Handle errors while fetching activities
    if (!actRes.ok) {
      return res.status(actRes.status).json({ error: actData.error || 'Failed to fetch activities' });
    }

    // Send successful response with city name and activity list
    return res.status(200).json({
      city: cityName,
      activities: actData.data || [],
    });

  } catch (err) {
    // Catch and log any unexpected errors
    console.error('API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
