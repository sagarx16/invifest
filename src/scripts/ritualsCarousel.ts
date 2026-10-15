import EmblaCarousel, { type EmblaCarouselType, type EmblaOptionsType } from 'embla-carousel';
import Autoplay from 'embla-carousel-autoplay';

/**
 * Embla-Powered Sacred Rituals Coverflow Carousel
 * - Center card scale: 1, Side cards scale: ~0.88 with reduced opacity (~0.65)
 * - Driven from Embla scroll progress inside requestAnimationFrame, only transform & opacity
 * - Momentum drag with touch & mouse, touch-action: pan-y
 * - 3500ms autoplay with stopOnInteraction: false, pauses on hover (desktop), tab hide & offscreen
 * - Prev/next arrows move exactly 1 card reliably
 * - Clicking side cards brings them to center
 * - Sliding active gold circle indicator over fixed 16px slots (12px on mobile)
 * - Prefetches adjacent card images
 * - Full prefers-reduced-motion support
 */
export function initRitualsCarousel(): () => void {
  const container = document.querySelector<HTMLElement>('[data-carousel="rituals"]');
  if (!container) return () => {};

  const viewport = container.querySelector<HTMLElement>('.rituals-track-container');
  if (!viewport) return () => {};

  const dotSlots = Array.from(container.querySelectorAll<HTMLElement>('.ritual-dot-slot'));
  const activeIndicator = container.querySelector<HTMLElement>('#ritual-active-indicator');
  const pulseWrapper = container.querySelector<HTMLElement>('.ritual-active-pulse-wrapper');
  const counterCurr = container.querySelector<HTMLElement>('#ritual-counter-curr');
  const progressLine = container.querySelector<HTMLElement>('#ritual-progress-line');
  const liveRegion = document.getElementById('rituals-live-region');
  const prevBtn = container.querySelector<HTMLButtonElement>('#ritual-ctrl-prev');
  const nextBtn = container.querySelector<HTMLButtonElement>('#ritual-ctrl-next');
  const autoplayBtn = container.querySelector<HTMLButtonElement>('#ritual-ctrl-autoplay');

  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Embla Options: loop, align center, duration 25 (buttery smooth glide), initial index 2
  const options: EmblaOptionsType = {
    loop: true,
    align: 'center',
    skipSnaps: false,
    dragFree: false,
    duration: 25,
    startIndex: 2,
    watchDrag: true,
  };

  // Autoplay plugin configuration: 3000ms delay for smooth, proper pacing
  const autoplayPlugin = Autoplay({
    delay: 3000,
    stopOnInteraction: false,
    stopOnMouseEnter: true,
  });

  const plugins = isReducedMotion ? [] : [autoplayPlugin];
  const embla: EmblaCarouselType = EmblaCarousel(viewport, options, plugins);
  const slides = embla.slideNodes();
  const snapsCount = embla.scrollSnapList().length;

  let rafId: number | null = null;
  let isUserPaused = false;
  let isContainerVisible = false;
  let prevActiveIndex = embla.selectedScrollSnap();

  // Cached slot width to prevent layout reflows on click/select
  let cachedSlotWidth = window.innerWidth < 480 ? 12 : 16;
  const updateCachedSlotWidth = () => {
    if (dotSlots.length > 0 && dotSlots[0].offsetWidth > 0) {
      cachedSlotWidth = dotSlots[0].offsetWidth;
    } else {
      cachedSlotWidth = window.innerWidth < 480 ? 12 : 16;
    }
  };
  updateCachedSlotWidth();

  // ── PREFETCH ADJACENT IMAGES ──
  const prefetchAdjacentImages = (centerIdx: number) => {
    if (!slides.length) return;
    const prevIdx = (centerIdx - 1 + slides.length) % slides.length;
    const nextIdx = (centerIdx + 1) % slides.length;
    [prevIdx, nextIdx].forEach((idx) => {
      const img = slides[idx]?.querySelector<HTMLImageElement>('.ritual-card-img');
      if (img) {
        if (img.loading === 'lazy') {
          img.loading = 'eager';
        }
        if ('decode' in img && !img.complete) {
          img.decode().catch(() => {});
        }
      }
    });
  };

  // ── COVERFLOW SCALE & OPACITY TRANSFORMS VIA RAF (ZERO GAP) ──
  // Reads only in-memory engine data; NO layout reads or reflows in loop
  const applyCoverflowScales = () => {
    const engine = embla.internalEngine();
    const scrollProgress = embla.scrollProgress();

    embla.scrollSnapList().forEach((scrollSnap, snapIndex) => {
      let diffToTarget = scrollSnap - scrollProgress;
      const slidesInSnap = engine.slideRegistry[snapIndex];

      slidesInSnap.forEach((slideIndex) => {
        if (engine.options.loop) {
          engine.slideLooper.loopPoints.forEach((loopItem) => {
            const target = loopItem.target();
            if (slideIndex === loopItem.index && target !== 0) {
              const sign = Math.sign(target);
              if (sign === -1) diffToTarget = scrollSnap - (1 + scrollProgress);
              if (sign === 1) diffToTarget = scrollSnap + (1 - scrollProgress);
            }
          });
        }

        const distance = Math.abs(diffToTarget) * snapsCount;
        // Center: scale 1.0, Neighbours: ~0.88 with lower opacity (~0.65), farther: smaller
        const scale = isReducedMotion ? 1 : Math.max(0.78, 1 - distance * 0.12);
        const opacity = Math.max(0.42, 1 - distance * 0.35);

        // Pull side cards toward center so there is literally 0 gap between scaled cards
        const pullOffset = isReducedMotion ? 0 : -Math.sign(diffToTarget) * Math.min(distance, 1.2) * 26;
        const zIndex = Math.round(20 - Math.min(15, distance * 5));

        const slide = slides[slideIndex];
        if (slide) {
          slide.style.transform = `translate3d(${pullOffset.toFixed(1)}px, 0, 0) scale(${scale.toFixed(3)})`;
          slide.style.opacity = `${opacity.toFixed(3)}`;
          slide.style.zIndex = `${zIndex}`;
          const isCenter = distance < 0.35;
          slide.classList.toggle('is-active', isCenter);
        }
      });
    });
  };

  const onScroll = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = null;
      applyCoverflowScales();
    });
  };

  embla.on('scroll', onScroll);
  embla.on('reInit', () => {
    updateCachedSlotWidth();
    applyCoverflowScales();
  });

  // ── GET CURRENT SLOT WIDTH (cached) ──
  const getSlotWidth = () => cachedSlotWidth;

  // ── ACTIVE CIRCLE INDICATOR & ACCESSIBILITY ──
  const updateDotsAndIndicator = () => {
    const total = dotSlots.length || snapsCount;
    const selected = ((embla.selectedScrollSnap() % total) + total) % total;
    const slotWidth = getSlotWidth();

    // 1. Update Mobile Counter text ("07 / 10")
    if (counterCurr) {
      counterCurr.textContent = String(selected + 1).padStart(2, '0');
    }
    if (progressLine) {
      const pct = ((selected + 1) / total) * 100;
      progressLine.style.width = `${pct}%`;
    }

    // 2. Animate Active Indicator circle
    if (activeIndicator) {
      const distance = Math.abs(selected - prevActiveIndex);
      const isLoopWrap = distance >= total - 1;

      // When moving between far dots, add a tiny scale pulse (1 to 1.15 to 1) without forced reflow
      if (pulseWrapper && distance > 1 && !isLoopWrap) {
        pulseWrapper.classList.remove('is-pulsing');
        requestAnimationFrame(() => {
          pulseWrapper.classList.add('is-pulsing');
        });
      }

      if (isLoopWrap) {
        // Smooth loop wrap: fade through shortest visual path
        activeIndicator.style.transition = 'opacity 120ms ease';
        activeIndicator.style.opacity = '0';
        setTimeout(() => {
          activeIndicator.style.transform = `translateX(${selected * slotWidth}px)`;
          activeIndicator.style.transition = 'opacity 150ms ease';
          activeIndicator.style.opacity = '1';
          setTimeout(() => {
            activeIndicator.style.transition = 'transform 380ms cubic-bezier(.22,1,.36,1), opacity 150ms ease';
          }, 150);
        }, 120);
      } else {
        activeIndicator.style.transition = 'transform 380ms cubic-bezier(.22,1,.36,1), opacity 150ms ease';
        activeIndicator.style.transform = `translateX(${selected * slotWidth}px)`;
      }
    }

    prevActiveIndex = selected;

    // 3. Update Dots accessibility & base dot opacity
    dotSlots.forEach((slot, idx) => {
      const isSelected = idx === selected;
      slot.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      slot.setAttribute('aria-current', isSelected ? 'true' : 'false');
      slot.tabIndex = isSelected ? 0 : -1;
      const circle = slot.querySelector<HTMLElement>('.ritual-dot-circle');
      if (circle) {
        circle.style.opacity = isSelected ? '0' : '1';
      }
    });

    // 4. Prefetch next and previous images
    prefetchAdjacentImages(selected);

    if (liveRegion) {
      const activeSlide = slides[selected];
      const title = activeSlide?.getAttribute('data-ritual-title') || '';
      liveRegion.textContent = `Slide ${selected + 1} of ${slides.length}: ${title}`;
    }
  };

  embla.on('select', updateDotsAndIndicator);
  embla.on('reInit', updateDotsAndIndicator);

  // Initial runs
  requestAnimationFrame(() => {
    applyCoverflowScales();
    updateDotsAndIndicator();
  });

  // Recompute position on resize
  const handleResize = () => {
    updateDotsAndIndicator();
  };
  window.addEventListener('resize', handleResize, { passive: true });

  // ── DOT SLOT CLICKS ──
  dotSlots.forEach((slot, idx) => {
    slot.addEventListener('click', (e) => {
      e.preventDefault();
      embla.scrollTo(idx);
    });
  });

  // ── ARROWS ──
  prevBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    embla.scrollPrev();
  });

  nextBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    embla.scrollNext();
  });

  // ── SIDE CARD CLICK TO CENTER ──
  slides.forEach((slide, idx) => {
    slide.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.ritual-read-more-btn')) return;
      if (embla.selectedScrollSnap() !== idx) {
        embla.scrollTo(idx);
      }
    });
  });

  // ── KEYBOARD ARROWS ──
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      embla.scrollPrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      embla.scrollNext();
    }
  };
  container.addEventListener('keydown', handleKeyDown);

  // ── AUTOPLAY CONTROLS ──
  const autoplay = embla.plugins().autoplay;

  const updateAutoplayUI = (playing: boolean) => {
    if (!autoplayBtn) return;
    const pauseIcon = autoplayBtn.querySelector<HTMLElement>('.ritual-icon-pause');
    const playIcon = autoplayBtn.querySelector<HTMLElement>('.ritual-icon-play');
    const label = autoplayBtn.querySelector<HTMLElement>('.ritual-pill-label');

    autoplayBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
    autoplayBtn.setAttribute('aria-label', playing ? 'Pause autoplay' : 'Play autoplay');
    pauseIcon?.classList.toggle('hidden', !playing);
    playIcon?.classList.toggle('hidden', playing);
    if (label) label.textContent = playing ? 'AUTO' : 'PLAY';
  };

  const toggleAutoplay = () => {
    if (!autoplay) return;
    if (autoplay.isPlaying()) {
      autoplay.stop();
      isUserPaused = true;
      updateAutoplayUI(false);
    } else {
      autoplay.play();
      isUserPaused = false;
      updateAutoplayUI(true);
    }
  };
  autoplayBtn?.addEventListener('click', toggleAutoplay);

  embla.on('autoplay:play', () => updateAutoplayUI(true));
  embla.on('autoplay:stop', () => {
    if (isUserPaused) updateAutoplayUI(false);
  });

  // Initial UI state
  updateAutoplayUI(!isReducedMotion);

  // ── HOVER, TAB VISIBILITY & INTERSECTION OBSERVER ──
  const handleMouseEnter = () => {
    if (!isUserPaused && autoplay?.isPlaying()) {
      autoplay.stop();
    }
  };

  const handleMouseLeave = () => {
    if (!isUserPaused && !autoplay?.isPlaying() && isContainerVisible && !document.hidden) {
      autoplay?.play();
    }
  };

  container.addEventListener('mouseenter', handleMouseEnter, { passive: true });
  container.addEventListener('mouseleave', handleMouseLeave, { passive: true });

  const handleVisibility = () => {
    if (document.hidden) {
      autoplay?.stop();
    } else if (!isUserPaused && isContainerVisible) {
      autoplay?.play();
    }
  };
  document.addEventListener('visibilitychange', handleVisibility, { passive: true });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isContainerVisible = entry.isIntersecting;
      if (isContainerVisible) {
        if (!isUserPaused && !document.hidden) {
          autoplay?.play();
        }
      } else {
        autoplay?.stop();
      }
    });
  }, { threshold: 0.1 });
  observer.observe(container);

  // ── MOBILE READ MORE ACCORDION ──
  const updateReadMoreButtons = () => {
    const isMobile = window.innerWidth <= 768;
    slides.forEach((card) => {
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

  slides.forEach((card) => {
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
  window.addEventListener('resize', updateReadMoreButtons, { passive: true });

  // ── CLEANUP ──
  return () => {
    if (rafId) cancelAnimationFrame(rafId);
    observer.disconnect();
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('resize', updateReadMoreButtons);
    document.removeEventListener('visibilitychange', handleVisibility);
    container.removeEventListener('mouseenter', handleMouseEnter);
    container.removeEventListener('mouseleave', handleMouseLeave);
    container.removeEventListener('keydown', handleKeyDown);
    autoplayBtn?.removeEventListener('click', toggleAutoplay);
    embla.destroy();
  };
}
