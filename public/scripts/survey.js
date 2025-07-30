document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('surveyForm');
  const resultsSection = document.getElementById('results');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Gather form values
    const city = form.city.value.trim();
    const budget = form.budget.value;
    const weather = form.weather.value;

    // Get all checked activity checkboxes
    const selectedActivities = Array.from(
      form.querySelectorAll('input[name="activities"]:checked')
    ).map(input => input.value);

    const startDate = form.startDate.value;
    const endDate = form.endDate.value;
    const distance = form.distance.value;

    // Validate required fields and at least one activity
    if (
      !city || !budget || !weather ||
      selectedActivities.length === 0 ||
      !startDate || !endDate || !distance
    ) {
      alert('Please fill out all required fields and select at least one activity.');
      return;
    }

    // Validate date logic
    if (new Date(startDate) > new Date(endDate)) {
      alert('Start Date cannot be after End Date.');
      return;
    }

    // Disable submit to prevent duplicate requests
    submitBtn.disabled = true;
    resultsSection.innerHTML = '<p>Loading recommendations...</p>';

    try {
      const response = await fetch('/recommendations', {
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

      if (data.activities && data.activities.length > 0) {
        resultsSection.innerHTML = `
          <h3>Recommended Activities in ${data.city}</h3>
          <ul>
            ${data.activities.map(act => `<li>${act.name}</li>`).join('')}
          </ul>
        `;
      } else {
        resultsSection.innerHTML = '<p>No activities found matching your preferences.</p>';
      }
    } catch (error) {
      console.error('Fetch error:', error);
      resultsSection.innerHTML = '<p>Error fetching recommendations. Please try again later.</p>';
    } finally {
      // Re-enable submit button
      submitBtn.disabled = false;
    }
  });
});
