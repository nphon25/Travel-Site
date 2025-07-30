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
      const response = await fetch('/api/recommendations', {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city,
          /*
          budget,
          weather,
          activities: selectedActivities,
          startDate,
          endDate,
          distance: Number(distance),*/
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
