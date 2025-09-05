/* =============================================================================
   assets/js/site.js
   -----------------------------------------------------------------------------
   Inhalt (alles streng gekapselt, keine Globals):
   - (0) Utilities ($, $$, include)
   - (1) Einmalige Schutzmaßnahme: genau EIN .contact-block auf der Seite
   - (2) Headerhöhe messen → CSS-Var --header-h (Drawer-Start unter Header)
   - (3) Menü/Drawer "Themen" (A11y: ESC, Focus-Trap, Outside-Click)
   - (4) Aktiven Menüpunkt markieren
   - (5) Footer-Jahr & Kontakt-Mail (Spam-sicher) setzen
   - (6) Boot: Header/Footer laden → dann Initialisierungen → Kontakt-Schutz
   - (7) RZ-Diagramm: Lupe + Vollbild (Pan & Zoom) – nur bei vorhandenen DOM-Hooks
   ============================================================================= */

(() => {
  'use strict';

  /* ---------------------------------------------------------------------------
   * (0) Utilities
   * ------------------------------------------------------------------------ */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // HTML-Teil (header/footer) in Zielcontainer laden
  const include = (sel, url) => {
    const host = $(sel);
    if (!host) return Promise.resolve(false);
    // Bereits gefüllt? (z.B. durch anderes Skript) → nichts tun
    const alreadyFilled = host.children.length > 0 && !host.querySelector('noscript');
    if (alreadyFilled) return Promise.resolve(true);
    return fetch(url)
      .then(r => (r.ok ? r.text() : ''))
      .then(html => { if (html) host.innerHTML = html; return !!html; })
      .catch(() => false);
  };

  /* ---------------------------------------------------------------------------
   * (1) Nur EIN Kontaktblock auf der Seite lassen
   *  - Behalte bevorzugt den im Footer (#site-footer .contact-block),
   *    sonst den zuletzt vorhandenen im DOM. Entferne Rest.
   *  - Wird nach Includes ausgeführt und zusätzlich via MutationObserver
   *    überwacht (falls später erneut etwas injected wird).
   * ------------------------------------------------------------------------ */
  function ensureSingleContact() {
    const all = $$('.contact-block');
    if (all.length <= 1) return;
    const footerOne = $('#site-footer .contact-block');
    const keep = footerOne || all[all.length - 1];
    all.forEach(el => { if (el !== keep) el.remove(); });
  }

  // Watcher nur einmal aktivieren
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
   *  - Damit .nav-drawer mit "inset: var(--header-h) auto 0 0" unter dem
   *    sichtbaren Header startet. Wird bei Resize aktualisiert.
   * ------------------------------------------------------------------------ */
  function setHeaderHeightVar() {
    const header   = $('.site-header');
    const brandBar = $('.brand-bar');
    if (!header) return;
    const compute = () => {
      const h = header.offsetHeight + (brandBar ? brandBar.offsetHeight : 0);
      document.documentElement.style.setProperty('--header-h', `${h}px`);
    };
    compute();
    window.addEventListener('resize', compute);
  }

  /* ---------------------------------------------------------------------------
   * (3) Menü/Drawer "Themen" initialisieren (A11y vollständig)
   *  - Voraussetzungen im HTML (im include/header.html):
   *    • Button .burger mit .burger__label ("Themen")
   *    • Drawer #navdrawer (role="navigation")
   *  - Features:
   *    • aria-expanded Umschaltung am Burger
   *    • Focus-Trap im geöffneten Drawer
   *    • ESC schließt / Outside-Click schließt / Resize schließt
   *    • Label-Text wechselt zwischen "Themen" und "Menü schließen"
   * ------------------------------------------------------------------------ */
  function initMenu() {
    const burger = $('.burger');
    const drawer = $('#navdrawer');
    if (!burger || !drawer) return;

    // Statisch sicherstellen (hilft Readern und E2E-Tests)
    burger.setAttribute('aria-controls', drawer.id);
    burger.setAttribute('aria-expanded', 'false');

    const FOCUSABLE =
      'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    let lastFocus = null;

    const setLabel = (open) => {
      const label = burger.querySelector('.burger__label');
      if (label) label.textContent = open ? 'Menü schließen' : 'Themen';
    };

    const applyOpenState = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      drawer.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      setLabel(open);
      if (open) {
        lastFocus = document.activeElement;
        (drawer.querySelector(FOCUSABLE) || drawer).focus({ preventScroll: true });
        document.addEventListener('keydown', trapTab);
      } else {
        (lastFocus instanceof HTMLElement ? lastFocus : burger).focus({ preventScroll: true });
        document.removeEventListener('keydown', trapTab);
      }
    };

    const trapTab = (e) => {
      if (e.key !== 'Tab' || !drawer.classList.contains('is-open')) return;
      const focusables = [...drawer.querySelectorAll(FOCUSABLE)]
        .filter(el => !el.disabled && el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    };

    // Startzustand
    applyOpenState(false);

    // Events
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      applyOpenState(!open);
    });
    // ESC
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') applyOpenState(false); });
    // Outside-Click
    document.addEventListener('click', (e) => {
      if (!drawer.classList.contains('is-open')) return;
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (!drawer.contains(t) && !burger.contains(t)) applyOpenState(false);
    });
    // Beim Navigieren im Drawer schließen
    drawer.addEventListener('click', (e) => {
      const link = (e.target instanceof HTMLElement) ? e.target.closest('a') : null;
      if (link) applyOpenState(false);
    });
    // Bei Resize schließen (z. B. beim Drehen des Geräts)
    window.addEventListener('resize', () => applyOpenState(false));
  }

  /* ---------------------------------------------------------------------------
   * (4) Aktiven Menüpunkt markieren
   *  - Vergleicht den Dateinamen (…/foo.html) mit href-Endungen
   * ------------------------------------------------------------------------ */
  function markActiveLink() {
    const current = location.pathname.split('/').pop() || 'index.html';
    $$('#navdrawer a[href]').forEach(a => {
      const onPage = (a.getAttribute('href') || '').endsWith(current);
      a.classList.toggle('is-active', onPage);
      if (onPage) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  /* ---------------------------------------------------------------------------
   * (5) Footer-Jahr & Kontakt-Mail (Spam-sicher)
   *  - Jahr <span data-year>…</span>
   *  - Mail-Link: <a id="contactEmail" data-email-user="..." data-email-domain="...">
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
    // Nur Text ersetzen, wenn noch der Platzhalter steht
    if (/anzeigen/i.test(link.textContent || '')) link.textContent = addr;
    link.removeAttribute('rel'); // rel="nofollow" optional entfernen
  }

  /* ---------------------------------------------------------------------------
   * (6) Bootstrapping: Includes → Initialisierungen → Kontakt-Schutz
   * ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
      include('#site-header', 'includes/header.html'),
      include('#site-footer', 'includes/footer.html'),
    ]).then(() => {
      // Alles da → initialisieren
      initMenu();              // Themen-Menü
      setHeaderHeightVar();    // Drawer-Start unter Header
      markActiveLink();        // aktives Menü
      setYear();               // Jahr im Footer
      hydrateContactEmail();   // Kontakt-Mail

      // Doppelte Kontaktblöcke vermeiden
      ensureSingleContact();
      observeOnceForContacts();

      // Danach: RZ-Lupe/Modal optional initialisieren
      initRZZoom();            // macht nichts, wenn DOM-Hooks fehlen
    });
  });

  /* ---------------------------------------------------------------------------
   * (7) RZ-Diagramm: Lupe + Modal (Pan & Zoom)
   *  - Aktiviert sich nur, wenn die erwarteten Elemente vorhanden sind:
   *    figure.rz-zoom > img.diagram + .rz-zoom__lens + .rz-zoom__open
   *    und #rzModal mit .rz-stage > .rz-stage__img vorhanden ist.
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
    if (!fig || !img || !lens || !openB || !modal || !stage || !full) return; // keine RZ-Elemente → ruhig aussteigen

    // ------ (A) Lupe über dem kleinen Bild ---------------------------------
    const fullSrc = img.getAttribute('data-full') || img.currentSrc || img.src;
    lens.style.backgroundImage = `url("${fullSrc}")`;

    const showLens = (show) => {
      lens.style.display = show ? 'block' : 'none';
      lens.style.backgroundSize = '200%'; // Vergrößerungsfaktor; ggf. anpassen
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

      // an den Bildrand klemmen
      x = Math.max(0, Math.min(x, rect.width  - lensW));
      y = Math.max(0, Math.min(y, rect.height - lensH));

      // Lens positionieren
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

    const apply = () => { full.style.transform = `translate(${Z.x}px, ${Z.y}px) scale(${Z.scale})`; };
    const center = () => { full.src = fullSrc; Z.scale = 1; Z.x = Z.y = 0; apply(); };

    function setZoom(factor, cx, cy) {
      const old = Z.scale;
      const next = Math.max(Z.min, Math.min(Z.max, old * factor));
      if (next === old) return;

      const r = stage.getBoundingClientRect();
      const px = (cx ?? r.width  / 2);
      const py = (cy ?? r.height / 2);

      // zoome zum Cursorpunkt
      Z.x = px - (next / old) * (px - Z.x);
      Z.y = py - (next / old) * (py - Z.y);

      Z.scale = next; apply();
    }

    function openModal() {
      modal.hidden = false;
      center();
      stage.focus({ preventScroll: true });
      document.body.style.overflow = 'hidden'; // Seite nicht scrollen, solange Modal offen
    }
    function closeModal() {
      modal.hidden = true;
      document.body.style.overflow = '';
      openB.focus?.(); // Fokus zurück
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

    // Tool-Buttons
    modal.querySelector('[data-zoom="in"]')   ?.addEventListener('click', () => setZoom(1.2));
    modal.querySelector('[data-zoom="out"]')  ?.addEventListener('click', () => setZoom(1 / 1.2));
    modal.querySelector('[data-zoom="reset"]')?.addEventListener('click', () => { Z.scale = 1; Z.x = Z.y = 0; apply(); });
  }
})();
