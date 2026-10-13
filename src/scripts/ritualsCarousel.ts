/**
 * Pure Astro + Vanilla JS Infinite Coverflow Carousel for Sacred Rituals Section
 * Features:
 * - Royal Arch Frame with smooth 5-card coverflow perspective
 * - Seamless infinite looping with 3 clones at each end
 * - Active card centered at scale(1), inactive cards at scale(0.85) & opacity(0.65)
 * - Desktop pointer drag & mobile touch swipe with flick momentum
 * - Bottom Unified Control Bar: Prev / Dots / AUTO / Next
 * - Zero lag and auto-re-centering when unlocked or resized
 */

export function initRitualsCarousel(): () => void {
  const container = document.querySelector<HTMLElement>('[data-carousel="rituals"]');
  if (!container) return () => {};

  const viewport = container.querySelector<HTMLElement>('.rituals-track-container');
  const track = container.querySelector<HTMLElement>('.rituals-track');
  const liveRegion = document.getElementById('rituals-live-region');
  const controlBar = container.querySelector<HTMLElement>('.rituals-control-bar');
  const autoplayBtn = container.querySelector<HTMLButtonElement>('#ritual-ctrl-autoplay');
  const counterCurr = container.querySelector<HTMLElement>('#ritual-counter-curr');

  if (!viewport || !track) return () => {};

  // Prevent multiple initializations on same element
  if (track.getAttribute('data-initialized') === 'true') {
    return () => {};
  }
  track.setAttribute('data-initialized', 'true');

  const originalCards = Array.from(track.children) as HTMLElement[];
  const N = originalCards.length;
  if (N === 0) return () => {};

  // 3 clones at each end guarantee smooth infinite coverflow on all screen sizes
  const CLONES_COUNT = 3;

  // 1. Clone cards for seamless infinite loop
  for (let i = 0; i < CLONES_COUNT; i++) {
    const clone = originalCards[i % N].cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('data-clone', 'true');
    clone.querySelectorAll('img').forEach((img) => {
      img.loading = 'eager';
      img.draggable = false;
    });
    track.appendChild(clone);
  }

  for (let i = 0; i < CLONES_COUNT; i++) {
    const realIndex = (N - 1 - i + N) % N;
    const clone = originalCards[realIndex].cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('data-clone', 'true');
    clone.querySelectorAll('img').forEach((img) => {
      img.loading = 'eager';
      img.draggable = false;
    });
    track.insertBefore(clone, track.firstChild);
  }

  // Ensure all images are non-draggable
  track.querySelectorAll('img').forEach((img) => {
    img.draggable = false;
  });

  const allCards = Array.from(track.children) as HTMLElement[];
  const dots = Array.from(container.querySelectorAll<HTMLElement>('.ritual-dot'));

  // Initial active card: "Mangal Milan" (index 2 in original array)
  let currentIndex = CLONES_COUNT + 2;
  let currentTranslateX = 0;
  let isAnimating = false;

  // Autoplay State
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let isPlaying = !isReducedMotion;
  let isManuallyPaused = isReducedMotion;
  let autoplayTimer: number | null = null;
  let resumeTimer: number | null = null;
  let isContainerVisible = false;
  const AUTOPLAY_DELAY = 3500;

  // Dynamic Translate Calculation to center card at `index`
  const getTranslateForIndex = (index: number): number => {
    const card = allCards[index];
    if (!card) return 0;
    const viewportCenter = viewport.offsetWidth / 2;
    if (viewportCenter === 0) return 0;
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    return viewportCenter - cardCenter;
  };

  // Update active state classes and secondary indicators
  const updateActiveStates = (targetIndex: number) => {
    allCards.forEach((c, idx) => {
      if (idx === targetIndex) {
        c.classList.add('is-active');
        c.setAttribute('aria-current', 'true');
      } else {
        c.classList.remove('is-active');
        c.removeAttribute('aria-current');
        if (c.classList.contains('is-expanded')) {
          c.classList.remove('is-expanded');
          const btn = c.querySelector<HTMLElement>('.ritual-read-more-btn');
          if (btn) {
            btn.setAttribute('aria-expanded', 'false');
            const textSpan = btn.querySelector('.ritual-btn-text');
            if (textSpan) textSpan.textContent = 'Read more';
          }
        }
      }
    });

    const realIndex = (targetIndex - CLONES_COUNT + N) % N;

    // Update Dots
    dots.forEach((dot, dIdx) => {
      const isCur = dIdx === realIndex;
      dot.classList.toggle('is-active', isCur);
      dot.setAttribute('aria-selected', isCur ? 'true' : 'false');
      dot.style.transform = isCur ? 'scaleX(2.8)' : 'scaleX(1)';
      dot.style.backgroundColor = isCur ? '#D4AF37' : 'rgba(212, 175, 55, 0.32)';
    });

    // Update Mobile Counter Chip ("03 / 11")
    if (counterCurr) {
      counterCurr.textContent = String(realIndex + 1).padStart(2, '0');
    }

    // Live Region
    if (liveRegion) {
      const activeCard = allCards[targetIndex];
      const title = activeCard?.getAttribute('data-ritual-title') || '';
      liveRegion.textContent = `Slide ${realIndex + 1} of ${N}: ${title}`;
    }
  };

  // Silently jump positions if landed in clone boundaries
  const checkInfiniteBounds = () => {
    if (currentIndex < CLONES_COUNT) {
      currentIndex += N;
      track.style.transition = 'none';
      currentTranslateX = getTranslateForIndex(currentIndex);
      track.style.transform = `translate3d(${currentTranslateX}px, 0, 0)`;
      updateActiveStates(currentIndex);
    } else if (currentIndex >= CLONES_COUNT + N) {
      currentIndex -= N;
      track.style.transition = 'none';
      currentTranslateX = getTranslateForIndex(currentIndex);
      track.style.transform = `translate3d(${currentTranslateX}px, 0, 0)`;
      updateActiveStates(currentIndex);
    }
  };

  // Go to slide
  const goToSlide = (targetIndex: number, animate = true) => {
    currentIndex = targetIndex;
    updateActiveStates(currentIndex);

    const translate = getTranslateForIndex(currentIndex);
    if (translate !== 0) {
      currentTranslateX = translate;
    }

    if (animate && !isReducedMotion) {
      isAnimating = true;
      track.style.transition = 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)';
      track.style.transform = `translate3d(${currentTranslateX}px, 0, 0)`;

      const onTransitionEnd = (e: TransitionEvent) => {
        if (e.target !== track) return;
        track.removeEventListener('transitionend', onTransitionEnd);
        isAnimating = false;
        checkInfiniteBounds();
      };
      track.addEventListener('transitionend', onTransitionEnd, { once: true });

      window.setTimeout(() => {
        if (isAnimating) {
          isAnimating = false;
          checkInfiniteBounds();
        }
      }, 500);
    } else {
      track.style.transition = 'none';
      track.style.transform = `translate3d(${currentTranslateX}px, 0, 0)`;
      checkInfiniteBounds();
    }
  };

  // Initial positioning
  goToSlide(currentIndex, false);

  // ── AUTOPLAY ENGINE ──
  const updateAutoplayUI = () => {
    if (!autoplayBtn) return;
    const pauseIcon = autoplayBtn.querySelector<HTMLElement>('.ritual-icon-pause');
    const playIcon = autoplayBtn.querySelector<HTMLElement>('.ritual-icon-play');
    const label = autoplayBtn.querySelector<HTMLElement>('.ritual-pill-label');

    if (isPlaying) {
      autoplayBtn.setAttribute('aria-label', 'Pause autoplay');
      autoplayBtn.setAttribute('aria-pressed', 'true');
      pauseIcon?.classList.remove('hidden');
      playIcon?.classList.add('hidden');
      if (label) label.textContent = 'AUTO';
    } else {
      autoplayBtn.setAttribute('aria-label', 'Play autoplay');
      autoplayBtn.setAttribute('aria-pressed', 'false');
      pauseIcon?.classList.add('hidden');
      playIcon?.classList.remove('hidden');
      if (label) label.textContent = 'PLAY';
    }
  };

  const stopAutoplay = () => {
    if (autoplayTimer) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
    if (resumeTimer) {
      window.clearTimeout(resumeTimer);
      resumeTimer = null;
    }
  };

  const startAutoplay = () => {
    stopAutoplay();
    if (!isPlaying || isManuallyPaused || isReducedMotion || !isContainerVisible || document.hidden) {
      return;
    }
    autoplayTimer = window.setInterval(() => {
      if (isPointerDown || isAnimating) return;
      goToSlide(currentIndex + 1, true);
    }, AUTOPLAY_DELAY);
  };

  const scheduleAutoplayResume = (delay = 2000) => {
    if (!isPlaying || isManuallyPaused || isReducedMotion || !isContainerVisible || document.hidden) {
      return;
    }
    if (resumeTimer) window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      startAutoplay();
    }, delay);
  };

  const resetAutoplayTimer = () => {
    if (!isPlaying || isManuallyPaused || isReducedMotion) return;
    stopAutoplay();
    scheduleAutoplayResume(AUTOPLAY_DELAY);
  };

  const toggleAutoplay = () => {
    if (isPlaying) {
      isPlaying = false;
      isManuallyPaused = true;
      stopAutoplay();
    } else {
      isPlaying = true;
      isManuallyPaused = false;
      if (isContainerVisible && !document.hidden && !isPointerDown) {
        startAutoplay();
      }
    }
    updateAutoplayUI();
  };

  updateAutoplayUI();

  // Viewport Intersection Observer (Auto-center when section is scrolled into view or unlocked)
  const viewportObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isContainerVisible = entry.isIntersecting;
      if (isContainerVisible) {
        goToSlide(currentIndex, false);
        if (!document.hidden && !isManuallyPaused && isPlaying) {
          startAutoplay();
        }
      } else {
        stopAutoplay();
      }
    });
  }, { threshold: 0.05 });
  viewportObserver.observe(container);

  // Tab visibility change
  const handleVisibility = () => {
    if (document.hidden) {
      stopAutoplay();
    } else if (isContainerVisible && !isPointerDown && !isManuallyPaused && isPlaying) {
      scheduleAutoplayResume(1000);
    }
  };
  document.addEventListener('visibilitychange', handleVisibility, { passive: true });

  // Hover temporary pause
  const handleMouseEnter = () => {
    if (!isManuallyPaused && isPlaying) {
      stopAutoplay();
    }
  };
  const handleMouseLeave = () => {
    if (!isManuallyPaused && isPlaying) {
      scheduleAutoplayResume(2000);
    }
  };
  container.addEventListener('mouseenter', handleMouseEnter, { passive: true });
  container.addEventListener('mouseleave', handleMouseLeave, { passive: true });

  // ── CONTROL BAR CLICKS ──
  const handleControlBarClick = (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (!btn) return;

    if (btn.id === 'ritual-ctrl-prev') {
      e.preventDefault();
      goToSlide(currentIndex - 1, true);
      resetAutoplayTimer();
    } else if (btn.id === 'ritual-ctrl-next') {
      e.preventDefault();
      goToSlide(currentIndex + 1, true);
      resetAutoplayTimer();
    } else if (btn.id === 'ritual-ctrl-autoplay') {
      e.preventDefault();
      toggleAutoplay();
    } else if (btn.classList.contains('ritual-dot')) {
      e.preventDefault();
      const dotIndex = parseInt(btn.getAttribute('data-dot-index') || '0', 10);
      goToSlide(CLONES_COUNT + dotIndex, true);
      resetAutoplayTimer();
    }
  };
  controlBar?.addEventListener('click', handleControlBarClick);

  // ── POINTER EVENTS (DESKTOP DRAG + MOBILE SWIPE) ──
  let isPointerDown = false;
  let startX = 0;
  let dragStartX = 0;
  let dragStartTime = 0;
  let hasDragged = false;
  let activePointerId: number | null = null;
  let dragRafId: number | null = null;

  const handlePointerDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('.ritual-read-more-btn') ||
      target.closest('.ritual-ctrl-btn') ||
      target.closest('.ritual-ctrl-pill') ||
      target.closest('.rituals-control-bar') ||
      target.closest('.ritual-dot')
    ) {
      return;
    }

    isPointerDown = true;
    hasDragged = false;
    startX = e.clientX;
    dragStartX = currentTranslateX;
    dragStartTime = performance.now();
    activePointerId = e.pointerId;

    try {
      track.setPointerCapture(e.pointerId);
    } catch {}

    track.style.transition = 'none';
    viewport.classList.add('is-dragging');

    if (!isManuallyPaused && isPlaying) {
      stopAutoplay();
    }
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isPointerDown || e.pointerId !== activePointerId) return;
    const deltaX = e.clientX - startX;

    if (Math.abs(deltaX) > 5) {
      hasDragged = true;
    }

    currentTranslateX = dragStartX + deltaX;

    if (!dragRafId) {
      dragRafId = requestAnimationFrame(() => {
        dragRafId = null;
        track.style.transform = `translate3d(${currentTranslateX}px, 0, 0)`;
      });
    }
  };

  const handlePointerEnd = (e: PointerEvent) => {
    if (!isPointerDown || e.pointerId !== activePointerId) return;
    isPointerDown = false;
    viewport.classList.remove('is-dragging');

    if (dragRafId) {
      cancelAnimationFrame(dragRafId);
      dragRafId = null;
    }

    try {
      track.releasePointerCapture(e.pointerId);
    } catch {}
    activePointerId = null;

    const deltaX = e.clientX - startX;
    const elapsed = Math.max(performance.now() - dragStartTime, 1);
    const velocity = deltaX / elapsed; // px per ms

    // Find nearest card center relative to current translateX
    const viewportCenter = viewport.offsetWidth / 2;
    let closestIndex = currentIndex;
    let minDistance = Infinity;

    allCards.forEach((card, idx) => {
      const cardCenterInViewport = card.offsetLeft + card.offsetWidth / 2 + currentTranslateX;
      const dist = Math.abs(viewportCenter - cardCenterInViewport);
      if (dist < minDistance) {
        minDistance = dist;
        closestIndex = idx;
      }
    });

    if (Math.abs(velocity) > 0.35 || Math.abs(deltaX) > 60) {
      if (deltaX < 0) {
        goToSlide(currentIndex + 1, true);
      } else {
        goToSlide(currentIndex - 1, true);
      }
    } else {
      goToSlide(closestIndex, true);
    }

    if (!isManuallyPaused && isPlaying) {
      scheduleAutoplayResume(2000);
    }
  };

  track.addEventListener('pointerdown', handlePointerDown);
  track.addEventListener('pointermove', handlePointerMove, { passive: true });
  track.addEventListener('pointerup', handlePointerEnd);
  track.addEventListener('pointercancel', handlePointerEnd);

  // ── CARD CLICK HANDLER ──
  allCards.forEach((card, idx) => {
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.ritual-read-more-btn') || target.closest('.rituals-control-bar')) return;

      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (idx !== currentIndex) {
        goToSlide(idx, true);
        resetAutoplayTimer();
      }
    });
  });

  // ── TRACKPAD HORIZONTAL WHEEL SUPPORT ──
  let wheelTimeout: number | null = null;
  const handleWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 25) {
      if (wheelTimeout) return;
      if (e.deltaX > 0) {
        goToSlide(currentIndex + 1, true);
      } else {
        goToSlide(currentIndex - 1, true);
      }
      resetAutoplayTimer();
      wheelTimeout = window.setTimeout(() => {
        wheelTimeout = null;
      }, 350);
    }
  };
  viewport.addEventListener('wheel', handleWheel, { passive: true });

  // ── KEYBOARD NAVIGATION ──
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goToSlide(currentIndex - 1, true);
      resetAutoplayTimer();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goToSlide(currentIndex + 1, true);
      resetAutoplayTimer();
    }
  };
  container.addEventListener('keydown', handleKeyDown);

  // ── MOBILE READ MORE TOGGLE ──
  const updateReadMoreButtons = () => {
    const isMobile = window.innerWidth <= 768;
    allCards.forEach((card) => {
      const desc = card.querySelector<HTMLElement>('.ritual-desc');
      const btn = card.querySelector<HTMLElement>('.ritual-read-more-btn');
      if (!desc || !btn) return;

      if (!isMobile) {
        btn.style.display = 'none';
        card.classList.remove('is-expanded');
        btn.setAttribute('aria-expanded', 'false');
        return;
      }

      if (card.classList.contains('is-expanded')) {
        btn.style.display = 'inline-flex';
        return;
      }

      const isClamped = desc.scrollHeight > desc.clientHeight + 2;
      btn.style.display = isClamped ? 'inline-flex' : 'none';
    });
  };

  allCards.forEach((card) => {
    const btn = card.querySelector<HTMLElement>('.ritual-read-more-btn');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isExpanded = card.classList.toggle('is-expanded');
      btn.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
      const textSpan = btn.querySelector('.ritual-btn-text');
      if (textSpan) {
        textSpan.textContent = isExpanded ? 'Show less' : 'Read more';
      }
    });
  });

  updateReadMoreButtons();
  if (document.readyState === 'complete') {
    updateReadMoreButtons();
  }
  window.addEventListener('load', updateReadMoreButtons, { once: true });

  // ── RESIZE & UNLOCK HANDLERS ──
  let resizeTimer: number | null = null;
  const handleResize = () => {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      goToSlide(currentIndex, false);
      updateReadMoreButtons();
    }, 80);
  };
  window.addEventListener('resize', handleResize, { passive: true });

  // Cleanup handler
  return () => {
    stopAutoplay();
    viewportObserver.disconnect();
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('visibilitychange', handleVisibility);
    if (resizeTimer) window.clearTimeout(resizeTimer);
    if (wheelTimeout) window.clearTimeout(wheelTimeout);
    if (dragRafId) cancelAnimationFrame(dragRafId);
    container.removeEventListener('mouseenter', handleMouseEnter);
    container.removeEventListener('mouseleave', handleMouseLeave);
    controlBar?.removeEventListener('click', handleControlBarClick);
    track.removeEventListener('pointerdown', handlePointerDown);
    track.removeEventListener('pointermove', handlePointerMove);
    track.removeEventListener('pointerup', handlePointerEnd);
    track.removeEventListener('pointercancel', handlePointerEnd);
    viewport.removeEventListener('wheel', handleWheel);
    container.removeEventListener('keydown', handleKeyDown);
  };
}
