/* ══════════════════════════════════════════════════════════════
   PORSCHE — Engineering Emotion
   hero.js  |  v5 — final smooth

   Root cause of jerks / dead zones in v4:
   • easeInOut4 inside frameAt() created steep+flat curves
     → flat zones = "nothing happens", steep zones = rapid jumps
   
   Fix:
   ① frameAt() is now PURELY LINEAR (1 → 160 over full scroll)
      — scroll lerp (LERP_SPEED) provides all the easing needed
   ② ctx.filter applied at draw time, never CSS filter change
   ③ Dark atmosphere overlay only at 0–30% — middle is fully visible
   ④ No clearRect, no ctx.filter on the overlay — zero flicker
   ⑤ Canvas { alpha: false } for faster GPU compositing
══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────── */
  const TOTAL = 160;
  const DIR = 'brand_assets/ezgif-17f36a44630cd305-png-split/';
  const LERP_SPEED = 0.072;  // scroll smoothing factor

  function pad(n) { return String(n).padStart(3, '0'); }
  function src(n) { return DIR + 'ezgif-frame-' + pad(n) + '.png'; }

  /* ── PRELOAD ALL 160 FRAMES ─────────────────────────── */
  const imgs = new Array(TOTAL);
  const ready = new Uint8Array(TOTAL);
  let loaded = 0;

  for (let i = 0; i < TOTAL; i++) {
    const img = new Image();
    (function (idx) {
      img.onload = () => { ready[idx] = 1; loaded++; };
      img.onerror = () => { ready[idx] = 2; loaded++; };
    })(i);
    img.src = src(i + 1);
    imgs[i] = img;
  }

  /* ── CANVAS ─────────────────────────────────────────── */
  const canvas = document.getElementById('car-frame');
  const ctx = canvas.getContext('2d', { alpha: false });

  // Dynamically size canvas to viewport
  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas, { passive: true });

  // Fill black immediately
  ctx.fillStyle = '#070707';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  canvas.style.transition = 'none';

  /* ── DOM ────────────────────────────────────────────── */
  const track = document.getElementById('scroll-track');
  const haze = document.getElementById('haze');
  const trace = document.getElementById('red-trace');
  const glow = document.getElementById('headlight-glow');
  const type = document.getElementById('type-block');
  const bar = document.getElementById('progress-bar');
  const hint = document.getElementById('scroll-hint');
  const asmSt = document.getElementById('assembly-status');
  const asmTxt = document.getElementById('assembly-text');
  const sLabel = document.getElementById('stage-label');
  const sNum = document.getElementById('stage-num');
  const sName = document.getElementById('stage-name');
  const cDot = document.getElementById('cursor');
  const cRing = document.getElementById('cursor-ring');

  /* ── CURSOR ─────────────────────────────────────────── */
  let mx = innerWidth / 2, my = innerHeight / 2;
  let rx = mx, ry = my;
  document.addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; }, { passive: true });
  (function cursorTick() {
    rx += (mx - rx) * 0.13; ry += (my - ry) * 0.13;
    cDot.style.left = mx + 'px'; cDot.style.top = my + 'px';
    cRing.style.left = rx + 'px'; cRing.style.top = ry + 'px';
    requestAnimationFrame(cursorTick);
  })();

  /* ── MATH ───────────────────────────────────────────── */
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const range = (v, s, e) => clamp((v - s) / (e - s), 0, 1);
  const ss = t => t * t * (3 - 2 * t);         // smoothstep
  const eo3 = t => 1 - (1 - t) ** 3;             // ease-out cubic

  /* ── FRAME SCHEDULE — PURELY LINEAR ────────────────── */
  //
  // THIS is the key fix. No easing inside the schedule.
  //
  // With 160 frames over 600vh:
  //   • Every 1% scroll ≈ 1.6 frames change — perfectly visible
  //   • No flat zones, no steep zones
  //   • LERP_SPEED provides the smooth deceleration on scroll stop
  //
  function frameAt(p) {
    return clamp(1 + p * (TOTAL - 1), 1, TOTAL);
  }

  /* ── CANVAS DRAW ────────────────────────────────────── */
  //
  // ① ctx.filter applied at draw time — baked into pixels
  // ② NO invert() anywhere — cinematic dark emergence instead
  // ③ Dark overlay on top hides white studio bg naturally
  // ④ Overdraw (no clearRect) = zero black-flash between frames
  //

  // Cover-fit helper: scales image to cover the canvas like CSS object-fit:cover
  function coverDims(imgW, imgH, canW, canH) {
    const imgRatio = imgW / imgH;
    const canRatio = canW / canH;
    let dw, dh;
    if (canRatio > imgRatio) {
      dw = canW; dh = canW / imgRatio;
    } else {
      dh = canH; dw = canH * imgRatio;
    }
    return { x: (canW - dw) / 2, y: (canH - dh) / 2, w: dw, h: dh };
  }

  function draw(p) {
    const W = window.innerWidth;
    const H = window.innerHeight;

    const fFloat = frameAt(p);
    const idxA = clamp(Math.floor(fFloat), 1, TOTAL) - 1;
    const idxB = clamp(idxA + 1, 0, TOTAL - 1);
    const blend = fFloat - Math.floor(fFloat);

    const imgA = imgs[idxA];
    const imgB = imgs[idxB];
    const filt = getFilter(p);

    // Clear
    ctx.fillStyle = '#070707';
    ctx.fillRect(0, 0, W, H);

    // Base frame — cover fit
    if (imgA && ready[idxA] === 1) {
      const d = coverDims(imgA.naturalWidth, imgA.naturalHeight, W, H);
      ctx.filter = filt;
      ctx.globalAlpha = 1;
      ctx.drawImage(imgA, d.x, d.y, d.w, d.h);
    }

    // Sub-frame cross-fade
    if (blend > 0.01 && imgB && ready[idxB] === 1 && idxB !== idxA) {
      const d = coverDims(imgB.naturalWidth, imgB.naturalHeight, W, H);
      ctx.filter = filt;
      ctx.globalAlpha = blend;
      ctx.drawImage(imgB, d.x, d.y, d.w, d.h);
      ctx.globalAlpha = 1;
    }

    ctx.filter = 'none';

    // Dark overlay
    const dark = darkOverlay(p);
    if (dark > 0.005) {
      ctx.fillStyle = `rgba(7,7,7,${dark.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ── CANVAS FILTER — NO INVERT ───────────────────────── */
  //
  //  Approach: natural photo treatment that builds from black.
  //  The white studio background is hidden by the dark overlay,
  //  not by inverting. No X-ray appearance at any scroll stage.
  //
  //  0–08% : pitch black (brightness 0)
  //  08–32%: mechanical detail emerges — grayscale + low brightness
  //  32–58%: desaturation lifts, structural assembly visible
  //  58–82%: full natural colour, brightness normalising
  //  82–100%: clean natural photo, no processing
  //
  function getFilter(p) {
    if (p < 0.08) {
      const t = p / 0.08;
      return `brightness(${lerp(0, 0.14, t).toFixed(3)}) grayscale(1) contrast(1.6)`;
    }
    if (p < 0.32) {
      const t = range(p, 0.08, 0.32);
      const bri = lerp(0.14, 0.50, t);
      const gray = lerp(1.0, 0.65, t);
      const con = lerp(1.6, 1.35, t);
      return `brightness(${bri.toFixed(3)}) grayscale(${gray.toFixed(3)}) contrast(${con.toFixed(3)})`;
    }
    if (p < 0.58) {
      const t = range(p, 0.32, 0.58);
      const bri = lerp(0.50, 0.78, t);
      const gray = lerp(0.65, 0.10, t);
      const con = lerp(1.35, 1.12, t);
      return `brightness(${bri.toFixed(3)}) grayscale(${gray.toFixed(3)}) contrast(${con.toFixed(3)})`;
    }
    if (p < 0.82) {
      const t = range(p, 0.58, 0.82);
      const bri = lerp(0.78, 0.96, t);
      const con = lerp(1.12, 1.02, t);
      return `brightness(${bri.toFixed(3)}) contrast(${con.toFixed(3)})`;
    }
    if (p < 0.95) {
      const t = range(p, 0.82, 0.95);
      const bri = lerp(0.96, 1.00, t);
      return `brightness(${bri.toFixed(3)})`;
    }
    return 'none';
  }

  /* ── DARK OVERLAY SCHEDULE ───────────────────────────── */
  //
  //  Opacity of the rgba(7,7,7,X) rect drawn over the frame.
  //  Hides white studio background without invert().
  //
  //  0–08%  : 0.95→0.88  near-total black
  //  08–35% : 0.88→0.52  chassis emerges through shadow
  //  35–58% : 0.52→0.22  assembly brightens
  //  58–75% : 0.22→0.05  almost clear
  //  75%+   : 0           none — natural photo
  //
  function darkOverlay(p) {
    if (p < 0.08) return lerp(0.95, 0.88, p / 0.08);
    if (p < 0.35) return lerp(0.88, 0.52, range(p, 0.08, 0.35));
    if (p < 0.58) return lerp(0.52, 0.22, range(p, 0.35, 0.58));
    if (p < 0.75) return lerp(0.22, 0.05, range(p, 0.58, 0.75));
    return 0;
  }

  /* ── STAGE HUD ──────────────────────────────────────── */
  const STAGES = [
    { at: 0.00, n: '01', name: 'Studio Active', txt: 'Establishing environment' },
    { at: 0.15, n: '02', name: 'Chassis Assembly', txt: 'Structural framework initializing' },
    { at: 0.35, n: '03', name: 'Component Integration', txt: 'Wheels + panels approaching' },
    { at: 0.55, n: '04', name: 'Body Alignment', txt: 'Frame locking sequence active' },
    { at: 0.75, n: '05', name: 'Systems Activation', txt: 'Headlights — powering up' },
    { at: 0.90, n: '06', name: 'Assembly Complete', txt: 'Ready to drive' },
  ];
  let lastStage = -1;

  function updateHUD(p) {
    let s = 0;
    for (let i = 0; i < STAGES.length; i++) if (p >= STAGES[i].at) s = i;
    if (s !== lastStage) {
      lastStage = s;
      sNum.textContent = STAGES[s].n;
      sName.textContent = STAGES[s].name;
      asmTxt.textContent = STAGES[s].txt;
    }
    if (p > 0.02) {
      asmSt.style.opacity = '0.9';
      sLabel.style.opacity = '0.72';
    }
  }

  /* ── OVERLAY + TRANSFORM UPDATES ────────────────────── */
  //
  // Phase boundaries use smoothstep for CSS transitions.
  // No easing on the frame schedule itself — that's linear.
  //
  function updateOverlays(p) {
    bar.style.width = (p * 100).toFixed(1) + '%';

    // ── 0–12%  Dark void
    if (p < 0.12) {
      const ph = p / 0.12;
      const eph = ss(ph);
      set(canvas, 'opacity', f(lerp(0, 0.15, ph)));
      set(canvas, 'transform', `translateY(${f(lerp(30, 18, eph))}px) scale(${lerp(0.958, 0.974, eph).toFixed(4)})`);
      set(haze, 'opacity', f(lerp(0, 0.40, eph)));
      set(trace, 'opacity', '0'); set(trace, 'transform', 'scaleX(0)');
      set(glow, 'opacity', '0');
      set(type, 'opacity', '0'); set(type, 'transform', 'translateY(30px)'); set(type, 'pointerEvents', 'none');
      set(hint, 'opacity', f(lerp(1, 0.4, ph)));
      if (p < 0.02) { set(asmSt, 'opacity', '0'); set(sLabel, 'opacity', '0'); }
    }

    // ── 12–35%  Chassis rises
    else if (p < 0.35) {
      const eph = eo3(range(p, 0.12, 0.35));
      set(canvas, 'opacity', f(lerp(0.15, 0.92, eph)));
      set(canvas, 'transform', `translateY(${f(lerp(18, 2, eph))}px) scale(${lerp(0.974, 0.999, eph).toFixed(4)})`);
      set(haze, 'opacity', f(lerp(0.40, 0.55, eph)));
      set(trace, 'opacity', '0'); set(trace, 'transform', 'scaleX(0)');
      set(glow, 'opacity', '0');
      set(type, 'opacity', '0'); set(type, 'pointerEvents', 'none');
      set(hint, 'opacity', f(lerp(0.4, 0, range(p, 0.12, 0.22))));
    }

    // ── 35–55%  Panels converge
    else if (p < 0.55) {
      const eph = ss(range(p, 0.35, 0.55));
      set(canvas, 'opacity', f(lerp(0.92, 0.96, eph)));
      set(canvas, 'transform', `translateY(${f(lerp(2, 0, eph))}px) scale(${lerp(0.999, 1.007, eph).toFixed(4)})`);
      set(haze, 'opacity', f(lerp(0.55, 0.60, eph)));
      set(trace, 'opacity', '0'); set(trace, 'transform', 'scaleX(0)');
      set(glow, 'opacity', '0');
      set(type, 'opacity', '0'); set(type, 'pointerEvents', 'none');
      set(hint, 'opacity', '0');
    }

    // ── 55–75%  Body locks — red trace enters
    else if (p < 0.75) {
      const eph = ss(range(p, 0.55, 0.75));
      set(canvas, 'opacity', f(lerp(0.96, 0.99, eph)));
      set(canvas, 'transform', `translateY(0) scale(${lerp(1.007, 1.020, eph).toFixed(4)})`);
      set(haze, 'opacity', f(lerp(0.60, 0.68, eph)));
      // Trace enters at 63%
      const trT = ss(range(p, 0.63, 0.75));
      set(trace, 'opacity', f(trT * 0.70)); set(trace, 'transform', `scaleX(${trT.toFixed(4)})`);
      set(glow, 'opacity', '0');
      set(type, 'opacity', '0'); set(type, 'pointerEvents', 'none');
      set(hint, 'opacity', '0');
    }

    // ── 75–90%  Headlights + type emerges
    else if (p < 0.90) {
      const eph = ss(range(p, 0.75, 0.90));
      set(canvas, 'opacity', f(lerp(0.99, 1.0, eph)));
      set(canvas, 'transform', `translateY(0) scale(${lerp(1.020, 1.032, eph).toFixed(4)})`);
      set(haze, 'opacity', f(lerp(0.68, 0.76, eph)));
      set(trace, 'opacity', f(lerp(0.70, 0.88, eph))); set(trace, 'transform', 'scaleX(1)');
      set(glow, 'opacity', f(ss(eph)));
      const tyT = ss(range(p, 0.84, 0.90));
      set(type, 'opacity', f(tyT * 0.82));
      set(type, 'transform', `translateY(${f(lerp(24, 0, tyT))}px)`);
      set(type, 'pointerEvents', tyT > 0.5 ? 'auto' : 'none');
      set(hint, 'opacity', '0');
    }

    // ── 90–100%  Full reveal
    else {
      const eph = eo3(range(p, 0.90, 1.00));
      set(canvas, 'opacity', '1');
      set(canvas, 'transform', `translateX(${f(lerp(0, -18, eph))}px) scale(${lerp(1.032, 1.055, eph).toFixed(4)})`);
      set(haze, 'opacity', f(lerp(0.76, 0.82, eph)));
      set(trace, 'opacity', f(lerp(0.88, 0.40, eph))); set(trace, 'transform', 'scaleX(1)');
      set(glow, 'opacity', f(lerp(1, 0.50, eph)));
      set(type, 'opacity', f(lerp(0.82, 1.0, eph)));
      set(type, 'transform', 'translateY(0)');
      set(type, 'pointerEvents', 'auto');
      set(hint, 'opacity', '0');
    }

    updateHUD(p);
  }

  /* tiny helpers */
  const _cache = new Map();
  function set(el, prop, val) {
    const k = el.id + prop;
    if (_cache.get(k) === val) return;
    _cache.set(k, val);
    el.style[prop] = val;
  }
  function f(v) { return parseFloat(v).toFixed(3); }

  /* ── MAIN RAF LOOP ──────────────────────────────────── */
  let rawY = scrollY;
  let smoothY = rawY;
  let lastP = -1;

  window.addEventListener('scroll', () => { rawY = scrollY; }, { passive: true });

  function tick() {
    requestAnimationFrame(tick);

    smoothY += (rawY - smoothY) * LERP_SPEED;

    const maxScroll = track.scrollHeight - innerHeight;
    const p = clamp(maxScroll > 0 ? smoothY / maxScroll : 0, 0, 1);

    // Canvas: draw every tick (lerp means p changes every frame even without scroll)
    draw(p);

    // CSS overlays: update when p changes meaningfully
    if (Math.abs(p - lastP) > 0.00015) {
      lastP = p;
      updateOverlays(p);
    }
  }

  tick();

})();
