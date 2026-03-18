/**
 * presenter.js — Shared presenter engine
 * Step navigation, audio playback, spotlight, scene index, mode switch, keyboard
 *
 * Usage:
 *   Presenter.init({
 *     container: '#demo-stage',
 *     pageSelector: '.presenter-view',
 *     pages: [3, 3, 3],
 *     steps: [{ spot: '#el', view: 'view-id', audio: 'p1s1' }, ...],
 *     views: { 'view-id': { label: 'Label' }, ... },
 *     scenes: [{ name: 'Overview' }, ...],
 *     audioDir: 'audio/',
 *     title: 'My Presentation',
 *     spotlight: true
 *   });
 */
(function(global) {
  'use strict';

  var P = {};
  var cfg = {};
  var state = {
    cur: 0, total: 0,
    autoPlaying: false, readingMode: false,
    audioMuted: false, audioLocked: false,
    lastRenderedPage: -1
  };
  var els = {};
  var audio = new Audio();
  var spotTimer = null;
  var currentSpotSelector = null;
  var listeners = {};

  /* ---- Event system ---- */
  function emit(ev, data) { (listeners[ev] || []).forEach(function(fn) { fn(data); }); }
  P.on = function(ev, fn) { if (!listeners[ev]) listeners[ev] = []; listeners[ev].push(fn); };

  /* ---- Public getters ---- */
  P.getState = function() { return state; };
  P.getConfig = function() { return cfg; };
  P.getCurrentViewKey = function() {
    return state.cur > 0 ? cfg.steps[state.cur - 1].view : Object.keys(cfg.views)[0];
  };
  P.getViewLabel = function(key) {
    return (cfg.views[key] && cfg.views[key].label) || key;
  };

  /* ---- Helpers ---- */
  function getPageForStep(step) {
    if (step <= 0) return 0;
    var count = 0;
    for (var p = 0; p < cfg.pages.length; p++) {
      count += cfg.pages[p];
      if (step <= count) return p;
    }
    return cfg.pages.length - 1;
  }
  P.getPageForStep = getPageForStep;

  function getFirstStepOfPage(page) {
    var step = 1;
    for (var p = 0; p < page; p++) step += cfg.pages[p];
    return step;
  }
  P.getFirstStepOfPage = getFirstStepOfPage;

  /* ---- Audio ---- */
  function setVoiceIndicator(on) {
    var vi = document.getElementById('voice-indicator');
    if (vi) vi.classList.toggle('on', !!on);
  }

  function stopAudio() {
    audio.pause();
    audio.currentTime = 0;
    state.audioLocked = false;
    setVoiceIndicator(false);
  }
  P.stopAudio = stopAudio;

  function playCurrentAudio() {
    if (state.readingMode || state.cur <= 0) return;
    var step = cfg.steps[state.cur - 1];
    if (!step || !step.audio) return;
    stopAudio();
    state.audioLocked = true;
    audio.src = cfg.audioDir + step.audio + '.mp3';
    audio.volume = state.audioMuted ? 0 : 1;
    setVoiceIndicator(true);
    audio.play().catch(function() {
      state.audioLocked = false;
      setVoiceIndicator(false);
      if (state.autoPlaying) setTimeout(function() { if (state.autoPlaying) goNext(); }, 900);
    });
  }

  audio.addEventListener('ended', function() {
    state.audioLocked = false;
    setVoiceIndicator(false);
    if (state.autoPlaying) setTimeout(function() { if (state.autoPlaying) goNext(); }, 350);
  });
  audio.addEventListener('error', function() {
    state.audioLocked = false;
    setVoiceIndicator(false);
    if (state.autoPlaying) setTimeout(function() { if (state.autoPlaying) goNext(); }, 900);
  });

  /* ---- Autoplay / Mute buttons ---- */
  function setAutoButton(playing) {
    var btn = els.btnAuto;
    if (!btn) return;
    btn.classList.toggle('active', playing);
    btn.innerHTML = playing
      ? '<svg viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" fill="currentColor"/><rect x="14" y="4" width="4" height="16" fill="currentColor"/></svg>'
      : '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>';
  }

  function setMuteButton(muted) {
    var btn = els.btnMute;
    if (!btn) return;
    btn.classList.toggle('active', !!muted);
    var on = btn.querySelector('#mute-icon-on');
    var off = btn.querySelector('#mute-icon-off');
    if (on) on.style.display = muted ? 'none' : '';
    if (off) off.style.display = muted ? '' : 'none';
  }

  /* ---- Spotlight ---- */
  function positionSpotlight(selector) {
    var spot = document.getElementById('spotlight');
    if (!spot || !cfg.spotlight) return;
    if (!selector) { spotlightOff(); return; }
    var el = document.querySelector(selector);
    if (!el) { spotlightOff(); return; }
    var r = el.getBoundingClientRect();
    var style = window.getComputedStyle(el);
    var radius = style.borderRadius && style.borderRadius !== '0px' ? style.borderRadius : '12px';
    var wasOff = !spot.classList.contains('on');
    if (wasOff) spot.style.transition = 'none';
    spot.style.top = Math.round(r.top) + 'px';
    spot.style.left = Math.round(r.left) + 'px';
    spot.style.width = Math.round(r.width) + 'px';
    spot.style.height = Math.round(r.height) + 'px';
    spot.style.borderRadius = radius;
    spot.classList.add('on');
    currentSpotSelector = selector;
    if (wasOff) requestAnimationFrame(function() { spot.style.transition = ''; });
  }

  function spotlightOff() {
    clearTimeout(spotTimer);
    var spot = document.getElementById('spotlight');
    if (spot) spot.classList.remove('on');
    currentSpotSelector = null;
  }

  function syncSpotlight() {
    if (!currentSpotSelector || state.readingMode) return;
    positionSpotlight(currentSpotSelector);
  }

  /* ---- Page Nav & Dots ---- */
  function buildPageNav() {
    if (!els.pageNav) return;
    var html = '';
    for (var p = 0; p < cfg.pages.length; p++)
      html += '<button class="page-nav-item" data-page="' + p + '">' + (p + 1) + '</button>';
    els.pageNav.innerHTML = html;
  }

  function buildDotsForPage(page) {
    if (!els.dots || page === state.lastRenderedPage) return;
    state.lastRenderedPage = page;
    var offset = getFirstStepOfPage(page);
    var html = '';
    for (var s = 0; s < cfg.pages[page]; s++)
      html += '<span class="cr-dot" data-step="' + (offset + s) + '"></span>';
    els.dots.innerHTML = html;
  }

  /* ---- Scene Index ---- */
  function buildSceneIndex() {
    var list = document.getElementById('scene-list');
    if (!list || !cfg.scenes) return;
    var currentPage = getPageForStep(state.cur);
    var html = '';
    for (var i = 0; i < cfg.scenes.length; i++) {
      html += '<a class="scene-item' + (i === currentPage ? ' active' : '') + '" data-page="' + i + '">' +
        '<span class="scene-num">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<div class="scene-info"><div class="scene-name">' + cfg.scenes[i].name + '</div>' +
        '<div class="scene-meta">' + cfg.pages[i] + ' steps</div></div></a>';
    }
    list.innerHTML = html;
  }

  function updateSceneProgress() {
    var fill = document.getElementById('scene-progress-fill');
    var text = document.getElementById('scene-progress-text');
    if (!fill || !text) return;
    var pct = state.total > 0 ? Math.round((state.cur / state.total) * 100) : 0;
    fill.style.width = pct + '%';
    text.textContent = state.cur + ' / ' + state.total;
  }

  function syncSceneActive() {
    var currentPage = getPageForStep(state.cur);
    var items = document.querySelectorAll('#scene-list .scene-item');
    for (var i = 0; i < items.length; i++)
      items[i].classList.toggle('active', i === currentPage);
    updateSceneProgress();
  }

  function openSceneIndex() {
    var si = document.getElementById('scene-index');
    var sb = document.getElementById('scene-backdrop');
    if (si) si.classList.add('open');
    if (sb) sb.classList.add('on');
  }
  function closeSceneIndex() {
    var si = document.getElementById('scene-index');
    var sb = document.getElementById('scene-backdrop');
    if (si) si.classList.remove('open');
    if (sb) sb.classList.remove('on');
  }
  P.openSceneIndex = openSceneIndex;
  P.closeSceneIndex = closeSceneIndex;

  /* ---- Render ---- */
  function render(step) {
    var viewKey = step > 0 ? cfg.steps[step - 1].view : Object.keys(cfg.views)[0];
    var container = document.querySelector(cfg.container);
    if (container) {
      var pages = container.querySelectorAll(cfg.pageSelector);
      for (var i = 0; i < pages.length; i++) {
        if (state.readingMode) pages[i].classList.add('active');
        else pages[i].classList.toggle('active', pages[i].id === viewKey);
      }
    }

    // Spotlight
    clearTimeout(spotTimer);
    if (state.readingMode) {
      spotlightOff();
    } else if (step > 0 && cfg.steps[step - 1].spot) {
      var prevView = step > 1 ? cfg.steps[step - 2].view : viewKey;
      var delay = cfg.steps[step - 1].view !== prevView ? 150 : 80;
      spotTimer = setTimeout(function() { positionSpotlight(cfg.steps[step - 1].spot); }, delay);
    } else {
      spotlightOff();
    }

    // Dots + page nav
    var currentPage = getPageForStep(step);
    buildDotsForPage(currentPage);
    var pageOffset = getFirstStepOfPage(currentPage);
    if (els.dots) {
      var dots = els.dots.querySelectorAll('.cr-dot');
      for (var j = 0; j < dots.length; j++) {
        var dotStep = pageOffset + j;
        dots[j].classList.remove('done', 'cur');
        if (dotStep < step) dots[j].classList.add('done');
        if (dotStep === step) dots[j].classList.add('cur');
      }
    }
    if (els.pageNav) {
      var navItems = els.pageNav.querySelectorAll('.page-nav-item');
      for (var p = 0; p < navItems.length; p++) {
        navItems[p].classList.toggle('active', p === currentPage);
      }
    }

    syncSceneActive();
    emit('render', { step: step, page: currentPage, viewKey: viewKey });
  }

  /* ---- Navigation ---- */
  function goTo(step, silent) {
    if (step < 0) step = 0;
    if (step > state.total) step = state.total;
    state.cur = step;
    render(step);
    if (!silent && !state.readingMode && step > 0) playCurrentAudio();
  }
  P.goTo = goTo;

  function goNext(silent) {
    if (state.cur < state.total) goTo(state.cur + 1, silent);
    else if (state.autoPlaying) {
      state.autoPlaying = false;
      stopAudio();
      setAutoButton(false);
    }
  }
  P.goNext = goNext;

  function goPrev() {
    stopAudio();
    if (state.cur > 0) goTo(state.cur - 1);
  }
  P.goPrev = goPrev;

  /* ---- Mode switching ---- */
  function enterReadingMode() {
    state.readingMode = true;
    closeSceneIndex();
    state.autoPlaying = false;
    stopAudio();
    setAutoButton(false);
    if (state.cur === 0) state.cur = 1;
    document.body.classList.add('reading-mode');
    var iconP = document.getElementById('mode-icon-present');
    var iconR = document.getElementById('mode-icon-read');
    if (iconP) iconP.style.display = 'none';
    if (iconR) iconR.style.display = '';
    var divPlay = document.getElementById('div-play');
    if (divPlay) divPlay.style.display = 'none';
    emit('modeChange', { readingMode: true });
    render(state.cur);
    // Scroll to current view
    var curView = document.getElementById(cfg.steps[state.cur - 1].view);
    if (curView) curView.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function exitReadingMode() {
    state.readingMode = false;
    document.body.classList.remove('reading-mode');
    var iconP = document.getElementById('mode-icon-present');
    var iconR = document.getElementById('mode-icon-read');
    if (iconP) iconP.style.display = '';
    if (iconR) iconR.style.display = 'none';
    var divPlay = document.getElementById('div-play');
    if (divPlay) divPlay.style.display = '';
    emit('modeChange', { readingMode: false });
    render(state.cur);
  }

  function toggleMode() {
    if (state.readingMode) exitReadingMode();
    else enterReadingMode();
  }
  P.toggleMode = toggleMode;

  /* ---- Event binding ---- */
  function bindEvents() {
    // Prev / Next
    if (els.btnPrev) els.btnPrev.addEventListener('click', function(e) { e.stopPropagation(); stopAudio(); goPrev(); });
    if (els.btnNext) els.btnNext.addEventListener('click', function(e) { e.stopPropagation(); stopAudio(); goNext(); });

    // Autoplay
    if (els.btnAuto) els.btnAuto.addEventListener('click', function(e) {
      e.stopPropagation();
      if (state.readingMode) return;
      state.autoPlaying = !state.autoPlaying;
      setAutoButton(state.autoPlaying);
      if (state.autoPlaying) {
        if (state.cur === 0) goTo(1);
        else if (!state.audioLocked) playCurrentAudio();
      } else { stopAudio(); }
    });

    // Mute
    if (els.btnMute) els.btnMute.addEventListener('click', function(e) {
      e.stopPropagation();
      if (state.readingMode) return;
      state.audioMuted = !state.audioMuted;
      audio.volume = state.audioMuted ? 0 : 1;
      setMuteButton(state.audioMuted);
    });

    // Dots
    if (els.dots) els.dots.addEventListener('click', function(e) {
      var dot = e.target.closest('.cr-dot');
      if (!dot) return;
      e.stopPropagation();
      state.autoPlaying = false;
      setAutoButton(false);
      stopAudio();
      goTo(parseInt(dot.dataset.step, 10));
    });

    // Page nav
    if (els.pageNav) els.pageNav.addEventListener('click', function(e) {
      var item = e.target.closest('.page-nav-item');
      if (!item) return;
      e.stopPropagation();
      var targetPage = parseInt(item.dataset.page, 10);
      state.autoPlaying = false;
      setAutoButton(false);
      stopAudio();
      var targetStep = getFirstStepOfPage(targetPage);
      goTo(targetStep, state.readingMode);
      if (state.readingMode) {
        var viewKeys = Object.keys(cfg.views);
        var viewId = viewKeys[targetPage];
        var el = document.getElementById(viewId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // Scene toggle (left button)
    var sceneToggle = document.getElementById('scene-toggle');
    if (sceneToggle) sceneToggle.addEventListener('click', function(e) {
      e.stopPropagation();
      var si = document.getElementById('scene-index');
      si && si.classList.contains('open') ? closeSceneIndex() : openSceneIndex();
    });

    // Scene backdrop
    var backdrop = document.getElementById('scene-backdrop');
    if (backdrop) backdrop.addEventListener('click', closeSceneIndex);

    // Dock scene button
    var btnScenes = document.getElementById('btn-scenes');
    if (btnScenes) btnScenes.addEventListener('click', function(e) {
      e.stopPropagation();
      var si = document.getElementById('scene-index');
      si && si.classList.contains('open') ? closeSceneIndex() : openSceneIndex();
    });

    // Scene list click
    var sceneList = document.getElementById('scene-list');
    if (sceneList) sceneList.addEventListener('click', function(e) {
      var item = e.target.closest('.scene-item');
      if (!item) return;
      e.preventDefault();
      e.stopPropagation();
      var targetPage = parseInt(item.dataset.page, 10);
      if (isNaN(targetPage)) return;
      state.autoPlaying = false;
      setAutoButton(false);
      stopAudio();
      goTo(getFirstStepOfPage(targetPage), state.readingMode);
      if (state.readingMode) {
        var viewKeys = Object.keys(cfg.views);
        var viewId = viewKeys[targetPage];
        var el = document.getElementById(viewId);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      closeSceneIndex();
    });

    // Mode toggle
    var modeToggle = document.getElementById('mode-toggle');
    if (modeToggle) modeToggle.addEventListener('click', function(e) { e.stopPropagation(); toggleMode(); });

    // Keyboard
    document.addEventListener('keydown', function(e) {
      // Skip if typing in input/textarea
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case ' ':
          if (!state.readingMode) { e.preventDefault(); if (els.btnAuto) els.btnAuto.click(); }
          break;
        case 'ArrowRight': case 'ArrowDown':
          if (!state.readingMode) { e.preventDefault(); stopAudio(); goNext(); }
          break;
        case 'ArrowLeft': case 'ArrowUp':
          if (!state.readingMode) { e.preventDefault(); stopAudio(); goPrev(); }
          break;
        case 'p': case 'P':
          if (!state.readingMode) { e.preventDefault(); if (els.btnAuto) els.btnAuto.click(); }
          break;
        case 'm': case 'M':
          if (!state.readingMode) { e.preventDefault(); if (els.btnMute) els.btnMute.click(); }
          break;
        case 'r': case 'R':
          e.preventDefault(); toggleMode();
          break;
        case 't': case 'T':
          e.preventDefault();
          var si = document.getElementById('scene-index');
          si && si.classList.contains('open') ? closeSceneIndex() : openSceneIndex();
          break;
        case 'Escape':
          closeSceneIndex();
          emit('escape');
          break;
      }
    });

    // Resize → sync spotlight
    window.addEventListener('resize', function() {
      if (state.cur > 0 && cfg.steps[state.cur - 1].spot && !state.readingMode) {
        clearTimeout(spotTimer);
        spotTimer = setTimeout(function() { positionSpotlight(cfg.steps[state.cur - 1].spot); }, 80);
      }
      emit('resize');
    });

    // Scroll → sync spotlight
    document.addEventListener('scroll', function() {
      clearTimeout(spotTimer);
      spotTimer = setTimeout(syncSpotlight, 16);
      emit('scroll');
    }, true);
  }

  /* ---- Scene header title ---- */
  function updateSceneHeader() {
    var titleEl = document.querySelector('.scene-header-title');
    if (titleEl && cfg.title) titleEl.textContent = cfg.title;
  }

  /* ---- Init ---- */
  P.init = function(config) {
    cfg = Object.assign({
      container: '#demo-stage',
      pageSelector: '.presenter-view',
      pages: [],
      steps: [],
      views: {},
      scenes: [],
      audioDir: 'audio/',
      title: 'Presentation',
      spotlight: true
    }, config);

    state.total = cfg.steps.length;

    // Cache elements
    els.pageNav = document.getElementById('page-nav-pages');
    els.dots = document.getElementById('cb-dots');
    els.btnPrev = document.getElementById('btn-prev');
    els.btnNext = document.getElementById('btn-next');
    els.btnAuto = document.getElementById('btn-auto');
    els.btnMute = document.getElementById('btn-mute');

    // Build UI
    updateSceneHeader();
    buildSceneIndex();
    buildPageNav();
    buildDotsForPage(0);
    setAutoButton(false);
    setMuteButton(false);

    // Bind events
    bindEvents();

    // Start at step 1 (silent)
    goTo(1, true);
    updateSceneProgress();
  };

  global.Presenter = P;
})(window);
