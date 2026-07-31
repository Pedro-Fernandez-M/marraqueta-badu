/* ══════════════════════════════════════════════════
   ARCADE — pestañas y registro de los tres juegos.
   Cada juego se registra con onShow/onHide opcionales
   para poder pausarse cuando su pestaña no está visible.
   ══════════════════════════════════════════════════ */
window.Arcade = (function () {
  'use strict';

  var juegos = {};
  var actual = null;

  /* Cifras chicas con separador de miles (2.000), grandes en compacto (1.20M).
     Bajo 10 conserva un decimal para que las tasas lentas no se vean como 0. */
  function fmt(n) {
    if (!isFinite(n) || n <= 0) return '0';
    if (n < 10) return String(Math.round(n * 10) / 10);
    n = Math.floor(n);
    if (n < 100000) return n.toLocaleString('es-CL');
    var u = ['K', 'M', 'B', 'T', 'Q'], i = -1;
    while (n >= 1000 && i < u.length - 1) { n /= 1000; i++; }
    return n.toFixed(n < 10 ? 2 : n < 100 ? 1 : 0) + u[i];
  }

  function register(id, api) { juegos[id] = api || {}; }

  function mostrar(id) {
    if (id === actual) return;
    var tabs = document.querySelectorAll('.arcade__tab');
    var panels = document.querySelectorAll('[data-panel]');
    var i;

    if (actual && juegos[actual] && juegos[actual].onHide) juegos[actual].onHide();

    for (i = 0; i < tabs.length; i++) {
      var on = tabs[i].dataset.game === id;
      tabs[i].classList.toggle('is-active', on);
      tabs[i].setAttribute('aria-selected', on ? 'true' : 'false');
      tabs[i].tabIndex = on ? 0 : -1;
    }
    for (i = 0; i < panels.length; i++) {
      panels[i].classList.toggle('is-active', panels[i].dataset.panel === id);
    }

    actual = id;
    if (juegos[id] && juegos[id].onShow) juegos[id].onShow();
  }

  function visible(id) { return actual === id; }

  function init() {
    var tabs = document.querySelectorAll('.arcade__tab');
    if (!tabs.length) return;

    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () { mostrar(this.dataset.game); });
      tabs[i].addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var lista = [].slice.call(document.querySelectorAll('.arcade__tab'));
        var pos = lista.indexOf(this);
        var sig = lista[(pos + (e.key === 'ArrowRight' ? 1 : lista.length - 1)) % lista.length];
        sig.focus();
        mostrar(sig.dataset.game);
      });
    }
    mostrar(tabs[0].dataset.game);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  return { register: register, mostrar: mostrar, visible: visible, fmt: fmt };
})();
