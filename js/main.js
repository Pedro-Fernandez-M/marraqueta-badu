/* Detalles de la página: aparición al hacer scroll y navegación activa. */
(function () {
  'use strict';

  var reveal = document.querySelectorAll('.story__step, .card, .evidence');
  if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    reveal.forEach(function (n) {
      n.style.opacity = '0';
      n.style.transform = 'translateY(18px)';
      n.style.transition = 'opacity .6s ease, transform .6s cubic-bezier(.2,.8,.3,1)';
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.style.opacity = '1';
        en.target.style.transform = 'none';
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px' });
    reveal.forEach(function (n) { io.observe(n); });
  }

  // Resalta el enlace de la sección visible.
  var links = document.querySelectorAll('.nav__links a[href^="#"]');
  var targets = [].map.call(links, function (a) { return document.querySelector(a.getAttribute('href')); });
  window.addEventListener('scroll', function () {
    var y = window.scrollY + 120, active = -1;
    targets.forEach(function (t, i) { if (t && t.offsetTop <= y) active = i; });
    links.forEach(function (a, i) { a.style.color = i === active && !a.classList.contains('nav__cta') ? 'var(--texto)' : ''; });
  }, { passive: true });
})();
