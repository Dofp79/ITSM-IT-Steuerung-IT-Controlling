/* =============================================================================
   site.js – Globales Skript für Header/Footer, Menü & Utilities
   =============================================================================
   Enthält:
   - (0) Utilities ($/$$, CURRENT_PAGE)
   - (1) Includes laden (Header + Footer)
   - (2) Headerhöhe messen → CSS-Var --header-h setzen (Drawer-Start)
   - (3) Menü/Drawer (A11y: ESC, Focus-Trap, Outside-Click)
   - (4) Aktiven Menüpunkt markieren
   - (5) Kontakt-Mail (Spam-sicher) + Jahr im Footer
   - (6) Sicherheitsgurt: doppelte Kontaktblöcke entfernen  ←  **LÖST dein Problem**
   ============================================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------------------------------------
   * (0) Utilities
   * ------------------------------------------------------------------------- */
  const $  = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // Aktuelle Datei (für .is-active Markierung)
  const CURRENT_PAGE = (() => {
    const p = location.pathname.split("/").pop();
    return p && p !== "/" ? p : "index.html";
  })();

  // Fokusierbare Elemente (für Focus-Trap im Drawer)
  const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

  /* ---------------------------------------------------------------------------
   * (1) Includes laden: Header + Footer – danach initialisieren
   * ------------------------------------------------------------------------- */
  document.addEventListener("DOMContentLoaded", () => {
    const loadInclude = (selector, url) => {
      const host = document.querySelector(selector);
      if (!host) return Promise.resolve(false);
      return fetch(url)
        .then(res => (res.ok ? res.text() : ""))
        .then(html => { if (html) host.innerHTML = html; return !!html; })
        .catch(() => false);
    };

    Promise.all([
      loadInclude("#site-header", "includes/header.html"),
      loadInclude("#site-footer", "includes/footer.html"),
    ]).then(() => {
      // WICHTIG: Alles erst nach Include verdrahten – Elemente existieren jetzt.
      initHeaderHeightVar();   // (2) Headerhöhe → --header-h
      initMenu();              // (3) Drawer/Burger (A11y)
      markActiveMenuLink();    // (4) Aktiver Menüpunkt
      initSafeMail();          // (5a) Spam-sichere Mail
      initYear();              // (5b) Jahr setzen
      ensureSingleContact();   // (6) ***Doppelte Kontaktblöcke entfernen***
    });
  });

  /* ---------------------------------------------------------------------------
   * (2) Headerhöhe messen → --header-h (Drawer beginnt direkt darunter)
   * ------------------------------------------------------------------------- */
  function initHeaderHeightVar(){
    const header   = $(".site-header");
    const brandBar = $(".brand-bar"); // dünne rote Linie direkt unter dem Header
    if (!header) return;

    const update = () => {
      const h = header.offsetHeight + (brandBar ? brandBar.offsetHeight : 0);
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    update();
    window.addEventListener("resize", update);
  }

  /* ---------------------------------------------------------------------------
   * (3) Menü/Drawer – A11y, Focus-Trap, Close-Mechaniken
   * ------------------------------------------------------------------------- */
  function initMenu(){
    const burger = $(".burger");
    const drawer = $("#navdrawer");
    if (!burger || !drawer) return;

    let lastFocus = null;

    const setBurgerLabel = (open) => {
      const label = burger.querySelector(".burger__label");
      if (label) label.textContent = open ? "Menü schließen" : "Themen";
    };

    const handleFocusTrap = (e) => {
      if (e.key !== "Tab" || !drawer.classList.contains("is-open")) return;
      const list = $$(FOCUSABLE, drawer).filter(el => !el.disabled && el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0], last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    };

    const setDrawer = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      drawer.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
      setBurgerLabel(open);

      if (open) {
        lastFocus = document.activeElement;
        (drawer.querySelector(FOCUSABLE) || drawer).focus({ preventScroll:true });
        document.addEventListener("keydown", handleFocusTrap);
      } else {
        (lastFocus instanceof HTMLElement ? lastFocus : burger).focus({ preventScroll:true });
        document.removeEventListener("keydown", handleFocusTrap);
      }
    };

    // Startzustand
    setDrawer(false);

    // Events
    burger.addEventListener("click", () => {
      const open = burger.getAttribute("aria-expanded") === "true";
      setDrawer(!open);
    });
    document.addEventListener("click", (e) => {
      if (!drawer.classList.contains("is-open")) return;
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (!drawer.contains(t) && !burger.contains(t)) setDrawer(false);
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setDrawer(false); });
    drawer.addEventListener("click", (e) => {
      const link = (e.target instanceof HTMLElement) ? e.target.closest("a") : null;
      if (link) setDrawer(false); // Navigieren → schließen
    });
    window.addEventListener("resize", () => setDrawer(false));
  }

  /* ---------------------------------------------------------------------------
   * (4) Aktiven Menüpunkt markieren (Multi-Page)
   * ------------------------------------------------------------------------- */
  function markActiveMenuLink(){
    const header = $("#site-header");
    if (!header) return;
    header.querySelectorAll('#navdrawer a[href]').forEach(a => {
      const href = a.getAttribute("href") || "";
      const isCurrent = href.endsWith(CURRENT_PAGE);
      a.classList.toggle("is-active", isCurrent);
      if (isCurrent) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
    });
  }

  /* ---------------------------------------------------------------------------
   * (5) Kleine Helfer: E-Mail & Jahr
   * ------------------------------------------------------------------------- */
  function initSafeMail(){
    // Funktioniert für alle Links mit id=contactEmail und data-email-Attributen
    $$("#contactEmail").forEach(link => {
      const user   = link.dataset.emailUser   || link.dataset.emailuser   || "";
      const domain = link.dataset.emailDomain || link.dataset.emaildomain || "";
      if (!user || !domain) return;
      const addr = `${user}@${domain}`;
      link.href = `mailto:${addr}`;
      link.textContent = addr;
    });
  }

  function initYear(){
    const yearEl = $("[data-year]");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  }

  /* ---------------------------------------------------------------------------
   * (6) Sicherheitsgurt gegen doppelte „Kontakt“-Blöcke
   * -------------------------------------------------------------------------
   * Ziel: Es soll genau EIN .contact-block pro Seite existieren.
   * Vorgehen:
   *  - Wenn im Footer-Container (#site-footer) ein Kontakt gefunden wird,
   *    entfernen wir ALLE .contact-block außerhalb des Footers.
   *  - Falls (außergewöhnlich) kein Footer-Kontakt vorhanden ist,
   *    behalten wir nur den ERSTEN .contact-block und entfernen alle weiteren.
   * ------------------------------------------------------------------------- */
  function ensureSingleContact(){
    const footerHost = $("#site-footer");
    const footerContact = footerHost ? $(".contact-block", footerHost) : null;
    const allContacts = $$(".contact-block", document);

    if (footerContact) {
      // Footer-Variante ist maßgeblich → alle anderen weg
      allContacts.forEach(block => {
        // steht der Block NICHT im Footer-Host? → entfernen
        if (!footerHost.contains(block)) block.remove();
      });
      return;
    }

    // Kein Footer-Kontakt? → Behalte nur den ersten, rest löschen
    if (allContacts.length > 1) {
      allContacts.slice(1).forEach(b => b.remove());
    }
  }

})(); // Ende IIFE
