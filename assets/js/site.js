/* =============================================================================
   assets/js/site.js – KOMPLETT & KOMMENTIERT
   -----------------------------------------------------------------------------
   Zweck:
   - Globalen Header/Footer laden (horizontales Sticky-Menü auf allen Seiten)
   - Responsive Collapsible-Navigation (Burger) inkl. A11y
   - Aktiven Menüpunkt markieren (aria-current, .is-active)
   - Footer-Jahr & E-Mail sicher einsetzen
   - Kontaktblock-Deduplizierung
   - (optional) RZ-Lupe + Vollbild (Pan & Zoom), nur wenn Hooks vorhanden
   - (optional) Galerie (horizontales Scroll-Snap Karussell)
   - (optional) Accordion (WAI-ARIA-light)

   Abhängigkeiten im HTML (MINDESTENS):
   -----------------------------------------------------------------------------
   <header id="site-header" class="site-header" role="banner"></header>
   <div id="site-footer"></div>
   <script src="assets/js/site.js" defer></script>

   Abhängigkeiten im Header-Include (includes/header.html) für Mobile:
   -----------------------------------------------------------------------------
   - Button:  <button class="nav-toggle" aria-controls="primary-nav">
                <span class="nav-toggle__bars" aria-hidden="true"></span>
                <span class="nav-toggle__label">Menü</span>
              </button>
   - Nav:     <nav id="primary-nav" class="nav-main" data-collapsible>
                <ul class="nav-list">…</ul>
              </nav>

   Abhängigkeiten für RZ-Lupe/Vollbild (nur auf RZ-Seiten nötig):
   -----------------------------------------------------------------------------
   figure.rz-zoom > img.diagram[data-full] + .rz-zoom__lens + .rz-zoom__open
   #rzModal .rz-stage > .rz-stage__img   (+ Schließen/Zoom-Buttons optional)

   Abhängigkeiten für Galerie (optional, beliebig oft verwendbar):
   -----------------------------------------------------------------------------
   .gallery  > .gallery__toolbar (Prev/Next) + .gallery__viewport > .gallery__track > .gallery__slide*
             + .gallery__dots > .gallery__dot*

   Hinweise:
   - Alles ist in eine IIFE gekapselt (keine Globals in window).
   - Kommentare zeigen exakte Aufgaben & Stolpersteine.
   ============================================================================= */

