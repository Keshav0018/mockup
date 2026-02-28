/* ══════════════════════════════════════════════════════════════
   Section Loader — Assembles modular sections into the page
   
   Usage in index.html:
     <div data-section="hero/hero.html"
          data-css="hero/hero.css"
          data-js="hero/hero.js"></div>
   
   For ES module scripts add: data-module="true"
══════════════════════════════════════════════════════════════ */

(async function loadSections() {
    const slots = document.querySelectorAll('[data-section]');

    for (const slot of slots) {
        const htmlPath = slot.getAttribute('data-section');
        const cssPath = slot.getAttribute('data-css');
        const jsPath = slot.getAttribute('data-js');
        const isModule = slot.getAttribute('data-module') === 'true';

        try {
            // 1. Load CSS first (non-blocking)
            if (cssPath) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = cssPath;
                document.head.appendChild(link);
            }

            // 2. Fetch and inject HTML
            const resp = await fetch(htmlPath);
            if (!resp.ok) throw new Error(`Failed to load ${htmlPath}: ${resp.status}`);
            const html = await resp.text();
            slot.innerHTML = html;

            // 3. Load JS after HTML is in the DOM
            if (jsPath) {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = jsPath;
                    if (isModule) script.type = 'module';
                    script.onload = resolve;
                    script.onerror = () => reject(new Error(`Failed to load ${jsPath}`));
                    document.body.appendChild(script);
                });
            }

            console.log(`[Loader] ✅ Loaded section: ${htmlPath}`);
        } catch (err) {
            console.error(`[Loader] ❌ Error loading section:`, err);
            slot.innerHTML = `<div style="padding:4rem;text-align:center;color:#c0392b;">
        Section failed to load: ${htmlPath}
      </div>`;
        }
    }

    // Fire event when all sections are loaded
    document.dispatchEvent(new CustomEvent('all-sections-loaded'));
    console.log('[Loader] All sections loaded.');
})();
