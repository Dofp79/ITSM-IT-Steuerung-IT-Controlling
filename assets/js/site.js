/* ==========================================================================
   Globales Skript – Navigation, Accordion & kleine Helfer
   Ordnerstruktur: /js/site.js (global)
   ========================================================================== */
(() => {
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

  // 1) Mobile Navigation
  const toggle = $('.nav-toggle');
  const menu = $('#hauptmenue');

  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      // Für Mobile: block anzeigen; auf Desktop greift CSS
      menu.style.display = open ? 'block' : '';
    };
    setOpen(false);

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      setOpen(!open);
    });

    // Klick außerhalb schließt das Menü
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });

    // Escape schließt
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
  }

  // 2) Accordion
  $$('.accordion__trigger').forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      if (panel) panel.hidden = !open;
    };
    set(false);
    btn.addEventListener('click', () => set(btn.getAttribute('aria-expanded') !== 'true'));
  });

  // 3) Jahr im Footer
  const yearTarget = document.querySelector('[data-year]');
  if (yearTarget) yearTarget.textContent = new Date().getFullYear();
})();
