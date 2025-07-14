document.addEventListener('DOMContentLoaded', function() {
  // Load the header
  fetch('components/Dheader.html')
    .then(response => response.text())
    .then(html => {
      document.body.insertAdjacentHTML('afterbegin', html);
      initSearch();
    })
    .catch(error => console.error('Error loading header:', error));

  function initSearch() {
    const searchContainer = document.querySelector('.search-container');
    const searchTrigger = document.querySelector('.search-trigger');
    const closeSearch = document.querySelector('.close-search');
    const searchInput = document.querySelector('.search-input');

    if (!searchContainer || !searchTrigger) return;

    // Open search
    searchTrigger.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling to document
      searchContainer.classList.add('active');
      searchInput.focus();
    });

    // Close search
    closeSearch.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling to document
      closeSearchFn();
    });

    // Close when clicking outside
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.search-container') && searchContainer.classList.contains('active')) {
        closeSearchFn();
      }
    });

    // Close on ESC
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && searchContainer.classList.contains('active')) {
        closeSearchFn();
      }
    });

    function closeSearchFn() {
      searchContainer.classList.remove('active');
      searchInput.value = '';
    }
  }
});