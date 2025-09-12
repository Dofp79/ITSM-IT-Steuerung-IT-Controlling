/* =============================================================================
   assets/js/site.js
   -----------------------------------------------------------------------------
   Zweck:
   - Globalen Header/Footer laden (horizontales Sticky-Menü auf allen Seiten)
   - Responsive Collapsible-Navigation (Burger) inkl. A11y
   - Aktiven Menüpunkt markieren (aria-current, .is-active)
   - Footer-Jahr & E-Mail sicher einsetzen
   - Kontaktblock-Deduplizierung (nur 1x anzeigen)
   - (optional) RZ-Lupe + Vollbild (Pan & Zoom), nur wenn Hooks vorhanden sind
   - NEU: Off-Canvas-Menü (mobil), inspiriert von CiberCuba

   HTML-Abhängigkeiten (MINDESTENS):
   -----------------------------------------------------------------------------
   <header id="site-header" class="site-header" role="banner"></header>
   <div id="site-footer"></div>
   <script src="assets/js/site.js" defer></script>

   Header-Include (includes/header.html) – Mobile Hooks:
   -----------------------------------------------------------------------------
   - Button (Burger):   [data-offcanvas-trigger]
   - Panel (Offcanvas): [data-offcanvas] (enthält Overlay [data-offcanvas-close])
   - Collapsible Nav:   <nav id="primary-nav" class="nav-main" data-collapsible>…</nav>

   Hinweise:
   - Alles ist in eine IIFE gekapselt → keine Globals.
   - Kommentare markieren Stolpersteine und A11y-Details.
   ============================================================================= */

