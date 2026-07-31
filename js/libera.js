/* ══════════════════════════════════════════════════
   LIBERA A LOS PANES
   Cada trazo define una recta infinita que parte todas
   las piezas que cruza. Ganas cuando cada pieza tiene
   exactamente un pan adentro.
   ══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var VW = 600, VH = 340;          // espacio virtual de dibujo
  var MIN_ARRASTRE = 26;           // px virtuales mínimos para que cuente el corte

  var NIVELES = [
    { nombre: 'Calentando motores', par: 1, r: 62,
      panes: [[240, 170], [360, 170]] },
    { nombre: 'El bloque de Badu', par: 2, r: 58,
      panes: [[238, 108], [362, 108], [238, 232], [362, 232]] },
    { nombre: 'La hilera', par: 3, r: 47,
      panes: [[150, 170], [250, 170], [350, 170], [450, 170]] },
    { nombre: 'Badu se motivó', par: 3, r: 51,
      panes: [[190, 110], [300, 110], [410, 110], [190, 230], [300, 230], [410, 230]] },
    { nombre: 'La bandeja entera', par: 4, r: 43,
      panes: [[165, 110], [255, 110], [345, 110], [435, 110],
              [165, 230], [255, 230], [345, 230], [435, 230]] }
  ];

  var RANGOS = [
    { min: 90, t: 'Cirujano panadero', d: 'Cortes limpios, cero víctimas. Badu debería tomar notas.' },
    { min: 70, t: 'Buen pulso', d: 'Alguno se salvó por poco, pero todos quedaron libres.' },
    { min: 50, t: 'Se liberaron igual', d: 'Con más cortes de los necesarios, pero nadie se queja.' },
    { min: 0,  t: 'Masacre panadera', d: 'Los liberaste, sí. Enteros, no tanto. Muy en el espíritu de Badu.' }
  ];

  /* ---------- geometría ---------- */
  // >0 si p queda a la izquierda de la recta a→b
  function lado(p, a, b) {
    return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
  }

  function distRecta(p, a, b) {
    var largo = Math.hypot(b.x - a.x, b.y - a.y);
    return largo < 1e-6 ? Infinity : Math.abs(lado(p, a, b)) / largo;
  }

  // Parte un polígono convexo por la recta infinita a→b (Sutherland–Hodgman)
  function partir(poly, a, b) {
    var izq = [], der = [];
    for (var i = 0; i < poly.length; i++) {
      var c = poly[i], n = poly[(i + 1) % poly.length];
      var sc = lado(c, a, b), sn = lado(n, a, b);
      if (sc >= 0) izq.push(c);
      if (sc <= 0) der.push(c);
      if ((sc > 0 && sn < 0) || (sc < 0 && sn > 0)) {
        var t = sc / (sc - sn);
        var corte = { x: c.x + (n.x - c.x) * t, y: c.y + (n.y - c.y) * t };
        izq.push(corte); der.push(corte);
      }
    }
    return [izq, der];
  }

  // Octágono que envuelve a un grupo de panes
  function bloque(panes, r) {
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    panes.forEach(function (p) {
      x0 = Math.min(x0, p.x - r); y0 = Math.min(y0, p.y - r);
      x1 = Math.max(x1, p.x + r); y1 = Math.max(y1, p.y + r);
    });
    var m = 16, c = 26;
    x0 -= m; y0 -= m; x1 += m; y1 += m;
    return [
      { x: x0 + c, y: y0 }, { x: x1 - c, y: y0 }, { x: x1, y: y0 + c }, { x: x1, y: y1 - c },
      { x: x1 - c, y: y1 }, { x: x0 + c, y: y1 }, { x: x0, y: y1 - c }, { x: x0, y: y0 + c }
    ];
  }

  /* ---------- estado ---------- */
  var S = {
    nivel: 0, piezas: [], cortes: 0, heridos: 0,
    puntajes: [], arrastrando: false, ini: null, fin: null, terminado: false
  };

  var cv, ctx, escala = 1, dpr = 1, el = {};

  function init() {
    cv = document.getElementById('lbCanvas');
    if (!cv) return;
    ctx = cv.getContext('2d');

    ['lbLevelName', 'lbCuts', 'lbPar', 'lbHurt', 'lbHint', 'lbReset',
     'lbOverlay', 'lbOvTitle', 'lbOvText', 'lbOvBtn', 'lbProgress'].forEach(function (id) {
      el[id] = document.getElementById(id);
    });

    window.addEventListener('resize', redimensionar);
    cv.addEventListener('pointerdown', abajo);
    cv.addEventListener('pointermove', mover);
    window.addEventListener('pointerup', arriba);
    window.addEventListener('pointercancel', function () { S.arrastrando = false; dibujar(); });

    el.lbReset.addEventListener('click', function () { cargarNivel(S.nivel); });
    el.lbOvBtn.addEventListener('click', siguiente);

    redimensionar();
    reiniciarTodo();

    if (window.Arcade) window.Arcade.register('libera', { onShow: redimensionar });
  }

  function redimensionar() {
    if (!cv) return;
    var caja = cv.getBoundingClientRect();
    if (!caja.width) return;                      // pestaña oculta
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    escala = caja.width / VW;
    cv.width = Math.round(caja.width * dpr);
    cv.height = Math.round(caja.width * (VH / VW) * dpr);
    ctx.setTransform(dpr * escala, 0, 0, dpr * escala, 0, 0);
    dibujar();
  }

  function aVirtual(e) {
    var caja = cv.getBoundingClientRect();
    return { x: (e.clientX - caja.left) / escala, y: (e.clientY - caja.top) / escala };
  }

  /* ---------- niveles ---------- */
  function reiniciarTodo() {
    S.puntajes = [];
    S.terminado = false;
    cargarNivel(0);
  }

  function cargarNivel(i) {
    S.nivel = i;
    S.cortes = 0;
    S.heridos = 0;
    S.arrastrando = false;

    var n = NIVELES[i];
    var panes = n.panes.map(function (p) { return { x: p[0], y: p[1], r: n.r, herido: false }; });
    S.piezas = [{ poly: bloque(panes, n.r), panes: panes, off: { x: 0, y: 0 } }];

    el.lbLevelName.textContent = 'Nivel ' + (i + 1) + ' · ' + n.nombre;
    el.lbPar.textContent = n.par;
    el.lbHint.textContent = 'Arrastra para trazar un corte. Objetivo: ' +
      panes.length + ' panes sueltos en ' + n.par + ' corte' + (n.par > 1 ? 's' : '') + '.';
    el.lbOverlay.classList.remove('is-active');
    hud();
    dibujar();
  }

  function hud() {
    el.lbCuts.textContent = S.cortes;
    el.lbHurt.textContent = S.heridos;
    el.lbProgress.textContent = (S.nivel + 1) + '/' + NIVELES.length;
  }

  /* ---------- entrada ---------- */
  function abajo(e) {
    if (el.lbOverlay.classList.contains('is-active')) return;
    e.preventDefault();
    S.arrastrando = true;
    S.ini = aVirtual(e);
    S.fin = S.ini;
    dibujar();
  }

  function mover(e) {
    if (!S.arrastrando) return;
    S.fin = aVirtual(e);
    dibujar();
  }

  function arriba() {
    if (!S.arrastrando) return;
    S.arrastrando = false;
    if (S.ini && S.fin && Math.hypot(S.fin.x - S.ini.x, S.fin.y - S.ini.y) >= MIN_ARRASTRE) {
      cortar(S.ini, S.fin);
    }
    S.ini = S.fin = null;
    dibujar();
  }

  /* ---------- corte ---------- */
  function cortar(a, b) {
    var nuevas = [], huboCorte = false;
    var largo = Math.hypot(b.x - a.x, b.y - a.y);
    var nx = -(b.y - a.y) / largo, ny = (b.x - a.x) / largo;   // normal hacia la izquierda

    S.piezas.forEach(function (pz) {
      // la recta se evalúa en el espacio local de la pieza (sin su desplazamiento)
      var la = { x: a.x - pz.off.x, y: a.y - pz.off.y };
      var lb = { x: b.x - pz.off.x, y: b.y - pz.off.y };
      var partes = partir(pz.poly, la, lb);

      if (partes[0].length < 3 || partes[1].length < 3) { nuevas.push(pz); return; }
      huboCorte = true;

      [0, 1].forEach(function (k) {
        var signo = k === 0 ? 1 : -1;
        var suyos = pz.panes.filter(function (p) {
          return (k === 0) === (lado(p, la, lb) >= 0);
        });
        suyos.forEach(function (p) {
          if (!p.herido && distRecta(p, la, lb) < p.r * 0.5) { p.herido = true; S.heridos++; }
        });
        nuevas.push({
          poly: partes[k],
          panes: suyos,
          off: {
            x: clampOff(pz.off.x + nx * signo * 3.5),
            y: clampOff(pz.off.y + ny * signo * 3.5)
          }
        });
      });
    });

    if (!huboCorte) return;   // el trazo pasó por fuera: no gasta corte

    S.piezas = nuevas;
    S.cortes++;
    hud();

    if (S.piezas.every(function (p) { return p.panes.length === 1; })) {
      setTimeout(nivelListo, 420);
    }
  }

  function clampOff(v) { return Math.max(-16, Math.min(16, v)); }

  /* ---------- fin de nivel ---------- */
  function nivelListo() {
    var n = NIVELES[S.nivel];
    var extra = Math.max(0, S.cortes - n.par);
    var pts = Math.max(20, 100 - extra * 20 - S.heridos * 15);
    S.puntajes.push(pts);

    var msg;
    if (extra === 0 && S.heridos === 0) {
      msg = '¡Perfecto! ' + S.cortes + (S.cortes === 1 ? ' corte' : ' cortes') + ', cero bajas.';
    } else if (S.heridos === 0) {
      msg = 'Libres y enteros, con ' + extra + (extra === 1 ? ' corte' : ' cortes') + ' de más.';
    } else if (S.heridos === 1) {
      msg = 'Un pan quedó con secuelas, pero salió.';
    } else {
      msg = S.heridos + ' panes quedaron con secuelas, pero salieron.';
    }

    if (S.nivel + 1 < NIVELES.length) {
      overlay('Nivel superado', msg + ' (' + pts + ' pts)', 'Siguiente nivel');
    } else {
      var total = Math.round(S.puntajes.reduce(function (x, y) { return x + y; }, 0) / S.puntajes.length);
      var r = RANGOS.find(function (x) { return total >= x.min; });
      S.terminado = true;
      overlay(r.t + ' · ' + total + '/100', r.d, 'Jugar de nuevo');
    }
  }

  function overlay(titulo, texto, boton) {
    el.lbOvTitle.textContent = titulo;
    el.lbOvText.textContent = texto;
    el.lbOvBtn.textContent = boton;
    el.lbOverlay.classList.add('is-active');
  }

  function siguiente() {
    el.lbOverlay.classList.remove('is-active');
    if (S.terminado) reiniciarTodo();
    else cargarNivel(S.nivel + 1);
  }

  /* ---------- dibujo ---------- */
  function dibujar() {
    if (!ctx) return;
    ctx.clearRect(0, 0, VW, VH);

    S.piezas.forEach(function (pz) {
      ctx.save();
      ctx.translate(pz.off.x, pz.off.y);

      ctx.beginPath();
      ctx.moveTo(pz.poly[0].x, pz.poly[0].y);
      for (var i = 1; i < pz.poly.length; i++) ctx.lineTo(pz.poly[i].x, pz.poly[i].y);
      ctx.closePath();

      var g = ctx.createLinearGradient(0, 60, 0, VH);
      g.addColorStop(0, '#e8c088');
      g.addColorStop(1, '#c98a3e');
      ctx.fillStyle = g;
      ctx.fill();

      // miga expuesta en el borde del corte
      ctx.strokeStyle = '#f6e7cf';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.clip();
      pz.panes.forEach(function (p) {
        var rg = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.35, p.r * 0.1, p.x, p.y, p.r);
        rg.addColorStop(0, p.herido ? '#e5a08e' : '#f7e3c0');
        rg.addColorStop(1, p.herido ? '#b4563c' : '#cf9550');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = rg;
        ctx.fill();
      });
      ctx.restore();
    });

    // vista previa del corte
    if (S.arrastrando && S.ini && S.fin) {
      var dx = S.fin.x - S.ini.x, dy = S.fin.y - S.ini.y;
      var L = Math.hypot(dx, dy);
      var valido = L >= MIN_ARRASTRE;
      if (L > 1) {
        var ex = dx / L * 2000, ey = dy / L * 2000;
        ctx.save();
        ctx.setLineDash(valido ? [] : [6, 6]);
        ctx.strokeStyle = valido ? 'rgba(255,250,241,.95)' : 'rgba(255,250,241,.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(S.ini.x - ex, S.ini.y - ey);
        ctx.lineTo(S.ini.x + ex, S.ini.y + ey);
        ctx.stroke();

        // avisa qué panes quedarían heridos
        if (valido) {
          S.piezas.forEach(function (pz) {
            var la = { x: S.ini.x - pz.off.x, y: S.ini.y - pz.off.y };
            var lb = { x: S.fin.x - pz.off.x, y: S.fin.y - pz.off.y };
            pz.panes.forEach(function (p) {
              if (p.herido || distRecta(p, la, lb) >= p.r * 0.5) return;
              ctx.beginPath();
              ctx.arc(p.x + pz.off.x, p.y + pz.off.y, p.r, 0, Math.PI * 2);
              ctx.strokeStyle = '#d9503f';
              ctx.lineWidth = 3;
              ctx.stroke();
            });
          });
        }
        ctx.restore();
      }
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
