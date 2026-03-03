const galleryGrid = document.getElementById('gallery-grid');
const galleryStatus = document.getElementById('gallery-status');
const filterPills = document.getElementById('filter-pills');
const albumList = document.getElementById('album-list');
const photoCountEl = document.getElementById('photo-count');
const albumCountEl = document.getElementById('album-count');
const lastUpdatedEl = document.getElementById('last-updated');
const heroImage = document.getElementById('hero-image');
const heroFrame = document.getElementById('hero-frame');
const heroCounter = document.getElementById('hero-counter');
const heroTitle = document.getElementById('hero-title');
const heroDescription = document.getElementById('hero-description');
const heroStrip = document.getElementById('hero-strip');
const heroAlbum = document.getElementById('hero-album');
const yearEl = document.getElementById('current-year');

const heatmapGrid = document.getElementById('heatmap-grid');
const heatmapMonths = document.getElementById('heatmap-months');
const heatmapActiveDays = document.getElementById('heatmap-active-days');
const heatmapTotalUploads = document.getElementById('heatmap-total-uploads');
const heatmapPeakDay = document.getElementById('heatmap-peak-day');

const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightbox-image');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxClose = document.getElementById('lightbox-close');
const lightboxPrev = document.getElementById('lightbox-prev');
const lightboxNext = document.getElementById('lightbox-next');

const DEFAULT_ALBUM = 'all';

