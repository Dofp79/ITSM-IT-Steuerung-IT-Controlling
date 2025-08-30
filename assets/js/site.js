(() => {
  // ---- HTML-Partials laden ----
  async function includePartials() {
    const slots = document.querySelectorAll('[data-include]');
    for (const slot of slots) {
      const url = slot.getAttribute('data-include');
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        slot.innerHTML = await res.text();
      } catch {
        slot.innerHTML = `<!-- include failed: ${url} -->`;
      }
    }
  }

  // ---- Navigation: Burger, Active-State, ESC schließt ----
  function enhanceNav() {
    const btn  = document.getElementById('navToggle');
    const list = document.getElementById('mainnavList');
    if (btn && list) {
      btn.addEventListener('click', () => {
        const open = list.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      list.querySelectorAll('a').forEach(a =>
        a.addEventListener('click', () => { list.classList.remove('is-open'); btn.setAttribute('aria-expanded','false'); })
      );
      window.addEventListener('keydown', e => {
        if (e.key === 'Escape') { list.classList.remove('is-open'); btn.setAttribute('aria-expanded','false'); }
      });
    }

    // aktiven Menüpunkt markieren
    const current = location.pathname.replace(/index\.html?$/,'') || '/';
    document.querySelectorAll('#mainnav a[href]').forEach(a => {
      const href = a.getAttribute('href').replace(/index\.html?$/,'') || '/';
      if (href === current) a.setAttribute('aria-current','page');
    });

    // optional: Sticky Header
    const header = document.querySelector('.km1-header');
    if (header) {
      const onScroll = () => header.classList.toggle('is-sticky', window.scrollY > 10);
      onScroll(); window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  // ---- Kontakt: E-Mail erst auf Klick zusammensetzen ----
  function protectMail() {
    document.querySelectorAll('[data-email-user][data-email-domain]').forEach(link => {
      link.addEventListener('click', e => {
        const u = link.getAttribute('data-email-user');
        const d = link.getAttribute('data-email-domain');
        link.href = `mailto:${u}@${d}`; link.textContent = `${u}@${d}`;
        e.preventDefault();
      }, { once: true });
    });
  }

  // ---- Footer: Jahr einfügen ----
  function setYear() {
    const y = document.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  }

  // Bootstrapping
  document.addEventListener('DOMContentLoaded', async () => {
    await includePartials();   // Header/Contact/Footer in Seite einsetzen
    enhanceNav();              // erst danach Navigation aktivieren
    protectMail();
    setYear();
  });
})();
