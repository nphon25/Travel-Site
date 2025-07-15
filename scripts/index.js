document.addEventListener('DOMContentLoaded', function () {
  // Materialize Carousel Init
  const elems = document.querySelectorAll('.carousel.carousel-slider');
  const instances = M.Carousel.init(elems, {
    fullWidth: true,
    indicators: true,
  });

  // Auto-slide carousel
  if (instances.length > 0) {
    setInterval(() => {
      instances[0].next();
    }, 5000);
  }

  // Materialbox Init
  const materialboxElems = document.querySelectorAll('.materialboxed');
  M.Materialbox.init(materialboxElems);

  // external HTML (header, footer, etc.)
  const includes = document.querySelectorAll('[data-include]');
  includes.forEach(async (el) => {
    const file = el.getAttribute('data-include');
    try {
      const res = await fetch(file);
      if (!res.ok) throw new Error(`Could not fetch ${file}`);
      const html = await res.text();
      el.innerHTML = html;
    } catch (err) {
      el.innerHTML = `<p style="color:red;">Failed to load: ${file}</p>`;
      console.error(err);
    }
  });
});
