(function () {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── COUNT-UP ─────────────────────────────────────────────────
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  function animateCount(el) {
    const target = parseInt(el.dataset.count, 10);
    const duration = 1200;
    const start = performance.now();
    const inner = el.querySelector('span');

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.round(easeOutQuart(progress) * target);
      if (inner) {
        el.firstChild.textContent = value;
      } else {
        el.textContent = value + (el.dataset.suffix || '');
      }
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        if (inner) {
          el.firstChild.textContent = target;
        } else {
          el.textContent = target + (el.dataset.suffix || '');
        }
      }
    }
    requestAnimationFrame(tick);
  }

  // ── INTERSECTION OBSERVER ─────────────────────────────────────
  if ('IntersectionObserver' in window) {

    // Count-up observer
    if (!reducedMotion) {
      const countEls = document.querySelectorAll('[data-count]');
      if (countEls.length) {
        const countObserver = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              animateCount(entry.target);
              countObserver.unobserve(entry.target);
            }
          });
        }, { threshold: 0.3 });
        countEls.forEach(el => countObserver.observe(el));
      }
    }

    // Fade-in observer
    const fadeEls = document.querySelectorAll('.fade-in');
    if (!reducedMotion && fadeEls.length) {
      const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            fadeObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });

      fadeEls.forEach((el) => {
        const siblings = Array.from(el.parentElement.querySelectorAll('.fade-in'));
        const idx = siblings.indexOf(el);
        el.style.transitionDelay = (idx * 100) + 'ms';
        fadeObserver.observe(el);
      });
    } else {
      fadeEls.forEach(el => el.classList.add('is-visible'));
    }

  } else {
    document.querySelectorAll('.fade-in').forEach(el => el.classList.add('is-visible'));
  }

  // ── FAQ ACCORDION ─────────────────────────────────────────────
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');

      document.querySelectorAll('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });

      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });
})();