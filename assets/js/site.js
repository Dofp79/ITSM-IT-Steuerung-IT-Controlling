/* =============================================================================
   assets/js/site.js  –  NEUE VERSION für horizontales Sticky-Menü (ohne Drawer)
   -----------------------------------------------------------------------------
   Inhalt (alles streng gekapselt, keine Globals):
   - (0) Utilities ($, $$, include)
   - (1) Schutzmaßnahme: genau EIN .contact-block im gesamten DOM
   - (2) Headerhöhe → CSS-Var --header-h (z. B. für Sticky-Offset)
   - (3) Navigation (OHNE Drawer): aktiven Menüpunkt markieren (aria-current, .is-active)
   - (3b) Responsive Navigation (Burger/Collapsible) – A11y, ESC, Link-Klick, Resize
   - (4) Footer: Jahr setzen & E-Mail sicher hydratisieren
   - (5) Boot: Header/Footer includen → Initialisierungen → Kontakt-Schutz
   - (6) RZ-Diagramm (optional): Lupe + Vollbild (Pan & Zoom) – nur wenn Hooks existieren
   ============================================================================= */

(() => {
  'use strict';

  /* ---------------------------------------------------------------------------
   * (0) Utilities
   * - $  : querySelector Kurzform
   * - $$ : querySelectorAll als Array
   * - include(sel, url): lädt HTML-Include in ein Host-Element (Progressive Enhancement)
   * ------------------------------------------------------------------------ */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const include = (sel, url) => {
    const host = $(sel);
    if (!host) return Promise.resolve(false);
    // Bereits gefüllt? (z. B. durch SSR/CMS/anderen Loader) → nichts tun
    const alreadyFilled = host.children.length > 0 && !host.querySelector('noscript');
    if (alreadyFilled) return Promise.resolve(true);
    return fetch(url)
      .then(r => (r.ok ? r.text() : ''))
      .then(html => { if (html) host.innerHTML = html; return !!html; })
      .catch(() => false);
  };

  /* ---------------------------------------------------------------------------
   * (1) Nur EIN Kontaktblock auf der Seite lassen
   *  - Bevorzugt den im Footer (#site-footer .contact-block), sonst den zuletzt
   *    vorhandenen. Entfernt Duplikate.
   *  - Läuft initial & via MutationObserver (falls später erneut injected wird).
   * ------------------------------------------------------------------------ */
  function ensureSingleContact() {
    const all = $$('.contact-block');
    if (all.length <= 1) return;
    const footerOne = $('#site-footer .contact-block');
    const keep = footerOne || all[all.length - 1];
    all.forEach(el => { if (el !== keep) el.remove(); });
  }
  const observeOnceForContacts = (() => {
    let started = false;
    return () => {
      if (started) return;
      const obs = new MutationObserver(() => ensureSingleContact());
      obs.observe(document.body, { childList: true, subtree: true });
      started = true;
    };
  })();

  /* ---------------------------------------------------------------------------
   * (2) Headerhöhe messen → --header-h setzen
   *  - Nützlich, wenn Layout unterhalb des Sticky-Headers mit Abstand starten soll.
   * ------------------------------------------------------------------------ */
  function setHeaderHeightVar() {
    const header   = $('.site-header'); // aus includes/header.html
    const brandBar = $('.brand-bar');   // optional (ältere Variante)
    if (!header) return;
    const compute = () => {
      const h = header.offsetHeight + (brandBar ? brandBar.offsetHeight : 0);
      document.documentElement.style.setProperty('--header-h', `${h}px`);
    };
    compute();
    window.addEventListener('resize', compute);
  }

  /* ---------------------------------------------------------------------------
   * (3) Navigation (OHNE Drawer) – aktiven Menüpunkt markieren
   *  - Vergleicht den aktuellen Dateinamen (…/seite.html) mit den href-Endungen
   *  - Setzt a[aria-current="page"] (A11y) und .is-active (für CSS)
   * ------------------------------------------------------------------------ */
  function markActiveLink() {
    // Liefert bei / oder leeren Pfaden "index.html"
    const current = location.pathname.split('/').pop() || 'index.html';
    // Links im globalen Horizontalmenü (kommt aus includes/header.html)
    const links = $$('.nav-list a[href]');
    links.forEach(a => {
      // Vergleich nur auf Dateinamebene (ohne Ordner, Query, Hash)
      const href = (a.getAttribute('href') || '').split('/').pop().split('#')[0].split('?')[0];
      const onPage = href === current;
      a.classList.toggle('is-active', onPage);
      if (onPage) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* ---------------------------------------------------------------------------
   * (3b) Responsive Navigation (Burger für Mobile)
   *  - Button .nav-toggle steuert das Collapsible #primary-nav[data-collapsible]
   *  - A11y: aria-expanded wird gepflegt; ESC & Link-Klick schließen
   *  - Zusätzlich: .is-open auch am Button (für Icon-Animationen via CSS)
   * ------------------------------------------------------------------------ */
  function initResponsiveNav(){
    // WICHTIG: Nach dem Include ausführen, damit der Header im DOM ist
    const header = document.getElementById('site-header');
    if (!header) return;

    const toggle = header.querySelector('.nav-toggle');
    const nav    = header.querySelector('#primary-nav[data-collapsible]');
    if (!toggle || !nav) return; // Falls Markup fehlt, sauber aussteigen

    // Initialzustand (geschlossen)
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.remove('is-open');
    nav.classList.remove('is-open');

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.classList.toggle('is-open', open); // ermöglicht „X“-Icon per CSS
      nav.classList.toggle('is-open', open);    // triggert Collapsible (max-height)
      // Hinweis: Da kein Offcanvas, kein Body-Scroll-Lock nötig
    };

    // Toggle per Klick
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      setOpen(!open);
    });

    // ESC schließt
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });

    // Klick auf Navigationslink schließt (Mobile-Komfort)
    nav.addEventListener('click', (e) => {
      const link = (e.target instanceof HTMLElement) ? e.target.closest('a[href]') : null;
      if (link) setOpen(false);
    });

    // Bei Resize von mobil → desktop: sicherheitshalber schließen
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      if (w !== lastW){
        if (w > 960) setOpen(false); // Breakpoint muss zu deinem CSS passen
        lastW = w;
      }
    });
  }

  /* ---------------------------------------------------------------------------
   * (4) Footer-Jahr & Kontakt-Mail (Spam-sicher)
   *  - Jahr:  <span data-year>…</span>  → wird dynamisch ersetzt
   *  - E-Mail: <a id="contactEmail" data-email-user="..." data-email-domain="...">
   *            → wird zu "mailto:user@domain" und ersetzt Platzhaltertext
   * ------------------------------------------------------------------------ */
  function setYear() {
    const y = new Date().getFullYear();
    $$('[data-year]').forEach(n => { n.textContent = String(y); });
  }

  function hydrateContactEmail() {
    const link = $('#contactEmail');
    if (!link) return;
    const user = link.getAttribute('data-email-user');
    const dom  = link.getAttribute('data-email-domain');
    if (!user || !dom) return;
    const addr = `${user}@${dom}`;
    link.href = `mailto:${addr}`;
    // Nur Platzhalter wie „E-Mail anzeigen“ überschreiben
    if (/anzeigen/i.test(link.textContent || '')) link.textContent = addr;
    // rel="nofollow" kann bleiben oder entfernt werden – je nach SEO-Vorgabe
    // link.removeAttribute('rel');
  }

  /* ---------------------------------------------------------------------------
   * (5) Bootstrapping
   *  - Lädt Header/Footer-Includes und initialisiert anschließend alle Features
   *  - WICHTIG: nur EIN zentraler DOMContentLoaded-Listener (keine Duplikate)
   * ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
      include('#site-header', 'includes/header.html'), // globales horizontales Menü
      include('#site-footer', 'includes/footer.html'), // globaler Kontakt + Footer
    ]).then(() => {
      // Initialisierungen NACH dem Laden der Includes:
      setHeaderHeightVar();   // CSS-Var für Sticky-Offset
      initResponsiveNav();    // ← NEU: Burger/Collapsible aktivieren
      markActiveLink();       // aktives Menü-Item markieren
      setYear();              // Copyright-Jahr aktualisieren
      hydrateContactEmail();  // E-Mail-Link sicher aktivieren

      // Kontakt-Blöcke deduplizieren (falls Seiten noch lokale Kontaktteile haben)
      ensureSingleContact();
      observeOnceForContacts();

      // Optional: RZ-Lupe/Modal initialisieren (no-op, falls Hooks fehlen)
      initRZZoom();
    });
  });

  /* ---------------------------------------------------------------------------
   * (6) RZ-Diagramm: Lupe + Vollbild (Pan & Zoom) – robuste, kommentierte Version
   *  Voraussetzungen im Markup (siehe rz-architektur.html):
   *    figure.rz-zoom > img.diagram[data-full] + .rz-zoom__lens + .rz-zoom__open
   *    #rzModal .rz-stage > .rz-stage__img, Buttons [data-close], [data-zoom]
   * ------------------------------------------------------------------------ */
  function initRZZoom() {
    // ---------- (A) DOM-Hooks einsammeln ------------------------------------
    const fig   = $('.rz-zoom');
    const img   = fig?.querySelector('img.diagram');
    const lens  = fig?.querySelector('.rz-zoom__lens');
    const openB = fig?.querySelector('.rz-zoom__open');

    const modal = $('#rzModal');
    const stage = modal?.querySelector('.rz-stage');
    const full  = modal?.querySelector('.rz-stage__img');
    const closers = modal?.querySelectorAll('[data-close], .rz-modal__backdrop, .rz-modal__close') || [];

    // Fehlende Hooks? → ruhig aussteigen (kein Fehler, nur kein Feature)
    if (!fig || !img || !lens || !openB || !modal || !stage || !full) return;

    // ---------- (B) Config an EINER Stelle ----------------------------------
    const CFG = {
      lensSize: 130,          // Durchmesser der Lupe in px (CSS spiegelt das)
      lensBgScale: 2.0,       // 2.0 = 200% (Vergrößerungsfaktor der Lupe)
      wheelStep: 1.15,        // Zoom-Schritt pro Wheel-Tick
      zoomMin: 0.5,           // untere Zoom-Grenze im Modal
      zoomMax: 6.0,           // obere Zoom-Grenze im Modal
    };

    // ---------- (C) State ----------------------------------------------------
    // Vollbild-Zoomzustand
    const Z = { scale: 1, min: CFG.zoomMin, max: CFG.zoomMax, x: 0, y: 0 };
    // Für Event-Cleanup (wichtig bei Hot-Reload/SPA)
    const destroy = [];

    // ---------- (D) Helpers --------------------------------------------------
    const on = (el, ev, fn, opts) => { el.addEventListener(ev, fn, opts); destroy.push(() => el.removeEventListener(ev, fn, opts)); };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // Bildquelle für Lupe/Vollbild bestimmen
    const fullSrc = img.getAttribute('data-full') || img.currentSrc || img.src;

    // Wendet transform auf das Vollbild an
    const apply = () => { full.style.transform = `translate(${Z.x}px, ${Z.y}px) scale(${Z.scale})`; };

    const center = () => {
      // Vollbild stets aus der hochauflösenden Quelle laden
      full.src = fullSrc;
      Z.scale = 1; Z.x = 0; Z.y = 0;
      apply();
    };

    // Zoomen um einen Bezugspunkt (cx, cy) innerhalb der Bühne
    function setZoom(factor, cx, cy) {
      const prev = Z.scale;
      const next = clamp(prev * factor, Z.min, Z.max);
      if (next === prev) return;

      const r = stage.getBoundingClientRect();
      const px = (cx ?? r.width / 2);
      const py = (cy ?? r.height / 2);

      // Zoom zum Cursorpunkt: versetze das Bild proportional
      Z.x = px - (next / prev) * (px - Z.x);
      Z.y = py - (next / prev) * (py - Z.y);
      Z.scale = next;
      apply();
    }

    // ---------- (E) Lupe auf dem Vorschaubild -------------------------------
    function initLens() {
      // CSS-Größe auch inline für sichere Berechnung (optional, CSS hat es bereits)
      lens.style.width = `${CFG.lensSize}px`;
      lens.style.height = `${CFG.lensSize}px`;

      // Hintergrundbild für Lens (die hochauflösende Variante)
      lens.style.backgroundImage = `url("${fullSrc}")`;
      lens.style.backgroundSize  = `${CFG.lensBgScale * 100}%`; // z. B. 200%

      const showLens = (show) => { lens.style.display = show ? 'block' : 'none'; };

      function moveLens(ev) {
        const rect  = img.getBoundingClientRect();
        const lensW = lens.offsetWidth;
        const lensH = lens.offsetHeight;

        // Cursorposition (Maus ODER Touch)
        const cx = (ev.touches?.[0]?.clientX) ?? ev.clientX;
        const cy = (ev.touches?.[0]?.clientY) ?? ev.clientY;

        // Position relativ zum Bildmitte der Lupe
        let x = cx - rect.left - lensW / 2;
        let y = cy - rect.top  - lensH / 2;

        // An Bildränder klemmen (Lupe ragt nicht heraus)
        x = clamp(x, 0, rect.width  - lensW);
        y = clamp(y, 0, rect.height - lensH);

        // Lens positionieren
        lens.style.left = `${x}px`;
        lens.style.top  = `${y}px`;

        // Hintergrundposition prozentual (0–100)
        const fx = (rect.width  - lensW) > 0 ? x / (rect.width  - lensW) : 0;
        const fy = (rect.height - lensH) > 0 ? y / (rect.height - lensH) : 0;
        lens.style.backgroundPosition = `${fx * 100}% ${fy * 100}%`;
      }

      // Nur starten, wenn das Bild Maße hat (LCP-sicher)
      const ensureReady = () => {
        const ready = img.complete && img.naturalWidth > 0;
        if (!ready) return false;
        return true;
      };

      if (!ensureReady()) {
        const onLoad = () => {
          showLens(false);
          img.removeEventListener('load', onLoad);
        };
        on(img, 'load', onLoad, { once: true });
      }

      // Maus-Interaktion
      on(img, 'mouseenter', () => showLens(true));
      on(img, 'mouseleave', () => showLens(false));
      on(img, 'mousemove',  moveLens);

      // Touch-Interaktion (passive für Scroll-Performance)
      on(img, 'touchstart', (e) => { showLens(true);  moveLens(e); }, { passive: true });
      on(img, 'touchmove',  (e) => { moveLens(e); }, { passive: true });
      on(img, 'touchend',   ()  => { showLens(false); });
    }

    // ---------- (F) Modal mit Pan & Zoom ------------------------------------
    function initModal() {
      // Öffnen/Schließen
      function openModal() {
        modal.hidden = false;
        center(); // Bild und Zoom zurücksetzen
        stage.focus?.({ preventScroll: true });
        document.body.style.overflow = 'hidden'; // Scroll der Seite verhindern
      }
      function closeModal() {
        modal.hidden = true;
        document.body.style.overflow = '';
        openB.focus?.(); // Fokus zurück zum Auslöser
      }

      on(openB, 'click', openModal);
      closers.forEach(el => on(el, 'click', closeModal));
      on(document, 'keydown', (e) => { if (!modal.hidden && e.key === 'Escape') closeModal(); });

      // Pan (Maus)
      let drag = null;
      on(stage, 'mousedown', (e) => { drag = { sx: e.clientX, sy: e.clientY, x: Z.x, y: Z.y }; });
      on(document, 'mousemove', (e) => {
        if (!drag) return;
        Z.x = drag.x + (e.clientX - drag.sx);
        Z.y = drag.y + (e.clientY - drag.sy);
        apply();
      });
      on(document, 'mouseup', () => { drag = null; });

      // Pan (Touch)
      on(stage, 'touchstart', (e) => {
        const t = e.touches[0]; drag = { sx: t.clientX, sy: t.clientY, x: Z.x, y: Z.y };
      }, { passive: true });
      on(stage, 'touchmove', (e) => {
        if (!drag) return;
        const t = e.touches[0];
        Z.x = drag.x + (t.clientX - drag.sx);
        Z.y = drag.y + (t.clientY - drag.sy);
        apply();
      }, { passive: true });
      on(stage, 'touchend', () => { drag = null; });

      // Wheel-Zoom (zum Cursor) – NICHT passive, da wir preventDefault nutzen
      on(stage, 'wheel', (e) => {
        e.preventDefault();
        const r = stage.getBoundingClientRect();
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        setZoom((e.deltaY < 0) ? 1.15 : 1 / 1.15, cx, cy);
      }, { passive: false });

      // Tool-Buttons (optional vorhanden)
      modal.querySelector('[data-zoom="in"]')    ?.addEventListener('click', () => setZoom(1.2));
      modal.querySelector('[data-zoom="out"]')   ?.addEventListener('click', () => setZoom(1 / 1.2));
      modal.querySelector('[data-zoom="reset"]') ?.addEventListener('click', () => { Z.scale = 1; Z.x = 0; Z.y = 0; apply(); });
    }

    // ---------- (G) Resize-Anpassungen --------------------------------------
    function onResize() {
      // Bei Größenwechsel des Vorschaubildes bleibt die Lupe stimmig —
      // der Hintergrund skaliert prozentual (z. B. 200%), daher kein Recalc nötig.
      // Optional: lensSize/lensBgScale dynamisch anpassen.
    }
    window.addEventListener('resize', onResize);

    // ---------- (H) Boot -----------------------------------------------------
    initLens();
    initModal();
  }

  // Hinweis: KEINE alte Drawer-Initialisierung mehr! (Früher: initMenu() mit .burger/#navdrawer)
})(); // Ende IIFE
