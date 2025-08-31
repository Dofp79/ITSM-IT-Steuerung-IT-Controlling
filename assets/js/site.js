/* ===========================================================
   Globales Skript
   - Utilities ($, $$)
   - Burger / Drawer (A11y, Focus, Close-Logik)
   - Accordion (WAI-ARIA light)
   - Kontakt-Mail (Spam-Schutz)
   - Jahr im Footer
   - Optional: Smooth Scroll für "Nach oben"
   =========================================================== */

(() => {
  "use strict";

  /* -----------------------------------------
   * 0) Mini-Utilities
   * ----------------------------------------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Selektor für fokussierbare Elemente (für Focus-Management im Drawer)
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';


  /* -----------------------------------------
   * 1) Burger / Drawer (ausfahrende Navigation)
   *    - A11y: aria-expanded, Focus-Management
   *    - Schließen: ESC, Klick außerhalb, Resize
   *    - Optional: Focus-Trap, dynamisches Label
   * ----------------------------------------- */
  const burger = $('.burger');
  const drawer = $('#navdrawer');
  let lastFocus = null;           // speichert das Element, das vor dem Öffnen aktiv war
  let trapFocusEnabled = true;    // ggf. auf false setzen, wenn kein Focus-Trap gewünscht ist

  // Hilfsfunktion: Burger-Label aktualisieren (A11y)
  const updateBurgerLabel = (open) => {
    const label = burger?.querySelector('.burger__label');
    if (label) label.textContent = open ? 'Menü schließen' : 'Themen';
  };

  // Focus-Trap: hält Tab-Fokus im Drawer, solange dieser offen ist
  const handleFocusTrap = (e) => {
    if (!trapFocusEnabled) return;
    if (!drawer?.classList.contains('is-open')) return;

    // nur Tab-Key interessieren
    if (e.key !== 'Tab') return;

    const focusables = $$(FOCUSABLE, drawer).filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
    if (!focusables.length) return;

    const first = focusables[0];
    const last  = focusables[focusables.length - 1];

    // Shift+Tab: wenn auf erstem Element → zum letzten springen
    if (e.shiftKey && document.activeElement === first) {
      last.focus();
      e.preventDefault();
      return;
    }
    // Tab: wenn auf letztem Element → zum ersten springen
    if (!e.shiftKey && document.activeElement === last) {
      first.focus();
      e.preventDefault();
    }
  };

  // Drawer öffnen/schließen (zentrale Schaltstelle)
  const setDrawer = (open) => {
    if (!burger || !drawer) return;

    burger.setAttribute('aria-expanded', String(open));
    drawer.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : ''; // Seite nicht scrollen wenn Drawer offen
    updateBurgerLabel(open);

    if (open) {
      // aktives Element merken, dann ersten Link im Drawer fokussieren
      lastFocus = document.activeElement;
      const firstFocusable = drawer.querySelector(FOCUSABLE);
      firstFocusable?.focus({ preventScroll: true });
      document.addEventListener('keydown', handleFocusTrap);
    } else {
      // Fokus zurück dorthin, wo der Nutzer war (oder Burger)
      (lastFocus instanceof HTMLElement ? lastFocus : burger).focus({ preventScroll: true });
      document.removeEventListener('keydown', handleFocusTrap);
    }
  };

  // Initialisierung + Event-Bindings
  if (burger && drawer) {
    setDrawer(false); // geschlossen starten

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

    // ESC schließt den Drawer
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setDrawer(false);
    });

    // Klick auf Link im Drawer: nach Navigation schließen (z. B. Sprunganker)
    drawer.addEventListener('click', (e) => {
      const link = (e.target instanceof HTMLElement) ? e.target.closest('a') : null;
      if (link) setDrawer(false);
    });

    // Window-Resize: falls Layout wechselt, Drawer sicher schließen
    window.addEventListener('resize', () => setDrawer(false));
  }


  /* -----------------------------------------
   * 2) Accordion (WAI-ARIA light)
   *    - Jeder Trigger steuert ein Panel (aria-controls)
   *    - hidden-Attribut für Panels
   *    - Standard: alle zu (false)
   *    - Optional: nur-eins-offen-Logik möglich (siehe Kommentar)
   * ----------------------------------------- */
  const triggers = $$('.accordion__trigger');

  // OPTIONAL: Nur ein Panel gleichzeitig offen halten?
  const SINGLE_OPEN = false; // auf true setzen, wenn gewünscht

  if (triggers.length) {
    // Map: Panel-ID -> Panel-Element
    const panels = new Map(
      triggers.map(btn => {
        const id = btn.getAttribute('aria-controls');
        return [btn, id ? document.getElementById(id) : null];
      })
    );

    // Startzustand: alles zu
    panels.forEach((panel, btn) => {
      btn.setAttribute('aria-expanded', 'false');
      if (panel) panel.hidden = true;
    });

    // Click-Handler pro Trigger
    triggers.forEach((btn) => {
      btn.addEventListener('click', () => {
        const panelId = btn.getAttribute('aria-controls');
        const panel = panelId ? document.getElementById(panelId) : null;
        const willOpen = btn.getAttribute('aria-expanded') !== 'true';

        if (SINGLE_OPEN) {
          // Alle schließen (wenn Single-Mode aktiv)
          triggers.forEach(other => {
            if (other === btn) return;
            other.setAttribute('aria-expanded', 'false');
          });
          panels.forEach((p, b) => { if (p) p.hidden = true; });
        }

        // Aktuelles toggeln
        btn.setAttribute('aria-expanded', String(willOpen));
        if (panel) panel.hidden = !willOpen;
      });
    });
  }


  /* -----------------------------------------
   * 3) Kontakt-Mail zusammensetzen (Spam-Schutz)
   *    - Text & href werden erst im Client gebaut
   *    - Daten kommen aus data-Attributen:
   *      data-email-user="name", data-email-domain="domain.tld"
   * ----------------------------------------- */
  const mailLink = $('#contactEmail');
  if (mailLink) {
    const user   = mailLink.dataset.emailUser || '';
    const domain = mailLink.dataset.emailDomain || '';
    if (user && domain) {
      const addr = `${user}@${domain}`;
      mailLink.href = `mailto:${addr}`;
      mailLink.textContent = addr;
      // Hinweis: rel="nofollow" ist bereits im Markup – gut gegen Scraper
    }
  }


  /* -----------------------------------------
   * 4) Jahr im Footer automatisch setzen
   *    - <span data-year></span> → "2025"
   * ----------------------------------------- */
  const yearEl = $('[data-year]');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());


  /* -----------------------------------------
   * 5) Optional: Smooth-Scroll für "Nach oben"
   *    - Respektiert prefers-reduced-motion
   *    - Greift nur, wenn Link auf #top zeigt
   * ----------------------------------------- */
  const toTop = $('.to-top');
  if (toTop) {
    toTop.addEventListener('click', (e) => {
      const href = toTop.getAttribute('href') || '';
      if (!href.startsWith('#')) return; // nur In-Page
      const target = $(href);
      if (!target) return;

      e.preventDefault();

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (prefersReduced) {
        target.scrollIntoView(); // ohne Smooth
      } else {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  }

})();
