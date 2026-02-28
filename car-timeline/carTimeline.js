/* ══════════════════════════════════════════════════════════════
   CAR TIMELINE — Scroll-Scrubbed Cinematic Component
   carTimeline.js  |  Canvas frame scrubbing driven by scroll
   
   Usage:
     new CarTimeline("carTimelineMount", "brand_assets/timeline/", 160)
══════════════════════════════════════════════════════════════ */

class CarTimeline {
  /**
   * @param {string} mountId       — ID of the mount element
   * @param {string} imageFolderPath — Path to folder with sequential frames
   * @param {number} frameCount    — Total number of frames
   * @param {object} [options]     — Optional configuration
   */
  constructor(mountId, imageFolderPath, frameCount, options = {}) {
    this.mountEl = document.getElementById(mountId);
    if (!this.mountEl) {
      console.error(`[CarTimeline] Mount element #${mountId} not found.`);
      return;
    }

    this.imagePath = imageFolderPath.endsWith('/') ? imageFolderPath : imageFolderPath + '/';
    this.frameCount = frameCount;
    this.lerpFactor = options.lerpFactor || 0.045;
    this.scrollHeight = options.scrollHeight || '800vh';

    // State
    this.images = new Array(frameCount);
    this.loaded = 0;
    this.targetProgress = 0;
    this.currentProgress = 0;
    this.lastDrawnFrame = -1;
    this.isActive = false;
    this.rafId = null;

    // Canvas
    this.canvas = null;
    this.ctx = null;
    this.lastDims = null;

    // Era timeline data
    this.eras = options.eras || [
      { start: 0.00, end: 0.18, year: '1963', name: '911 Original', desc: 'Where the legend began — the car that started a dynasty of speed, style, and engineering excellence.' },
      { start: 0.18, end: 0.34, year: '1973', name: 'Carrera RS 2.7', desc: 'Born for the track. The first production car with front and rear spoilers. Lightweight. Uncompromising.' },
      { start: 0.34, end: 0.52, year: '1989', name: '964 Generation', desc: 'Evolution refined — 85% new parts, all-wheel drive option, and the spirit of the original preserved.' },
      { start: 0.52, end: 0.68, year: '2004', name: '997 Era', desc: 'Precision engineering meets modern luxury. The return to round headlamps and analog soul.' },
      { start: 0.68, end: 0.85, year: '2019', name: '992 Generation', desc: 'The most powerful, most digital, most connected 911 ever built — yet unmistakably a 911.' },
      { start: 0.85, end: 1.00, year: '2025', name: 'The Future', desc: 'Always one step ahead. The next chapter of an icon that will never stop evolving.' },
    ];

    // Build everything
    this._buildDOM();
    this._setupCanvas();
    this._preloadImages().then(() => this._onReady());
  }

  /* ════════════════════════════════════════════════════════════
     DOM CONSTRUCTION
  ════════════════════════════════════════════════════════════ */

