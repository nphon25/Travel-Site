document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('surveyForm');
  const results = document.getElementById('results');

  // Initialize Materialize and Flatpickr
  M.FormSelect.init(document.querySelectorAll('select'));
  flatpickr('#dates', { mode: 'range', dateFormat: 'Y-m-d' });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const city = form.city.value.trim();
    const budget = form.budget.value.trim();
    const weather = form.weather.value;
    const activity = form.activity.value;
    const dates = form.dates.value.trim();
    const distance = form.distance.value.trim();

    if (!city || !weather) {
      M.toast({ html: 'Please fill in required fields.', classes: 'red' });
      return;
    }

    results.innerHTML = `<div class="progress"><div class="indeterminate"></div></div>`;

    const payload = {
      city,
      budget: budget ? Number(budget) : null,
      weather,
      activity,
      dates: dates ? dates.split(' to ') : [],
      distance: distance ? Number(distance) : null,
    };

    try {
      const res = await fetch('http://localhost:5501/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch');

      const activities = data.activities?.data || [];
      if (activities.length === 0) {
        results.innerHTML = '<p>No recommendations found.</p>';
        return;
      }

      results.innerHTML = `
        <h5>Recommended in ${data.city}</h5>
        <div class="row">
          ${activities.slice(0, 8).map(act => `
            <div class="col s12 m6 l4">
              <div class="card">
                
                ${act.pictures?.[0]?.url ? `<div class="card-image"><img src="${act.pictures[0].url}" alt="${act.name}"></div>` : ''}
                <div class="card-content">
                  <span class="card-title">${act.name || 'Unnamed Activity'}</span>
                  <p>${act.shortDescription || ''}</p>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } catch (err) {
      results.innerHTML = `<p class="red-text">Error: ${err.message}</p>`;
    }
  });
});
