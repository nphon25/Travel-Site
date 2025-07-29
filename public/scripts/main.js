// Hide loading screen and show page content on window load
window.onload = function() {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) loadingScreen.style.display = 'none';
  document.body.style.opacity = 1;
};

// Also ensure hiding loading screen on DOMContentLoaded (fallback)
document.addEventListener('DOMContentLoaded', () => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) loadingScreen.style.display = 'none';
  document.body.style.opacity = 1;

  // Load header dynamically if not present
  if (!document.querySelector('header')) {
    fetch('components/Dheader.html')
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.text();
      })
      .then(html => {
        document.body.insertAdjacentHTML('afterbegin', html);
        initMaterialize();
        initSearch();
      })
      .catch(error => {
        console.error('Error loading header:', error);
        // Fallback simple header if Dheader.html fails
        if (!document.querySelector('header')) {
          document.body.insertAdjacentHTML('afterbegin', 
            `<header>
              <nav class="top-nav">
                <div class="nav-wrapper">
                  <a href="#" class="brand-logo">Your Logo</a>
                  <a href="#" class="sidenav-trigger right"><i class="material-icons">menu</i></a>
                </div>
              </nav>
            </header>`
          );
        }
      });
  } else {
    // If header is already in place
    initMaterialize();
    initSearch();
  }
});

// Initialize Materialize components like sidenav
function initMaterialize() {
  const sidenavs = document.querySelectorAll('.sidenav');
  if (window.M && M.Sidenav) {
    M.Sidenav.init(sidenavs, { edge: 'right', draggable: true });
  } else {
    console.warn('Materialize (M) not loaded or Sidenav missing');
  }

  // Setup search input key event and close icon click
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('keyup', e => {
      if (e.key === 'Enter') performSearch(searchInput.value);
    });

    const closeIcon = searchInput.nextElementSibling?.querySelector('.close');
    if (closeIcon) {
      closeIcon.addEventListener('click', () => {
        searchInput.value = '';
        searchInput.focus();
      });
    }
  }
}

// Initialize search UI open/close events
function initSearch() {
  const searchContainer = document.querySelector('.search-container');
  const searchTrigger = document.querySelector('.search-trigger');
  const closeSearch = document.querySelector('.close-search');
  const searchInput = document.querySelector('.search-input');

  if (!searchContainer || !searchTrigger) return;

  searchTrigger.addEventListener('click', e => {
    e.preventDefault();
    e.stopPropagation();
    searchContainer.classList.add('active');
    if (searchInput) searchInput.focus();
  });

  if (closeSearch) {
    closeSearch.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      closeSearchFn();
    });
  }

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-container') && searchContainer.classList.contains('active')) {
      closeSearchFn();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && searchContainer.classList.contains('active')) {
      closeSearchFn();
    }
  });

  function closeSearchFn() {
    searchContainer.classList.remove('active');
    if (searchInput) searchInput.value = '';
  }
}

// Placeholder search function — replace with your actual search logic
function performSearch(query) {
  console.log('Searching for:', query);
}
