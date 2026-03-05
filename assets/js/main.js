(() => {
  const lightbox = document.getElementById('lightbox');
  const lightboxStage = document.getElementById('lightboxStage');
  const lightboxCanvas = document.getElementById('lightboxCanvas');
  const lightboxThumb = document.getElementById('lightboxThumb');
  const lightboxImage = document.getElementById('lightboxImage');
  const closeButton = document.getElementById('lightboxClose');
  const prevButton = document.getElementById('lightboxPrev');
  const nextButton = document.getElementById('lightboxNext');
  const images = Array.from(document.querySelectorAll('.gallery-image'));

  if (!images.length) return;

  // ==========================================================
  // 1) Chargement des thumbs UNE PAR UNE (concurrence = 1)
  //    Tri par position visuelle pour charger ligne par ligne
  // ==========================================================
  const ROOT_MARGIN = "350px";
  const SWIPE_THRESHOLD = 56;

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const markCardLoaded = (img) => {
    const card = img.closest('.card');
    if (!card) return;
    requestAnimationFrame(() => card.classList.add('is-loaded'));
  };

  const settleImage = (img) => {
    if (img.dataset.ready === '1') return Promise.resolve();

    const done = () => {
      img.dataset.ready = '1';
      markCardLoaded(img);
    };

    if (img.complete) {
      if (img.naturalWidth && typeof img.decode === 'function') {
        return img.decode().catch(() => {}).then(done);
      }
      done();
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const finish = () => { done(); resolve(); };

      const onLoad = () => {
        if (typeof img.decode === 'function') {
          img.decode().catch(() => {}).then(finish);
        } else {
          finish();
        }
      };

      img.addEventListener('load', onLoad, { once: true });
      img.addEventListener('error', finish, { once: true });
    });
  };

  let inFlight = false;
  const queue = [];

  const enqueue = (img) => {
    if (!img) return;
    if (img.dataset.queued === '1') return;
    if (img.dataset.loaded === '1') return;

    img.dataset.queued = '1';
    queue.push(img);
    pump();
  };

  const pump = () => {
    if (inFlight) return;
    const img = queue.shift();
    if (!img) return;

    const src = img.dataset.src;
    if (!src) return;

    inFlight = true;
    img.dataset.loaded = '1';

    img.src = src;

    settleImage(img)
      .catch(() => {})
      .finally(() => {
        inFlight = false;
        pump();
      });
  };

  const revealCount =
    window.matchMedia('(max-width: 700px)').matches ? 2 :
    window.matchMedia('(max-width: 1100px)').matches ? 4 : 6;

  // Sort images by visual position (top then left) for row-by-row loading
  const sortByVisualPosition = (imgList) => {
    return imgList.slice().sort((a, b) => {
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      if (Math.abs(ra.top - rb.top) > 10) return ra.top - rb.top;
      return ra.left - rb.left;
    });
  };

  const sorted = sortByVisualPosition(images);
  sorted.slice(0, Math.min(revealCount, sorted.length)).forEach(enqueue);

  const io = new IntersectionObserver((entries) => {
    const visible = entries
      .filter((e) => e.isIntersecting)
      .sort((a, b) => {
        const ra = a.boundingClientRect;
        const rb = b.boundingClientRect;
        if (Math.abs(ra.top - rb.top) > 10) return ra.top - rb.top;
        return ra.left - rb.left;
      });

    visible.forEach((e) => {
      enqueue(e.target);
      io.unobserve(e.target);
    });
  }, { root: null, rootMargin: ROOT_MARGIN, threshold: 0.01 });

  sorted.slice(revealCount).forEach((img) => io.observe(img));

  // ==========================================================
  // 2) Lightbox (thumb placeholder + preload next/prev)
  // ==========================================================
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 4;

  let zoom = 1;
  let fitWidth = 0;
  let fitHeight = 0;
  let isPointerDown = false;
  let hasDragged = false;
  let currentIndex = -1;
  let startX = 0;
  let startY = 0;
  let startScrollLeft = 0;
  let startScrollTop = 0;
  let swipeStartX = 0;
  let swipeStartY = 0;
  let isSwipeTracking = false;
  let suppressTap = false;
  let fullImageReady = false;

  const fullPreloadPromises = new Map();

  const preloadFull = (index) => {
    if (index < 0 || index >= images.length) return Promise.resolve(false);

    const url = images[index].dataset.full;
    if (!url) return Promise.resolve(false);

    if (fullPreloadPromises.has(url)) return fullPreloadPromises.get(url);

    const p = new Promise((resolve) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => resolve(true);
      im.onerror = () => resolve(false);
      im.src = url;
    });

    fullPreloadPromises.set(url, p);
    return p;
  };

  const preloadNextThenPrev = async () => {
    const next = currentIndex + 1;
    const prev = currentIndex - 1;
    await preloadFull(next);
    await preloadFull(prev);
  };

  const updateNavButtons = () => {
    prevButton.disabled = currentIndex <= 0;
    nextButton.disabled = currentIndex >= images.length - 1;
  };

  const showFullVisible = () => {
    fullImageReady = true;
    requestAnimationFrame(() => {
      lightboxImage.classList.add('is-visible');
      lightboxThumb.style.opacity = "0";
    });
  };

  const applyZoom = (clientX = null, clientY = null) => {
    if (!fitWidth || !fitHeight) return;

    const stageRect = lightboxStage.getBoundingClientRect();
    const previousWidth = parseFloat(lightboxImage.style.width) || fitWidth;
    const previousHeight = parseFloat(lightboxImage.style.height) || fitHeight;

    const focusClientX = clientX ?? (stageRect.left + (lightboxStage.clientWidth / 2));
    const focusClientY = clientY ?? (stageRect.top + (lightboxStage.clientHeight / 2));

    const visibleX = focusClientX - stageRect.left;
    const visibleY = focusClientY - stageRect.top;
    const imageX = lightboxStage.scrollLeft + visibleX;
    const imageY = lightboxStage.scrollTop + visibleY;

    const ratioX = previousWidth ? (imageX / previousWidth) : 0.5;
    const ratioY = previousHeight ? (imageY / previousHeight) : 0.5;

    const targetWidth = Math.max(1, Math.round(fitWidth * zoom));
    const targetHeight = Math.max(1, Math.round(fitHeight * zoom));

    lightboxImage.style.width = `${targetWidth}px`;
    lightboxImage.style.height = `${targetHeight}px`;
    lightboxImage.classList.toggle('is-zoomed', zoom > 1);
    lightboxImage.style.cursor = zoom > 1 ? 'grab' : 'zoom-in';

    requestAnimationFrame(() => {
      if (zoom <= 1) {
        lightboxStage.scrollLeft = 0;
        lightboxStage.scrollTop = 0;
      } else {
        lightboxStage.scrollLeft = Math.max(0, Math.round((targetWidth * ratioX) - visibleX));
        lightboxStage.scrollTop = Math.max(0, Math.round((targetHeight * ratioY) - visibleY));
      }
    });
  };

  const computeFit = () => {
    if (!lightboxImage.naturalWidth || !lightboxImage.naturalHeight) return;

    const canvasStyle = getComputedStyle(lightboxCanvas);
    const paddingX = (parseFloat(canvasStyle.paddingLeft) || 0) + (parseFloat(canvasStyle.paddingRight) || 0);
    const paddingY = (parseFloat(canvasStyle.paddingTop) || 0) + (parseFloat(canvasStyle.paddingBottom) || 0);

    const availableWidth = Math.max(1, lightboxStage.clientWidth - paddingX);
    const availableHeight = Math.max(1, lightboxStage.clientHeight - paddingY);

    const fitScale = Math.min(
      availableWidth / lightboxImage.naturalWidth,
      availableHeight / lightboxImage.naturalHeight,
      1
    );

    fitWidth = Math.max(1, Math.round(lightboxImage.naturalWidth * fitScale));
    fitHeight = Math.max(1, Math.round(lightboxImage.naturalHeight * fitScale));
    zoom = 1;

    lightboxImage.style.width = `${fitWidth}px`;
    lightboxImage.style.height = `${fitHeight}px`;
    lightboxImage.classList.remove('is-zoomed');
    lightboxImage.style.cursor = 'zoom-in';
    lightboxStage.scrollLeft = 0;
    lightboxStage.scrollTop = 0;
  };

  const openByIndex = async (index) => {
    if (index < 0 || index >= images.length) return;

    currentIndex = index;
    updateNavButtons();

    zoom = 1;
    fitWidth = 0;
    fitHeight = 0;
    isPointerDown = false;
    hasDragged = false;
    isSwipeTracking = false;
    suppressTap = false;
    fullImageReady = false;

    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lightboxStage.scrollLeft = 0;
    lightboxStage.scrollTop = 0;

    const thumbSrc = images[currentIndex].dataset.src || images[currentIndex].currentSrc || images[currentIndex].src;
    lightboxThumb.removeAttribute('style');
    lightboxThumb.src = thumbSrc;

    const showThumb = () => {
      if (fullImageReady) return;
      lightboxThumb.style.opacity = "1";
    };

    if (lightboxThumb.complete && lightboxThumb.naturalWidth > 1) {
      showThumb();
    } else {
      lightboxThumb.addEventListener('load', showThumb, { once: true });
    }

    lightboxImage.removeAttribute('src');
    lightboxImage.removeAttribute('style');
    lightboxImage.classList.remove('is-visible', 'is-zoomed', 'is-dragging');

    const fullSrc = images[currentIndex].dataset.full || images[currentIndex].src;

    await preloadFull(currentIndex);

    if (currentIndex !== index) return;

    lightboxImage.src = fullSrc;

    const reveal = () => {
      computeFit();
      showFullVisible();
    };

    if (lightboxImage.complete && lightboxImage.naturalWidth) {
      reveal();
    } else {
      lightboxImage.addEventListener('load', reveal, { once: true });
    }

    preloadNextThenPrev().catch(() => {});
  };

  const showPrevious = () => {
    if (currentIndex <= 0) return;
    openByIndex(currentIndex - 1);
  };

  const showNext = () => {
    if (currentIndex >= images.length - 1) return;
    openByIndex(currentIndex + 1);
  };

  const close = () => {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';

    lightboxThumb.removeAttribute('src');
    lightboxThumb.removeAttribute('style');

    lightboxImage.removeAttribute('src');
    lightboxImage.removeAttribute('style');
    lightboxImage.classList.remove('is-visible', 'is-zoomed', 'is-dragging');

    zoom = 1;
    fitWidth = 0;
    fitHeight = 0;
    isPointerDown = false;
    hasDragged = false;
    isSwipeTracking = false;
    suppressTap = false;
    fullImageReady = false;
  };

  images.forEach((img, index) => {
    img.addEventListener('click', () => openByIndex(index));
  });

  lightboxImage.addEventListener('click', (event) => {
    event.stopPropagation();

    if (suppressTap) { suppressTap = false; return; }
    if (hasDragged) { hasDragged = false; return; }

    zoom = zoom > 1 ? 1 : 2;
    applyZoom(event.clientX, event.clientY);

    if (zoom > 1) {
      preloadNextThenPrev().catch(() => {});
    }
  });

  lightboxStage.addEventListener('wheel', (event) => {
    if (!lightbox.classList.contains('is-open')) return;
    event.preventDefault();

    const nextZoom = clamp(
      zoom + (event.deltaY < 0 ? 0.2 : -0.2),
      MIN_ZOOM,
      MAX_ZOOM
    );

    if (nextZoom === zoom) return;

    zoom = nextZoom;
    applyZoom(event.clientX, event.clientY);

    if (zoom > 1) {
      preloadNextThenPrev().catch(() => {});
    }
  }, { passive: false });

  lightboxImage.addEventListener('pointerdown', (event) => {
    if (zoom <= 1) return;

    isPointerDown = true;
    hasDragged = false;
    startX = event.clientX;
    startY = event.clientY;
    startScrollLeft = lightboxStage.scrollLeft;
    startScrollTop = lightboxStage.scrollTop;
    lightboxImage.classList.add('is-dragging');

    if (typeof lightboxImage.setPointerCapture === 'function') {
      lightboxImage.setPointerCapture(event.pointerId);
    }
  });

  lightboxImage.addEventListener('pointermove', (event) => {
    if (!isPointerDown) return;

    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      hasDragged = true;
    }

    lightboxStage.scrollLeft = startScrollLeft - deltaX;
    lightboxStage.scrollTop = startScrollTop - deltaY;
  });

  const endPointer = (event) => {
    if (!isPointerDown) return;

    isPointerDown = false;
    lightboxImage.classList.remove('is-dragging');

    if (typeof lightboxImage.releasePointerCapture === 'function') {
      try { lightboxImage.releasePointerCapture(event.pointerId); } catch (_) {}
    }
  };

  lightboxImage.addEventListener('pointerup', endPointer);
  lightboxImage.addEventListener('pointercancel', endPointer);
  lightboxImage.addEventListener('pointerleave', endPointer);

  lightboxStage.addEventListener('touchstart', (event) => {
    if (!lightbox.classList.contains('is-open') || zoom > 1 || event.touches.length !== 1) return;
    swipeStartX = event.touches[0].clientX;
    swipeStartY = event.touches[0].clientY;
    isSwipeTracking = true;
  }, { passive: true });

  lightboxStage.addEventListener('touchend', (event) => {
    if (!isSwipeTracking || zoom > 1 || !event.changedTouches.length) {
      isSwipeTracking = false;
      return;
    }

    const deltaX = event.changedTouches[0].clientX - swipeStartX;
    const deltaY = event.changedTouches[0].clientY - swipeStartY;

    isSwipeTracking = false;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
    if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;

    suppressTap = true;
    if (deltaX < 0) showNext(); else showPrevious();
  }, { passive: true });

  prevButton.addEventListener('click', (event) => { event.stopPropagation(); showPrevious(); });
  nextButton.addEventListener('click', (event) => { event.stopPropagation(); showNext(); });
  closeButton.addEventListener('click', close);

  lightbox.addEventListener('click', (event) => {
    if (suppressTap) { suppressTap = false; return; }
    if (event.target === lightbox || event.target === lightboxStage || event.target === lightboxCanvas) close();
  });

  document.addEventListener('keydown', (event) => {
    if (!lightbox.classList.contains('is-open')) return;

    if (event.key === 'Escape') { close(); return; }

    if (event.key === 'ArrowLeft') { event.preventDefault(); showPrevious(); return; }
    if (event.key === 'ArrowRight') { event.preventDefault(); showNext(); return; }

    if (event.key === '+' || event.key === '=') {
      zoom = clamp(zoom + 0.2, MIN_ZOOM, MAX_ZOOM);
      applyZoom();
      if (zoom > 1) preloadNextThenPrev().catch(() => {});
    }

    if (event.key === '-') {
      zoom = clamp(zoom - 0.2, MIN_ZOOM, MAX_ZOOM);
      applyZoom();
      if (zoom > 1) preloadNextThenPrev().catch(() => {});
    }
  });

  window.addEventListener('resize', () => {
    if (lightbox.classList.contains('is-open') && lightboxImage.getAttribute('src')) {
      computeFit();
      applyZoom();
    }
  });
})();
