document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('surveyForm');
  const resultsSection = document.getElementById('results');
  const submitBtn = form.querySelector('button[type="submit"]');

  // Initialize Materialize select fields
  M.FormSelect.init(document.querySelectorAll('select'));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Gather form values
    const city = form.city.value.trim();
    const budget = form.budget.value;
    const weather = form.weather.value;
    const selectedActivities = Array.from(
      form.querySelectorAll('input[name="activities"]:checked')
    ).map(input => input.value);
    const startDate = form.startDate.value;
    const endDate = form.endDate.value;
    const distance = form.distance.value;

    // Validation
    if (!city || !budget || !weather || !startDate || !endDate || !distance || selectedActivities.length === 0) {
      M.toast({ html: 'Please complete all fields and select at least one activity.', classes: 'red darken-1' });
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      M.toast({ html: 'Start Date cannot be after End Date.', classes: 'orange darken-2' });
      return;
    }

    submitBtn.disabled = true;
    resultsSection.innerHTML = '<div class="progress"><div class="indeterminate"></div></div>';

    try {
      //const response = await fetch('/api/recommendations', {
      const response = await fetch('https://travel-site-bice-beta.vercel.app/api/recommendations', {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          budget,
          weather,
          activities: selectedActivities,
          startDate,
          endDate,
          distance: Number(distance),
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.activities?.length) {
        resultsSection.innerHTML = `
          <h4 class="green-text text-darken-2">Recommended Activities in ${data.city}</h4>
          <ul class="collection">
            ${data.activities.map(act => `<li class="collection-item">${act.name}</li>`).join('')}
          </ul>
        `;
      } else {
        resultsSection.innerHTML = '<p>No activities found matching your preferences.</p>';
      }
    } catch (err) {
      console.error('Fetch error:', err);
      resultsSection.innerHTML = '<p class="red-text">Error fetching recommendations. Please try again later.</p>';
    } finally {
      submitBtn.disabled = false;
    }
  });
});
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