(() => {
  'use strict';

  /* ---------------------------------------------------------------------------
   * (0) Mini-Utilities
   * ------------------------------------------------------------------------ */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /**
   * HTML-Snippet (Header/Footer) per fetch() laden und in Host einsetzen.
   * Progressive Enhancement: wird NICHT geladen, wenn bereits Content
   * (ohne <noscript>) vorhanden ist.
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
   * (2) Headerhöhe → CSS-Var --header-h (z. B. für Sticky-Offset)
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
   * (3) Aktiven Menüpunkt markieren (Dateiname vergleichen)
   * ------------------------------------------------------------------------ */
  function markActiveLink() {
    const current = location.pathname.split('/').pop() || 'index.html';
    const links = $$('.nav-list a[href]');
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
   * (3b) Collapsible-Navigation (Burger über dem Header – NICHT Off-Canvas)
   * ------------------------------------------------------------------------ */
  function initResponsiveNav() {
    const header = document.getElementById('site-header');
    if (!header) return;

    const toggle = header.querySelector('.nav-toggle');
    const nav    = header.querySelector('#primary-nav[data-collapsible]');
    if (!toggle || !nav) return;

    // sauberer Startzustand
    toggle.setAttribute('aria-expanded', 'false');
    toggle.classList.remove('is-open');
    nav.classList.remove('is-open');

    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.classList.toggle('is-open', open);
      nav.classList.toggle('is-open', open);
    };

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      setOpen(!open);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });

    nav.addEventListener('click', (e) => {
      const link = (e.target instanceof HTMLElement) ? e.target.closest('a[href]') : null;
      if (link) setOpen(false);
    });

    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      if (w !== lastW) {
        if (w > 960) setOpen(false);
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
    if (/anzeigen/i.test(link.textContent || '')) link.textContent = addr;
  }

  /* ---------------------------------------------------------------------------
   * (5) Off-Canvas-Menü (mobil) – inspiriert von CiberCuba
   *  - NICHT sofort starten → erst nach dem Header-Include aufrufen!
   * ------------------------------------------------------------------------ */
  function initOffcanvas(){
    const oc = document.querySelector('[data-offcanvas]');
    const trigger = document.querySelector('[data-offcanvas-trigger]');
    if (!oc || !trigger) return; // Header/Markup noch nicht da → ruhig aussteigen

    const overlay  = oc.querySelector('[data-offcanvas-close]'); // Klick → schließen
    const closeBtn = oc.querySelector('.offcanvas__close');       // X-Button
    const focusablesSel = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';
    let lastActive = null;

    const setOpen = (open) => {
      oc.classList.toggle('is-open', open);
      document.body.classList.toggle('offcanvas-open', open);
      oc.setAttribute('aria-hidden', String(!open));
      trigger.setAttribute('aria-expanded', String(open));

      if (open) {
        lastActive = document.activeElement;
        oc.focus(); // Fokus auf Panel (A11y)
        document.addEventListener('keydown', onKeydown);
      } else {
        document.removeEventListener('keydown', onKeydown);
        lastActive && lastActive.focus && lastActive.focus();
      }
    };

    const onKeydown = (e) => {
      // ESC schließt
      if (e.key === 'Escape') { setOpen(false); return; }
      // einfache Fokus-Falle
      if (e.key === 'Tab') {
        const items = oc.querySelectorAll(focusablesSel);
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first){ last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && document.activeElement === last){ first.focus(); e.preventDefault(); }
      }
    };

    // Öffnen
    trigger.addEventListener('click', () => setOpen(true));

    // Schließen (Overlay + X + Link-Klick)
    overlay?.addEventListener('click', () => setOpen(false));
    closeBtn?.addEventListener('click', () => setOpen(false));
    oc.addEventListener('click', (e) => {
      const a = (e.target instanceof HTMLElement) ? e.target.closest('a[href]') : null;
      if (a) setOpen(false);
    });

    // Sicherheitsnetz: bei Resize → Desktop schließen
    let lastW = window.innerWidth;
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      if (w !== lastW && w > 960) setOpen(false);
      lastW = w;
    });
  }

  /* ---------------------------------------------------------------------------
   * (6) RZ-Diagramm: Lupe + Vollbild (Pan & Zoom)
   *  - Wird nur aktiv, wenn alle DOM-Hooks vorhanden sind.
   * ------------------------------------------------------------------------ */
  function initRZZoom() {
    const fig   = $('.rz-zoom');
    const img   = fig?.querySelector('img.diagram');
    const lens  = fig?.querySelector('.rz-zoom__lens');
    const openB = fig?.querySelector('.rz-zoom__open');

    const modal = $('#rzModal');
    const stage = modal?.querySelector('.rz-stage');
    const full  = modal?.querySelector('.rz-stage__img');
    const closers = modal?.querySelectorAll('[data-close], .rz-modal__backdrop, .rz-modal__close') || [];

    if (!fig || !img || !lens || !openB || !modal || !stage || !full) return;

    const CFG = {
      lensSize: 180,
      lensBgScale: 4.0,
      lensBgMin:   1.5,
      lensBgMax:  10.0,
      wheelStepLens: 1.25,
      wheelTurbo:   1.10,
      wheelStep: 1.15,
      zoomMin:   0.5,
      zoomMax:   6.0,
    };

    const destroy = [];
    const on = (el, ev, fn, opts) => { el.addEventListener(ev, fn, opts); destroy.push(() => el.removeEventListener(ev, fn, opts)); };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    const fullSrc = img.getAttribute('data-full') || img.currentSrc || img.src;
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
      Z.x = px - (next / prev) * (px - Z.x);
      Z.y = py - (next / prev) * (py - Z.y);
      Z.scale = next;
      apply();
    }

    let turbo = false;
    let lensScale = CFG.lensBgScale;
    const applyLensZoom = () => { lens.style.backgroundSize = `${lensScale * 100}%`; };

    function initLens() {
      lens.style.width  = `${CFG.lensSize}px`;
      lens.style.height = `${CFG.lensSize}px`;
      lens.style.backgroundImage = `url("${fullSrc}")`;
      applyLensZoom();

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

      on(img, 'mouseenter', () => showLens(true));
      on(img, 'mouseleave', () => showLens(false));
      on(img, 'mousemove',  moveLens);

      on(img, 'touchstart', (e) => { showLens(true);  moveLens(e); }, { passive: true });
      on(img, 'touchmove',  (e) => { moveLens(e); }, { passive: true });
      on(img, 'touchend',   ()  => { showLens(false); });

      on(img, 'wheel', (e) => {
        e.preventDefault();
        const step = e.deltaY < 0 ? CFG.wheelStepLens : (1 / CFG.wheelStepLens);
        const turboFactor = e.altKey ? CFG.wheelTurbo : 1;
        lensScale = clamp(lensScale * step * turboFactor, CFG.lensBgMin, CFG.lensBgMax);
        applyLensZoom();
      }, { passive: false });
    }

    on(document, 'keydown', (e) => {
      if (e.altKey && !turbo) { turbo = true; lensScale = clamp(CFG.lensBgScale * 1.5, CFG.lensBgMin, CFG.lensBgMax); applyLensZoom(); }
    });
    on(document, 'keyup', () => {
      if (turbo) { turbo = false; lensScale = CFG.lensBgScale; applyLensZoom(); }
    });

    function initModal() {
      const modalEl = modal;
      function openModal() {
        modalEl.hidden = false;
        center();
        stage.focus?.({ preventScroll: true });
        document.body.style.overflow = 'hidden';
      }
      function closeModal() {
        modalEl.hidden = true;
        document.body.style.overflow = '';
        openB.focus?.();
      }

      on(openB, 'click', openModal);
      closers.forEach(el => on(el, 'click', closeModal));
      on(document, 'keydown', (e) => { if (!modalEl.hidden && e.key === 'Escape') closeModal(); });

      let drag = null;
      on(stage, 'mousedown', (e) => { drag = { sx: e.clientX, sy: e.clientY, x: Z.x, y: Z.y }; });
      on(document, 'mousemove', (e) => {
        if (!drag) return;
        Z.x = drag.x + (e.clientX - drag.sx);
        Z.y = drag.y + (e.clientY - drag.sy);
        apply();
      });
      on(document, 'mouseup', () => { drag = null; });

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

      on(stage, 'wheel', (e) => {
        e.preventDefault();
        const r = stage.getBoundingClientRect();
        const cx = e.clientX - r.left;
        const cy = e.clientY - r.top;
        setZoom((e.deltaY < 0) ? CFG.wheelStep : 1 / CFG.wheelStep, cx, cy);
      }, { passive: false });

      modalEl.querySelector('[data-zoom="in"]')   ?.addEventListener('click', () => setZoom(1.2));
      modalEl.querySelector('[data-zoom="out"]')  ?.addEventListener('click', () => setZoom(1 / 1.2));
      modalEl.querySelector('[data-zoom="reset"]')?.addEventListener('click', () => { Z.scale = 1; Z.x = 0; Z.y = 0; apply(); });
    }

    initLens();
    initModal();
  }

  /* ---------------------------------------------------------------------------
   * (7) Bootstrapping
   *  - Includes laden → dann Initialisierungen → dann Schutz/Optionals
   *  - Nur EIN zentraler DOMContentLoaded-Listener (keine Duplikate!)
   * ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
      include('#site-header', 'includes/header.html'),
      include('#site-footer', 'includes/footer.html'),
    ]).then(() => {
      // Alles da → Features aktivieren (JETZT ist der Header-DOM vorhanden!)
      setHeaderHeightVar();   // CSS-Var für Sticky-Offset
      initResponsiveNav();    // Burger/Collapsible (innerhalb des Headers)
      markActiveLink();       // aktiver Menüpunkt
      initOffcanvas();        // ⚠️ Off-Canvas NACH Include initialisieren
      setYear();              // Jahr im Footer
      hydrateContactEmail();  // E-Mail-Link

      // Schutz: doppelte Kontaktblöcke vermeiden
      ensureSingleContact();
      observeOnceForContacts();

      // Optional (tut nichts, wenn Hooks fehlen)
      initRZZoom();
    });
  });

})();
