/* ===========================================================
   Globales Skript – Burger/Drawer, Accordion, Jahr im Footer
   =========================================================== */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  // Burger-Menü / Drawer
  const burger = $('.burger');
  const drawer = $('#navdrawer');

  const setDrawer = (open) => {
    burger?.setAttribute('aria-expanded', String(open));
    drawer?.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };

  if (burger && drawer) {
    setDrawer(false);
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      setDrawer(!open);
    });
    // Schließen bei ESC oder Klick außen
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setDrawer(false); });
    document.addEventListener('click', (e) => {
      if (!drawer.contains(e.target) && !burger.contains(e.target)) setDrawer(false);
    });
  }

  // Accordion (Sektion ITSM Konzept)
  $$('.accordion__trigger').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const set = (open) => { btn.setAttribute('aria-expanded', String(open)); if (panel) panel.hidden = !open; };
    set(false);
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  });

  // Jahr im Footer
  const y = $('[data-year]'); if (y) y.textContent = new Date().getFullYear();
})();
