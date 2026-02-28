/* ══════════════════════════════════════════════════════════════
   PORSCHE — Hero Section Script
   Video playback, animated title reveal, start sound, and replay
══════════════════════════════════════════════════════════════ */

(function heroInit() {
    const video = document.getElementById('hero-video');
    const porscheText = document.getElementById('porsche-text');
    const letters = document.querySelectorAll('#porsche-text .letter');

    const progressFill = document.getElementById('progress-fill');
    const replayBtn = document.getElementById('replay-btn');
    const bloom = document.getElementById('headlight-bloom');

    if (!video) {
        console.warn('[Hero] No video element found, skipping hero init.');
        return;
    }

    console.log('[Hero] Initializing hero section...');

    // ── Preload start sound ─────────────────────────────
    const startSound = new Audio('brand_assets/start_sound.mp3');
    startSound.preload = 'auto';
    startSound.volume = 0.6;

    let soundPlayed = false;
    let lettersRevealed = false;
    let titleSettled = false;

    // ── Play hero sequence ──────────────────────────────
    function playHero() {
        // Reset all state
        soundPlayed = false;
        lettersRevealed = false;
        titleSettled = false;

        replayBtn.classList.remove('visible');
        porscheText.classList.remove('settled');
        letters.forEach(l => l.classList.remove('visible'));

        video.currentTime = 0;
        video.play().catch(() => {
            console.warn('[Hero] Autoplay blocked — user interaction required.');
        });

        // Schedule start sound at 0.8 seconds
        setTimeout(() => {
            if (!soundPlayed) {
                soundPlayed = true;
                startSound.currentTime = 0;
                startSound.play().catch(() => {
                    console.warn('[Hero] Sound autoplay blocked.');
                });
            }
        }, 800);
    }

    // ── Time-based animation ────────────────────────────
    video.addEventListener('timeupdate', function () {
        const pct = video.duration ? video.currentTime / video.duration : 0;

        // Update progress bar
        if (progressFill) {
            progressFill.style.width = (pct * 100) + '%';
        }

        // Bloom headlight effect
        if (bloom) {
            bloom.style.opacity = pct > 0.4 ? Math.min(1, (pct - 0.4) * 3) : 0;
        }

        // ── Phase 1: Letters appear (stagger) at 15% ──────
        if (pct > 0.15 && !lettersRevealed) {
            lettersRevealed = true;
            letters.forEach((letter, i) => {
                setTimeout(() => letter.classList.add('visible'), i * 100);
            });
        }

        // ── Phase 2: Title slides up at 35% ───────────────
        if (pct > 0.35 && !titleSettled) {
            titleSettled = true;
            porscheText.classList.add('settled');
        }


    });

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
