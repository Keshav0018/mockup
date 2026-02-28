/* ══════════════════════════════════════════════════════════════
   TIMELINE SECTION — Initializer
   Loads timeline-engine.js (CarTimeline class) and instantiates it
══════════════════════════════════════════════════════════════ */

(function timelineInit() {
    const mount = document.getElementById('carTimelineMount');
    if (!mount) {
        console.warn('[Timeline] Mount element #carTimelineMount not found.');
        return;
    }

    // Load the CarTimeline engine script, then initialize
    const script = document.createElement('script');
    script.src = 'timeline/timeline-engine.js';
    script.onload = function () {
        if (typeof CarTimeline === 'undefined') {
            console.error('[Timeline] CarTimeline class not found after loading engine.');
            return;
        }

        console.log('[Timeline] Initializing CarTimeline...');
        new CarTimeline('carTimelineMount', 'brand_assets/timeline/', 160, {
            lerpFactor: 0.045,
            scrollHeight: '800vh'
        });
    };
    script.onerror = function () {
        console.error('[Timeline] Failed to load timeline-engine.js');
    };
    document.body.appendChild(script);
})();
