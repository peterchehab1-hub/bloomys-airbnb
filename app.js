document.addEventListener('DOMContentLoaded', () => {
  const windowsLayer = document.getElementById('windows-layer');
  const buildingWrapper = document.getElementById('building-wrapper');
  const modal = document.getElementById('gallery-modal');
  const modalClose = document.getElementById('modal-close');
  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');
  const modalFloor = document.getElementById('modal-floor');
  const modalLink = document.getElementById('modal-airbnb-link');
  const photoCounter = document.getElementById('photo-counter');
  const thumbnailStrip = document.getElementById('thumbnail-strip');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const btnNight = document.getElementById('btn-night');
  const btnTwilight = document.getElementById('btn-twilight');
  const btnAllLights = document.getElementById('btn-all-lights');

  let currentApt = null;
  let currentPhotoIdx = 0;
  let allLightsOn = false;
  let lastTapTime = 0;

  // 1. Render Windows onto Facade
  const windowElements = [];
  APARTMENTS.forEach((apt) => {
    apt.windows.forEach((winDef, idx) => {
      const win = document.createElement('div');
      win.className = `building-window ${winDef.type || ''}`;
      win.style.left = `${winDef.left}%`;
      win.style.top = `${winDef.top}%`;
      win.style.width = `${winDef.width}%`;
      win.style.height = `${winDef.height}%`;
      win.dataset.aptId = apt.id;
      win.dataset.floor = apt.floor;

      // Tooltip for first window of each apartment
      if (idx === 0) {
        const tooltip = document.createElement('div');
        tooltip.className = 'window-tooltip';
        tooltip.innerHTML = `<strong>Floor ${apt.floor}</strong> &bull; ${apt.name}`;
        win.appendChild(tooltip);
      }

      // Double-click to open gallery
      win.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openGallery(apt);
      });

      // Mobile double-tap support
      win.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (now - lastTapTime < 350) {
          e.preventDefault();
          openGallery(apt);
        }
        lastTapTime = now;
      });

      // Hover highlights all windows of this apartment
      win.addEventListener('mouseenter', () => {
        setApartmentLighting(apt.id, true);
      });
      win.addEventListener('mouseleave', () => {
        if (!allLightsOn) setApartmentLighting(apt.id, false);
      });

      windowsLayer.appendChild(win);
      windowElements.push({ el: win, def: winDef, aptId: apt.id });
    });
  });

  function setApartmentLighting(aptId, lit) {
    windowElements.forEach(item => {
      if (item.aptId === aptId) {
        if (lit) {
          item.el.classList.add('lit');
          item.el.style.opacity = '1';
        } else if (!allLightsOn) {
          item.el.classList.remove('lit');
          item.el.style.opacity = '0';
        }
      }
    });
  }

  // 2. Real-Time Responsive Cursor Lighting: Lights up smoothly as cursor moves, turns off promptly as it moves away
  buildingWrapper.addEventListener('mousemove', (e) => {
    if (allLightsOn) return;
    const rect = buildingWrapper.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * 100;
    const mouseY = ((e.clientY - rect.top) / rect.height) * 100;

    windowElements.forEach(item => {
      const winCenterX = item.def.left + (item.def.width / 2);
      const winCenterY = item.def.top + (item.def.height / 2);
      const distance = Math.hypot(mouseX - winCenterX, mouseY - winCenterY);
      
      // Proximity threshold: light up smoothly when near cursor
      if (distance < 18) {
        const intensity = Math.min(1, Math.max(0.2, 1 - (distance / 18)));
        item.el.style.opacity = intensity.toFixed(2);
        item.el.classList.add('lit');
      } else {
        item.el.style.opacity = '0';
        item.el.classList.remove('lit');
      }
    });
  });

  buildingWrapper.addEventListener('mouseleave', () => {
    if (!allLightsOn) {
      windowElements.forEach(item => {
        item.el.style.opacity = '0';
        item.el.classList.remove('lit');
      });
    }
  });

  // 3. Lightbox Gallery Logic
  function openGallery(apt) {
    currentApt = apt;
    currentPhotoIdx = 0;
    modalTitle.textContent = apt.name;
    modalFloor.textContent = `Floor ${apt.floor}`;
    modalLink.href = apt.url;

    // Render thumbnails
    thumbnailStrip.innerHTML = '';
    apt.photos.forEach((photoUrl, idx) => {
      const thumb = document.createElement('img');
      thumb.src = photoUrl;
      thumb.alt = `${apt.name} photo ${idx + 1}`;
      if (idx === 0) thumb.classList.add('active');
      thumb.addEventListener('click', () => showPhoto(idx));
      thumbnailStrip.appendChild(thumb);
    });

    showPhoto(0);
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeGallery() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function showPhoto(idx) {
    if (!currentApt || !currentApt.photos.length) return;
    currentPhotoIdx = (idx + currentApt.photos.length) % currentApt.photos.length;
    modalImg.src = currentApt.photos[currentPhotoIdx];
    photoCounter.textContent = `${currentPhotoIdx + 1} / ${currentApt.photos.length}`;

    // Update active thumbnail
    const thumbs = thumbnailStrip.querySelectorAll('img');
    thumbs.forEach((t, i) => t.classList.toggle('active', i === currentPhotoIdx));
  }

  modalClose.addEventListener('click', closeGallery);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeGallery();
  });

  prevBtn.addEventListener('click', () => showPhoto(currentPhotoIdx - 1));
  nextBtn.addEventListener('click', () => showPhoto(currentPhotoIdx + 1));

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') closeGallery();
    if (e.key === 'ArrowLeft') showPhoto(currentPhotoIdx - 1);
    if (e.key === 'ArrowRight') showPhoto(currentPhotoIdx + 1);
  });

  // 4. Header Controls (Night, Twilight, All Lights)
  btnNight.addEventListener('click', () => {
    document.body.className = 'night-mode';
    btnNight.classList.add('active');
    btnTwilight.classList.remove('active');
  });

  btnTwilight.addEventListener('click', () => {
    document.body.className = 'twilight-mode';
    btnTwilight.classList.add('active');
    btnNight.classList.remove('active');
  });

  btnAllLights.addEventListener('click', () => {
    allLightsOn = !allLightsOn;
    windowElements.forEach(item => {
      item.el.classList.toggle('lit', allLightsOn);
      item.el.style.opacity = allLightsOn ? '1' : '0';
    });
    btnAllLights.classList.toggle('active', allLightsOn);
    btnAllLights.textContent = allLightsOn ? '💡 Lights: ALL ON' : '💡 All Lights';
  });
});
