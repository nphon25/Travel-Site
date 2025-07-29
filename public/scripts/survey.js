document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('surveyForm');
  const resultsDiv = document.getElementById('results');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const city = document.getElementById('city').value.trim();
    const budget = parseFloat(document.getElementById('budget').value);
    const weather = document.getElementById('weather').value;
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const distance = parseInt(document.getElementById('distance').value, 10);

    // Get checked activities as array
    const activities = Array.from(document.querySelectorAll('input[name="activities"]:checked')).map(el => el.value);

    if (!city || !budget || !weather || !startDate || !endDate || !distance) {
      alert('Please fill in all required fields.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date must be before end date.');
      return;
    }

    resultsDiv.textContent = 'Loading...';

    try {
      const response = await fetch('/api/recommendations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ city }),
});
/*
      const response = await fetch('http://localhost:5500/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city, budget, weather, activities, startDate, endDate, distance }),
      });*/

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Network response was not ok');
      }

      const data = await response.json();

      resultsDiv.innerHTML = `<h3>Activities in ${data.city}:</h3>`;

      if (data.activities && data.activities.length > 0) {
        data.activities.forEach(act => {
          resultsDiv.innerHTML += `<p>• ${act.name}</p>`;
        });
      } else {
        resultsDiv.innerHTML += `<p>No activities found matching your preferences.</p>`;
      }
    } catch (error) {
      resultsDiv.textContent = 'Failed to get recommendations: ' + error.message;
    }
  });
});

