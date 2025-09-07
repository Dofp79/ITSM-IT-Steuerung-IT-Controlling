/* =============================================================================
   assets/js/site.js  –  NEUE VERSION für horizontales Sticky-Menü (ohne Drawer)
   -----------------------------------------------------------------------------
   Inhalt (alles streng gekapselt, keine Globals):
   - (0) Utilities ($, $$, include)
   - (1) Schutzmaßnahme: genau EIN .contact-block im gesamten DOM
   - (2) Headerhöhe → CSS-Var --header-h (allgemein nützlich, z. B. für Sticky-Offset)
   - (3) Navigation (OHNE Drawer):
         • aktiven Menüpunkt markieren (aria-current, .is-active)
   - (4) Footer: Jahr setzen & E-Mail sicher hydratisieren
   - (5) Boot: Header/Footer includen → Initialisierungen → Kontakt-Schutz
   - (6) RZ-Diagramm: Lupe + Vollbild (Pan & Zoom) – nur wenn Hooks existieren
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
    // Bereits gefüllt? (z. B. durch SSR, CMS oder anderen Loader) → nichts tun
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
   *    vorhandenen. Entfernt Duplikate (z. B. wenn Seiten-Content zusätzlich
   *    einen Kontaktabschnitt enthält).
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
   *  - Allgemein nützlich (z. B. wenn Sticky-Header Flächen darunter beeinflusst)
   *  - Robust: läuft auch ohne brand-bar
   * ------------------------------------------------------------------------ */
  function setHeaderHeightVar() {
    const header   = $('.site-header');     // kommt aus includes/header.html
    const brandBar = $('.brand-bar');       // optional (alt), heute meist nicht vorhanden
    if (!header) return;
    const compute = () => {
      const h = header.offsetHeight + (brandBar ? brandBar.offsetHeight : 0);
      document.documentElement.style.setProperty('--header-h', `${h}px`);
    };
    compute();
    window.addEventListener('resize', compute);
  }

  /* ---------------------------------------------------------------------------
   * (3) Navigation (OHNE Drawer)
   *  - Markiert aktuell aktive Seite im horizontalen Menü
   *  - Erwartet Links in includes/header.html innerhalb .nav-list
   *  - Setzt:
   *      a[aria-current="page"] für A11y
   *      .is-active für CSS-Selektoren (falls gewünscht)
   * ------------------------------------------------------------------------ */
  function markActiveLink() {
    // Ermittelt den aktuellen Dateinamen (z. B. "projekte.html"); Fallback: index.html
    const current = location.pathname.split('/').pop() || 'index.html';

    // Suche NUR innerhalb der globalen Navigation aus dem Include
    const links = $$('.nav-list a[href]');
    if (!links.length) return;

    links.forEach(a => {
      const href = a.getAttribute('href') || '';
      const onPage = href.split('/').pop() === current;
      a.classList.toggle('is-active', onPage);
      if (onPage) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  /* ---------------------------------------------------------------------------
   * (4) Footer-Jahr & Kontakt-Mail (Spam-sicher)
   *  - Jahr:  <span data-year>2025</span>  → wird dynamisch ersetzt
   *  - E-Mail: <a id="contactEmail" data-email-user="..." data-email-domain="...">
   *            → wird zu "mailto:user@domain"
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
    // Ersetze nur Platzhaltertext wie "E-Mail anzeigen"
    if (/anzeigen/i.test(link.textContent || '')) link.textContent = addr;
    // rel="nofollow" kann optional entfernt werden; belassen ist auch ok:
    // link.removeAttribute('rel');
  }

  /* ---------------------------------------------------------------------------
   * (5) Bootstrapping
   *  - Lädt Header/Footer-Includes und initialisiert anschließend alle Features
   *  - Reihenfolge wichtig: erst Includes, dann Aktivierungslogik
   * ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
      include('#site-header', 'includes/header.html'), // globales horizontales Menü
      include('#site-footer', 'includes/footer.html'), // globaler Kontakt + Footer
    ]).then(() => {
      // Initialisierungen NACH dem Laden der Includes:
      setHeaderHeightVar();   // CSS-Var für Sticky-Offset
      markActiveLink();       // aktives Menü-Item markieren
      setYear();              // Copyright-Jahr aktualisieren
      hydrateContactEmail();  // E-Mail-Link sicher aktivieren

      // Kontakt-Blöcke deduplizieren (falls in Seiteninhalten vorhanden)
      ensureSingleContact();
      observeOnceForContacts();

      // Optional: RZ-Lupe/Modal initialisieren (no-op, falls Hooks fehlen)
      initRZZoom();
    });
  });

  /* ---------------------------------------------------------------------------
   * (6) RZ-Diagramm: Lupe + Vollbild (Pan & Zoom)
   *  - Aktiviert sich nur, wenn die erwarteten DOM-Hooks vorhanden sind:
   *    figure.rz-zoom > img.diagram + .rz-zoom__lens + .rz-zoom__open
   *    und #rzModal mit .rz-stage > .rz-stage__img (+ [data-close], [data-zoom])
   * ------------------------------------------------------------------------ */
  function initRZZoom() {
    const fig   = $('.rz-zoom');
    const img   = fig?.querySelector('img.diagram');
    const lens  = fig?.querySelector('.rz-zoom__lens');
    const openB = fig?.querySelector('.rz-zoom__open');
    const modal = $('#rzModal');
    const stage = modal?.querySelector('.rz-stage');
    const full  = modal?.querySelector('.rz-stage__img');
    const closers = modal?.querySelectorAll('[data-close]') || [];
    if (!fig || !img || !lens || !openB || !modal || !stage || !full) return; // Hooks fehlen → ruhig aussteigen

    // ------ (A) Lupe über dem kleinen Bild ---------------------------------
    const fullSrc = img.getAttribute('data-full') || img.currentSrc || img.src;
    lens.style.backgroundImage = `url("${fullSrc}")`;

    const showLens = (show) => {
      lens.style.display = show ? 'block' : 'none';
      lens.style.backgroundSize = '200%'; // Vergrößerungsfaktor; ggf. feinjustieren
    };

    function moveLens(ev) {
      const rect  = img.getBoundingClientRect();
      const lensW = lens.offsetWidth;
      const lensH = lens.offsetHeight;
      const cx = (ev.touches?.[0]?.clientX) ?? ev.clientX;
      const cy = (ev.touches?.[0]?.clientY) ?? ev.clientY;

      // Position relativ zum Bild
      let x = cx - rect.left - lensW / 2;
      let y = cy - rect.top  - lensH / 2;

      // an Bildränder klemmen
      x = Math.max(0, Math.min(x, rect.width  - lensW));
      y = Math.max(0, Math.min(y, rect.height - lensH));

      lens.style.left = `${x}px`;
      lens.style.top  = `${y}px`;

      // Hintergrundposition (prozentual)
      const fx = x / (rect.width  - lensW);
      const fy = y / (rect.height - lensH);
      lens.style.backgroundPosition = `${fx * 100}% ${fy * 100}%`;
    }

    // Maus
    img.addEventListener('mouseenter', () => showLens(true));
    img.addEventListener('mouseleave', () => showLens(false));
    img.addEventListener('mousemove',  moveLens);
    // Touch
    img.addEventListener('touchstart', (e) => { showLens(true);  moveLens(e); }, { passive: true });
    img.addEventListener('touchmove',  (e) => { moveLens(e); }, { passive: true });
    img.addEventListener('touchend',   ()  => { showLens(false); });

    // ------ (B) Vollbild-Modal mit Pan & Zoom -------------------------------
    const Z = { scale: 1, min: 0.5, max: 6, x: 0, y: 0 }; // Zoom-Zustand

    const apply  = () => { full.style.transform = `translate(${Z.x}px, ${Z.y}px) scale(${Z.scale})`; };
    const center = () => { full.src = fullSrc; Z.scale = 1; Z.x = Z.y = 0; apply(); };

    function setZoom(factor, cx, cy) {
      const old = Z.scale;
      const next = Math.max(Z.min, Math.min(Z.max, old * factor));
      if (next === old) return;

      const r = stage.getBoundingClientRect();
      const px = (cx ?? r.width  / 2);
      const py = (cy ?? r.height / 2);

      // Zoome um den Cursorpunkt
      Z.x = px - (next / old) * (px - Z.x);
      Z.y = py - (next / old) * (py - Z.y);

      Z.scale = next;
      apply();
    }

    function openModal() {
      modal.hidden = false;
      center();
      stage.focus?.({ preventScroll: true });
      document.body.style.overflow = 'hidden'; // Seite nicht scrollen, solange Modal offen
    }
    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = '';
      openB.focus?.(); // Fokus zurück zum Auslöser
    }

    openB.addEventListener('click', openModal);
    closers.forEach(el => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', (e) => { if (!modal.hidden && e.key === 'Escape') closeModal(); });

    // Pan (Maus)
    let drag = null;
    stage.addEventListener('mousedown', (e) => { drag = { sx: e.clientX, sy: e.clientY, x: Z.x, y: Z.y }; });
    document.addEventListener('mousemove', (e) => {
      if (!drag) return;
      Z.x = drag.x + (e.clientX - drag.sx);
      Z.y = drag.y + (e.clientY - drag.sy);
      apply();
    });
    document.addEventListener('mouseup', () => { drag = null; });

    // Pan (Touch)
    stage.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      drag = { sx: t.clientX, sy: t.clientY, x: Z.x, y: Z.y };
    }, { passive: true });
    stage.addEventListener('touchmove', (e) => {
      if (!drag) return;
      const t = e.touches[0];
      Z.x = drag.x + (t.clientX - drag.sx);
      Z.y = drag.y + (t.clientY - drag.sy);
      apply();
    }, { passive: true });
    stage.addEventListener('touchend', () => { drag = null; });

    // Zoom per Rad (zum Cursor)
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      setZoom((e.deltaY < 0) ? 1.15 : 1 / 1.15, cx, cy);
    }, { passive: false });

    // Tool-Buttons (optional vorhanden)
    modal.querySelector('[data-zoom="in"]')   ?.addEventListener('click', () => setZoom(1.2));
    modal.querySelector('[data-zoom="out"]')  ?.addEventListener('click', () => setZoom(1 / 1.2));
    modal.querySelector('[data-zoom="reset"]')?.addEventListener('click', () => { Z.scale = 1; Z.x = Z.y = 0; apply(); });
  }

  // ---------------------------------------------------------------------------
  // KEINE Drawer-Initialisierung mehr! (Früher: initMenu() mit .burger/#navdrawer)
  // ---------------------------------------------------------------------------

})(); // Ende IIFE
