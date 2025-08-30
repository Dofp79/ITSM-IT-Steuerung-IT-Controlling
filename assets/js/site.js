(() => {
  // ================================
  // FUNKTION: HTML-Partials laden
  // ================================
  async function includePartials() {
    // Alle Container finden, die data-include="..." tragen
    const slots = document.querySelectorAll('[data-include]');
    for (const slot of slots) {
      const url = slot.getAttribute('data-include'); // Pfad zum Partial (z.B. header.html)
      try {
        // Partial laden (immer ohne Cache, damit Änderungen sofort sichtbar sind)
        const res = await fetch(url, { cache: 'no-cache' });
        // Inhalt in den Platzhalter einsetzen
        slot.innerHTML = await res.text();
      } catch {
        // Falls das Laden fehlschlägt → Kommentar einfügen
        slot.innerHTML = `<!-- include failed: ${url} -->`;
      }
    }
  }

  // ================================
  // FUNKTION: Navigation verbessern
  // ================================
  function enhanceNav() {
    const btn  = document.getElementById('navToggle');   // Burger-Button
    const list = document.getElementById('mainnavList'); // UL mit Links

    if (btn && list) {
      // Klick auf Burger → Menü ein-/ausblenden
      btn.addEventListener('click', () => {
        const open = list.classList.toggle('is-open'); // Klasse toggeln
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });

      // Klick auf einen Link → Menü wieder schließen (mobile UX)
      list.querySelectorAll('a').forEach(a =>
        a.addEventListener('click', () => {
          list.classList.remove('is-open');
          btn.setAttribute('aria-expanded','false');
        })
      );

      // ESC-Taste → Menü schließen
      window.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          list.classList.remove('is-open');
          btn.setAttribute('aria-expanded','false');
        }
      });
    }

    // -------------------------------
    // Aktiven Menüpunkt markieren
    // -------------------------------
    // Aktuelle URL-Pfad (ohne index.html am Ende)
    const current = location.pathname.replace(/index\.html?$/,'') || '/';
    
    // Alle Links im Hauptmenü durchgehen
    document.querySelectorAll('#mainnav a[href]').forEach(a => {
      const href = a.getAttribute('href').replace(/index\.html?$/,'') || '/';
      if (href === current) {
        a.setAttribute('aria-current','page'); // aktiven Link hervorheben
      }
    });

    // -------------------------------
    // Sticky Header beim Scrollen
    // -------------------------------
    const header = document.querySelector('.km1-header');
    if (header) {
      const onScroll = () => {
        // Ab 10px Scroll → Header bekommt "is-sticky"-Klasse
        header.classList.toggle('is-sticky', window.scrollY > 10);
      };
      onScroll(); // direkt beim Laden prüfen
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  // ================================
  // FUNKTION: Kontakt-Mail schützen
  // ================================
  function protectMail() {
    // Alle Links mit data-email-user & data-email-domain finden
    document.querySelectorAll('[data-email-user][data-email-domain]').forEach(link => {
      link.addEventListener('click', e => {
        // Daten zusammensetzen → echtes mailto:
        const u = link.getAttribute('data-email-user');
        const d = link.getAttribute('data-email-domain');
        link.href = `mailto:${u}@${d}`;
        link.textContent = `${u}@${d}`;
        e.preventDefault(); // Klick nicht sofort ausführen
      }, { once: true });   // nur beim ersten Klick ausführen
    });
  }

  // ================================
  // FUNKTION: Jahr im Footer setzen
  // ================================
  function setYear() {
    const y = document.querySelector('[data-year]');
    if (y) {
      y.textContent = new Date().getFullYear(); // aktuelles Jahr einfügen
    }
  }

  // ================================
  // INITIALISIERUNG (Bootstrapping)
  // ================================
  document.addEventListener('DOMContentLoaded', async () => {
    await includePartials();   // Header/Contact/Footer einsetzen
    enhanceNav();              // Navigation (Burger, aktiv, sticky)
    protectMail();             // Mail-Links schützen
    setYear();                 // Copyright-Jahr aktualisieren
  });

})(); // IIFE → alles in sich geschlossen
