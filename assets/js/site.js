<figure class="rz-zoom" aria-labelledby="rz-caption">
  <img
    class="diagram"
    src="assets/images/rz/ITSM_RZ_1.0.0.png"
    data-full="assets/images/rz/ITSM_RZ_1.0.0.png"
    alt="Diagramm: Rechenzentrumsstruktur für ein ITSM-System" />

  <!-- Lupe -->
  <span class="rz-zoom__lens" aria-hidden="true"></span>

  <!-- Button zum Öffnen des Vollbild-Dialogs -->
  <button type="button" class="rz-zoom__open" aria-haspopup="dialog" aria-controls="rzModal">
    Groß ansehen
  </button>

  <figcaption id="rz-caption" class="visually-hidden">
    ITSM-RZ-Diagramm – für Details die Lupe bewegen oder „Groß ansehen“ öffnen.
  </figcaption>
</figure>

<!-- Vollbild-Modal -->
<div class="rz-modal" id="rzModal" role="dialog" aria-modal="true" hidden>
  <div class="rz-modal__backdrop" data-close></div>
  <div class="rz-modal__dialog" role="document">
    <header class="rz-modal__head">
      <h3>Diagramm – Detailansicht</h3>
      <button type="button" class="rz-modal__close" aria-label="Schließen" data-close>×</button>
    </header>

    <div class="rz-stage" tabindex="0" aria-label="Zoombereich; Maus/Touch zum Verschieben, Rad/Pinch zum Zoomen.">
      <img class="rz-stage__img" alt="">
    </div>

    <div class="rz-tools">
      <button type="button" class="rz-btn" data-zoom="out"  aria-label="Herauszoomen">−</button>
      <button type="button" class="rz-btn" data-zoom="in"   aria-label="Hineinzoomen">+</button>
      <button type="button" class="rz-btn" data-zoom="reset" aria-label="Zurücksetzen">Reset</button>
    </div>
  </div>
</div>