(() => {
  'use strict';

  /* ---------------------------------------------------------------------------
   * (0) Utilities – Mini-Helfer ohne Abhängigkeiten
   * ------------------------------------------------------------------------ */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /**
   * include(sel, url) – HTML-Snippet (Header/Footer) laden und in Host einsetzen.
   * Progressive Enhancement: lädt NICHT, wenn bereits Content (ohne <noscript>) vorhanden.
   */
  const include = (sel, url) => {
    const host = $(sel);
    if (!host) return Promise.resolve(false);
    const alreadyFilled = host.children.length > 0 && !host.querySelector('noscript');
    if (alreadyFilled) return Promise.resolve(true);
    return fetch(url)
      .then(r => (r.ok ? r.text() : ''))
      .then(html => { if (html) host.innerHTML = html; return !!html; })
      .catch(() => false);
  };

  /* ---------------------------------------------------------------------------
   * (1) Kontaktblock-Deduplizierung
   *  - Behalte den im Footer (#site-footer .contact-block) oder den zuletzt
   *    vorhandenen. Entferne alle anderen Vorkommen.
   *  - Läuft initial + via MutationObserver (falls später noch Inhalt injected wird).
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
   * (2) Headerhöhe → CSS-Var --header-h
   *  - Nützlich als Sticky-Offset oder wenn etwas „unter dem Header“ starten soll.
   *  - Robust, falls .brand-bar (alte Variante) noch existiert.
   * ------------------------------------------------------------------------ */
  function setHeaderHeightVar() {
    const header   = $('.site-header');
    const brandBar = $('.brand-bar'); // optional
    if (!header) return;
    const compute = () => {
      const h = header.offsetHeight + (brandBar ? brandBar.offsetHeight : 0);
      document.documentElement.style.setProperty('--header-h', `${h}px`);
    };
    compute();
    window.addEventListener('resize', compute);
  }

  /* ---------------------------------------------------------------------------
   * (3) Aktiven Menüpunkt markieren (OHNE Drawer)
   *  - Vergleich auf Dateinamebene, Query/Hash werden ignoriert.
   *  - Setzt a[aria-current="page"] + .is-active (für CSS).
   * ------------------------------------------------------------------------ */
  function markActiveLink() {
    const current = location.pathname.split('/').pop() || 'index.html';
    const links = $$('.nav-list a[href]'); // kommt aus includes/header.html
    links.forEach(a => {
      const href = (a.getAttribute('href') || '')
        .split('/').pop().split('#')[0].split('?')[0];
      const onPage = href === current;
      a.classList.toggle('is-active', onPage);
      if (onPage) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* ---------------------------------------------------------------------------
   * (3b) Responsive Navigation (Burger / Collapsible)
   *  - Button .nav-toggle toggelt #primary-nav[data-collapsible]
   *  - A11y: aria-expanded, ESC schließt, Klick auf Link schließt
   *  - Resize: beim Wechsel auf Desktop schließen
   * ------------------------------------------------------------------------ */
  function initResponsiveNav() {
    const header = document.getElementById('site-header');
    if (!header) return;

    const toggle = header.querySelector('.nav-toggle');
    const nav    = header.querySelector('#primary-nav[data-collapsible]');
    if (!toggle || !nav) return; // Header-Markup fehlt → ruhig aussteigen

    // Startzustand
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.remove('is-open');
    nav.classList.remove('is-open');

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.classList.toggle('is-open', open); // ermöglicht Icon-Animation via CSS
      nav.classList.toggle('is-open', open);    // triggert Collapsible (z. B. max-height)
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

    // Klick auf Link schließt (Mobile-Usability)
    nav.addEventListener('click', (e) => {
      const link = (e.target instanceof HTMLElement) ? e.target.closest('a[href]') : null;
      if (link) setOpen(false);
    });

    // Bei Resize von klein → groß: sicherheitshalber schließen
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      if (w !== lastW) {
        if (w > 960) setOpen(false); // Breakpoint zum CSS passend halten
        lastW = w;
      }
    });
  }

  /* ---------------------------------------------------------------------------
   * (4) Footer-Jahr & E-Mail hydratisieren (Spam-sicher)
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
    // Ersetze nur Platzhalter wie „E-Mail anzeigen“
    if (/anzeigen/i.test(link.textContent || '')) link.textContent = addr;
    // rel="nofollow" kann bleiben oder entfernt werden (SEO-Policy)
    // link.removeAttribute('rel');
  }

  /* ---------------------------------------------------------------------------
   * (5) Bootstrapping – Includes laden → Initialisierungen → Schutz/Optionals
   *  - Nur EIN zentraler DOMContentLoaded-Listener (keine Duplikate!)
   * ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
      include('#site-header', 'includes/header.html'),
      include('#site-footer', 'includes/footer.html'),
    ]).then(() => {
      // Alles da → Features aktivieren
      setHeaderHeightVar();   // CSS-Var für Sticky-Offset
      initResponsiveNav();    // Burger/Collapsible
      markActiveLink();       // aktives Menü
      setYear();              // Jahr im Footer
      hydrateContactEmail();  // E-Mail-Link

      // Schutz: doppelte Kontaktblöcke vermeiden
      ensureSingleContact();
      observeOnceForContacts();

      // Optionale Features (no-op, falls Hooks fehlen)
      initRZZoom();
      initGalleries();
      initAccordion();
    });
  });

  /* ============================================================================
   * (G) Galerie: natives horizontales Karussell (Scroll-Snap)
   *  - unterstützt mehrere .gallery-Instanzen pro Seite
   *  - ARIA: Dots als Tabs, Viewport aria-live="polite"
   * ======================================================================== */
  function initGalleries(){
    $$('.gallery').forEach(g => {
      const viewport = g.querySelector('.gallery__viewport');
      const track    = g.querySelector('.gallery__track');
      const slides   = Array.from(g.querySelectorAll('.gallery__slide'));
      const prevBtn  = g.querySelector('.gallery__btn--prev');
      const nextBtn  = g.querySelector('.gallery__btn--next');
      const dots     = Array.from(g.querySelectorAll('.gallery__dot'));
      if (!viewport || !track || slides.length === 0) return;

      let idx = 0; // aktueller Slide-Index
      const slideWidth = () => viewport.getBoundingClientRect().width;

      function goTo(i){
        idx = Math.max(0, Math.min(i, slides.length - 1));
        viewport.scrollTo({ left: idx * slideWidth(), behavior: 'smooth' });
        updateUI();
      }
      function updateUI(){
        dots.forEach((d, i) => d.setAttribute('aria-selected', String(i === idx)));
        prevBtn?.toggleAttribute('disabled', idx === 0);
        nextBtn?.toggleAttribute('disabled', idx === slides.length - 1);
      }
      function syncIndexFromScroll(){
        const i = Math.round(viewport.scrollLeft / slideWidth());
        if (i !== idx){ idx = i; updateUI(); }
      }

      prevBtn?.addEventListener('click', () => goTo(idx - 1));
      nextBtn?.addEventListener('click', () => goTo(idx + 1));
      dots.forEach((dot, i) => {
        dot.addEventListener('click', () => goTo(i));
        dot.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft') { e.preventDefault(); (dots[i-1]||dots[0]).focus(); goTo(Math.max(0, i-1)); }
          if (e.key === 'ArrowRight'){ e.preventDefault(); (dots[i+1]||dots[dots.length-1]).focus(); goTo(Math.min(dots.length-1, i+1)); }
        });
      });

      viewport.addEventListener('scroll', () => { window.requestAnimationFrame(syncIndexFromScroll); });
      window.addEventListener('resize', () => goTo(idx));
      updateUI();
    });
  }

  /* ============================================================================
   * (H) Accordion (leichtgewichtig, A11y-safe)
   * - Schaltet aria-expanded und hidden; progressive Enhancement
   * ======================================================================== */
  function initAccordion(){
    const roots = $$('.accordion[data-accordion]');
    roots.forEach(root => {
      root.addEventListener('click', (e) => {
        const btn = (e.target instanceof HTMLElement) ? e.target.closest('.accordion__trigger') : null;
        if (!btn) return;
        const panelId = btn.getAttribute('aria-controls');
        const panel   = panelId ? document.getElementById(panelId) : null;
        if (!panel) return;
        const open = btn.getAttribute('aria-expanded') === 'true';
        btn.setAttribute('aria-expanded', String(!open));
        panel.hidden = open;
      });
    });
  }

  /* ---------------------------------------------------------------------------
   * (6) RZ-Diagramm: Lupe + Vollbild (Pan & Zoom)
   *  - Aktiv nur, wenn alle DOM-Hooks vorhanden sind.
   *  - Starker Linsen-Zoom (Standard 400 %, ALT → 600 % Turbo).
   *  - NEU: Linsen-Zoom per Mausrad (konfigurierbar, mit Min/Max).
   * ------------------------------------------------------------------------ */
  function initRZZoom() {
    // (A) DOM-Hooks
    const fig   = $('.rz-zoom');
    const img   = fig?.querySelector('img.diagram');
    const lens  = fig?.querySelector('.rz-zoom__lens');
    const openB = fig?.querySelector('.rz-zoom__open');

    const modal = $('#rzModal');
    const stage = modal?.querySelector('.rz-stage');
    const full  = modal?.querySelector('.rz-stage__img');
    const closers = modal?.querySelectorAll('[data-close], .rz-modal__backdrop, .rz-modal__close') || [];

    if (!fig || !img || !lens || !openB || !modal || !stage || !full) return; // sauber aussteigen

    // (B) Konfiguration – zentrale Stellschrauben
    const CFG = {
      /* L U P E  (Overlay auf dem Vorschaubild) */
      lensSize: 180,         // Durchmesser der Lupe in px
      lensBgScale: 4.0,      // Standard-Vergrößerung → 4.0 = 400 %
      lensBgMin:   1.5,      // Untere Grenze für Lupe  (150 %)
      lensBgMax:  10.0,      // Obere Grenze für Lupe   (1000 %)
      wheelStepLens: 1.25,   // Mausrad-Schrittweite für Linse
      wheelTurbo:   1.10,    // Zusatzfaktor wenn ALT gehalten

      /* M O D A L  (Vollbild mit Pan & Zoom) */
      wheelStep: 1.15,
      zoomMin:   0.5,
      zoomMax:   6.0,
    };

    // (C) State & Helfer
    const on = (el, ev, fn, opts) => { el.addEventListener(ev, fn, opts); };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const fullSrc = img.getAttribute('data-full') || img.currentSrc || img.src;

    // Vollbild-Zoomzustand
    const Z = { scale: 1, min: CFG.zoomMin, max: CFG.zoomMax, x: 0, y: 0 };

    const apply  = () => { full.style.transform = `translate(${Z.x}px, ${Z.y}px) scale(${Z.scale})`; };
    const center = () => { full.src = fullSrc; Z.scale = 1; Z.x = Z.y = 0; apply(); };

    function setZoom(factor, cx, cy) {
      const prev = Z.scale;
      const next = clamp(prev * factor, Z.min, Z.max);
      if (next === prev) return;
      const r = stage.getBoundingClientRect();
      const px = (cx ?? r.width  / 2);
      const py = (cy ?? r.height / 2);
      // zum Cursorpunkt zoomen (stabiler UX)
      Z.x = px - (next / prev) * (px - Z.x);
      Z.y = py - (next / prev) * (py - Z.y);
      Z.scale = next;
      apply();
    }

    // (E) Lupe auf dem Vorschaubild
    let turbo = false;                  // ALT-Taste = Turbo-Zoom
    let lensScale = CFG.lensBgScale;    // aktueller Linsen-Zoom (Faktor)

    function applyLensZoom() {
      lens.style.backgroundSize = `${lensScale * 100}%`;
    }

    function initLens() {
      // Größe & Hintergrund der Linse
      lens.style.width  = `${CFG.lensSize}px`;
      lens.style.height = `${CFG.lensSize}px`;
      lens.style.backgroundImage = `url("${fullSrc}")`;
      applyLensZoom(); // Start: 400 %

      const showLens = (show) => { lens.style.display = show ? 'block' : 'none'; };

      function moveLens(ev) {
        const rect  = img.getBoundingClientRect();
        const lensW = lens.offsetWidth;
        const lensH = lens.offsetHeight;
        const cx = (ev.touches?.[0]?.clientX) ?? ev.clientX;
        const cy = (ev.touches?.[0]?.clientY) ?? ev.clientY;
        let x = cx - rect.left - lensW / 2;
        let y = cy - rect.top  - lensH / 2;
        x = clamp(x, 0, rect.width  - lensW);
        y = clamp(y, 0, rect.height - lensH);
        lens.style.left = `${x}px`;
        lens.style.top  = `${y}px`;
        const fx = (rect.width  - lensW) > 0 ? x / (rect.width  - lensW) : 0;
        const fy = (rect.height - lensH) > 0 ? y / (rect.height - lensH) : 0;
        lens.style.backgroundPosition = `${fx * 100}% ${fy * 100}%`;
      }

      // Maus
      on(img, 'mouseenter', () => showLens(true));
      on(img, 'mouseleave', () => showLens(false));
      on(img, 'mousemove',  moveLens);

      // Touch
      on(img, 'touchstart', (e) => { showLens(true);  moveLens(e); }, { passive: true });
      on(img, 'touchmove',  (e) => { moveLens(e); }, { passive: true });
      on(img, 'touchend',   ()  => { showLens(false); });

      // **NEU:** Mausrad auf dem Vorschaubild ändert Linsen-Zoom (mit Min/Max)
      on(img, 'wheel', (e) => {
        e.preventDefault();
        const step = e.deltaY < 0 ? CFG.wheelStepLens : (1 / CFG.wheelStepLens);
        const turboFactor = e.altKey ? CFG.wheelTurbo : 1;
        lensScale = clamp(lensScale * step * turboFactor, CFG.lensBgMin, CFG.lensBgMax);
        applyLensZoom();
      }, { passive: false });
    }

    // Turbo-Zoom (ALT gedrückt halten) – setzt kurzzeitig höher, loslassen = Standard
    on(document, 'keydown', (e) => {
      if (e.altKey && !turbo) { turbo = true; lensScale = clamp(CFG.lensBgScale * 1.5, CFG.lensBgMin, CFG.lensBgMax); applyLensZoom(); }
    });
    on(document, 'keyup', () => {
      if (turbo) { turbo = false; lensScale = CFG.lensBgScale; applyLensZoom(); }
    });

    // (F) Vollbild-Modal mit Pan & Zoom
    function initModal() {
      function openModal() {
        modal.hidden = false;
        center();
        stage.focus?.({ preventScroll: true });
        document.body.style.overflow = 'hidden';
      }
      function closeModal() {
        modal.hidden = true;
        document.body.style.overflow = '';
        openB.focus?.();
      }

      on(openB, 'click', openModal);
      (closers || []).forEach(el => on(el, 'click', closeModal));
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
        const t = e.touches[0];
        drag = { sx: t.clientX, sy: t.clientY, x: Z.x, y: Z.y };
      }, { passive: true });
      on(stage, 'touchmove', (e) => {
        if (!drag) return;
        const t = e.touches[0];
        Z.x = drag.x + (t.clientX - drag.sx);
        Z.y = drag.y + (t.clientY - drag.sy);
        apply();
      }, { passive: true });
      on(stage, 'touchend', () => { drag = null; });

      // Wheel-Zoom (zum Cursor) – nicht passive, da preventDefault
      on(stage, 'wheel', (e) => {
        e.preventDefault();
        const r = stage.getBoundingClientRect();
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        setZoom((e.deltaY < 0) ? CFG.wheelStep : 1 / CFG.wheelStep, cx, cy);
      }, { passive: false });

      // Tool-Buttons (optional vorhanden)
      modal.querySelector('[data-zoom="in"]')   ?.addEventListener('click', () => setZoom(1.2));
      modal.querySelector('[data-zoom="out"]')  ?.addEventListener('click', () => setZoom(1 / 1.2));
      modal.querySelector('[data-zoom="reset"]')?.addEventListener('click', () => { Z.scale = 1; Z.x = 0; Z.y = 0; apply(); });
    }

    // (G) Boot
    initLens();
    initModal();
  }

  // Ende Modul
})();
