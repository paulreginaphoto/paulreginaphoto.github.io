const galleryGrid = document.getElementById('gallery-grid');
const galleryStatus = document.getElementById('gallery-status');
const photoCountEl = document.getElementById('photo-count');
const lastUpdatedEl = document.getElementById('last-updated');
const heroImage = document.getElementById('hero-image');
const heroFrame = document.getElementById('hero-frame');
const heroCounter = document.getElementById('hero-counter');
const heroTitle = document.getElementById('hero-title');
const heroDescription = document.getElementById('hero-description');
const heroStrip = document.getElementById('hero-strip');
const yearEl = document.getElementById('current-year');

const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');

let galleryImages = [];
let currentIndex = 0;
let heroTimer = null;

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-CH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function titleFromFilename(path) {
  const file = path.split('/').pop() || path;
  const base = file.replace(/\.[^.]+$/, '');
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ') || 'Sans titre';
}

function descriptionFromImage(image) {
  const position = String(image.index + 1).padStart(2, '0');
  return `Image ${position} sur ${String(galleryImages.length).padStart(2, '0')} · clique pour l’ouvrir en plein écran.`;
}

function updateHeroStripActiveState(index) {
  const buttons = heroStrip.querySelectorAll('.hero-thumb');
  buttons.forEach((button, buttonIndex) => {
    button.classList.toggle('is-active', buttonIndex === index);
  });
}

function setHeroImage(index) {
  const image = galleryImages[index];
  if (!image) return;

  currentIndex = index;
  heroImage.src = image.src;
  heroImage.alt = image.title;
  heroTitle.textContent = image.title;
  heroDescription.textContent = descriptionFromImage(image);
  heroCounter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(galleryImages.length).padStart(2, '0')}`;
  heroFrame.classList.add('has-image');
  heroFrame.classList.remove('empty');
  updateHeroStripActiveState(index);
}

function renderEmptyState() {
  galleryStatus.textContent = 'Aucune photo détectée pour le moment.';
  heroCounter.textContent = '00 / 00';
  heroTitle.textContent = 'Prêt à accueillir tes images';
  heroDescription.innerHTML = 'Ajoute des fichiers dans <code>assets/photos/</code> pour alimenter automatiquement la vitrine.';
  heroStrip.innerHTML = '';
  galleryGrid.innerHTML = `
    <div class="empty-gallery">
      <h3>Le portfolio est prêt.</h3>
      <p>
        Ajoute simplement tes images dans <code>assets/photos/</code>, puis pousse le dépôt.
        Le workflow inclus générera automatiquement la galerie.
      </p>
    </div>
  `;
}

function openLightbox(index) {
  currentIndex = index;
  const image = galleryImages[currentIndex];
  if (!image) return;

  lightboxImage.src = image.src;
  lightboxImage.alt = image.title;
  lightboxCaption.textContent = image.title;
  lightbox.classList.add('open');
  lightbox.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  lightbox.classList.remove('open');
  lightbox.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function stepLightbox(direction) {
  if (!galleryImages.length) return;
  currentIndex = (currentIndex + direction + galleryImages.length) % galleryImages.length;
  setHeroImage(currentIndex);
  openLightbox(currentIndex);
}

function buildHeroStrip() {
  heroStrip.innerHTML = '';

  galleryImages.slice(0, 4).forEach((image, stripIndex) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hero-thumb';
    button.setAttribute('aria-label', `Afficher ${image.title} en vedette`);

    const img = document.createElement('img');
    img.src = image.src;
    img.alt = image.title;
    img.loading = 'lazy';
    img.decoding = 'async';

    button.appendChild(img);
    button.addEventListener('click', () => setHeroImage(stripIndex));
    heroStrip.appendChild(button);
  });
}

function renderGallery(items) {
  galleryImages = items.map((item, index) => ({
    src: item.src,
    title: item.title || titleFromFilename(item.src),
    index
  }));

  photoCountEl.textContent = String(galleryImages.length);

  if (!galleryImages.length) {
    renderEmptyState();
    return;
  }

  galleryStatus.textContent = `${galleryImages.length} photo${galleryImages.length > 1 ? 's' : ''} chargée${galleryImages.length > 1 ? 's' : ''}.`;
  galleryGrid.innerHTML = '';
  buildHeroStrip();
  setHeroImage(0);

  galleryImages.forEach((image, index) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'gallery-card';
    card.setAttribute('aria-label', `Ouvrir ${image.title}`);

    const img = document.createElement('img');
    img.src = image.src;
    img.alt = image.title;
    img.loading = index < 6 ? 'eager' : 'lazy';
    img.decoding = 'async';

    const meta = document.createElement('div');
    meta.className = 'gallery-meta';
    meta.innerHTML = `
      <span class="gallery-title">${image.title}</span>
      <span class="gallery-index">${String(index + 1).padStart(2, '0')}</span>
    `;

    card.append(img, meta);
    card.addEventListener('mouseenter', () => setHeroImage(index));
    card.addEventListener('focus', () => setHeroImage(index));
    card.addEventListener('click', () => openLightbox(index));
    galleryGrid.appendChild(card);
  });

  startHeroAutoplay();
}

async function loadGallery() {
  try {
    const response = await fetch(`assets/data/gallery.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    const images = Array.isArray(payload?.images) ? payload.images : [];
    lastUpdatedEl.textContent = formatDate(payload?.updatedAt);
    renderGallery(images);
  } catch (error) {
    photoCountEl.textContent = '0';
    lastUpdatedEl.textContent = '—';
    galleryStatus.textContent = 'Impossible de charger le manifeste de galerie.';
    heroCounter.textContent = '00 / 00';
    galleryGrid.innerHTML = `
      <div class="empty-gallery">
        <h3>Le site fonctionne, mais la galerie n'est pas encore générée.</h3>
        <p>
          Vérifie que le workflow GitHub a bien créé <code>assets/data/gallery.json</code>
          après ton premier push d'images.
        </p>
      </div>
    `;
    console.error(error);
  }
}

function startHeroAutoplay() {
  if (heroTimer) {
    window.clearInterval(heroTimer);
    heroTimer = null;
  }

  if (galleryImages.length < 2) return;

  heroTimer = window.setInterval(() => {
    if (lightbox.classList.contains('open')) return;
    const nextIndex = (currentIndex + 1) % galleryImages.length;
    setHeroImage(nextIndex);
  }, 5000);
}

function setupLightbox() {
  lightboxClose.addEventListener('click', closeLightbox);
  lightboxPrev.addEventListener('click', () => stepLightbox(-1));
  lightboxNext.addEventListener('click', () => stepLightbox(1));

  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) closeLightbox();
  });

  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('open')) return;
    if (event.key === 'Escape') closeLightbox();
    if (event.key === 'ArrowLeft') stepLightbox(-1);
    if (event.key === 'ArrowRight') stepLightbox(1);
  });
}

function setupReveal() {
  const elements = document.querySelectorAll('.reveal');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12 });

  elements.forEach((element) => observer.observe(element));
}

function init() {
  yearEl.textContent = new Date().getFullYear();
  setupLightbox();
  setupReveal();
  loadGallery();
}

init();
