window.onload = function() {
    // Hide the loading screen
    //document.getElementById('loading-screen').style.display = 'none';

    // Show the page content
    document.body.style.opacity = 1;
};

document.addEventListener('DOMContentLoaded', function() {
    // Hide the loading screen
    //document.getElementById('loading-screen').style.display = 'none';

    // Show the page content
    document.body.style.opacity = 1;
});


document.addEventListener('DOMContentLoaded', function() {
  // Load the header only if it doesn't already exist
  if (!document.querySelector('header')) {
    fetch('components/Dheader.html')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.text();
      })
      .then(html => {
        document.body.insertAdjacentHTML('afterbegin', html);
        initMaterialize();
        initSearch();
      })
      .catch(error => {
        console.error('Error loading header:', error);
        // Fallback header if needed
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
    // If header already exists, just initialize components
    initMaterialize();
    initSearch();
  }
});

function initMaterialize() {
  // Initialize sidenav with right-alignment
  const sidenavs = document.querySelectorAll('.sidenav');
  M.Sidenav.init(sidenavs, {
    edge: 'right',
    draggable: true
  });

  // Initialize search functionality in sidenav
  const searchInput = document.getElementById('search');
  if (searchInput) {
    searchInput.addEventListener('keyup', function(e) {
      if (e.key === 'Enter') {
        performSearch(this.value);
      }
    });

    // Close icon functionality
    const closeIcon = searchInput.nextElementSibling.querySelector('.close');
    if (closeIcon) {
      closeIcon.addEventListener('click', function() {
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

  // Open search
  searchTrigger.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    searchContainer.classList.add('active');
    if (searchInput) searchInput.focus();
  });

  // Close search
  if (closeSearch) {
    closeSearch.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      closeSearchFn();
    });
  }

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
    if (searchInput) searchInput.value = '';
  }
}

function performSearch(query) {
  console.log('Searching for:', query);
}