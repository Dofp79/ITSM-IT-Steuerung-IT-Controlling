/* ===========================================================
   Globales Skript – Burger/Drawer, Accordion, Jahr im Footer
   =========================================================== */
(() => {
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  // -------------------------------
  // Burger/Drawer
  // -------------------------------
  const burger = $('.burger');
  const drawer = $('#navdrawer');
  let lastFocus = null;

  const setDrawer = (open) => {
    if (!burger || !drawer) return;
    burger.setAttribute('aria-expanded', String(open));
    drawer.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';

    if (open) {
      lastFocus = document.activeElement;
      // Ersten Link fokusieren (falls vorhanden)
      const firstLink = drawer.querySelector('a, button, [tabindex]:not([tabindex="-1"])');
      firstLink?.focus({ preventScroll: true });
    } else {
      // Fokus zurück auf den Burger
      (lastFocus instanceof HTMLElement ? lastFocus : burger).focus({ preventScroll: true });
    }
  };

  if (burger && drawer) {
    setDrawer(false);

    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      setDrawer(!open);
    });

    // Klick außerhalb schließt
    document.addEventListener('click', (e) => {
      if (!drawer.contains(e.target) && !burger.contains(e.target)) setDrawer(false);
    });

    // ESC schließt
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setDrawer(false);
    });

    // Klick auf Link im Drawer schließt (z. B. bei Anker-Navigation)
    drawer.addEventListener('click', (e) => {
      const t = e.target;
      if (t instanceof HTMLElement && t.closest('a')) {
        setDrawer(false);
      }
    });
  }

  // -------------------------------
  // Accordion (WAI-ARIA light)
  // -------------------------------
  $$('.accordion__trigger').forEach((btn) => {
    const panelId = btn.getAttribute('aria-controls');
    const panel   = panelId ? document.getElementById(panelId) : null;

    const set = (open) => {
      btn.setAttribute('aria-expanded', String(open));
      if (panel) panel.hidden = !open;
    };

    set(false);
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      set(open);
    });
  });

  // -------------------------------
  // Kontakt-Mail zusammensetzen (Spam-Schutz)
  // -------------------------------
  const mailLink = $('#contactEmail');
  if (mailLink) {
    const user   = mailLink.dataset.emailUser || '';
    const domain = mailLink.dataset.emailDomain || '';
    if (user && domain) {
      const addr = `${user}@${domain}`;
      mailLink.href = `mailto:${addr}`;
      mailLink.textContent = addr;
    }
  }

  // -------------------------------
  // Jahr im Footer
  // -------------------------------
  const y = $('[data-year]');
  if (y) y.textContent = new Date().getFullYear();
})();
