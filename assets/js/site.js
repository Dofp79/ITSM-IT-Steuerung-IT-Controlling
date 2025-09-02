/* ===========================================================================
   Globales JavaScript für ITSM-Website
   ===========================================================================
   Funktionen:
   - $ / $$ Utilities
   - Burger-Menü (offcanvas Drawer mit A11y und Focus-Handling)
   - Aktive Link-Markierung (Blau → Rot)
   - Scrollspy (Menü folgt Scroll)
   - Accordion nach WAI-ARIA
   - E-Mail-Spamschutz per JS
   - Automatisches Jahr im Footer
   - Smooth Scroll für "Nach oben"
   - Dynamisches Laden von Header und Footer (Modularisierung)
   =========================================================================== */

(() => {
  "use strict";

  /* ---------------------------------------------------------------------------
   * 0) GRUNDEINSTELLUNGEN + HILFSFUNKTIONEN
   * ---------------------------------------------------------------------------
   * Hier werden Konfigurationswerte und Mini-Utilities definiert.
   * --------------------------------------------------------------------------- */

  const trapFocusEnabled  = true;    // Fokusfang im geöffneten Drawer aktivieren
  const SINGLE_OPEN       = false;   // Nur ein Accordion-Panel gleichzeitig offen?
  const SCROLLSPY_ENABLED = true;    // Scrollspy aktivieren?
  const SCROLLSPY_OFFSET  = 120;     // Offset für Scrollspy in Pixel

  // Kurzschreibweise für DOM-Selektoren
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Selektor für fokussierbare Elemente im Drawer (für Fokus-Management)
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  /* ---------------------------------------------------------------------------
   * 1) BURGER / DRAWER (Offcanvas-Navigation)
   * ---------------------------------------------------------------------------
   * Öffnet und schließt den seitlichen Drawer.
   * - mit aria-expanded
   * - Fokusfang bei geöffnetem Drawer
   * - Schließt bei ESC, Klick außerhalb, Resize etc.
   * --------------------------------------------------------------------------- */

  const burger = $('.burger');
  const drawer = $('#navdrawer');
  let lastFocus = null; // Für Fokus-Rückgabe nach Schließen

  // Aktuelles Label im Burger-Button setzen
  const updateBurgerLabel = (open) => {
    const label = burger?.querySelector('.burger__label');
    if (label) label.textContent = open ? 'Menü schließen' : 'Themen';
  };

  // Fokus innerhalb des Drawers halten (Focus Trap)
  const handleFocusTrap = (e) => {
    if (!trapFocusEnabled || !drawer?.classList.contains('is-open') || e.key !== 'Tab') return;

    const focusables = $$(FOCUSABLE, drawer).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    if (!focusables.length) return;

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
    }
    if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  };

  // Drawer öffnen oder schließen
  const setDrawer = (open) => {
    if (!burger || !drawer) return;

    burger.setAttribute('aria-expanded', String(open));
    drawer.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    updateBurgerLabel(open);

    if (open) {
      lastFocus = document.activeElement;
      const firstFocusable = drawer.querySelector(FOCUSABLE);
      firstFocusable?.focus({ preventScroll: true });
      document.addEventListener('keydown', handleFocusTrap);
    } else {
      (lastFocus instanceof HTMLElement ? lastFocus : burger).focus({ preventScroll: true });
      document.removeEventListener('keydown', handleFocusTrap);
    }
  };

  // Drawer-Ereignisse initialisieren
  if (burger && drawer) {
    setDrawer(false); // Start: Drawer geschlossen

    // Klick auf Burger toggelt Drawer
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      setDrawer(!open);
    });

    // Klick außerhalb schließt den Drawer
    document.addEventListener('click', (e) => {
      if (!drawer.classList.contains('is-open')) return;
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (!drawer.contains(t) && !burger.contains(t)) setDrawer(false);
    });

    // ESC-Taste schließt den Drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setDrawer(false);
    });

    // Klick auf Link im Drawer schließt diesen
    drawer.addEventListener('click', (e) => {
      const link = (e.target instanceof HTMLElement) ? e.target.closest('a') : null;
      if (link) setDrawer(false);
    });

    // Fenstergröße ändert sich → Drawer zur Sicherheit schließen
    window.addEventListener('resize', () => setDrawer(false));
  }

  /* ---------------------------------------------------------------------------
   * 2) AKTIVER LINK IM DRAWER (Blau → Rot)
   * ---------------------------------------------------------------------------
   * Markiert den aktuell aktiven Menüpunkt (z. B. beim Klick oder Hash-Wechsel)
   * --------------------------------------------------------------------------- */

  const drawerLinks = $$('#navdrawer a[href^="#"]');

  const clearActive = () => {
    drawerLinks.forEach(l => {
      l.classList.remove('is-active');
      l.removeAttribute('aria-current');
    });
  };

  const setActiveByHash = (hash) => {
    if (!hash) return;
    const link = drawerLinks.find(l => l.getAttribute('href') === hash);
    if (link) {
      clearActive();
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
  };

  // Klick → aktiven Link setzen
  drawerLinks.forEach(link => {
    link.addEventListener('click', () => setActiveByHash(link.getAttribute('href')));
  });

  // Seite lädt → aktiven Link setzen
  if (location.hash) setActiveByHash(location.hash);

  // Hash in URL ändert sich (via Browser-Vor/Zurück) → aktiv setzen
  window.addEventListener('hashchange', () => setActiveByHash(location.hash));

  /* ---------------------------------------------------------------------------
   * 3) SCROLLSPY
   * ---------------------------------------------------------------------------
   * Beobachtet Scrollposition und markiert den Menüpunkt der gerade sichtbaren Sektion
   * --------------------------------------------------------------------------- */

  if (SCROLLSPY_ENABLED) {
    (function initScrollspy() {
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

      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll(); // Initiale Ausführung
    })();
  }

  /* ---------------------------------------------------------------------------
   * 4) ACCORDION (WAI-ARIA-konform)
   * ---------------------------------------------------------------------------
   * Öffnet und schließt Panels (optional: nur ein Panel offen)
   * --------------------------------------------------------------------------- */

  const triggers = $$('.accordion__trigger');

  if (triggers.length) {
    const panels = new Map(
      triggers.map(btn => {
        const id = btn.getAttribute('aria-controls');
        return [btn, id ? document.getElementById(id) : null];
      })
    );

    // Start: alles geschlossen
    panels.forEach((panel, btn) => {
      btn.setAttribute('aria-expanded', 'false');
      if (panel) panel.hidden = true;
    });

    // Klick-Event für jedes Accordion-Element
    triggers.forEach((btn) => {
      btn.addEventListener('click', () => {
        const panelId = btn.getAttribute('aria-controls');
        const panel = panelId ? document.getElementById(panelId) : null;
        const willOpen = btn.getAttribute('aria-expanded') !== 'true';

        if (SINGLE_OPEN) {
          triggers.forEach(other => {
            if (other === btn) return;
            other.setAttribute('aria-expanded', 'false');
          });
          panels.forEach(p => { if (p) p.hidden = true; });
        }

        btn.setAttribute('aria-expanded', String(willOpen));
        if (panel) panel.hidden = !willOpen;
      });
    });
  }

  /* ---------------------------------------------------------------------------
   * 5) KONTAKT-MAIL (SPAM-SCHUTZ)
   * ---------------------------------------------------------------------------
   * Baut "mailto:"-Link aus data-Attributen (verhindert Spam durch Crawler)
   * --------------------------------------------------------------------------- */

  const mailLink = $('#contactEmail');
  if (mailLink) {
    const user = mailLink.dataset.emailUser || '';
    const domain = mailLink.dataset.emailDomain || '';
    if (user && domain) {
      const addr = `${user}@${domain}`;
      mailLink.href = `mailto:${addr}`;
      mailLink.textContent = addr;
    }
  }

  /* ---------------------------------------------------------------------------
   * 6) AKTUELLES JAHR IM FOOTER
   * ---------------------------------------------------------------------------
   * Fügt das aktuelle Jahr automatisch ein
   * --------------------------------------------------------------------------- */

  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------------------------------------------------------------------------
   * 7) SMOOTH SCROLL für "Nach oben"
   * ---------------------------------------------------------------------------
   * Weiches Scrollen zu #top (respektiert Reduced Motion)
   * --------------------------------------------------------------------------- */

  const toTop = $('.to-top');
  if (toTop) {
    toTop.addEventListener('click', (e) => {
      const href = toTop.getAttribute('href') || '';
      if (!href.startsWith('#')) return;
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

  /* ---------------------------------------------------------------------------
   * 8) HEADER & FOOTER automatisch laden
   * ---------------------------------------------------------------------------
   * Modularisierung durch includes/header.html & includes/footer.html
   * --------------------------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", () => {
    const loadInclude = (selector, file) => {
      const el = document.querySelector(selector);
      if (el) {
        fetch(file)
          .then((res) => res.text())
          .then((html) => (el.innerHTML = html));
      }
    };

    loadInclude("#site-header", "includes/header.html");
    loadInclude("#site-footer", "includes/footer.html");
  });

})(); // Sofort ausgeführte Funktion (IIFE)
