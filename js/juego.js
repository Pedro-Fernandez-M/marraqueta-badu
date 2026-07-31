/* ══════════════════════════════════════════════════
   SIMULADOR DE MARRAQUETA 3000
   Tres etapas: amasar → marcar → hornear
   ══════════════════════════════════════════════════ */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---------- configuración ---------- */
  var CFG = {
    knead:  { dur: 8,  gain: 3.8, decay: 6 },
    cut:    { rounds: 3, speeds: [0.75, 0.95, 1.2], widths: [0.20, 0.16, 0.13] },
    // rateOver < rateIn a propósito: pasarse de calor sella la corteza y frena
    // la cocción, así que la zona verde siempre es la mejor opción.
    bake:   { dur: 10, zone: [0.52, 0.70], burnAt: 0.78,
              heat: 0.45, cool: 0.30,
              rateIn: 13, rateOver: 7, rateUnder: 3, burnRate: 22 }
  };

  var POWS = ['¡PAF!', '¡PUM!', '¡ZAS!', '¡TOMA!', '¡PLOF!', '¡CHAS!'];

  var RANKS = [
    { min: 90, rank: 'S', title: 'Panadería del barrio',
      text: 'Se abrió sola, crujió al partirla y el olor llegó hasta la esquina. Badu Lake te odia en silencio.' },
    { min: 75, rank: 'A', title: 'Marraqueta legítima',
      text: 'Cuatro lóbulos bien definidos, corteza que suena. Esto se defiende en cualquier once.' },
    { min: 60, rank: 'B', title: 'Pan batido correcto',
      text: 'No es para una foto, pero con palta y sal nadie va a reclamar. Trabajo honesto.' },
    { min: 45, rank: 'C', title: 'Se nota el esfuerzo',
      text: 'Y también se notan los errores. Se abrió a medias, como pidiendo permiso.' },
    { min: 30, rank: 'D', title: 'Cuatro panes unidos',
      text: 'Nivel Badu Lake alcanzado. Técnicamente es una marraqueta. Emocionalmente es un bloque.' },
    { min: 0,  rank: 'F', title: 'Ladrillo con levadura',
      text: 'Badu Lake te felicita y te ofrece sociedad. Considera comprar el pan en la esquina.' }
  ];

  /* ---------- estado ---------- */
  var S = {
    stage: 'intro',
    running: false,
    last: 0,
    held: false,
    scores: { amasar: 0, marcar: 0, hornear: 0 },
    knead: 0, kneadLeft: 0,
    cutPos: 0, cutDir: 1, cutIdx: 0, cutCenter: 0.5, cutHalf: 0.1, cutPaused: false,
    cutResults: [],
    temp: 0.45, bake: 0, burn: 0, bakeLeft: 0
  };

  /* ---------- elementos ---------- */
  var el = {};
  var IDS = ['game', 'hudStage', 'hudScore', 'hudBest', 'stageArea', 'btnStart', 'btnRetry',
    'btnShare', 'dough', 'doughHits', 'kneadFill', 'kneadPct', 'kneadTime', 'cutZone',
    'cutBlade', 'cutDots', 'cutLeft', 'cutFeedback', 'gaugeZone', 'gaugeNeedle',
    'ovenChamber', 'loafSvg', 'loafScore', 'bakeFill', 'bakePct', 'burnPct', 'bakeTime',
    'resultRank', 'resultTitle', 'resultText', 'rAmasar', 'rMarcar', 'rHornear', 'rTotal'];

  var screens, dots;

  function init() {
    IDS.forEach(function (id) { el[id] = $(id); });
    if (!el.game) return;

    screens = el.game.querySelectorAll('[data-screen]');
    dots = el.game.querySelectorAll('.stagedot');

    el.hudBest.textContent = readBest();

    // zona fija del horno
    var z = CFG.bake.zone;
    el.gaugeZone.style.left = (z[0] * 100) + '%';
    el.gaugeZone.style.width = ((z[1] - z[0]) * 100) + '%';

    el.btnStart.addEventListener('click', start);
    el.btnRetry.addEventListener('click', start);
    el.btnShare.addEventListener('click', share);

    // entrada unificada
    el.stageArea.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      e.preventDefault();
      press();
    });
    window.addEventListener('pointerup', release);
    window.addEventListener('pointercancel', release);

    document.addEventListener('keydown', function (e) {
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      if (e.target.closest('a, button, input, textarea')) return;
      if (!isPlaying() && S.stage !== 'intro' && S.stage !== 'resultado') return;
      if (!isPlaying()) {
        if (isGameVisible()) { e.preventDefault(); start(); }
        return;
      }
      if (e.code === 'Enter') return; // Enter solo arranca la partida
      e.preventDefault();
      if (!e.repeat) press();
    });
    document.addEventListener('keyup', function (e) {
      if (e.code === 'Space') release();
    });
  }

  function isPlaying() {
    return S.stage === 'amasar' || S.stage === 'marcar' || S.stage === 'hornear';
  }
  function isGameVisible() {
    var r = el.game.getBoundingClientRect();
    return r.top < window.innerHeight * 0.75 && r.bottom > 0;
  }

  /* ---------- navegación de pantallas ---------- */
  function show(name) {
    S.stage = name;
    S.held = false; // que una tecla apretada en la etapa anterior no se arrastre a la siguiente
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.toggle('is-active', screens[i].dataset.screen === name);
    }
    var order = { amasar: 1, marcar: 2, hornear: 3 };
    var cur = order[name] || 0;
    for (var j = 0; j < dots.length; j++) {
      var n = +dots[j].dataset.stage;
      dots[j].classList.toggle('is-active', n === cur);
      dots[j].classList.toggle('is-done', cur > 0 && n < cur);
    }
    var titles = {
      intro: 'Listo para amasar',
      amasar: 'Etapa 1 · Amasando',
      marcar: 'Etapa 2 · Marcando la masa',
      hornear: 'Etapa 3 · En el horno',
      resultado: 'Resultado final'
    };
    el.hudStage.textContent = titles[name] || '';
  }

  /* ---------- ciclo principal ---------- */
  function start() {
    S.scores = { amasar: 0, marcar: 0, hornear: 0 };
    el.hudScore.textContent = '0';
    startKnead();
    if (!S.running) {
      S.running = true;
      S.last = performance.now();
      requestAnimationFrame(loop);
    }
  }

  function loop(now) {
    var dt = Math.min((now - S.last) / 1000, 0.05);
    S.last = now;
    if (S.stage === 'amasar') tickKnead(dt);
    else if (S.stage === 'marcar') tickCut(dt);
    else if (S.stage === 'hornear') tickBake(dt);
    if (S.running) requestAnimationFrame(loop);
  }

  function press() {
    S.held = true;
    if (S.stage === 'amasar') hitDough();
    else if (S.stage === 'marcar') lockCut();
  }
  function release() { S.held = false; }

  /* ══════ ETAPA 1 · AMASAR ══════ */
  function startKnead() {
    S.knead = 0;
    S.kneadLeft = CFG.knead.dur;
    show('amasar');
    renderKnead();
  }

  function hitDough() {
    S.knead = clamp(S.knead + CFG.knead.gain, 0, 100);
    el.dough.classList.add('is-hit');
    setTimeout(function () { el.dough.classList.remove('is-hit'); }, 70);

    var p = document.createElement('span');
    p.className = 'pow';
    p.textContent = POWS[(Math.random() * POWS.length) | 0];
    p.style.left = (18 + Math.random() * 58) + '%';
    p.style.top = (24 + Math.random() * 34) + '%';
    el.doughHits.appendChild(p);
    setTimeout(function () { p.remove(); }, 560);
  }

  function tickKnead(dt) {
    S.knead = clamp(S.knead - CFG.knead.decay * dt, 0, 100);
    S.kneadLeft -= dt;
    renderKnead();
    if (S.kneadLeft <= 0) {
      S.scores.amasar = Math.round(S.knead);
      bumpScore();
      startCut();
    }
  }

  function renderKnead() {
    el.kneadFill.style.width = S.knead + '%';
    el.kneadPct.textContent = Math.round(S.knead) + '%';
    el.kneadTime.textContent = Math.max(0, S.kneadLeft).toFixed(1);
  }

  /* ══════ ETAPA 2 · MARCAR ══════ */
  function startCut() {
    S.cutIdx = 0;
    S.cutResults = [];
    S.cutPaused = false;
    S.cutPos = 0;
    S.cutDir = 1;
    el.cutFeedback.textContent = ' ';
    el.cutFeedback.className = 'screen__feedback';
    el.cutDots.innerHTML = '';
    for (var i = 0; i < CFG.cut.rounds; i++) el.cutDots.appendChild(document.createElement('i'));
    show('marcar');
    setupCutRound();
  }

  function setupCutRound() {
    var w = CFG.cut.widths[S.cutIdx];
    S.cutHalf = w / 2;
    S.cutCenter = 0.30 + Math.random() * 0.40;
    el.cutZone.style.left = ((S.cutCenter - S.cutHalf) * 100) + '%';
    el.cutZone.style.width = (w * 100) + '%';
    el.cutBlade.className = 'cutfield__blade';
    el.cutLeft.textContent = CFG.cut.rounds - S.cutIdx;
  }

  function tickCut(dt) {
    if (S.cutPaused) return;
    S.cutPos += S.cutDir * CFG.cut.speeds[S.cutIdx] * dt;
    if (S.cutPos >= 1) { S.cutPos = 1; S.cutDir = -1; }
    if (S.cutPos <= 0) { S.cutPos = 0; S.cutDir = 1; }
    el.cutBlade.style.left = (S.cutPos * 100) + '%';
  }

  function lockCut() {
    if (S.cutPaused) return;
    S.cutPaused = true;

    var norm = Math.abs(S.cutPos - S.cutCenter) / S.cutHalf;
    var pts, msg, cls, dotCls;

    if (norm <= 0.3) {
      pts = 100; cls = 'is-good'; dotCls = 'is-good';
      msg = '¡Marca perfecta! Eso se va a abrir sí o sí.';
    } else if (norm <= 1) {
      pts = Math.round(100 - ((norm - 0.3) / 0.7) * 35);
      cls = 'is-good'; dotCls = 'is-ok';
      msg = 'Buena marca. Un poco corrida, pero pasa.';
    } else {
      pts = Math.round(Math.max(0, 60 - (norm - 1) * 42));
      cls = 'is-bad'; dotCls = 'is-bad';
      msg = pts > 25
        ? 'Marca tímida. Le tuviste lástima a la masa.'
        : 'Eso fue una caricia, no una marca. Badu approves.';
    }

    S.cutResults.push(pts);
    el.cutBlade.classList.add(dotCls === 'is-bad' ? 'is-miss' : 'is-locked');
    el.cutFeedback.textContent = msg;
    el.cutFeedback.className = 'screen__feedback ' + cls;
    el.cutDots.children[S.cutIdx].className = dotCls;

    setTimeout(function () {
      S.cutIdx++;
      if (S.cutIdx >= CFG.cut.rounds) {
        var sum = S.cutResults.reduce(function (a, b) { return a + b; }, 0);
        S.scores.marcar = Math.round(sum / CFG.cut.rounds);
        bumpScore();
        startBake();
      } else {
        setupCutRound();
        S.cutPaused = false;
      }
    }, 620);
  }

  /* ══════ ETAPA 3 · HORNEAR ══════ */
  function startBake() {
    S.temp = 0.35;
    S.bake = 0;
    S.burn = 0;
    S.bakeLeft = CFG.bake.dur;
    show('hornear');
    renderBake();
  }

  function tickBake(dt) {
    var c = CFG.bake;
    S.temp = clamp(S.temp + (S.held ? c.heat : -c.cool) * dt, 0, 1);

    if (S.temp >= c.zone[0] && S.temp <= c.zone[1]) S.bake += c.rateIn * dt;
    else if (S.temp > c.zone[1]) S.bake += c.rateOver * dt;
    else S.bake += c.rateUnder * dt;

    if (S.temp > c.burnAt) S.burn += c.burnRate * (S.temp - c.burnAt) / (1 - c.burnAt) * dt * 2;

    S.bake = clamp(S.bake, 0, 100);
    S.burn = clamp(S.burn, 0, 100);
    S.bakeLeft -= dt;
    renderBake();

    if (S.bakeLeft <= 0) {
      S.scores.hornear = Math.round(clamp(S.bake - S.burn * 1.2, 0, 100));
      bumpScore();
      finish();
    }
  }

  function renderBake() {
    el.gaugeNeedle.style.left = (S.temp * 100) + '%';
    el.bakeFill.style.width = S.bake + '%';
    el.bakePct.textContent = Math.round(S.bake) + '%';
    el.burnPct.textContent = Math.round(S.burn) + '%';
    el.bakeTime.textContent = Math.max(0, S.bakeLeft).toFixed(1);

    el.ovenChamber.classList.toggle('is-hot', S.temp > CFG.bake.burnAt);
    el.ovenChamber.classList.toggle('is-cold', S.temp < 0.35);

    // color del pan: pálido → dorado → quemado
    var t = S.bake / 100, k = S.burn / 100;
    var r = lerp(lerp(242, 216, t), 74, k);
    var g = lerp(lerp(226, 164, t), 44, k);
    var b = lerp(lerp(194, 87, t), 18, k);
    el.loafSvg.style.setProperty('--loaf-color',
      'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')');

    el.loafScore.style.strokeWidth = (t * 7).toFixed(2);
    el.loafSvg.querySelector('.loaf__g').style.transform = 'scale(' + (1 + t * 0.06).toFixed(3) + ')';
  }

  /* ══════ RESULTADO ══════ */
  function bumpScore() {
    el.hudScore.textContent = total();
  }

  function total() {
    return Math.round((S.scores.amasar + S.scores.marcar + S.scores.hornear) / 3);
  }

  function finish() {
    var t = total();
    var r = RANKS.find(function (x) { return t >= x.min; });

    el.resultRank.textContent = r.rank;
    el.resultTitle.textContent = r.title;
    el.resultText.textContent = r.text;
    el.rAmasar.textContent = S.scores.amasar;
    el.rMarcar.textContent = S.scores.marcar;
    el.rHornear.textContent = S.scores.hornear;
    el.rTotal.textContent = t;
    el.btnShare.textContent = 'Copiar resultado';

    if (t > readBest()) {
      writeBest(t);
      el.hudBest.textContent = t;
    }
    show('resultado');
  }

  function share() {
    var t = total();
    var r = RANKS.find(function (x) { return t >= x.min; });
    var txt = '🥖 Simulador de Marraqueta 3000\n' +
      'Rango ' + r.rank + ' — ' + r.title + ' (' + t + '/100)\n' +
      'Amasado ' + S.scores.amasar + ' · Marcado ' + S.scores.marcar +
      ' · Horneado ' + S.scores.hornear + '\n' +
      '¿Le ganas a Badu Lake?';

    var done = function () {
      el.btnShare.textContent = '¡Copiado!';
      setTimeout(function () { el.btnShare.textContent = 'Copiar resultado'; }, 1800);
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(done, fallback);
    } else fallback();

    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); done(); } catch (e) { /* no-op */ }
      ta.remove();
    }
  }

  /* ---------- récord ---------- */
  var KEY = 'marraqueta-badu-best';
  function readBest() {
    try { return parseInt(localStorage.getItem(KEY), 10) || 0; } catch (e) { return 0; }
  }
  function writeBest(v) {
    try { localStorage.setItem(KEY, String(v)); } catch (e) { /* no-op */ }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
