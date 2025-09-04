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

/* =======================================================================
   Globale Includes + Header/Menu-Init + "nur EIN Kontakt"-Sicherheitsgurt
   ======================================================================= */

(() => {
  "use strict";

  /* ---------------------------------------------
   * (0) Mini-Utils (Query-Helfer, einmalige Promises)
   * ------------------------------------------- */
  const $  = (sel, ctx=document) => ctx.querySelector(sel);
  const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));

  const include = (sel, url) => {
    // Lädt HTML in einen Ziel-Container (#site-header, #site-footer)
    const host = $(sel);
    if (!host) return Promise.resolve(false);
    return fetch(url)
      .then(r => (r.ok ? r.text() : ""))
      .then(html => { if (html) host.innerHTML = html; return !!html; })
      .catch(() => false);
  };

  /* ---------------------------------------------------------
   * (1) Genau EIN Kontaktblock (.contact-block) auf der Seite
   * ---------------------------------------------------------
   * Regel:
   * - Falls es mehrere gibt, behalten wir den aus dem Footer
   *   (#site-footer .contact-block). Wenn keiner im Footer,
   *   behalten wir den letzte(n) im DOM.
   * - Wird nach dem Laden der Includes UND bei späteren DOM-
   *   Änderungen (MutationObserver) angewandt.
   */
  function ensureSingleContact() {
    const all = $$('.contact-block');
    if (all.length <= 1) return; // alles gut

    const footerOne = $('#site-footer .contact-block');
    const keep = footerOne || all[all.length - 1];

    all.forEach(el => { if (el !== keep) el.remove(); });
  }

  // Reagiere auch auf spätere DOM-Änderungen (z. B. zweites Include-Skript)
  const maybeObserveOnce = (() => {
    let done = false;
    return () => {
      if (done) return;
      const obs = new MutationObserver(() => ensureSingleContact());
      obs.observe(document.body, { childList: true, subtree: true });
      done = true;
    };
  })();

  /* ---------------------------------------------------------
   * (2) Headerhöhe messen → CSS-Var --header-h setzen
   *     (wichtig, damit der Drawer unter dem Header startet)
   * --------------------------------------------------------- */
  function setHeaderHeightVar(){
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

  /* ---------------------------------------------------------
   * (3) Burger/Drawer initialisieren (A11y + Close-Logik)
   * --------------------------------------------------------- */
  function initMenu(){
    const burger = $('.burger');
    const drawer = $('#navdrawer');
    if (!burger || !drawer) return;

    const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    let lastFocus = null;

    const setLabel = open => {
      const label = burger.querySelector('.burger__label');
      if (label) label.textContent = open ? 'Menü schließen' : 'Themen';
    };
    const trap = e => {
      if (e.key !== 'Tab' || !drawer.classList.contains('is-open')) return;
      const list = [...drawer.querySelectorAll(FOCUSABLE)].filter(el => !el.disabled && el.offsetParent !== null);
      if (!list.length) return;
      const first = list[0], last = list[list.length-1];
      if (e.shiftKey && document.activeElement === first){ last.focus(); e.preventDefault(); }
      if (!e.shiftKey && document.activeElement === last){ first.focus(); e.preventDefault(); }
    };

    const openDrawer = open => {
      burger.setAttribute('aria-expanded', String(open));
      drawer.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      setLabel(open);
      if (open){
        lastFocus = document.activeElement;
        (drawer.querySelector(FOCUSABLE) || drawer).focus({ preventScroll: true });
        document.addEventListener('keydown', trap);
      } else {
        (lastFocus instanceof HTMLElement ? lastFocus : burger).focus({ preventScroll: true });
        document.removeEventListener('keydown', trap);
      }
    };

    // Startzustand & Events
    openDrawer(false);
    burger.addEventListener('click', () => openDrawer(burger.getAttribute('aria-expanded') !== 'true'));
    document.addEventListener('click', e => {
      if (!drawer.classList.contains('is-open')) return;
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (!drawer.contains(t) && !burger.contains(t)) openDrawer(false);
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') openDrawer(false); });
    drawer.addEventListener('click', e => { if ((e.target instanceof HTMLElement) && e.target.closest('a')) openDrawer(false); });
    window.addEventListener('resize', () => openDrawer(false));
  }

  /* ---------------------------------------------------------
   * (4) Aktiven Menüpunkt markieren
   * --------------------------------------------------------- */
  function markActiveLink(){
    const current = location.pathname.split('/').pop() || 'index.html';
    $$('#navdrawer a[href]').forEach(a => {
      const onPage = (a.getAttribute('href') || '').endsWith(current);
      a.classList.toggle('is-active', onPage);
      if (onPage) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  /* ---------------------------------------------------------
   * (5) Seite starten: Includes → Init → EIN Kontakt sicherstellen
   * --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
      include('#site-header', 'includes/header.html'),
      include('#site-footer', 'includes/footer.html'),
    ]).then(() => {
      // Nach dem Einfügen des Headers/Footers alles initialisieren:
      initMenu();
      setHeaderHeightVar();
      markActiveLink();

      // → und jetzt DOPPELTE Kontakte entfernen (falls Seite noch einen eigenen hat)
      ensureSingleContact();
      maybeObserveOnce(); // falls später erneut was injected wird
    });
  });
})();
