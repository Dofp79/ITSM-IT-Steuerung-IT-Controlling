/* ==========================================================================
   Globales Skript – Navigation, Accordion & kleine Helfer
   ========================================================================== */

(function () {
  // Utility: Helper für Selektor
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  // 1) Mobile Navigation
  const toggle = $('.nav-toggle');
  const menu = $('#hauptmenue');

  if (toggle && menu) {
    const setOpen = (open) => {
      toggle.setAttribute('aria-expanded', String(open));
      menu.style.display = open ? 'block' : '';
    };
    setOpen(false);

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      setOpen(!open);
    });

    // Schließen, wenn Fokus rausgeht (einfach gehalten)
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target) && !toggle.contains(e.target)) {
        setOpen(false);
      }
    });

    // Escape schließt Menü
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  // 2) Accordion (WAI-ARIA light)
  const triggers = $$('.accordion__trigger');
  triggers.forEach((btn) => {
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!expanded));
      if (panel) {
        panel.hidden = expanded; // wenn offen -> schließen, sonst öffnen
      }
    });

    // Initialzustand: Panels versteckt
    if (panel) panel.hidden = true;
  });

  // 3) Dynamisches Jahr im Footer
  const yearTarget = document.querySelector('[data-year]');
  if (yearTarget) yearTarget.textContent = new Date().getFullYear();
})();
