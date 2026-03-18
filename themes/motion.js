/**
 * Boom CDN — Motion Engine
 * Vanilla JS, zero dependencies, < 200 lines.
 * Auto-initializes on DOMContentLoaded.
 */

(function () {
  'use strict';

  /* ─── Scroll Reveal ─────────────────────────────────────────────────── */
  function initReveal() {
    const els = document.querySelectorAll('[data-reveal]');
    if (!els.length) return;
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        const el = e.target;
        const delay = parseInt(el.dataset.delay || 0, 10);
        setTimeout(function () { el.classList.add('revealed'); }, delay);
        io.unobserve(el);
      });
    }, { threshold: 0.1 });
    els.forEach(function (el) {
      el.classList.add('b-reveal-' + (el.dataset.reveal || 'fade'));
      io.observe(el);
    });
  }

  /* ─── Typewriter ────────────────────────────────────────────────────── */
  function initTypewriter() {
    document.querySelectorAll('[data-typewriter]').forEach(function (el) {
      const text = el.dataset.typewriter || el.textContent;
      const speed = parseInt(el.dataset.speed || 50, 10);
      const cursor = el.dataset.cursor === 'true';
      el.textContent = '';
      el.classList.add('b-typewriter');
      if (cursor) el.classList.add('b-typewriter-cursor');
      let i = 0;
      function type() {
        if (i < text.length) {
          el.textContent += text[i++];
          setTimeout(type, speed);
        } else if (cursor) {
          el.classList.add('b-typewriter-done');
        }
      }
      // Start after a short delay so element is visible
      const io = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) { type(); io.disconnect(); }
      }, { threshold: 0.5 });
      io.observe(el);
    });
  }

  /* ─── Counter ───────────────────────────────────────────────────────── */
  function initCounter() {
    document.querySelectorAll('[data-count]').forEach(function (el) {
      const target = parseFloat(el.dataset.target || 0);
      const duration = parseInt(el.dataset.duration || 2000, 10);
      const isFloat = String(el.dataset.target).includes('.');
      const decimals = isFloat ? (String(el.dataset.target).split('.')[1] || '').length : 0;
      let started = false;
      const io = new IntersectionObserver(function (entries) {
        if (!entries[0].isIntersecting || started) return;
        started = true;
        io.disconnect();
        const start = performance.now();
        function tick(now) {
          const p = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - p, 3);
          const val = target * ease;
          const formatted = isFloat
            ? val.toFixed(decimals)
            : Math.floor(val).toLocaleString();
          el.textContent = formatted + (el.dataset.suffix || '');
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      }, { threshold: 0.3 });
      io.observe(el);
    });
  }

  /* ─── Marquee ───────────────────────────────────────────────────────── */
  function initMarquee() {
    document.querySelectorAll('.b-marquee').forEach(function (wrap) {
      const speed = parseFloat(wrap.dataset.speed || 30);
      const dir = wrap.dataset.direction === 'right' ? 1 : -1;
      // Clone inner content for seamless loop
      const inner = wrap.querySelector('.b-marquee-inner');
      if (!inner) return;
      const clone = inner.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      wrap.appendChild(clone);
      let x = 0;
      let paused = false;
      wrap.addEventListener('mouseenter', function () { paused = true; });
      wrap.addEventListener('mouseleave', function () { paused = false; });
      const w = inner.scrollWidth;
      function tick() {
        if (!paused) {
          x += dir * (speed / 60);
          if (dir < 0 && x <= -w) x = 0;
          if (dir > 0 && x >= 0) x = -w;
          inner.style.transform = 'translateX(' + x + 'px)';
          clone.style.transform = 'translateX(' + (x + dir * w) + 'px)';
        }
        requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    });
  }

  /* ─── Parallax ──────────────────────────────────────────────────────── */
  function initParallax() {
    const els = Array.from(document.querySelectorAll('[data-parallax]'));
    if (!els.length) return;
    function onScroll() {
      const sy = window.scrollY;
      els.forEach(function (el) {
        const speed = parseFloat(el.dataset.speed || 0.3);
        const rect = el.getBoundingClientRect();
        const center = rect.top + rect.height / 2 + sy - window.innerHeight / 2;
        el.style.transform = 'translateY(' + (center * speed) + 'px)';
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ─── Tilt ──────────────────────────────────────────────────────────── */
  function initTilt() {
    document.querySelectorAll('[data-tilt]').forEach(function (el) {
      const max = parseFloat(el.dataset.tiltMax || 10);
      el.style.transition = 'transform 0.15s ease';
      el.style.transformStyle = 'preserve-3d';
      el.style.willChange = 'transform';
      el.addEventListener('mousemove', function (e) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const rx = ((e.clientY - cy) / (r.height / 2)) * -max;
        const ry = ((e.clientX - cx) / (r.width / 2)) * max;
        el.style.transform = 'perspective(600px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) scale3d(1.02,1.02,1.02)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)';
      });
    });
  }

  /* ─── Magnetic ──────────────────────────────────────────────────────── */
  function initMagnetic() {
    document.querySelectorAll('[data-magnetic]').forEach(function (el) {
      el.style.transition = 'transform 0.3s cubic-bezier(0.23,1,0.32,1)';
      el.addEventListener('mousemove', function (e) {
        const r = el.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const dx = (e.clientX - cx) * 0.35;
        const dy = (e.clientY - cy) * 0.35;
        el.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = 'translate(0,0)';
      });
    });
  }

  /* ─── Boot ──────────────────────────────────────────────────────────── */
  function init() {
    initReveal();
    initTypewriter();
    initCounter();
    initMarquee();
    initParallax();
    initTilt();
    initMagnetic();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
