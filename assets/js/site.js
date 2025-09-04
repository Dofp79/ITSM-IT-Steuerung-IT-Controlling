/* ===========================================================================
   Globales JavaScript für ITSM-Website
   ===========================================================================
   Enthält:
   - $ / $$ Utilities
   - Header/Footer-Includes (fetch) + NACHLAUFENDE Initialisierung
   - Burger / Drawer (A11y, Focus-Trap, Close-Logik)
   - Aktiver Menüpunkt (aria-current + .is-active) – Multi-Page fähig
   - Optional: Scrollspy (für In-Page-Anker im Drawer)
   - Accordion (WAI-ARIA light)
   - Kontakt-Mail (Spam-Schutz)
   - Jahr im Footer
   - Smooth Scroll für "Nach oben"
   ---------------------------------------------------------------------------
   Wichtig:
   - Der Header (mit .burger & #navdrawer) wird per fetch() geladen.
   - Event-Listener für Menü/Drawer werden ERST DANACH gebunden.
   =========================================================================== */

(() => {
  "use strict";

  /* -------------------------------------------------------------------------
   * (0) GRUNDEINSTELLUNGEN + HILFSFUNKTIONEN
   * ----------------------------------------------------------------------- */

  // Konfiguration
  const trapFocusEnabled  = true;   // Fokusfang im geöffneten Drawer
  const SINGLE_OPEN       = false;  // Accordion: nur ein Panel gleichzeitig?
  const SCROLLSPY_ENABLED = true;   // Scrollspy für In-Page-Anker
  const SCROLLSPY_OFFSET  = 120;    // Offset in px (ungefähre Headerhöhe)

  // Mini-Query-Helfer (DOM)
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Selektor für fokussierbare Elemente (Focus-Management im Drawer)
  const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  // Aktuelle „Datei“ der Seite – robust für GitHub Pages / Unterordner
  const CURRENT_PAGE = (() => {
    const p = location.pathname.split("/").filter(Boolean).pop();
    return p ? p : "index.html";
  })();


  /* -------------------------------------------------------------------------
   * (1) HEADER & FOOTER dynamisch laden (includes/*.html)
   * -----------------------------------------------------------------------
   * Lädt HTML-Fragmente und initialisiert danach das Menü.
   * Der Aufruf geschieht einmalig auf DOMContentLoaded.
   * ----------------------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", () => {
    // Loader: fetch → in Ziel-Container einsetzen → Erfolg true/false
    const loadInclude = (selector, url) => {
      const host = document.querySelector(selector);
      if (!host) return Promise.resolve(false); // Container fehlt
      return fetch(url)
        .then(res => (res.ok ? res.text() : ""))
        .then(html => { if (html) host.innerHTML = html; return !!html; })
        .catch(() => false);
    };

    // Header + Footer laden → dann Menü verdrahten + aktiven Link markieren
    Promise.all([
      loadInclude("#site-header", "includes/header.html"),
      loadInclude("#site-footer", "includes/footer.html"),
    ]).then(() => {
      initHeaderAndMenu();   // .burger & #navdrawer existieren jetzt sicher
      markActiveMenuLink();  // aria-current + .is-active setzen
    });
  });


  /* -------------------------------------------------------------------------
   * (2) HEADER / THEMEN-MENÜ – Initialisierung NACH Include
   * -----------------------------------------------------------------------
   * - Offcanvas-Drawer mit A11y (aria-expanded, Focus-Trap)
   * - Schließen bei ESC, Outside-Click, Resize, Link-Klick
   * ----------------------------------------------------------------------- */

  function initHeaderAndMenu() {
    // Sicherheitsnetz: Header kann auf Minimal-Seiten fehlen
    const burger = $(".burger");
    const drawer = $("#navdrawer");
    if (!burger || !drawer) return;

    let lastFocus = null; // Zur Fokus-Rückgabe beim Schließen

    // Label des Burgers aktualisieren (visuelles Feedback)
    const updateBurgerLabel = (open) => {
      const label = burger.querySelector(".burger__label");
      if (label) label.textContent = open ? "Menü schließen" : "Themen";
    };

    // Fokus innerhalb des Drawers halten (Focus Trap)
    const handleFocusTrap = (e) => {
      if (!trapFocusEnabled || e.key !== "Tab" || !drawer.classList.contains("is-open")) return;

      const focusables = $$(FOCUSABLE, drawer)
        .filter(el => !el.hasAttribute("disabled") && el.offsetParent !== null);
      if (!focusables.length) return;

      const first = focusables[0];
      const last  = focusables[focusables.length - 1];

      // Shift + Tab → vom ersten zum letzten
      if (e.shiftKey && document.activeElement === first) {
        last.focus(); e.preventDefault();
      }
      // Tab → vom letzten zum ersten
      if (!e.shiftKey && document.activeElement === last) {
        first.focus(); e.preventDefault();
      }
    };

    // Drawer öffnen/schließen (einheitlicher Schalter)
    const setDrawer = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      drawer.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : ""; // Body-Scroll sperren
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

    // Startzustand (zu)
    setDrawer(false);

    // A) Burger-Klick toggelt Drawer
    burger.addEventListener("click", () => {
      const isOpen = burger.getAttribute("aria-expanded") === "true";
      setDrawer(!isOpen);
    });

    // B) Klick außerhalb schließt Drawer
    document.addEventListener("click", (e) => {
      if (!drawer.classList.contains("is-open")) return;
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (!drawer.contains(t) && !burger.contains(t)) setDrawer(false);
    });

    // C) ESC schließt Drawer
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setDrawer(false);
    });

    // D) Link im Drawer angeklickt → nach Navigation schließen
    drawer.addEventListener("click", (e) => {
      const link = (e.target instanceof HTMLElement) ? e.target.closest("a") : null;
      if (link) setDrawer(false);
    });

    // E) Resize (Layoutwechsel) → Drawer schließen
    window.addEventListener("resize", () => setDrawer(false));
  }


  /* -------------------------------------------------------------------------
   * (3) AKTIVEN MENÜPUNKT markieren (Multi-Page)
   * -----------------------------------------------------------------------
   * Sucht alle Header-Links und markiert den, der zur aktuellen Seite passt.
   * Für In-Page-Links (#id) wird unten zusätzlich Scrollspy verdrahtet.
   * ----------------------------------------------------------------------- */

  function markActiveMenuLink() {
    const header = $("#site-header");
    if (!header) return;

    header.querySelectorAll("a[href]").forEach(a => {
      // Hinweis: relative Hrefs (index.html, unterseiten.html, …)
      const href = a.getAttribute("href") || "";
      const file = href.split("/").pop();               // letzter Pfadteil
      const isSamePage = file && file === CURRENT_PAGE; // exakte Dateimatch

      a.classList.toggle("is-active", isSamePage);
      if (isSamePage) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });

    // Scrollspy nur für Drawer-Links, die auf In-Page-Anker zeigen
    const drawerLinks = $$('#navdrawer a[href^="#"]');
    if (drawerLinks.length && SCROLLSPY_ENABLED) initScrollspy(drawerLinks);
  }


  /* -------------------------------------------------------------------------
   * (4) SCROLLSPY – aktive In-Page Links beim Scrollen
   * ----------------------------------------------------------------------- */

  function initScrollspy(drawerLinks) {
    // Mappe Section-Elemente auf ihre Links
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
    onScroll(); // initial setzen
  }


  /* -------------------------------------------------------------------------
   * (5) ACCORDION – WAI-ARIA light
   * ----------------------------------------------------------------------- */

  function initAccordion() {
    const triggers = $$('.accordion__trigger');
    if (!triggers.length) return;

    const panels = new Map(
      triggers.map(btn => {
        const id = btn.getAttribute("aria-controls");
        return [btn, id ? document.getElementById(id) : null];
      })
    );

    // Start: alles zu
    panels.forEach((panel, btn) => {
      btn.setAttribute("aria-expanded", "false");
      if (panel) panel.hidden = true;
    });

    // Toggle-Logik
    triggers.forEach(btn => {
      btn.addEventListener("click", () => {
        const panelId  = btn.getAttribute("aria-controls");
        const panel    = panelId ? document.getElementById(panelId) : null;
        const willOpen = btn.getAttribute("aria-expanded") !== "true";

        if (willOpen && SINGLE_OPEN) {
          // Single-Open-Modus: alle anderen schließen
          triggers.forEach(other => { if (other !== btn) other.setAttribute("aria-expanded", "false"); });
          panels.forEach(p => { if (p) p.hidden = true; });
        }

        btn.setAttribute("aria-expanded", String(willOpen));
        if (panel) panel.hidden = !willOpen;
      });
    });
  }


  /* -------------------------------------------------------------------------
   * (6) KONTAKT-MAIL – Spam-Schutz
   * ----------------------------------------------------------------------- */

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


  /* -------------------------------------------------------------------------
   * (7) FOOTER-JAHR – automatisch setzen
   * ----------------------------------------------------------------------- */

  function initYear() {
    const yearEl = $("[data-year]");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }


  /* -------------------------------------------------------------------------
   * (8) SMOOTH SCROLL – „Nach oben“-Link
   * ----------------------------------------------------------------------- */

  function initSmoothToTop() {
    const toTop = $(".to-top");
    if (!toTop) return;

    toTop.addEventListener("click", (e) => {
      const href = toTop.getAttribute("href") || "";
      if (!href.startsWith("#")) return;      // nur In-Page
      const target = $(href);
      if (!target) return;

      e.preventDefault();
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({
        behavior: prefersReduced ? "auto" : "smooth",
        block: "start"
      });
    });
  }


  /* -------------------------------------------------------------------------
   * (9) BASIS-INITIALISIERUNG (nicht abhängig vom Header-Include)
   * ----------------------------------------------------------------------- */

  document.addEventListener("DOMContentLoaded", () => {
    initAccordion();     // Accordion-Komponenten (falls vorhanden)
    initSafeMail();      // Kontakt-E-Mail aufbauen
    initYear();          // aktuelles Jahr in den Footer schreiben
    initSmoothToTop();   // sanftes Scrollen zum Seitenanfang
    // Scrollspy wird in markActiveMenuLink() gestartet,
    // nachdem der Header (inkl. Drawer) geladen wurde.
  });

})(); // IIFE – kapselt alles und vermeidet globale Variablen