  _buildDOM() {
    this.root = document.createElement('div');
    this.root.className = 'ct-root';

    this.root.innerHTML = `
      <div class="ct-scroll-container" style="height:${this.scrollHeight}">
        <div class="ct-viewport">
          <canvas class="ct-canvas"></canvas>

          <div class="ct-vignette"></div>
          <div class="ct-road-line"></div>

          <div class="ct-section-title">
            <div class="ct-eyebrow">Porsche Heritage</div>
            <div class="ct-heading">The Evolution of an Icon</div>
          </div>

          <div class="ct-era-overlay">
            ${this.eras.map((era, i) => `
              <div class="ct-era-card" data-era="${i}">
                <div class="ct-era-year">${era.year}</div>
                <div class="ct-era-name">${era.name}</div>
                <div class="ct-era-desc">${era.desc}</div>
              </div>
            `).join('')}
            <div class="ct-gen-counter">
              <div class="ct-gen-number">01</div>
              <div class="ct-gen-label">Generation</div>
            </div>
          </div>

          <div class="ct-bottom-bar">
            <div class="ct-scroll-hint">
              <span class="ct-scroll-hint-arrow"></span>
              Scroll to explore
            </div>
            <div class="ct-frame-counter">001 / ${String(this.frameCount).padStart(3, '0')}</div>
          </div>

          <div class="ct-progress-track">
            <div class="ct-progress-fill"></div>
          </div>

          <div class="ct-loader">
            <div class="ct-loader-text">Loading Timeline</div>
            <div class="ct-loader-bar">
              <div class="ct-loader-bar-fill"></div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.mountEl.appendChild(this.root);

    // Cache references
    this.viewport = this.root.querySelector('.ct-viewport');
    this.scrollContainer = this.root.querySelector('.ct-scroll-container');
    this.progressFill = this.root.querySelector('.ct-progress-fill');
    this.loader = this.root.querySelector('.ct-loader');
    this.loaderBarFill = this.root.querySelector('.ct-loader-bar-fill');
    this.frameCounterEl = this.root.querySelector('.ct-frame-counter');
    this.genNumber = this.root.querySelector('.ct-gen-number');
    this.eraCards = this.root.querySelectorAll('.ct-era-card');
  }

  /* ════════════════════════════════════════════════════════════
     CANVAS SETUP
  ════════════════════════════════════════════════════════════ */

  _setupCanvas() {
    this.canvas = this.root.querySelector('.ct-canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false });

    this._resizeCanvas();
    this._resizeHandler = () => this._resizeCanvas();
    window.addEventListener('resize', this._resizeHandler, { passive: true });

    // Fill black initially
    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  _resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.viewport.clientWidth;
    const h = this.viewport.clientHeight;
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.lastDims = null; // Force redraw
    this.lastDrawnFrame = -1;
  }

  /* ════════════════════════════════════════════════════════════
     IMAGE PRELOADING
  ════════════════════════════════════════════════════════════ */

  _preloadImages() {
    return new Promise((resolve) => {
      let loaded = 0;
      const total = this.frameCount;

      for (let i = 0; i < total; i++) {
        const img = new Image();
        const num = String(i + 1).padStart(3, '0');
        img.src = `${this.imagePath}ezgif-frame-${num}.png`;

        img.onload = () => {
          this.images[i] = img;
          loaded++;
          const pct = (loaded / total) * 100;
          this.loaderBarFill.style.width = pct + '%';
          if (loaded === total) resolve();
        };

        img.onerror = () => {
          // Still count errored frames to avoid hanging
          loaded++;
          if (loaded === total) resolve();
        };
      }
    });
  }

  /* ════════════════════════════════════════════════════════════
     READY — Start the engine
  ════════════════════════════════════════════════════════════ */

  _onReady() {
    // Hide loader
    this.loader.classList.add('ct-hidden');
    setTimeout(() => { this.loader.style.display = 'none'; }, 800);

    // Activate visual state
    this.root.classList.add('ct-active');
    this.isActive = true;

    // Draw first frame immediately
    this._drawFrame(0);

    // Bind scroll
    this._scrollHandler = () => this._onScroll();
    window.addEventListener('scroll', this._scrollHandler, { passive: true });

    // Set initial progress from current scroll position
    this._onScroll();

    // Start RAF loop
    this._startLoop();
  }

  /* ════════════════════════════════════════════════════════════
     SCROLL → PROGRESS MAPPING
  ════════════════════════════════════════════════════════════ */

  _onScroll() {
    const rect = this.scrollContainer.getBoundingClientRect();
    const containerHeight = this.scrollContainer.offsetHeight;
    const viewportHeight = window.innerHeight;
    const scrollableDistance = containerHeight - viewportHeight;

    // How far into the scroll container are we?
    // rect.top starts positive (below viewport) and goes negative (scrolled past)
    const scrolled = -rect.top;
    this.targetProgress = Math.max(0, Math.min(1, scrolled / scrollableDistance));
  }

  /* ════════════════════════════════════════════════════════════
     RAF ANIMATION LOOP — Lerp smoothing
  ════════════════════════════════════════════════════════════ */

  _startLoop() {
    // Second-order smoothing: smooth the smoothed value for extra buttery feel
    let smoothProgress = 0;

    const tick = () => {
      // First pass: lerp currentProgress toward target
      const diff = this.targetProgress - this.currentProgress;
      if (Math.abs(diff) > 0.00005) {
        this.currentProgress += diff * this.lerpFactor;
      } else {
        this.currentProgress = this.targetProgress;
      }

      // Second pass: smooth again for ultra-fluid motion
      const diff2 = this.currentProgress - smoothProgress;
      if (Math.abs(diff2) > 0.00005) {
        smoothProgress += diff2 * 0.35;
      } else {
        smoothProgress = this.currentProgress;
      }

      // Clamp
      smoothProgress = Math.max(0, Math.min(1, smoothProgress));

      // Determine frame index
      const frameIndex = Math.min(
        this.frameCount - 1,
        Math.floor(smoothProgress * this.frameCount)
      );

      // Draw only if frame changed
      if (frameIndex !== this.lastDrawnFrame) {
        this._drawFrame(frameIndex);
        this.lastDrawnFrame = frameIndex;
      }

      // Update UI
      this._updateUI(smoothProgress, frameIndex);

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }

  /* ════════════════════════════════════════════════════════════
     CANVAS DRAWING — Cover fit
  ════════════════════════════════════════════════════════════ */

  _getCoverDims(imgW, imgH, canW, canH) {
    const imgRatio = imgW / imgH;
    const canRatio = canW / canH;
    let drawW, drawH;
    if (canRatio > imgRatio) {
      drawW = canW;
      drawH = canW / imgRatio;
    } else {
      drawH = canH;
      drawW = canH * imgRatio;
    }
    return {
      x: (canW - drawW) / 2,
      y: (canH - drawH) / 2,
      w: drawW,
      h: drawH,
    };
  }

  _drawFrame(index) {
    const img = this.images[index];
    if (!img) return;

    const W = this.canvas.width / (Math.min(window.devicePixelRatio || 1, 2));
    const H = this.canvas.height / (Math.min(window.devicePixelRatio || 1, 2));

    const dims = this._getCoverDims(img.naturalWidth, img.naturalHeight, W, H);

    this.ctx.fillStyle = '#050505';
    this.ctx.fillRect(0, 0, W, H);
    this.ctx.drawImage(img, dims.x, dims.y, dims.w, dims.h);
  }


  /* ════════════════════════════════════════════════════════════
     UI UPDATES — Text overlays, progress bar, counters
  ════════════════════════════════════════════════════════════ */

  _updateUI(progress, frameIndex) {
    // Progress bar
    this.progressFill.style.width = (progress * 100) + '%';

    // Frame counter
    this.frameCounterEl.textContent =
      `${String(frameIndex + 1).padStart(3, '0')} / ${String(this.frameCount).padStart(3, '0')}`;

    // Era cards
    let activeEraIndex = -1;
    this.eras.forEach((era, i) => {
      const card = this.eraCards[i];
      if (!card) return;

      // Calculate local progress within this era
      const eraLength = era.end - era.start;
      const localProgress = (progress - era.start) / eraLength;

      if (progress >= era.start && progress <= era.end) {
        activeEraIndex = i;

        // Fade in/out curve
        let opacity = 1;
        let tx = 0;

        // Entrance: first 20% of era — fade in from left
        if (localProgress < 0.2) {
          const t = localProgress / 0.2;
          const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
          opacity = eased;
          tx = (1 - eased) * -40;
        }
        // Exit: last 20% of era — fade out to left
        else if (localProgress > 0.8) {
          const t = (localProgress - 0.8) / 0.2;
          const eased = 1 - Math.pow(1 - t, 3);
          opacity = 1 - eased;
          tx = -eased * 30;
        }

        card.style.opacity = opacity;
        card.style.transform = `translateX(${tx}px)`;
      } else {
        card.style.opacity = '0';
        card.style.transform = 'translateX(-30px)';
      }
    });

    // Generation counter
    if (activeEraIndex >= 0) {
      this.genNumber.textContent = String(activeEraIndex + 1).padStart(2, '0');
    }

    // Hide scroll hint after initial scroll
    if (progress > 0.02) {
      const hint = this.root.querySelector('.ct-scroll-hint');
      if (hint) hint.style.opacity = '0';
    } else {
      const hint = this.root.querySelector('.ct-scroll-hint');
      if (hint) hint.style.opacity = '';
    }
  }

  /* ════════════════════════════════════════════════════════════
     CLEANUP
  ════════════════════════════════════════════════════════════ */

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('scroll', this._scrollHandler);
    window.removeEventListener('resize', this._resizeHandler);
    if (this.root && this.root.parentNode) {
      this.root.parentNode.removeChild(this.root);
    }
    this.images = [];
  }
}

// Expose globally
window.CarTimeline = CarTimeline;
