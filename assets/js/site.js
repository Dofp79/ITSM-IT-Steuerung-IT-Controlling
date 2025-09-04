/* ===========================================================
   HEADER & FOOTER laden und DANACH Menü initialisieren
   + Headerhöhe messen → CSS-Variable --header-h setzen
   =========================================================== */
document.addEventListener('DOMContentLoaded', () => {
  // kleines Include-Helferlein
  const include = (sel, url) => {
    const host = document.querySelector(sel);
    if (!host) return Promise.resolve(false);
    return fetch(url).then(r => r.ok ? r.text() : '')
      .then(html => { if (html) host.innerHTML = html; return !!html; })
      .catch(() => false);
  };

  // Nach Header-Include: Menü & Headerhöhe initialisieren
  const afterHeaderReady = () => {
    initMenu();          // Burger + Drawer + active state
    setHeaderHeightVar();// --header-h passend setzen
    markActiveLink();    // aktuellen Menüpunkt markieren
  };

  // Alles laden → initialisieren
  Promise.all([
    include('#site-header', 'includes/header.html'),
    include('#site-footer', 'includes/footer.html'),
  ]).then(afterHeaderReady);

  // ---------- Hilfsfunktionen ----------

  function setHeaderHeightVar(){
    // Header existiert erst NACH Include
    const header = document.querySelector('.site-header');
    const brandBar = document.querySelector('.brand-bar');
    if (!header) return;
    // reale Höhe: Header + Brand-Bar (falls vorhanden)
    const h = header.offsetHeight + (brandBar ? brandBar.offsetHeight : 0);
    document.documentElement.style.setProperty('--header-h', `${h}px`);
    // bei Resize neu messen (responsiv)
    window.addEventListener('resize', () => {
      const hh = header.offsetHeight + (brandBar ? brandBar.offsetHeight : 0);
      document.documentElement.style.setProperty('--header-h', `${hh}px`);
    });
  }

  function initMenu(){
    // Burger/Drawer verdrahten (defensiv; existieren evtl. noch nicht)
    const burger = document.querySelector('.burger');
    const drawer = document.getElementById('navdrawer');
    if (!burger || !drawer) return;

    const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    let lastFocus = null;

    const setLabel = (open) => {
      const label = burger.querySelector('.burger__label');
      if (label) label.textContent = open ? 'Menü schließen' : 'Themen';
    };
    const trap = (e) => {
      if (e.key !== 'Tab' || !drawer.classList.contains('is-open')) return;
      const list = [...drawer.querySelectorAll(FOCUSABLE)].filter(el => !el.disabled && el.offsetParent !== null);
      if (!list.length) return;
      const [first, last] = [list[0], list[list.length-1]];
      if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
      if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
    };
    const openDrawer = (open) => {
      burger.setAttribute('aria-expanded', String(open));
      drawer.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      setLabel(open);
      if (open) {
        lastFocus = document.activeElement;
        (drawer.querySelector(FOCUSABLE) || drawer).focus({ preventScroll:true });
        document.addEventListener('keydown', trap);
      } else {
        (lastFocus instanceof HTMLElement ? lastFocus : burger).focus({ preventScroll:true });
        document.removeEventListener('keydown', trap);
      }
    };

    // Startzustand
    openDrawer(false);

    // Events
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      openDrawer(!open);
    });
    document.addEventListener('click', (e) => {
      if (!drawer.classList.contains('is-open')) return;
      const t = e.target;
      if (!(t instanceof Node)) return;
      if (!drawer.contains(t) && !burger.contains(t)) openDrawer(false);
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') openDrawer(false); });
    drawer.addEventListener('click', (e) => {
      const link = (e.target instanceof HTMLElement) ? e.target.closest('a') : null;
      if (link) openDrawer(false); // beim Navigieren schließen
    });
    window.addEventListener('resize', () => openDrawer(false));
  }

  function markActiveLink(){
    // Aktive Seite im Drawer markieren
    const current = location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('#navdrawer a[href]').forEach(a => {
      const onPage = (a.getAttribute('href') || '').endsWith(current);
      a.classList.toggle('is-active', onPage);
      if (onPage) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }
});
