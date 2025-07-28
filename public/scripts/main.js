document.addEventListener('DOMContentLoaded', () => {
  // Hide loading screen if it exists
  const loader = document.getElementById('loading-screen');
  if (loader) loader.style.display = 'none';

  // Show the page content (fade-in or instant)
  document.body.style.opacity = '1';

  // Initialize Materialize components and search only after header/footer loaded
  initMaterialize();
  initSearch();
});

function initMaterialize() {
  // Initialize side navs with right edge and draggable
  const sidenavs = document.querySelectorAll('.sidenav');
  if (sidenavs.length) {
    M.Sidenav.init(sidenavs, {
      edge: 'right',
      draggable: true,
    });
  }

  // Initialize search input Enter key and close icon
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('keyup', (e) => {
      if (e.key === 'Enter') performSearch(searchInput.value.trim());
    });

    // Look for close icon inside the next sibling element (safe)
    const closeIcon = searchInput.nextElementSibling?.querySelector('.close');
    if (closeIcon) {
      closeIcon.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
      });
    }
  }
}

function initSearch() {
  const searchContainer = document.querySelector('.search-container');
  const searchTrigger = document.querySelector('.search-trigger');
  const closeSearch = document.querySelector('.close-search');
  const searchInput = document.querySelector('.search-input');

  if (!searchContainer || !searchTrigger) return;

  searchTrigger.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    searchContainer.classList.add('active');
    if (searchInput) searchInput.focus();
  });

  if (closeSearch) {
    closeSearch.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closeSearchFn();
    });
  }

  // Close search if clicked outside container
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-container') && searchContainer.classList.contains('active')) {
      closeSearchFn();
    }
  });

  // Close search on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && searchContainer.classList.contains('active')) {
      closeSearchFn();
    }
  });

  function closeSearchFn() {
    searchContainer.classList.remove('active');
    if (searchInput) searchInput.value = '';
  }
}

function performSearch(query) {
  if (!query) return;
  console.log('Searching for:', query);
  // Add your real search logic here
}
