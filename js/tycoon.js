/* ══════════════════════════════════════════════════
   MARRAQUETA TYCOON
   Clicker con progresión. El chiste central: contratar
   a Badu duplica la producción pero bota el 40% de los
   panes, así que conviene... apenas.
   ══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var KEY = 'marraqueta-tycoon-v1';
  var CRECIMIENTO = 1.15;          // encarecimiento por cada compra
  var META = 1e6;

  var MEJORAS = [
    { id: 'palo',       nombre: 'Palo de amasar',   desc: '+1 por click',  costo: 15,     tipo: 'click', valor: 1 },
    { id: 'ayudante',   nombre: 'Ayudante',         desc: '+1 $/s',        costo: 110,    tipo: 'seg',   valor: 1 },
    { id: 'barro',      nombre: 'Horno de barro',   desc: '+4 $/s',        costo: 600,    tipo: 'seg',   valor: 4 },
    { id: 'bici',       nombre: 'Reparto en bici',  desc: '+4 por click',  costo: 2400,   tipo: 'click', valor: 4 },
    { id: 'turno',      nombre: 'Segundo turno',    desc: '+14 $/s',       costo: 3200,   tipo: 'seg',   valor: 14 },
    { id: 'industrial', nombre: 'Horno industrial', desc: '+50 $/s',       costo: 19000,  tipo: 'seg',   valor: 50 },
    { id: 'local',      nombre: 'Local propio',     desc: '+200 $/s',      costo: 110000, tipo: 'seg',   valor: 200 },
    { id: 'franquicia', nombre: 'Franquicia',       desc: '+800 $/s',      costo: 600000, tipo: 'seg',   valor: 800 }
  ];

  var COSTO_BADU = 2000, COSTO_ESCUELA = 220000;

  var HITOS = [
    { at: 100,    txt: 'Vendiste tu primera hornada. La señora de la esquina ya sospecha.' },
    { at: 5000,   txt: 'Se corrió la voz. Llega gente de otra población a comprarte.' },
    { at: 50000,  txt: 'Un diario local te hace una nota. Te sacan mal en la foto.' },
    { at: 300000, txt: 'Te ofrecen franquiciar. Badu pide ser socio, no empleado.' },
    { at: META,   txt: '🏆 Imperio marraquetero. Ya puedes jubilarte, pero seguí clickeando.' }
  ];

  var S = {
    plata: 0, total: 0, clicks: 0,
    compras: {}, badu: false, escuela: false, baduPagado: false,
    hitos: [], t: Date.now()
  };

  var el = {}, filas = {}, ultimoTick = Date.now(), guardadoEn = 0, confirmando = false;
  var avisoOffline = null;   // se muestra recién cuando abres la pestaña

  /* ---------- economía ---------- */
  function costo(m) {
    return Math.ceil(m.costo * Math.pow(CRECIMIENTO, S.compras[m.id] || 0));
  }
  // Badu duplica la producción pero solo se vende parte de lo que hace.
  function mult() {
    if (!S.badu) return 1;
    return 2 * (S.escuela ? 0.95 : 0.6);
  }
  function porClick() {
    var base = 1;
    MEJORAS.forEach(function (m) {
      if (m.tipo === 'click') base += m.valor * (S.compras[m.id] || 0);
    });
    return base * mult();
  }
  function porSeg() {
    var base = 0;
    MEJORAS.forEach(function (m) {
      if (m.tipo === 'seg') base += m.valor * (S.compras[m.id] || 0);
    });
    return base * mult();
  }

  function ganar(n) {
    S.plata += n;
    S.total += n;
    HITOS.forEach(function (h) {
      if (S.total >= h.at && S.hitos.indexOf(h.at) === -1) {
        S.hitos.push(h.at);
        toast(h.txt);
      }
    });
  }

  /* ---------- init ---------- */
  function init() {
    var raiz = document.getElementById('tycoon');
    if (!raiz) return;

    ['tyCash', 'tyRate', 'tyClick', 'tyClicker', 'tyPops', 'tyShop', 'tyBadu',
     'tyToasts', 'tyReset', 'tyTotal', 'tyMult'].forEach(function (id) {
      el[id] = document.getElementById(id);
    });

    cargar();
    construirTienda();

    el.tyClicker.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      var g = porClick();
      ganar(g);
      S.clicks++;
      pop(e, g);
      el.tyClicker.classList.add('is-hit');
      setTimeout(function () { el.tyClicker.classList.remove('is-hit'); }, 90);
      render();
    });

    el.tyReset.addEventListener('click', function () {
      if (!confirmando) {
        confirmando = true;
        el.tyReset.textContent = '¿Seguro? Toca de nuevo';
        setTimeout(function () {
          confirmando = false;
          el.tyReset.textContent = 'Empezar de cero';
        }, 3500);
        return;
      }
      try { localStorage.removeItem(KEY); } catch (e) { /* no-op */ }
      S = { plata: 0, total: 0, clicks: 0, compras: {}, badu: false, escuela: false,
            baduPagado: false, hitos: [], t: Date.now() };
      confirmando = false;
      el.tyReset.textContent = 'Empezar de cero';
      toast('Panadería demolida. A empezar de nuevo.');
      render();
    });

    setInterval(tick, 100);
    render();

    document.addEventListener('visibilitychange', function () { if (document.hidden) guardar(); });
    window.addEventListener('beforeunload', guardar);

    if (window.Arcade) window.Arcade.register('tycoon', {
      onShow: function () {
        render();
        if (!avisoOffline) return;
        var msg = avisoOffline;
        avisoOffline = null;
        setTimeout(function () { toast(msg); }, 400);
      }
    });
  }

  /* ---------- bucle ---------- */
  function tick() {
    var ahora = Date.now();
    var dt = Math.min((ahora - ultimoTick) / 1000, 1);
    ultimoTick = ahora;

    if (porSeg() > 0) ganar(porSeg() * dt);

    if (ahora - guardadoEn > 5000) { guardar(); guardadoEn = ahora; }
    if (!window.Arcade || window.Arcade.visible('tycoon')) render();
  }

  /* ---------- tienda ---------- */
  function construirTienda() {
    el.tyShop.innerHTML = '';
    MEJORAS.forEach(function (m) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'ty-item';
      b.innerHTML =
        '<span class="ty-item__n"></span>' +
        '<span class="ty-item__info"><b></b><i></i></span>' +
        '<span class="ty-item__costo"></span>';
      b.addEventListener('click', function () {
        var c = costo(m);
        if (S.plata < c) return;
        S.plata -= c;
        S.compras[m.id] = (S.compras[m.id] || 0) + 1;
        render();
      });
      el.tyShop.appendChild(b);
      filas[m.id] = b;
    });

    el.tyBadu.innerHTML =
      '<div class="ty-badu__cab"><b>Badu Lake</b><span id="tyBaduEstado"></span></div>' +
      '<p id="tyBaduTxt"></p>' +
      '<div class="ty-badu__btns">' +
        '<button type="button" class="btn btn--primary btn--sm" id="tyBaduBtn"></button>' +
        '<button type="button" class="btn btn--ghost btn--sm" id="tyEscuelaBtn"></button>' +
      '</div>';

    document.getElementById('tyBaduBtn').addEventListener('click', function () {
      if (!S.baduPagado) {
        if (S.plata < COSTO_BADU) return;
        S.plata -= COSTO_BADU;
        S.baduPagado = true;
        S.badu = true;
        toast('Badu Lake contratado. Que Dios nos ayude.');
      } else {
        S.badu = !S.badu;
        toast(S.badu ? 'Badu vuelve al horno.' : 'Badu despedido. Se lo tomó bien.');
      }
      render();
    });

    document.getElementById('tyEscuelaBtn').addEventListener('click', function () {
      if (S.escuela || S.plata < COSTO_ESCUELA) return;
      S.plata -= COSTO_ESCUELA;
      S.escuela = true;
      toast('Badu aprendió a marcar la masa. Ahora solo bota el 5%.');
      render();
    });
  }

  /* ---------- render ---------- */
  function render() {
    var f = window.Arcade ? window.Arcade.fmt : String;
    el.tyCash.textContent = f(S.plata);
    el.tyRate.textContent = f(porSeg());
    el.tyClick.textContent = f(porClick());
    el.tyTotal.textContent = f(S.total);
    el.tyMult.textContent = '×' + mult().toFixed(2);

    MEJORAS.forEach(function (m) {
      var b = filas[m.id], c = costo(m), n = S.compras[m.id] || 0;
      b.querySelector('.ty-item__n').textContent = n;
      b.querySelector('.ty-item__info b').textContent = m.nombre;
      b.querySelector('.ty-item__info i').textContent = m.desc;
      b.querySelector('.ty-item__costo').textContent = '$' + f(c);
      b.disabled = S.plata < c;
      b.classList.toggle('is-owned', n > 0);
    });

    var estado = document.getElementById('tyBaduEstado');
    var txt = document.getElementById('tyBaduTxt');
    var btn = document.getElementById('tyBaduBtn');
    var esc = document.getElementById('tyEscuelaBtn');

    estado.textContent = !S.baduPagado ? 'sin contratar' : S.badu ? 'trabajando' : 'despedido';
    estado.className = S.badu ? 'is-on' : '';

    var merma = S.escuela ? 5 : 40;
    txt.textContent = 'Produce el doble, pero el ' + merma + '% de los panes sale sin abrir y hay que botarlo. ' +
      'Neto: ×2 × ' + (S.escuela ? '0,95' : '0,60') + ' = ×' + (S.escuela ? '1,90' : '1,20') +
      '. Sí, conviene' + (S.escuela ? '.' : '. Apenas.');

    if (!S.baduPagado) {
      btn.textContent = 'Contratar · $' + f(COSTO_BADU);
      btn.disabled = S.plata < COSTO_BADU;
    } else {
      btn.textContent = S.badu ? 'Despedir a Badu' : 'Volver a contratar';
      btn.disabled = false;
    }

    esc.style.display = S.baduPagado ? '' : 'none';
    if (S.escuela) {
      esc.textContent = 'Ya le enseñaste ✓';
      esc.disabled = true;
    } else {
      esc.textContent = 'Enseñarle a marcar · $' + f(COSTO_ESCUELA);
      esc.disabled = S.plata < COSTO_ESCUELA;
    }
  }

  /* ---------- efectos ---------- */
  function pop(e, n) {
    var caja = el.tyClicker.getBoundingClientRect();
    var s = document.createElement('span');
    s.className = 'ty-pop';
    s.textContent = '+$' + (window.Arcade ? window.Arcade.fmt(n) : Math.floor(n));
    s.style.left = (((e.clientX - caja.left) / caja.width) * 100) + '%';
    s.style.top = (((e.clientY - caja.top) / caja.height) * 100) + '%';
    el.tyPops.appendChild(s);
    setTimeout(function () { s.remove(); }, 750);
  }

  function toast(msg) {
    var d = document.createElement('div');
    d.className = 'ty-toast';
    d.textContent = msg;
    el.tyToasts.appendChild(d);
    setTimeout(function () { d.classList.add('is-out'); }, 4200);
    setTimeout(function () { d.remove(); }, 4800);
  }

  /* ---------- persistencia ---------- */
  function guardar() {
    S.t = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* no-op */ }
  }

  function cargar() {
    var crudo;
    try { crudo = localStorage.getItem(KEY); } catch (e) { return; }
    if (!crudo) return;
    var d;
    try { d = JSON.parse(crudo); } catch (e) { return; }
    if (!d || typeof d.plata !== 'number') return;

    Object.keys(S).forEach(function (k) { if (k in d) S[k] = d[k]; });
    S.compras = S.compras || {};
    S.hitos = S.hitos || [];

    // Ganancia mientras no estabas: máximo 2 horas, a mitad de rendimiento.
    var fuera = Math.min((Date.now() - (d.t || Date.now())) / 1000, 7200);
    var offline = porSeg() * fuera * 0.5;
    if (offline >= 1) {
      S.plata += offline;
      S.total += offline;
      avisoOffline = 'Mientras no estabas se vendieron $' +
        (window.Arcade ? window.Arcade.fmt(offline) : Math.floor(offline)) + '.';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
