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

    resultsDiv.innerHTML = '<p>Loading recommendations...</p>';

    try {
      const response = await fetch('/api/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city }),
      });

      const contentType = response.headers.get('content-type');

      if (!response.ok) {
        // Attempt to read error body
        const errorText = await response.text();
        throw new Error(`Server error ${response.status}: ${errorText}`);
      }

      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid server response (expected JSON)');
      }

      const data = await response.json();

      resultsDiv.innerHTML = `<h3>Activities in ${data.city}:</h3>`;

      if (
        data.activities &&
        Array.isArray(data.activities.data) &&
        data.activities.data.length > 0
      ) {
        data.activities.data.forEach((act) => {
          resultsDiv.innerHTML += `<p>• ${act.name}</p>`;
        });
      } else {
        resultsDiv.innerHTML += `<p>No activities found for this city.</p>`;
      }
    } catch (error) {
      console.error('Recommendation error:', error);
      resultsDiv.innerHTML = `<p style="color:red;">Failed to get recommendations: ${error.message}</p>`;
    }
  });
});

