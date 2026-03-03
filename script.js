const galleryEl = document.getElementById('gallery');
const statusEl = document.getElementById('status');
const filterBar = document.getElementById('filterBar');
const yearEl = document.getElementById('year');
const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxTitle = document.getElementById('lightboxTitle');
const lightboxAlbum = document.getElementById('lightboxAlbum');
const lightboxClose = document.getElementById('lightboxClose');

yearEl.textContent = new Date().getFullYear();

let allPhotos = [];
let activeAlbum = 'all';

function humanize(value) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\.[^.]+$/, '')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function openLightbox(photo) {
  lightboxImage.src = photo.src;
  lightboxImage.alt = photo.title;
  lightboxTitle.textContent = photo.title;
  lightboxAlbum.textContent = photo.album !== 'Portfolio' ? photo.album : '';
  if (!lightbox.open) lightbox.showModal();
}

function renderFilters() {
  const albums = [...new Set(allPhotos.map((photo) => photo.album))].sort((a, b) => a.localeCompare(b));
  if (albums.length <= 1) {
    filterBar.hidden = true;
    filterBar.innerHTML = '';
    return;
  }

  filterBar.hidden = false;
  const items = ['all', ...albums];
  filterBar.innerHTML = items
    .map((item) => {
      const label = item === 'all' ? 'Tout' : item;
      const active = activeAlbum === item ? 'active' : '';
      return `<button class="filter-button ${active}" data-album="${item}">${label}</button>`;
    })
    .join('');

  filterBar.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      activeAlbum = button.dataset.album;
      renderFilters();
      renderGallery();
    });
  });
}

function renderGallery() {
  const photos = activeAlbum === 'all'
    ? allPhotos
    : allPhotos.filter((photo) => photo.album === activeAlbum);

  if (!photos.length) {
    galleryEl.innerHTML = '';
    statusEl.hidden = false;
    statusEl.textContent = 'Aucune image trouvée.';
    return;
  }

  statusEl.hidden = true;
  galleryEl.innerHTML = photos.map((photo) => `
    <article class="gallery-card" data-src="${photo.src}">
      <figure>
        <img loading="lazy" src="${photo.src}" alt="${photo.title}">
        <figcaption>
          <span class="card-title">${photo.title}</span>
          <span class="card-meta">${photo.album}</span>
        </figcaption>
      </figure>
    </article>
  `).join('');

  galleryEl.querySelectorAll('.gallery-card').forEach((card, index) => {
    card.addEventListener('click', () => openLightbox(photos[index]));
  });
}

async function loadGallery() {
  try {
    const response = await fetch('assets/data/gallery.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('Impossible de charger la galerie');
    const data = await response.json();

    allPhotos = (Array.isArray(data) ? data : []).map((item) => ({
      ...item,
      title: item.title || humanize(item.name || item.src || 'Photo'),
      album: item.album || 'Portfolio',
    }));

    if (!allPhotos.length) {
      statusEl.textContent = 'Ajoute tes photos dans assets/photos/ puis pousse sur GitHub.';
      galleryEl.innerHTML = '';
      filterBar.hidden = true;
      return;
    }

    renderFilters();
    renderGallery();
  } catch (error) {
    statusEl.textContent = 'Erreur de chargement. Vérifie assets/data/gallery.json.';
    galleryEl.innerHTML = '';
    filterBar.hidden = true;
    console.error(error);
  }
}

lightboxClose.addEventListener('click', () => lightbox.close());
lightbox.addEventListener('click', (event) => {
  const rect = lightbox.getBoundingClientRect();
  const inside = rect.top <= event.clientY && event.clientY <= rect.bottom
    && rect.left <= event.clientX && event.clientX <= rect.right;
  if (!inside) lightbox.close();
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && lightbox.open) lightbox.close();
});

loadGallery();
