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

  // Track double-tap and touch dragging on mobile
  let lastTapAptId = null;
  let lastTapTimestamp = 0;
  let touchMoved = false;
  let touchStartCoords = { x: 0, y: 0 };

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
        tooltip.addEventListener('click', (e) => {
          e.stopPropagation();
          openGallery(apt);
        });
        tooltip.addEventListener('touchend', (e) => {
          e.stopPropagation();
          e.preventDefault();
          openGallery(apt);
        });
        win.appendChild(tooltip);
      }

      // Desktop Double-Click
      win.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        openGallery(apt);
      });

      // Mobile Touch Handling: Single-tap lights up apartment; Double-tap opens gallery
      win.addEventListener('touchend', (e) => {
        if (touchMoved) return; // User was dragging across building, ignore tap
        const now = Date.now();
        const timeDiff = now - lastTapTimestamp;

        if (lastTapAptId === apt.id && timeDiff < 450 && timeDiff > 40) {
          // Confirmed double-tap!
          e.preventDefault();
          e.stopPropagation();
          openGallery(apt);
          lastTapAptId = null;
          lastTapTimestamp = 0;
        } else {
          // Single tap: light up this apartment and show tooltip preview
          lastTapAptId = apt.id;
          lastTapTimestamp = now;
          setApartmentLighting(apt.id, true);
          // Show tooltip temporarily on mobile
          const tip = win.querySelector('.window-tooltip');
          if (tip) {
            tip.style.opacity = '1';
            tip.style.transform = 'translateX(-50%) translateY(0)';
            setTimeout(() => {
              if (!allLightsOn && modal.getAttribute('aria-hidden') === 'true') {
                tip.style.opacity = '';
                tip.style.transform = '';
                setApartmentLighting(apt.id, false);
              }
            }, 2500);
          }
        }
      });

      // Desktop Hover
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

  // 2. Real-Time Proximity Lighting: Handles both Mouse and Mobile Touch Dragging
  function handlePointerLighting(clientX, clientY) {
    if (allLightsOn) return;
    const rect = buildingWrapper.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;

    windowElements.forEach(item => {
      const winCenterX = item.def.left + (item.def.width / 2);
      const winCenterY = item.def.top + (item.def.height / 2);
      const distance = Math.hypot(x - winCenterX, y - winCenterY);

      if (distance < 18) {
        const intensity = Math.min(1, Math.max(0.2, 1 - (distance / 18)));
        item.el.style.opacity = intensity.toFixed(2);
        item.el.classList.add('lit');
      } else {
        item.el.style.opacity = '0';
        item.el.classList.remove('lit');
      }
    });
  }

  function resetLighting() {
    if (!allLightsOn) {
      windowElements.forEach(item => {
        item.el.style.opacity = '0';
        item.el.classList.remove('lit');
      });
    }
  }

  // Desktop mouse move
  buildingWrapper.addEventListener('mousemove', (e) => {
    handlePointerLighting(e.clientX, e.clientY);
  });
  buildingWrapper.addEventListener('mouseleave', resetLighting);

  // Mobile touch drag (sliding finger across facade)
  buildingWrapper.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      touchMoved = false;
      touchStartCoords = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }, { passive: true });

  buildingWrapper.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const dx = Math.abs(e.touches[0].clientX - touchStartCoords.x);
      const dy = Math.abs(e.touches[0].clientY - touchStartCoords.y);
      if (dx > 8 || dy > 8) {
        touchMoved = true;
      }
      handlePointerLighting(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, { passive: true });

  buildingWrapper.addEventListener('touchend', () => {
    if (touchMoved && !allLightsOn) {
      setTimeout(resetLighting, 150);
    }
  });

  buildingWrapper.addEventListener('touchcancel', () => {
    if (!allLightsOn) resetLighting();
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

  // 4. Mobile Swipe Navigation in Gallery (Touch Swipe Left/Right)
  const imageContainer = modal.querySelector('.main-image-container');
  let touchStartX = 0;
  let touchStartY = 0;
  let touchEndX = 0;
  let touchEndY = 0;

  imageContainer.addEventListener('touchstart', (e) => {
    if (e.changedTouches.length > 0) {
      touchStartX = e.changedTouches[0].clientX;
      touchStartY = e.changedTouches[0].clientY;
    }
  }, { passive: true });

  imageContainer.addEventListener('touchend', (e) => {
    if (e.changedTouches.length > 0) {
      touchEndX = e.changedTouches[0].clientX;
      touchEndY = e.changedTouches[0].clientY;
      handleSwipe();
    }
  }, { passive: true });

  function handleSwipe() {
    const swipeDistanceX = touchEndX - touchStartX;
    const swipeDistanceY = touchEndY - touchStartY;
    if (Math.abs(swipeDistanceX) > 35 && Math.abs(swipeDistanceX) > Math.abs(swipeDistanceY)) {
      if (swipeDistanceX < 0) {
        // Swiped Left -> Next Photo
        showPhoto(currentPhotoIdx + 1);
      } else {
        // Swiped Right -> Previous Photo
        showPhoto(currentPhotoIdx - 1);
      }
    }
  }

  // Keyboard navigation
  window.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') closeGallery();
    if (e.key === 'ArrowLeft') showPhoto(currentPhotoIdx - 1);
    if (e.key === 'ArrowRight') showPhoto(currentPhotoIdx + 1);
  });

  // 5. Header Controls (Night, Twilight, All Lights)
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
