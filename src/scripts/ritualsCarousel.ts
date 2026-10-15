import EmblaCarousel, { type EmblaCarouselType, type EmblaOptionsType } from 'embla-carousel';
import Autoplay from 'embla-carousel-autoplay';

/**
 * Embla-Powered Sacred Rituals Coverflow Carousel
 * - Center card scale: 1, Side cards scale: ~0.88 with reduced opacity
 * - Driven from Embla scroll progress inside requestAnimationFrame
 * - Momentum drag with touch & mouse, touch-action: pan-y
 * - 4s autoplay with stopOnInteraction: false, pauses on hover, tab hide & offscreen
 * - Prev/next arrows move exactly 1 card reliably
 * - Clicking side cards brings them to center
 * - Sliding active gold pill indicator over fixed-width slots (no overlapping)
 */
export function initRitualsCarousel(): () => void {
  const container = document.querySelector<HTMLElement>('[data-carousel="rituals"]');
  if (!container) return () => {};

  const viewport = container.querySelector<HTMLElement>('.rituals-track-container');
  if (!viewport) return () => {};

  const dotsContainer = container.querySelector<HTMLElement>('.ritual-ctrl-dots');
  const dotSlots = Array.from(container.querySelectorAll<HTMLElement>('.ritual-dot-slot'));
  const activePill = container.querySelector<HTMLElement>('#ritual-active-pill');
  const counterCurr = container.querySelector<HTMLElement>('#ritual-counter-curr');
  const liveRegion = document.getElementById('rituals-live-region');
  const prevBtn = container.querySelector<HTMLButtonElement>('#ritual-ctrl-prev');
  const nextBtn = container.querySelector<HTMLButtonElement>('#ritual-ctrl-next');
  const autoplayBtn = container.querySelector<HTMLButtonElement>('#ritual-ctrl-autoplay');

  const isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Embla Options: loop, align center, smooth duration ~28, initial index 2 (Mangal Milan)
  const options: EmblaOptionsType = {
    loop: true,
    align: 'center',
    skipSnaps: false,
    dragFree: false,
    duration: 28,
    startIndex: 2,
    watchDrag: true,
  };

  // Autoplay plugin configuration: 4s delay, stops on pointer drag but resumes after interaction
  const autoplayPlugin = Autoplay({
    delay: 4000,
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

  // ── COVERFLOW SCALE & OPACITY TRANSFORMS VIA RAF ──
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
        const scale = isReducedMotion ? 1 : Math.max(0.76, 1 - distance * 0.12);
        const opacity = Math.max(0.42, 1 - distance * 0.35);

        const slide = slides[slideIndex];
        if (slide) {
          slide.style.transform = `scale(${scale.toFixed(3)})`;
          slide.style.opacity = `${opacity.toFixed(3)}`;
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
  embla.on('reInit', applyCoverflowScales);

  // ── SEPARATE SLIDING ACTIVE PILL & FIXED-WIDTH DOTS ──
  const updateDotsAndCounter = () => {
    const selected = embla.selectedScrollSnap();

    // Update Mobile Counter Text ("03 / 11")
    if (counterCurr) {
      counterCurr.textContent = String(selected + 1).padStart(2, '0');
    }

    // Move separate active gold pill via transform: translateX()
    const activeSlot = dotSlots[selected];
    if (activeSlot && activePill && dotsContainer) {
      const slotLeft = activeSlot.offsetLeft;
      const slotWidth = activeSlot.offsetWidth;
      const pillWidth = 22;
      const targetX = slotLeft + (slotWidth - pillWidth) / 2;
      activePill.style.transform = `translateX(${targetX}px)`;
    }

    // Update slots accessibility & fade out circle under active pill
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

    // Screen reader live region
    if (liveRegion) {
      const activeSlide = slides[selected];
      const title = activeSlide?.getAttribute('data-ritual-title') || '';
      liveRegion.textContent = `Slide ${selected + 1} of ${slides.length}: ${title}`;
    }
  };

  embla.on('select', updateDotsAndCounter);
  embla.on('reInit', updateDotsAndCounter);

  // Initial runs once DOM is ready
  requestAnimationFrame(() => {
    applyCoverflowScales();
    updateDotsAndCounter();
  });

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
    window.removeEventListener('resize', updateReadMoreButtons);
    document.removeEventListener('visibilitychange', handleVisibility);
    container.removeEventListener('mouseenter', handleMouseEnter);
    container.removeEventListener('mouseleave', handleMouseLeave);
    container.removeEventListener('keydown', handleKeyDown);
    autoplayBtn?.removeEventListener('click', toggleAutoplay);
    embla.destroy();
  };
}
