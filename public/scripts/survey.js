document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('surveyForm');
  const resultsDiv = document.getElementById('results');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const city = document.getElementById('city').value.trim();
    if (!city) {
      alert('Please enter a city name.');
      return;
    }

    resultsDiv.textContent = 'Loading...';

    try {
      const response = await fetch('http://localhost:5500/recommendations', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ city }),
});


      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Network response was not ok');
      }

      const data = await response.json();

      resultsDiv.innerHTML = `<h3>Activities in ${data.city}:</h3>`;
      if (data.activities && data.activities.data && data.activities.data.length > 0) {
        data.activities.data.forEach(act => {
          resultsDiv.innerHTML += `<p>• ${act.name}</p>`;
        });
      } else {
        resultsDiv.innerHTML += `<p>No activities found.</p>`;
      }
    } catch (error) {
      resultsDiv.textContent = 'Failed to get recommendations: ' + error.message;
    }
  });
});
