/* ===========================================================================
   Globales JavaScript – Standard für ALLE Seiten
   ===========================================================================
   Aufgaben:
   - Header/Footer includen (fetch) und ERST DANACH das Menü initialisieren
   - Burger/Drawer: A11y, Focus-Trap, ESC, Outside-Click
   - Aktiver Menüpunkt (aria-current + .is-active)
   - Optional: Scrollspy für #Anker
   - Kontakt-Mail obfuskieren
   - Jahr im Footer setzen
   - Smooth Scroll zum "Nach oben"
   =========================================================================== */

(() => {
  "use strict";

  /* ----------------------------- Utilities -------------------------------- */
  const $  = (s, c=document) => c.querySelector(s);
  const $$ = (s, c=document) => Array.from(c.querySelectorAll(s));
  const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const CURRENT_PAGE = (() => {
    const file = location.pathname.split("/").pop();
    return file && file !== "" ? file : "index.html";
  })();

  /* -------- Header/Footer includen UND danach Menü binden ------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    const include = (sel, url) => {
      const host = document.querySelector(sel);
      if (!host) return Promise.resolve(false);
      return fetch(url)
        .then(r => r.ok ? r.text() : "")
        .then(html => { if (html) host.innerHTML = html; return !!html; })
        .catch(() => false);
    };

    // Erst laden …
    Promise.all([
      include("#site-header", "includes/header.html"),
      include("#site-footer", "includes/footer.html"),
    ]).then(() => {
      // … dann verdrahten:
      initHeaderAndMenu();
      markActiveMenuLink();
      initMisc();
    });
  });

  /* ----------------------- Header / Menü initialisieren -------------------- */
  function initHeaderAndMenu(){
    const header = $("#site-header");
    const burger = $(".burger", header);
    const drawer = $("#navdrawer", header);
    if (!header || !burger || !drawer) return;

    // Header-Höhe messen → CSS-Var für Drawer-Top setzen
    const setHeaderHeightVar = () => {
      const h = header.offsetHeight;
      document.documentElement.style.setProperty("--header-h", `${h}px`);
    };
    setHeaderHeightVar();
    window.addEventListener("resize", setHeaderHeightVar);

    let lastFocus = null;

    const updateBurgerLabel = (open) => {
      const label = $(".burger__label", header);
      if (label) label.textContent = open ? "Menü schließen" : "Themen";
    };

    const handleFocusTrap = (e) => {
      if (e.key !== "Tab" || !drawer.classList.contains("is-open")) return;
      const f = $$(FOCUSABLE, drawer).filter(el => !el.disabled && el.offsetParent !== null);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    };

    const setDrawer = (open) => {
      burger.setAttribute("aria-expanded", String(open));
      drawer.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
      updateBurgerLabel(open);
      if (open) {
        lastFocus = document.activeElement;
        const first = drawer.querySelector(FOCUSABLE);
        first && first.focus({ preventScroll:true });
        document.addEventListener("keydown", handleFocusTrap);
      } else {
        (lastFocus instanceof HTMLElement ? lastFocus : burger).focus({ preventScroll:true });
        document.removeEventListener("keydown", handleFocusTrap);
      }
    };

    // Start: Drawer zu
    setDrawer(false);

    // Events
    burger.addEventListener("click", () => {
      const isOpen = burger.getAttribute("aria-expanded") === "true";
      setDrawer(!isOpen);
    });
    document.addEventListener("click", (e) => {
      if (!drawer.classList.contains("is-open")) return;
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (!drawer.contains(t) && !burger.contains(t)) setDrawer(false);
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") setDrawer(false); });
    drawer.addEventListener("click", (e) => {
      const a = (e.target instanceof HTMLElement) ? e.target.closest("a") : null;
      if (a) setDrawer(false); // nach Seitenwechsel schließen
    });
    window.addEventListener("resize", () => setDrawer(false));
  }

  /* ------------------ Aktiven Menüpunkt markieren (M-Page) ----------------- */
  function markActiveMenuLink(){
    const header = $("#site-header");
    if (!header) return;
    header.querySelectorAll("a[href]").forEach(a => {
      const href = a.getAttribute("href") || "";
      const active = href.endsWith(CURRENT_PAGE);
      a.classList.toggle("is-active", active);
      if (active) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
  }

  /* ------------------- Sonstiges (Mail, Jahr, To-Top) ---------------------- */
  function initMisc(){
    // Spam-sichere Mailadresse (falls vorhanden)
    const mail = $("#contactEmail");
    if (mail) {
      const addr = `${mail.dataset.emailUser || ""}@${mail.dataset.emailDomain || ""}`.trim();
      if (addr.includes("@")) { mail.href = `mailto:${addr}`; mail.textContent = addr; }
    }

    // Jahr im Footer
    const y = $("[data-year]"); if (y) y.textContent = String(new Date().getFullYear());

    // Smooth Scroll „Nach oben“
    const toTop = $(".to-top");
    if (toTop){
      toTop.addEventListener("click", (e) => {
        const href = toTop.getAttribute("href") || "";
        if (!href.startsWith("#")) return;
        const target = $(href);
        if (!target) return;
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      });
    }
  }
})();
