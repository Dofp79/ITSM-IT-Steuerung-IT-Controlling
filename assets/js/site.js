/* ===========================================================================
   Globales JavaScript für ITSM-Website
   ===========================================================================
   Enthält:
   - $ / $$ Utilities
   - Header-Includes (fetch) + NACHLAUFENDE Initialisierung
   - Burger / Drawer (A11y, Focus-Trap, Close-Logik)
   - Aktiver Menüpunkt (aria-current + .is-active)
   - Optional: Scrollspy (für In-Page-Anker)
   - Accordion (WAI-ARIA light)
   - Kontakt-Mail (Spam-Schutz)
   - Jahr im Footer
   - Optional: Smooth Scroll für "Nach oben"
   ===========================================================================
   WICHTIG:
   - Der Header (mit .burger & #navdrawer) wird per fetch() geladen.
   - Alle Event-Listener für Menü/Drawer werden ERST DANACH gebunden.
   =========================================================================== */

(() => {
  "use strict";

  /* ---------------------------------------------------------------------------
   * (0) GRUNDEINSTELLUNGEN + HILFSFUNKTIONEN
   * ------------------------------------------------------------------------- */

  // Konfig
  const trapFocusEnabled  = true;   // Fokusfang im geöffneten Drawer
  const SINGLE_OPEN       = false;  // Accordion: nur ein Panel gleichzeitig?
  const SCROLLSPY_ENABLED = true;   // Scrollspy für In-Page-Anker
  const SCROLLSPY_OFFSET  = 120;    // Offset in px (abhängig von Headerhöhe)

  // DOM-Helfer
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Selektor für fokussierbare Elemente (für Focus-Trap)
  const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  // Name der aktuellen Datei (zur Menü-Markierung bei Seitenwechseln)
  const CURRENT_PAGE = (() => {
    const p = location.pathname.split("/").pop();
    return p && p !== "/" ? p : "index.html";
  })();


  /* ---------------------------------------------------------------------------
   * (1) HEADER & FOOTER – dynamisch laden
   * ---------------------------------------------------------------------------
   * Lädt includes/header.html & includes/footer.html in #site-header/#site-footer
   * und ruft DANACH die Initialisierung des Menüs auf.
   * ------------------------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", () => {
    // Mini-Include-Loader: lädt HTML in Zielcontainer
    const loadInclude = (selector, url) => {
      const host = document.querySelector(selector);
      if (!host) return Promise.resolve(false); // Container existiert nicht → fertig
      return fetch(url)
        .then(res => (res.ok ? res.text() : ""))
        .then(html => {
          if (html) host.innerHTML = html;
          return !!html;
        })
        .catch(() => false);
    };

    // Header + Footer laden → anschließend Menü initialisieren
    Promise.all([
      loadInclude("#site-header", "includes/header.html"),
      loadInclude("#site-footer", "includes/footer.html"),
    ]).then(() => {
      initHeaderAndMenu();   // jetzt existieren .burger & #navdrawer → Events binden
      markActiveMenuLink();  // aktiven Menüpunkt markieren (aria-current / .is-active)
    });
  });


  /* ---------------------------------------------------------------------------
   * (2) HEADER/ MENÜ – Initialisierung NACH Include
   * ---------------------------------------------------------------------------
   * - Burger/Drawer-Logik (A11y, Focus-Trap, Close-Mechaniken)
   * - Outside-Click, ESC, Resize, Link-Klick → Drawer schließen
   * ------------------------------------------------------------------------- */

  function initHeaderAndMenu() {
    // Sicherheit: Elemente existieren erst nach Include
    const burger = $(".burger");
    const drawer = $("#navdrawer");
    if (!burger || !drawer) return; // Kein Header auf der Seite

    let lastFocus = null; // Zurück zum vorherigen Fokus beim Schließen

    // Label des Burgers (visuelles Feedback)
    const updateBurgerLabel = (open) => {
      const label = burger.querySelector(".burger__label");
      if (label) label.textContent = open ? "Menü schließen" : "Themen";
    };

    // Focus-Trap im geöffneten Drawer halten
    const handleFocusTrap = (e) => {
      if (!trapFocusEnabled || e.key !== "Tab" || !drawer.classList.contains("is-open")) return;
      const focusables = $$(FOCUSABLE, drawer).filter(el => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last  = focusables[focusables.length - 1];
      // Shift + Tab → vom ersten zum letzten
      if (e.shiftKey && document.activeElement === first) {
        last.focus();
        e.preventDefault();
      }
      // Tab → vom letzten zum ersten
      if (!e.shiftKey && document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };

    // Drawer öffnen/schließen
    const setDrawer = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      drawer.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
      updateBurgerLabel(open);

      if (open) {
        lastFocus = document.activeElement;
        const firstFocusable = drawer.querySelector(FOCUSABLE);
        firstFocusable?.focus({ preventScroll: true });
        document.addEventListener("keydown", handleFocusTrap);
      } else {
        (lastFocus instanceof HTMLElement ? lastFocus : burger).focus({ preventScroll: true });
        document.removeEventListener("keydown", handleFocusTrap);
      }
    };

    // Startzustand
    setDrawer(false);

    // A) Burger klick → toggeln
    burger.addEventListener("click", () => {
      const isOpen = burger.getAttribute("aria-expanded") === "true";
      setDrawer(!isOpen);
    });

    // B) Klick außerhalb → schließen
    document.addEventListener("click", (e) => {
      if (!drawer.classList.contains("is-open")) return;
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (!drawer.contains(t) && !burger.contains(t)) setDrawer(false);
    });

    // C) ESC → schließen
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setDrawer(false);
    });

    // D) Navigation im Drawer → nach Klick schließen
    drawer.addEventListener("click", (e) => {
      const link = (e.target instanceof HTMLElement) ? e.target.closest("a") : null;
      if (link) setDrawer(false);
    });

    // E) Layoutwechsel → schließen
    window.addEventListener("resize", () => setDrawer(false));
  }


  /* ---------------------------------------------------------------------------
   * (3) AKTIVER MENÜPUNKT – Multi-Page & In-Page
   * ---------------------------------------------------------------------------
   * - Markiert den Link der aktuellen Seite (index.html, projekte.html …)
   * - Für In-Page-Anker (#id) gibt es zusätzlich Scrollspy (unten)
   * ------------------------------------------------------------------------- */

  function markActiveMenuLink() {
    const header = $("#site-header");
    if (!header) return;

    // Alle Links im Header/Drawer
    const links = header.querySelectorAll('a[href]');
    links.forEach(a => {
      const href = a.getAttribute("href") || "";
      const isSamePage = href.endsWith(CURRENT_PAGE);
      a.classList.toggle("is-active", isSamePage);
      if (isSamePage) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    // In-Page-Links im Drawer (für Scrollspy)
    // Beispiel: <a href="#projekte">…</a>
    const drawerLinks = $$('#navdrawer a[href^="#"]');
    if (drawerLinks.length && SCROLLSPY_ENABLED) initScrollspy(drawerLinks);
  }


  /* ---------------------------------------------------------------------------
   * (4) SCROLLSPY – hält In-Page-Menüpunkte synchron zum Scroll
   * ---------------------------------------------------------------------------
   * - nur für Drawer-Links, die auf #anker verweisen
   * ------------------------------------------------------------------------- */

  function initScrollspy(drawerLinks) {
    // Zuordnung: Abschnitt → Link
    const sectionMap = new Map();
    drawerLinks.forEach(l => {
      const id = (l.getAttribute("href") || "").replace("#", "");
      const sec = id ? document.getElementById(id) : null;
      if (sec) sectionMap.set(sec, l);
    });
    if (!sectionMap.size) return;

    const clearActive = () => {
      drawerLinks.forEach(l => { l.classList.remove("is-active"); l.removeAttribute("aria-current"); });
    };

    const onScroll = () => {
      let current = null;
      sectionMap.forEach((link, section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top <= SCROLLSPY_OFFSET && rect.bottom > SCROLLSPY_OFFSET) current = link;
      });
      if (current) {
        clearActive();
        current.classList.add("is-active");
        current.setAttribute("aria-current", "page");
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initial
  }


  /* ---------------------------------------------------------------------------
   * (5) ACCORDION – WAI-ARIA light
   * ------------------------------------------------------------------------- */

  function initAccordion() {
    const triggers = $$('.accordion__trigger');
    if (!triggers.length) return;

    const panels = new Map(
      triggers.map(btn => {
        const id = btn.getAttribute("aria-controls");
        return [btn, id ? document.getElementById(id) : null];
      })
    );

    // Startzustand: alle zu
    panels.forEach((panel, btn) => {
      btn.setAttribute("aria-expanded", "false");
      if (panel) panel.hidden = true;
    });

    // Klicklogik
    triggers.forEach(btn => {
      btn.addEventListener("click", () => {
        const panelId  = btn.getAttribute("aria-controls");
        const panel    = panelId ? document.getElementById(panelId) : null;
        const willOpen = btn.getAttribute("aria-expanded") !== "true";

        if (SINGLE_OPEN) {
          triggers.forEach(other => { if (other !== btn) other.setAttribute("aria-expanded", "false"); });
          panels.forEach(p => { if (p) p.hidden = true; });
        }

        btn.setAttribute("aria-expanded", String(willOpen));
        if (panel) panel.hidden = !willOpen;
      });
    });
  }


  /* ---------------------------------------------------------------------------
   * (6) KONTAKT-MAIL – Spam-Schutz
   * ------------------------------------------------------------------------- */

  function initSafeMail() {
    const mailLink = $("#contactEmail");
    if (!mailLink) return;
    const user   = mailLink.dataset.emailUser   || "";
    const domain = mailLink.dataset.emailDomain || "";
    if (!user || !domain) return;
    const addr = `${user}@${domain}`;
    mailLink.href = `mailto:${addr}`;
    mailLink.textContent = addr;
  }


  /* ---------------------------------------------------------------------------
   * (7) FOOTER-JAHR – automatisch setzen
   * ------------------------------------------------------------------------- */

  function initYear() {
    const yearEl = $("[data-year]");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }


  /* ---------------------------------------------------------------------------
   * (8) SMOOTH SCROLL – nur für „Nach oben“-Link (falls vorhanden)
   * ------------------------------------------------------------------------- */

  function initSmoothToTop() {
    const toTop = $(".to-top");
    if (!toTop) return;
    toTop.addEventListener("click", (e) => {
      const href = toTop.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      const target = $(href);
      if (!target) return;

      e.preventDefault();
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
    });
  }


  /* ---------------------------------------------------------------------------
   * (9) REST INITIALISIEREN (akkordeon, mail, jahr, scroll)
   * ------------------------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", () => {
    initAccordion();
    initSafeMail();
    initYear();
    initSmoothToTop();
    // Scrollspy wird in markActiveMenuLink() gestartet, sobald Drawer-Links existieren.
  });

})(); // IIFE: schützt den globalen Scope
