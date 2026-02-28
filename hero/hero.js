/* ══════════════════════════════════════════════════════════════
   PORSCHE — Hero Section Script
   Video playback, letter animation, and replay logic
══════════════════════════════════════════════════════════════ */

(function heroInit() {
    const video = document.getElementById('hero-video');
    const letters = document.querySelectorAll('#porsche-text .letter');
    const tagline = document.getElementById('tagline');
    const progressFill = document.getElementById('progress-fill');
    const replayBtn = document.getElementById('replay-btn');
    const bloom = document.getElementById('headlight-bloom');

    if (!video) {
        console.warn('[Hero] No video element found, skipping hero init.');
        return;
    }

    console.log('[Hero] Initializing hero section...');

    // ── Play video and animate letters ──────────────────
    function playHero() {
        replayBtn.classList.remove('visible');
        tagline.classList.remove('visible');
        letters.forEach(l => l.classList.remove('visible'));

        video.currentTime = 0;
        video.play().catch(() => {
            console.warn('[Hero] Autoplay blocked — user interaction required.');
        });

        // Stagger letter reveals at 30% through video
        video.addEventListener('timeupdate', function onTime() {
            const pct = video.currentTime / video.duration;

            // Update progress bar
            if (progressFill) {
                progressFill.style.width = (pct * 100) + '%';
            }

            // Bloom headlight effect
            if (bloom) {
                bloom.style.opacity = pct > 0.4 ? Math.min(1, (pct - 0.4) * 3) : 0;
            }

            // Stagger letters at 30%
            if (pct > 0.3) {
                letters.forEach((letter, i) => {
                    setTimeout(() => letter.classList.add('visible'), i * 80);
                });
            }

            // Show tagline at 70%
            if (pct > 0.7 && tagline) {
                tagline.classList.add('visible');
            }
        });
    }

    // ── On video end ────────────────────────────────────
    video.addEventListener('ended', () => {
        if (replayBtn) replayBtn.classList.add('visible');
    });

    // ── Replay button ───────────────────────────────────
    if (replayBtn) {
        replayBtn.addEventListener('click', () => {
            playHero();
        });
    }

    // ── Start on load ───────────────────────────────────
    if (video.readyState >= 3) {
        playHero();
    } else {
        video.addEventListener('canplaythrough', () => playHero(), { once: true });
    }

    console.log('[Hero] Hero section initialized.');
})();
