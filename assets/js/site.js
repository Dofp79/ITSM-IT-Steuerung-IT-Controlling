/* ===========================================================
   Globales Skript
   -----------------------------------------------------------
   - Utilities ($, $$)
   - Burger / Drawer (A11y, Focus, Close-Logik)
   - Aktiver Drawer-Link (Blau → Rot)
   - Optional: Scrollspy für aktive Menüpunkte
   - Accordion (WAI-ARIA light)
   - Kontakt-Mail (Spam-Schutz)
   - Jahr im Footer
   - Optional: Smooth Scroll für "Nach oben"
   =========================================================== */

(() => {
  "use strict";

  /* ===========================================================
   * 0) CONFIG & MINI-UTILITIES
   * ===========================================================
   * -> Hier zentrale Optionen einstellen
   * ----------------------------------------------------------- */
  const trapFocusEnabled  = true;   // Focus-Trap im geöffneten Drawer aktiv?
  const SINGLE_OPEN       = false;  // Accordion: nur ein Panel gleichzeitig offen?
  const SCROLLSPY_ENABLED = true;   // Scrollspy aktivieren?
  const SCROLLSPY_OFFSET  = 120;    // Offset (px) ab dem eine Section als "aktiv" gilt

  // Kurze Query-Helfer (DOM)
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Selektor für fokussierbare Elemente (Focus-Management im Drawer)
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';


  /* ===========================================================
   * 1) BURGER / DRAWER  (ausfahrende Navigation)
   *    - A11y: aria-expanded + dynamisches Label
   *    - Fokus-Management + optionaler Focus-Trap
   *    - Schließen: ESC, Klick außerhalb, Resize
   * =========================================================== */
  const burger = $('.burger');
  const drawer = $('#navdrawer');
  let lastFocus = null; // speichert das vorher aktive Element

  // (A11y) Label im Burger aktualisieren
  const updateBurgerLabel = (open) => {
    const label = burger?.querySelector('.burger__label');
    if (label) label.textContent = open ? 'Menü schließen' : 'Themen';
  };

  // Focus-Trap im geöffneten Drawer (Tab bleibt im Drawer)
  const handleFocusTrap = (e) => {
    if (!trapFocusEnabled) return;
    if (!drawer?.classList.contains('is-open')) return;
    if (e.key !== 'Tab') return;

    const focusables = $$(FOCUSABLE, drawer).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    if (!focusables.length) return;

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    // Shift+Tab auf erstem → springe zum letzten
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    }
    // Tab auf letztem → springe zum ersten
    if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  };

  // Drawer öffnen/schließen (einheitlicher Schalter)
  const setDrawer = (open) => {
    if (!burger || !drawer) return;

    burger.setAttribute('aria-expanded', String(open));
    drawer.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';   // Body-Scroll sperren, wenn offen
    updateBurgerLabel(open);

    if (open) {
      // zuletzt fokussiertes Element merken und ersten Fokus im Drawer setzen
      lastFocus = document.activeElement;
      const firstFocusable = drawer.querySelector(FOCUSABLE);
      firstFocusable?.focus({ preventScroll: true });
      document.addEventListener('keydown', handleFocusTrap);
    } else {
      // Fokus zurück zum vorherigen Element (Fallback: Burger)
      (lastFocus instanceof HTMLElement ? lastFocus : burger).focus({ preventScroll: true });
      document.removeEventListener('keydown', handleFocusTrap);
    }
  };

  // Initialisierung + Events für den Drawer
  if (burger && drawer) {
    setDrawer(false); // Drawer geschlossen starten

    // 1) Burger-Klick toggelt Drawer
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      setDrawer(!open);
    });

    // 2) Klick außerhalb: Drawer schließen
    document.addEventListener('click', (e) => {
      if (!drawer.classList.contains('is-open')) return;
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (!drawer.contains(t) && !burger.contains(t)) setDrawer(false);
    });

    // 3) ESC: Drawer schließen
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setDrawer(false);
    });

    // 4) Klick auf Links im Drawer: nach Navigation schließen
    drawer.addEventListener('click', (e) => {
      const link = (e.target instanceof HTMLElement) ? e.target.closest('a') : null;
      if (link) setDrawer(false);
    });

    // 5) Resize: Sicherheits-Schließen bei Layoutwechsel
    window.addEventListener('resize', () => setDrawer(false));
  }


  /* ===========================================================
   * 2) AKTIVER DRAWER-LINK (Blau → Rot)
   *    - Beim Klick: .is-active + aria-current="page"
   *    - Beim Laden/Hash-Wechsel: Zustand setzen
   * =========================================================== */
  const drawerLinks = $$('#navdrawer a[href^="#"]'); // nur In-Page-Links

  const clearActive = () => {
    drawerLinks.forEach(l => {
      l.classList.remove('is-active');
      l.removeAttribute('aria-current');
    });
  };

  const setActiveByHash = (hash) => {
    if (!hash) return;
    const link = drawerLinks.find(l => (l.getAttribute('href') === hash));
    if (link) {
      clearActive();
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  };

  // a) Klick auf Drawer-Link → sofort aktiv markieren
  drawerLinks.forEach(link => {
    link.addEventListener('click', () => setActiveByHash(link.getAttribute('href')));
  });

  // b) Beim Laden: aktiven Link anhand des Hash setzen
  if (location.hash) setActiveByHash(location.hash);

  // c) Hash-Änderung (Vor/Zurück) → aktiv setzen
  window.addEventListener('hashchange', () => setActiveByHash(location.hash));


  /* ===========================================================
   * 3) OPTIONAL: SCROLLSPY (sanft & leichtgewichtig)
   *    - Hält den aktiven Menüpunkt in Rot beim Scrollen
   *    - Respektiert Offset (Header-Höhe)
   * =========================================================== */
  if (SCROLLSPY_ENABLED) {
    (function initScrollspy() {
      // Zuordnung: Abschnitt → Link
      const sectionMap = new Map();
      drawerLinks.forEach(l => {
        const id = (l.getAttribute('href') || '').replace('#', '');
        const sec = id ? document.getElementById(id) : null;
        if (sec) sectionMap.set(sec, l);
      });
      if (!sectionMap.size) return;

      const onScroll = () => {
        let current = null;
        sectionMap.forEach((link, section) => {
          const rect = section.getBoundingClientRect();
          if (rect.top <= SCROLLSPY_OFFSET && rect.bottom > SCROLLSPY_OFFSET) {
            current = link;
          }
        });
        if (current) {
          clearActive();
          current.classList.add('is-active');
          current.setAttribute('aria-current', 'page');
        }
      };

      // passive Listener für Performance, einmal initial triggern
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    })();
  }


  /* ===========================================================
   * 4) ACCORDION (WAI-ARIA light)
   *    - Trigger steuert Panel (aria-controls)
   *    - Panel via hidden sichtbar/unsichtbar
   *    - Optional: SINGLE_OPEN (nur ein Panel offen)
   * =========================================================== */
  const triggers = $$('.accordion__trigger');

  if (triggers.length) {
    // Mapping: Trigger → Panel
    const panels = new Map(
      triggers.map(btn => {
        const id = btn.getAttribute('aria-controls');
        return [btn, id ? document.getElementById(id) : null];
      })
    );

    // Start: alle zu
    panels.forEach((panel, btn) => {
      btn.setAttribute('aria-expanded', 'false');
      if (panel) panel.hidden = true;
    });

    // Click-Handler
    triggers.forEach((btn) => {
      btn.addEventListener('click', () => {
        const panelId  = btn.getAttribute('aria-controls');
        const panel    = panelId ? document.getElementById(panelId) : null;
        const willOpen = btn.getAttribute('aria-expanded') !== 'true';

        if (SINGLE_OPEN) {
          // Alle schließen (Single-Mode)
          triggers.forEach(other => {
            if (other === btn) return;
            other.setAttribute('aria-expanded', 'false');
          });
          panels.forEach(p => { if (p) p.hidden = true; });
        }

        // Aktuelles toggeln
        btn.setAttribute('aria-expanded', String(willOpen));
        if (panel) panel.hidden = !willOpen;
      });
    });
  }


  /* ===========================================================
   * 5) KONTAKT-MAIL (Spam-Schutz)
   *    - Baut "mailto:" erst im Client
   *    - Daten aus data-Attributen
   * =========================================================== */
  const mailLink = $('#contactEmail');
  if (mailLink) {
    const user   = mailLink.dataset.emailUser   || '';
    const domain = mailLink.dataset.emailDomain || '';
    if (user && domain) {
      const addr = `${user}@${domain}`;
      mailLink.href = `mailto:${addr}`;
      mailLink.textContent = addr;
      // Hinweis: rel="nofollow" steht im Markup → gut gegen Crawler
    }
  }


  /* ===========================================================
   * 6) FOOTER-JAHR (auto)
   * =========================================================== */
  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());


  /* ===========================================================
   * 7) OPTIONAL: SMOOTH SCROLL für "Nach oben"
   *    - Greift nur bei In-Page (#top)
   *    - Respektiert prefers-reduced-motion
   * =========================================================== */
  const toTop = $('.to-top');
  if (toTop) {
    toTop.addEventListener('click', (e) => {
      const href = toTop.getAttribute('href') || '';
      if (!href.startsWith('#')) return;          // nur In-Page
      const target = $(href);
      if (!target) return;

      e.preventDefault();
      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      target.scrollIntoView({
        behavior: prefersReduced ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  }

})();
