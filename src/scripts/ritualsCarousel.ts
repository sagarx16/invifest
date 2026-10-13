/**
 * Pure Astro + Vanilla JS Infinite Coverflow Carousel for Sacred Rituals Section
 * Features:
 * - DOM cloning for seamless infinite loop (clones marked aria-hidden="true" & data-clone="true")
 * - Center card active scale(1) & opacity(1); side cards scale(0.85) & opacity(0.65)
 * - Pointer events drag & momentum swipe on desktop & mobile with grab/grabbing cursor
 * - Trackpad horizontal scroll & keyboard arrow navigation
 * - Autoplay (4s delay) with hover/drag pause and 2s resume
 * - Respects prefers-reduced-motion
 * - Mobile 3-line clamp description with Read more / Show less toggle
 * - Prev/Next gold navigation arrow buttons
 */

export function initRitualsCarousel(): () => void {
  const container = document.querySelector<HTMLElement>('[data-carousel="rituals"]');
  if (!container) return () => {};

  const viewport = container.querySelector<HTMLElement>('.rituals-track-container');
  const track = container.querySelector<HTMLElement>('.rituals-track');
  const liveRegion = document.getElementById('rituals-live-region');
  const prevBtn = container.querySelector<HTMLButtonElement>('.ritual-nav-prev');
  const nextBtn = container.querySelector<HTMLButtonElement>('.ritual-nav-next');

  if (!viewport || !track) return () => {};

  // Prevent multiple initializations on same element
  if (track.getAttribute('data-initialized') === 'true') {
    return () => {};
  }
  track.setAttribute('data-initialized', 'true');

  const originalCards = Array.from(track.children) as HTMLElement[];
  const N = originalCards.length;
  if (N === 0) return () => {};

  const CLONES_COUNT = 3; // 3 clones at each end are plenty for 5-card visible layout

  // 1. Clone cards for seamless infinite loop
  const headClones: HTMLElement[] = [];
  const tailClones: HTMLElement[] = [];

  // Tail clones (first CLONES_COUNT cards appended to end)
  for (let i = 0; i < CLONES_COUNT; i++) {
    const clone = originalCards[i % N].cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('data-clone', 'true');
    clone.querySelectorAll('img').forEach((img) => {
      img.loading = 'eager';
      img.draggable = false;
    });
    tailClones.push(clone);
    track.appendChild(clone);
  }

  // Head clones (last CLONES_COUNT cards prepended to start in reverse order)
  for (let i = 0; i < CLONES_COUNT; i++) {
    const realIndex = (N - 1 - i + N) % N;
    const clone = originalCards[realIndex].cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute('data-clone', 'true');
    clone.querySelectorAll('img').forEach((img) => {
      img.loading = 'eager';
      img.draggable = false;
    });
    headClones.unshift(clone);
    track.insertBefore(clone, track.firstChild);
  }

  // Ensure all images are non-draggable
  track.querySelectorAll('img').forEach((img) => {
    img.draggable = false;
  });

  const allCards = Array.from(track.children) as HTMLElement[];
  const totalCount = allCards.length;

  // Initial active card: "Mangal Milan" (index 2 in original array)
  let currentIndex = CLONES_COUNT + 2;
  let currentTranslateX = 0;
  let isAnimating = false;

  // Autoplay timer
  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let autoplayTimer: number | null = null;
  let resumeTimer: number | null = null;

  // Read timing settings dynamically from CSS variables (with fallback defaults)
  const readTimingFromCSS = () => {
    const computed = window.getComputedStyle(container);
    const durationRaw = computed.getPropertyValue('--slide-duration').trim() || '0.4s';
    let durationMs = 400;
    if (durationRaw.endsWith('ms')) {
      durationMs = parseFloat(durationRaw);
    } else if (durationRaw.endsWith('s')) {
      durationMs = parseFloat(durationRaw) * 1000;
    }
    const easing = computed.getPropertyValue('--slide-easing').trim() || 'cubic-bezier(0.22, 1, 0.36, 1)';
    const delayRaw = computed.getPropertyValue('--autoplay-delay').trim() || '3000';
    let delayMs = 3000;
    if (delayRaw.endsWith('ms')) {
      delayMs = parseFloat(delayRaw);
    } else if (delayRaw.endsWith('s')) {
      delayMs = parseFloat(delayRaw) * 1000;
    } else if (!isNaN(parseFloat(delayRaw))) {
      delayMs = parseFloat(delayRaw);
    }

    return {
      durationStr: durationRaw || '0.4s',
      durationMs: isNaN(durationMs) ? 400 : durationMs,
      easing: easing,
      autoplayDelayMs: isNaN(delayMs) ? 3000 : delayMs,
    };
  };

  const timing = readTimingFromCSS();

  // Pointer drag state
  let isPointerDown = false;
  let startX = 0;
  let dragStartX = 0;
  let dragStartTime = 0;
  let hasDragged = false;
  let activePointerId: number | null = null;

  // Helper: calculate translateX needed to center card at `index`
  const getTranslateForIndex = (index: number): number => {
    const card = allCards[index];
    if (!card) return 0;
    const viewportCenter = viewport.offsetWidth / 2;
    const cardCenter = card.offsetLeft + card.offsetWidth / 2;
    return viewportCenter - cardCenter;
  };

  // Helper: update active state classes
  const updateActiveStates = (idx: number) => {
    allCards.forEach((c, i) => {
      if (i === idx) {
        c.classList.add('is-active');
        c.setAttribute('aria-current', 'true');
      } else {
        c.classList.remove('is-active');
        c.removeAttribute('aria-current');
        // Reset mobile read-more expansion on inactive cards
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

    if (liveRegion) {
      const activeCard = allCards[idx];
      const realIndex = (idx - CLONES_COUNT + N) % N;
      const title = activeCard?.getAttribute('data-ritual-title') || '';
      liveRegion.textContent = `Slide ${realIndex + 1} of ${N}: ${title}`;
    }
  };

  // Helper: jump position silently if in clone zone
  const checkInfiniteBounds = () => {
    if (currentIndex < CLONES_COUNT) {
      // Landed on a head clone -> jump to real card at end
      currentIndex += N;
      track.style.transition = 'none';
      currentTranslateX = getTranslateForIndex(currentIndex);
      track.style.transform = `translate3d(${currentTranslateX}px, 0, 0)`;
      updateActiveStates(currentIndex);
    } else if (currentIndex >= CLONES_COUNT + N) {
      // Landed on a tail clone -> jump to real card at beginning
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

    currentTranslateX = getTranslateForIndex(currentIndex);

    if (animate && !isReducedMotion) {
      isAnimating = true;
      track.style.transition = `transform ${timing.durationStr} ${timing.easing}`;
      track.style.transform = `translate3d(${currentTranslateX}px, 0, 0)`;

      const onTransitionEnd = (e: TransitionEvent) => {
        if (e.target !== track) return;
        track.removeEventListener('transitionend', onTransitionEnd);
        isAnimating = false;
        checkInfiniteBounds();
      };
      track.addEventListener('transitionend', onTransitionEnd);

      // Safety fallback in case transitionend does not fire
      window.setTimeout(() => {
        if (isAnimating) {
          isAnimating = false;
          checkInfiniteBounds();
        }
      }, timing.durationMs + 60);
    } else {
      track.style.transition = 'none';
      track.style.transform = `translate3d(${currentTranslateX}px, 0, 0)`;
      checkInfiniteBounds();
    }
  };

  // Initial positioning (no animation)
  goToSlide(currentIndex, false);

  // 2. Autoplay implementation (3s interval, pause on hover/drag, 2s resume)
  let isContainerVisible = false;

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
    if (isReducedMotion || autoplayTimer || !isContainerVisible || document.hidden) return;
    autoplayTimer = window.setInterval(() => {
      if (isPointerDown || isAnimating) return;
      goToSlide(currentIndex + 1, true);
    }, timing.autoplayDelayMs);
  };

  const scheduleAutoplayResume = () => {
    if (isReducedMotion || !isContainerVisible || document.hidden) return;
    if (resumeTimer) window.clearTimeout(resumeTimer);
    resumeTimer = window.setTimeout(() => {
      startAutoplay();
    }, 2000);
  };

  // Only start autoplay when rituals carousel is actually in viewport
  const viewportObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isContainerVisible = entry.isIntersecting;
      if (isContainerVisible && !document.hidden && !isPointerDown) {
        startAutoplay();
      } else {
        stopAutoplay();
      }
    });
  }, { threshold: 0.1 });
  viewportObserver.observe(container);

  const handleVisibility = () => {
    if (document.hidden) {
      stopAutoplay();
    } else if (isContainerVisible && !isPointerDown) {
      scheduleAutoplayResume();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility);

  container.addEventListener('mouseenter', stopAutoplay);
  container.addEventListener('mouseleave', scheduleAutoplayResume);

  // 3. Navigation Arrow Buttons
  const handlePrev = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    stopAutoplay();
    goToSlide(currentIndex - 1, true);
    scheduleAutoplayResume();
  };

  const handleNext = (e: Event) => {
    e.preventDefault();
    e.stopPropagation();
    stopAutoplay();
    goToSlide(currentIndex + 1, true);
    scheduleAutoplayResume();
  };

  prevBtn?.addEventListener('click', handlePrev);
  nextBtn?.addEventListener('click', handleNext);

  // 4. Pointer Events (Desktop Mouse Drag + Mobile Touch Swipe)
  const handlePointerDown = (e: PointerEvent) => {
    // Ignore secondary buttons or clicks on Read More button
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('.ritual-read-more-btn') || target.closest('.ritual-nav-btn')) return;

    isPointerDown = true;
    hasDragged = false;
    startX = e.clientX;
    dragStartX = currentTranslateX;
    dragStartTime = performance.now();
    activePointerId = e.pointerId;

    track.setPointerCapture(e.pointerId);
    track.style.transition = 'none';
    viewport.classList.add('is-dragging');

    stopAutoplay();
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isPointerDown || e.pointerId !== activePointerId) return;
    const deltaX = e.clientX - startX;

    if (Math.abs(deltaX) > 5) {
      hasDragged = true;
    }

    currentTranslateX = dragStartX + deltaX;
    track.style.transform = `translate3d(${currentTranslateX}px, 0, 0)`;
  };

  const handlePointerEnd = (e: PointerEvent) => {
    if (!isPointerDown || e.pointerId !== activePointerId) return;
    isPointerDown = false;
    viewport.classList.remove('is-dragging');

    try {
      track.releasePointerCapture(e.pointerId);
    } catch {
      // Safe ignore
    }
    activePointerId = null;

    const deltaX = e.clientX - startX;
    const elapsed = Math.max(performance.now() - dragStartTime, 1);
    const velocity = deltaX / elapsed; // px per millisecond

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

    // Flick momentum check
    if (Math.abs(velocity) > 0.35 || Math.abs(deltaX) > 70) {
      if (deltaX < 0) {
        goToSlide(currentIndex + 1, true);
      } else {
        goToSlide(currentIndex - 1, true);
      }
    } else {
      goToSlide(closestIndex, true);
    }

    scheduleAutoplayResume();
  };

  track.addEventListener('pointerdown', handlePointerDown);
  track.addEventListener('pointermove', handlePointerMove);
  track.addEventListener('pointerup', handlePointerEnd);
  track.addEventListener('pointercancel', handlePointerEnd);

  // 5. Card Click Handler (Smoothly scroll clicked card to center if not dragging)
  allCards.forEach((card, idx) => {
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('.ritual-read-more-btn')) return;

      if (hasDragged) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (idx !== currentIndex) {
        stopAutoplay();
        goToSlide(idx, true);
        scheduleAutoplayResume();
      }
    });
  });

  // 6. Trackpad Horizontal Wheel Support
  let wheelTimeout: number | null = null;
  const handleWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 25) {
      e.preventDefault();
      if (wheelTimeout) return;
      stopAutoplay();
      if (e.deltaX > 0) {
        goToSlide(currentIndex + 1, true);
      } else {
        goToSlide(currentIndex - 1, true);
      }
      scheduleAutoplayResume();
      wheelTimeout = window.setTimeout(() => {
        wheelTimeout = null;
      }, 350);
    }
  };
  viewport.addEventListener('wheel', handleWheel, { passive: false });

  // 7. Keyboard Navigation (Left / Right Arrow)
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stopAutoplay();
      goToSlide(currentIndex - 1, true);
      scheduleAutoplayResume();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      stopAutoplay();
      goToSlide(currentIndex + 1, true);
      scheduleAutoplayResume();
    }
  };
  container.addEventListener('keydown', handleKeyDown);

  // 8. Mobile Read More Button Logic (3-line clamp by default, toggle on tap)
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
      e.stopPropagation();
      e.preventDefault();
      const isExpanded = card.classList.toggle('is-expanded');
      btn.setAttribute('aria-expanded', String(isExpanded));
      const textSpan = btn.querySelector('.ritual-btn-text');
      if (textSpan) {
        textSpan.textContent = isExpanded ? 'Show less' : 'Read more';
      }
    });

    btn.addEventListener('touchstart', (e) => {
      e.stopPropagation();
    }, { passive: true });
  });

  updateReadMoreButtons();
  if (document.fonts) {
    document.fonts.ready.then(updateReadMoreButtons).catch(() => {});
  }
  window.addEventListener('load', updateReadMoreButtons, { once: true });

  // 9. Resize Handling: keep active card centered without jump
  let resizeTimer: number | null = null;
  const handleResize = () => {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      goToSlide(currentIndex, false);
      updateReadMoreButtons();
    }, 100);
  };
  window.addEventListener('resize', handleResize, { passive: true });

  // Cleanup handler for Astro ViewTransitions / before-swap
  return () => {
    stopAutoplay();
    viewportObserver.disconnect();
    document.removeEventListener('visibilitychange', handleVisibility);
    if (resizeTimer) window.clearTimeout(resizeTimer);
    if (wheelTimeout) window.clearTimeout(wheelTimeout);
    container.removeEventListener('mouseenter', stopAutoplay);
    container.removeEventListener('mouseleave', scheduleAutoplayResume);
    prevBtn?.removeEventListener('click', handlePrev);
    nextBtn?.removeEventListener('click', handleNext);
    track.removeEventListener('pointerdown', handlePointerDown);
    track.removeEventListener('pointermove', handlePointerMove);
    track.removeEventListener('pointerup', handlePointerEnd);
    track.removeEventListener('pointercancel', handlePointerEnd);
    viewport.removeEventListener('wheel', handleWheel);
    container.removeEventListener('keydown', handleKeyDown);
    window.removeEventListener('resize', handleResize);
  };
}