const state = {
  allImages: [],
  filteredImages: [],
  albums: [],
  activeAlbum: DEFAULT_ALBUM,
  currentIndex: 0,
  heroTimer: null
};

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return new Intl.DateTimeFormat('fr-CH', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function formatShortDate(value) {
  if (!value) return 'Date inconnue';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';

  return new Intl.DateTimeFormat('fr-CH', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'portfolio';
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

function normalizeImage(item, index) {
  const albumName = item.album || 'Portfolio';
  const albumSlug = item.albumSlug || slugify(albumName);

  return {
    src: item.src,
    title: item.title || titleFromFilename(item.src),
    album: albumName,
    albumSlug,
    date: item.date || '',
    index
  };
}

function descriptionFromImage(image) {
  const activeTotal = state.filteredImages.length;
  const position = String(state.currentIndex + 1).padStart(2, '0');
  const dateText = image.date ? ` · ${formatShortDate(image.date)}` : '';
  return `${image.album} · ${position} / ${String(activeTotal).padStart(2, '0')}${dateText}`;
}

function getImagesForAlbum(albumSlug) {
  if (albumSlug === DEFAULT_ALBUM) return [...state.allImages];
  return state.allImages.filter((image) => image.albumSlug === albumSlug);
}

function getAlbumLabel(albumSlug) {
  if (albumSlug === DEFAULT_ALBUM) return 'Tous les albums';
  const found = state.albums.find((album) => album.slug === albumSlug);
  return found ? found.name : 'Album';
}

function updateHeroStripActiveState(index) {
  const buttons = heroStrip.querySelectorAll('.hero-thumb');
  buttons.forEach((button, buttonIndex) => {
    button.classList.toggle('is-active', buttonIndex === index);
  });
}

function setHeroImage(index) {
  const image = state.filteredImages[index];
  if (!image) return;

  state.currentIndex = index;
  heroImage.src = image.src;
  heroImage.alt = image.title;
  heroTitle.textContent = image.title;
  heroDescription.textContent = descriptionFromImage(image);
  heroCounter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(state.filteredImages.length).padStart(2, '0')}`;
  heroAlbum.textContent = image.album;
  heroFrame.classList.add('has-image');
  heroFrame.classList.remove('empty');
  updateHeroStripActiveState(index);
}

function stopHeroAutoplay() {
  if (state.heroTimer) {
    window.clearInterval(state.heroTimer);
    state.heroTimer = null;
  }
}

function startHeroAutoplay() {
  stopHeroAutoplay();

  if (state.filteredImages.length < 2) return;

  state.heroTimer = window.setInterval(() => {
    if (lightbox.classList.contains('open')) return;
    const nextIndex = (state.currentIndex + 1) % state.filteredImages.length;
    setHeroImage(nextIndex);
  }, 5200);
}

function buildHeroStrip() {
  heroStrip.innerHTML = '';

  state.filteredImages.slice(0, 5).forEach((image, stripIndex) => {
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

function updateAlbumSelectionUi() {
  document.querySelectorAll('.album-card').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.album === state.activeAlbum);
  });

  document.querySelectorAll('.filter-pill').forEach((button) => {
    button.classList.toggle('is-active', button.dataset.album === state.activeAlbum);
  });
}

function renderEmptyPortfolio(message = 'Aucune photo détectée pour le moment.') {
  galleryStatus.textContent = message;
  heroCounter.textContent = '00 / 00';
  heroAlbum.textContent = 'Sélection';
  heroTitle.textContent = 'Prêt à accueillir tes images';
  heroDescription.innerHTML = 'Ajoute des fichiers dans <code>assets/photos/</code> pour générer automatiquement albums, heatmap et portfolio.';
  heroStrip.innerHTML = '';
  heroFrame.classList.remove('has-image');
  heroFrame.classList.add('empty');
  galleryGrid.innerHTML = `
    <div class="empty-gallery">
      <h3>Le portfolio est prêt.</h3>
      <p>
        Ajoute des images dans <code>assets/photos/</code>. Utilise des sous-dossiers pour créer des albums.
      </p>
    </div>
  `;
  stopHeroAutoplay();
}

function renderGallery() {
  state.filteredImages = getImagesForAlbum(state.activeAlbum);
  state.currentIndex = 0;
  updateAlbumSelectionUi();

  if (!state.allImages.length) {
    renderEmptyPortfolio();
    renderHeatmap([]);
    return;
  }

  if (!state.filteredImages.length) {
    galleryStatus.textContent = `Aucune image dans « ${getAlbumLabel(state.activeAlbum)} ».`;
    galleryGrid.innerHTML = `
      <div class="empty-gallery">
        <h3>Album vide</h3>
        <p>Ajoute des images dans ce dossier, puis pousse le dépôt pour voir l’album apparaître ici.</p>
      </div>
    `;
    heroCounter.textContent = '00 / 00';
    heroAlbum.textContent = getAlbumLabel(state.activeAlbum);
    heroTitle.textContent = 'Aucune image dans cet album';
    heroDescription.textContent = 'Choisis un autre album ou ajoute des fichiers dans le sous-dossier correspondant.';
    heroStrip.innerHTML = '';
    heroFrame.classList.remove('has-image');
    heroFrame.classList.add('empty');
    stopHeroAutoplay();
    renderHeatmap(state.filteredImages);
    return;
  }

  const albumLabel = getAlbumLabel(state.activeAlbum);
  galleryStatus.textContent = `${state.filteredImages.length} photo${state.filteredImages.length > 1 ? 's' : ''} · ${albumLabel}`;
  galleryGrid.innerHTML = '';
  buildHeroStrip();
  setHeroImage(0);

  state.filteredImages.forEach((image, index) => {
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

    const title = document.createElement('span');
    title.className = 'gallery-title';
    title.textContent = image.title;

    const sub = document.createElement('div');
    sub.className = 'gallery-submeta';

    const album = document.createElement('span');
    album.className = 'gallery-album';
    album.textContent = image.album;

    const counter = document.createElement('span');
    counter.className = 'gallery-index';
    counter.textContent = String(index + 1).padStart(2, '0');

    sub.append(album, counter);
    meta.append(title, sub);
    card.append(img, meta);

    card.addEventListener('mouseenter', () => setHeroImage(index));
    card.addEventListener('focus', () => setHeroImage(index));
    card.addEventListener('click', () => openLightbox(index));

    galleryGrid.appendChild(card);
  });

  startHeroAutoplay();
  renderHeatmap(state.filteredImages);
}

function renderAlbums() {
  if (!albumList) return;

  if (!state.albums.length) {
    albumList.innerHTML = `
      <div class="empty-section">
        <h3>Les albums apparaîtront automatiquement.</h3>
        <p>Crée simplement des sous-dossiers dans <code>assets/photos/</code> pour voir les albums ici.</p>
      </div>
    `;
    return;
  }

  const totalCount = state.allImages.length;
  const cards = [];

  cards.push({
    slug: DEFAULT_ALBUM,
    name: 'Tous les albums',
    count: totalCount,
    cover: state.allImages[0]?.src || ''
  });

  state.albums.forEach((album) => cards.push(album));

  albumList.innerHTML = '';
  cards.forEach((album) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'album-card';
    button.dataset.album = album.slug;

    if (album.cover) {
      const img = document.createElement('img');
      img.src = album.cover;
      img.alt = album.name;
      img.loading = 'lazy';
      img.decoding = 'async';
      button.appendChild(img);
    } else {
      const fallback = document.createElement('div');
      fallback.className = 'album-fallback';
      button.appendChild(fallback);
    }

    const meta = document.createElement('div');
    meta.className = 'album-meta';

    const name = document.createElement('span');
    name.className = 'album-name';
    name.textContent = album.name;

    const sub = document.createElement('div');
    sub.className = 'album-subline';

    const count = document.createElement('span');
    count.textContent = `${album.count} photo${album.count > 1 ? 's' : ''}`;

    const pill = document.createElement('span');
    pill.className = 'album-pill';
    pill.textContent = album.slug === DEFAULT_ALBUM ? 'Vue globale' : 'Filtrer';

    sub.append(count, pill);
    meta.append(name, sub);
    button.appendChild(meta);

    button.addEventListener('click', () => {
      state.activeAlbum = album.slug;
      renderGallery();
      scrollToSection('gallery');
    });

    albumList.appendChild(button);
  });

  updateAlbumSelectionUi();
}

function renderFilterPills() {
  if (!filterPills) return;

  const options = [{ slug: DEFAULT_ALBUM, name: 'Tout' }, ...state.albums.map((album) => ({ slug: album.slug, name: album.name }))];
  filterPills.innerHTML = '';

  options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-pill';
    button.dataset.album = option.slug;
    button.textContent = option.name;
    button.addEventListener('click', () => {
      state.activeAlbum = option.slug;
      renderGallery();
    });
    filterPills.appendChild(button);
  });

  updateAlbumSelectionUi();
}

function getActivityMap(images) {
  const map = new Map();
  images.forEach((image) => {
    if (!image.date) return;
    const dateKey = new Date(image.date).toISOString().slice(0, 10);
    map.set(dateKey, (map.get(dateKey) || 0) + 1);
  });
  return map;
}

function levelFromCount(count) {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

function renderHeatmap(images) {
  if (!heatmapGrid || !heatmapMonths) return;

  const activity = getActivityMap(images);
  const totalUploads = Array.from(activity.values()).reduce((sum, value) => sum + value, 0);
  const activeDays = Array.from(activity.values()).filter((value) => value > 0).length;
  const peak = Array.from(activity.values()).reduce((max, value) => Math.max(max, value), 0);

  if (heatmapActiveDays) heatmapActiveDays.textContent = String(activeDays);
  if (heatmapTotalUploads) heatmapTotalUploads.textContent = String(totalUploads);
  if (heatmapPeakDay) heatmapPeakDay.textContent = String(peak);

  heatmapGrid.innerHTML = '';
  heatmapMonths.innerHTML = '';

  const weeks = 26;
  const totalDays = weeks * 7;
  const today = new Date();
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(end.getDate() - (totalDays - 1));

  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const dayOffset = (start.getDay() + 6) % 7;

  if (window.matchMedia('(max-width: 760px)').matches) {
    const mobileWeeks = 13;
    const mobileDays = mobileWeeks * 7;
    const mobileStart = new Date(end);
    mobileStart.setDate(end.getDate() - (mobileDays - 1));
    const mobileColumns = [];

    for (let week = 0; week < mobileWeeks; week += 1) {
      const col = document.createElement('div');
      col.className = 'heat-column';

      for (let day = 0; day < 7; day += 1) {
        const offset = week * 7 + day;
        const date = new Date(mobileStart);
        date.setDate(mobileStart.getDate() + offset);
        const key = date.toISOString().slice(0, 10);
        const count = activity.get(key) || 0;

        const square = document.createElement('span');
        square.className = `heat-square level-${levelFromCount(count)}`;
        square.title = `${key} · ${count} photo${count > 1 ? 's' : ''}`;
        col.appendChild(square);
      }

      mobileColumns.push(col);
    }

    mobileColumns.forEach((col) => heatmapGrid.appendChild(col));

    for (let i = 0; i < mobileWeeks; i += 1) {
      if (i % 2 !== 0) {
        const spacer = document.createElement('span');
        heatmapMonths.appendChild(spacer);
        continue;
      }

      const monthDate = new Date(mobileStart);
      monthDate.setDate(mobileStart.getDate() + i * 7);
      const label = document.createElement('span');
      label.className = 'heatmap-month';
      label.textContent = monthDate.toLocaleDateString('fr-CH', { month: 'short' });
      heatmapMonths.appendChild(label);
    }

    return;
  }

  dayLabels.forEach((label) => {
    const rowLabel = document.createElement('span');
    rowLabel.className = 'heatmap-day-label';
    rowLabel.textContent = label;
    heatmapGrid.appendChild(rowLabel);
  });

  for (let week = 0; week < weeks; week += 1) {
    const monthLabel = document.createElement('span');
    monthLabel.className = 'heatmap-month';

    const firstDateOfWeek = new Date(start);
    firstDateOfWeek.setDate(start.getDate() + week * 7);
    const isFirstColumn = week === 0;
    const monthChanged = firstDateOfWeek.getDate() <= 7;

    monthLabel.textContent = (isFirstColumn || monthChanged)
      ? firstDateOfWeek.toLocaleDateString('fr-CH', { month: 'short' })
      : '';

    heatmapMonths.appendChild(monthLabel);

    const column = document.createElement('div');
    column.className = 'heat-column';

    for (let day = 0; day < 7; day += 1) {
      const offset = week * 7 + day;
      const date = new Date(start);
      date.setDate(start.getDate() + offset);
      const key = date.toISOString().slice(0, 10);
      const count = activity.get(key) || 0;

      const square = document.createElement('span');
      square.className = `heat-square level-${levelFromCount(count)}`;
      square.title = `${key} · ${count} photo${count > 1 ? 's' : ''}`;
      column.appendChild(square);
    }

    heatmapGrid.appendChild(column);
  }
}

function openLightbox(index) {
  state.currentIndex = index;
  const image = state.filteredImages[state.currentIndex];
  if (!image) return;

  lightboxImage.src = image.src;
  lightboxImage.alt = image.title;
  lightboxCaption.textContent = `${image.title} · ${image.album}`;
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
  if (!state.filteredImages.length) return;
  state.currentIndex = (state.currentIndex + direction + state.filteredImages.length) % state.filteredImages.length;
  setHeroImage(state.currentIndex);
  openLightbox(state.currentIndex);
}

function setupLightbox() {
  lightboxClose?.addEventListener('click', closeLightbox);
  lightboxPrev?.addEventListener('click', () => stepLightbox(-1));
  lightboxNext?.addEventListener('click', () => stepLightbox(1));

  lightbox?.addEventListener('click', (event) => {
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
  if (!elements.length || !('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.1 });

  elements.forEach((element) => observer.observe(element));
}

function scrollToSection(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function deriveAlbumsFromImages(images) {
  const map = new Map();

  images.forEach((image) => {
    if (!map.has(image.albumSlug)) {
      map.set(image.albumSlug, {
        slug: image.albumSlug,
        name: image.album,
        count: 0,
        cover: image.src
      });
    }

    const album = map.get(image.albumSlug);
    album.count += 1;
    if (!album.cover) album.cover = image.src;
  });

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
}

function sortImages(images) {
  return [...images].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    if (aTime !== bTime) return bTime - aTime;
    return a.src.localeCompare(b.src, 'fr', { sensitivity: 'base', numeric: true });
  });
}

function hydrateState(payload) {
  const rawImages = Array.isArray(payload?.images) ? payload.images : [];
  state.allImages = sortImages(rawImages.map(normalizeImage));
  state.albums = Array.isArray(payload?.albums) && payload.albums.length
    ? payload.albums.map((album) => ({
        slug: album.slug || slugify(album.name),
        name: album.name || 'Portfolio',
        count: album.count || 0,
        cover: album.cover || ''
      }))
    : deriveAlbumsFromImages(state.allImages);

  if (photoCountEl) photoCountEl.textContent = String(state.allImages.length);
  if (albumCountEl) albumCountEl.textContent = String(state.albums.length);
  if (lastUpdatedEl) lastUpdatedEl.textContent = formatDate(payload?.updatedAt);
}

async function loadGallery() {
  try {
    const response = await fetch(`assets/data/gallery.json?ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const payload = await response.json();
    hydrateState(payload);
    renderAlbums();
    renderFilterPills();
    renderGallery();
  } catch (error) {
    if (photoCountEl) photoCountEl.textContent = '0';
    if (albumCountEl) albumCountEl.textContent = '0';
    if (lastUpdatedEl) lastUpdatedEl.textContent = '—';
    if (galleryStatus) galleryStatus.textContent = 'Impossible de charger le manifeste de galerie.';
    renderAlbums();
    renderFilterPills();
    renderEmptyPortfolio('Le site fonctionne, mais le manifeste n\'est pas encore généré.');
    renderHeatmap([]);
    console.error(error);
  }
}

function init() {
  if (yearEl) yearEl.textContent = new Date().getFullYear();
  setupLightbox();
  setupReveal();
  loadGallery();

  window.addEventListener('resize', () => {
    renderHeatmap(state.filteredImages);
  });
}

init();
