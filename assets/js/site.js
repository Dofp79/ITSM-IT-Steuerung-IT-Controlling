/**
 * assets/js/site.js
 * Globale Initialisierung für:
 * - HTML-Partials laden (Header / Kontakt / Footer)
 * - Navigation (Burger, aktiver Menüpunkt, Sticky)
 * - E-Mail-Schutz (Adresse erst bei Klick zusammensetzen)
 * - Footer-Jahr automatisch setzen
 */
(() => {

  // =========================================
  // 1) HTML-PARTIALS LADEN
  //    Lädt alle Container mit data-include="…"
  //    und ersetzt deren Inhalt per fetch()
  // =========================================
  async function includePartials() {
    const slots = document.querySelectorAll('[data-include]');
    for (const slot of slots) {
      const url = slot.getAttribute('data-include'); // z. B. "./partials/header.html"
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const html = await res.text();
        slot.innerHTML = html;
      } catch (err) {
        // Sauberer Fallback + Console-Hinweis zur Diagnose
        console.warn(`includePartials(): Fehler beim Laden von ${url}`, err);
        slot.innerHTML = `<!-- include failed: ${url} -->`;
      }
    }
  }

  // =========================================
  // 2) NAVIGATION VERBESSERN
  //    - Burger-Menü (öffnen/schließen)
  //    - Aktiven Menüpunkt markieren
  //    - Sticky-Header beim Scrollen
  //    - Menü bei Klick außerhalb schließen (mobil)
  // =========================================
  function enhanceNav() {
    // Elemente aus dem per Partial geladenen Header
    const btn   = document.getElementById('navToggle');    // Burger-Button
    const list  = document.getElementById('mainnavList');  // <ul> der Links
    const nav   = document.getElementById('mainnav');      // <nav> Container
    const header = document.querySelector('.km1-header');  // Header-Wrapper

    // ----- Burger-Menü -----
    if (btn && list) {
      // Klick → Menü toggeln
      btn.addEventListener('click', () => {
        const open = list.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      // Link im Menü angeklickt → Menü schließen (Mobile-UX)
      list.querySelectorAll('a').forEach(a => {
        a.addEventListener('click', () => {
          list.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
        });
      });

      // Klick außerhalb der Navigation → Menü schließen
      document.addEventListener('click', (ev) => {
        if (!list.classList.contains('is-open')) return;
        const target = ev.target;
        const clickInsideNav = nav?.contains(target) || btn.contains(target);
        if (!clickInsideNav) {
          list.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
        }
      });

      // ESC-Taste → Menü schließen
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          list.classList.remove('is-open');
          btn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    // ----- Aktiven Menüpunkt markieren (robust per URL) -----
    // Normalisiert Pfade wie:
    //  - /repo/            → /repo
    //  - /repo/index.html  → /repo
    //  - /repo/ueber.html  → /repo/ueber
    const normalize = (path) =>
      path.replace(/\/index\.html?$/i, '').replace(/\/$/, '') || '/';

    const currentPath = normalize(location.pathname);

    document.querySelectorAll('#mainnav a[href]').forEach((a) => {
      const linkPath = normalize(new URL(a.getAttribute('href'), location.href).pathname);
      if (linkPath === currentPath) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });

    // ----- Sticky-Header ab kleinem Scroll-Offset -----
    if (header) {
      const onScroll = () => header.classList.toggle('is-sticky', window.scrollY > 10);
      onScroll(); // initial prüfen
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  // =========================================
  // 3) KONTAKT-MAIL SCHÜTZEN
  //    Setzt die echte mailto: erst beim Klick
  //    (versteckt die Adresse vor Bots)
  // =========================================
  function protectMail() {
    document
      .querySelectorAll('[data-email-user][data-email-domain]')
      .forEach((link) => {
        link.addEventListener(
          'click',
          (e) => {
            const u = link.getAttribute('data-email-user');
            const d = link.getAttribute('data-email-domain');
            link.href = `mailto:${u}@${d}`;
            link.textContent = `${u}@${d}`;
            e.preventDefault(); // verhindert Sprung nach "#"
          },
          { once: true } // nur beim ersten Klick ausführen
        );
      });
  }

  // =========================================
  // 4) FOOTER-JAHR AUTOMATISCH SETZEN
  // =========================================
  function setYear() {
    const y = document.querySelector('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  }

  // =========================================
  // 5) BOOTSTRAP
  //    - erst Partials laden (sie bringen Header/Kontakt/Footer ins DOM)
  //    - dann Navigation/Schutz/Year aktivieren
  // =========================================
  document.addEventListener('DOMContentLoaded', async () => {
    await includePartials();   // 1) Partials in Seite einsetzen
    enhanceNav();              // 2) Navigation (Burger, aktiv, sticky)
    protectMail();             // 3) Mail-Links schützen
    setYear();                 // 4) Copyright-Jahr aktualisieren
  });

})(); // IIFE → kapselt alles im Funktions-Scope ein
