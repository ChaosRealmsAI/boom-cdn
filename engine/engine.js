/**
 * screen-recording engine.js
 *
 * Usage:
 *   SR.init({ steps, animations, audioDir, title, meta, device })
 *
 * Demo only needs TWO things:
 *   1. STEPS — [{label, sub, audio}, ...]
 *   2. stepAnimations — [async function(){...}, ...]
 *
 * Jumping is handled automatically by replay (no setupState needed).
 *
 * Provides:
 *   SR.wait(ms), SR.moveTo(x,y,dur), SR.clickAt(x,y), SR.center(el),
 *   SR.glow(el), SR.unglow(el), SR.showSub(t), SR.hideSub(),
 *   SR.playAudio(id), SR.typeInto(el,text,speed), SR.showScreen(id),
 *   SR.$(id)
 *
 * Terminal extras:
 *   SR.appendLine(html,cls), SR.typeCommand(cmd,path), SR.showOutput(lines,opts), SR.blankLine()
 *
 * Mobile extras:
 *   SR.fingerTo(el), SR.fingerTap(el), SR.fingerHide()
 *
 * Attention (visual focus):
 *   SR.highlight(el, duration?)
 */
var SR = (function() {
  var cfg, curIdx = -1, playing = false, muted = false;
  var audioEl = null, _audioResolve = null, animating = false, abortFlag = false;
  var generation = 0;
  var _replaying = false;
  var _initialSnapshots = {};
  var cursorEl, ringEl, subEl, dockEl, fingerEl, termBody;

  function $(id) { return document.getElementById(id); }

  function wait(ms) {
    if (_replaying) return Promise.resolve();
    return new Promise(function(r) {
      var t = setTimeout(r, ms);
      var c = setInterval(function() { if (abortFlag) { clearTimeout(t); clearInterval(c); r(); } }, 50);
    });
  }

  function showSub(t) { if (_replaying) return; subEl.textContent = t; subEl.classList.add('visible'); }
  function hideSub() { if (_replaying) return; subEl.classList.remove('visible'); }

  function playAudio(id) {
    if (_replaying) return Promise.resolve();
    return new Promise(function(r) {
      // Resolve any pending audio promise (global uniqueness)
      if (_audioResolve) { var prev = _audioResolve; _audioResolve = null; prev(); }
      audioEl.pause();
      audioEl.currentTime = 0;
      audioEl.volume = muted ? 0 : 1;
      audioEl.src = cfg.audioDir + id + '.mp3';
      var done = false;
      function fin() { if (!done) { done = true; _audioResolve = null; r(); } }
      _audioResolve = r;
      audioEl.onended = fin;
      audioEl.onerror = function() { setTimeout(fin, 1500); };
      audioEl.play().catch(function() { setTimeout(fin, 1500); });
      // Unblock if aborted externally (goToStep / togglePlay)
      var c = setInterval(function() {
        if (abortFlag) { clearInterval(c); fin(); }
      }, 50);
    });
  }

  function stopAudio() {
    audioEl.pause();
    audioEl.currentTime = 0;
    if (_audioResolve) { var prev = _audioResolve; _audioResolve = null; prev(); }
  }

  function center(el) { var r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
  function glow(el) { if (el) el.classList.add('sr-glow'); }
  function unglow(el) { if (el) el.classList.remove('sr-glow'); }

  function showScreen(id) {
    document.querySelectorAll('.sr-screen').forEach(function(s) { s.classList.remove('active'); });
    $(id).classList.add('active');
  }

  // ── Web/Mobile: cursor ──
  function moveTo(x, y, dur) {
    if (_replaying) {
      if (cursorEl) { cursorEl.style.transition = 'none'; cursorEl.style.left = x + 'px'; cursorEl.style.top = y + 'px'; void cursorEl.offsetWidth; cursorEl.style.transition = ''; }
      return Promise.resolve();
    }
    dur = dur || 500;
    cursorEl.style.transitionDuration = dur + 'ms';
    cursorEl.style.left = x + 'px'; cursorEl.style.top = y + 'px';
    return wait(dur + 50);
  }
  function clickAt(x, y) {
    if (_replaying) return Promise.resolve();
    ringEl.style.left = (x - 12) + 'px'; ringEl.style.top = (y - 12) + 'px';
    ringEl.classList.remove('pop'); void ringEl.offsetWidth; ringEl.classList.add('pop');
    return wait(180);
  }
  function typeInto(el, text, speed) {
    if (_replaying) { el.value = text; return Promise.resolve(); }
    speed = speed || 42;
    return new Promise(function(r) {
      var i = 0; el.focus();
      var iv = setInterval(function() {
        if (abortFlag || i >= text.length) { el.value = text; clearInterval(iv); r(); return; }
        el.value = text.substring(0, ++i);
      }, speed);
    });
  }

  // ── Mobile: finger ──
  function fingerTo(el) {
    if (!fingerEl) return;
    var phone = fingerEl.parentElement;
    var pr = phone.getBoundingClientRect();
    var er = el.getBoundingClientRect();
    fingerEl.style.left = (er.left - pr.left + er.width / 2) + 'px';
    fingerEl.style.top = (er.top - pr.top + er.height / 2) + 'px';
    fingerEl.classList.add('visible');
  }
  function fingerTap(el) {
    if (_replaying) return Promise.resolve();
    fingerTo(el);
    return wait(400).then(function() {
      fingerEl.classList.remove('tap'); void fingerEl.offsetWidth; fingerEl.classList.add('tap');
      el.classList.remove('sr-press'); void el.offsetWidth; el.classList.add('sr-press');
      return wait(350);
    });
  }
  function fingerHide() { if (fingerEl) fingerEl.classList.remove('visible'); }

  // ── Terminal: append ──
  function appendLine(html, cls) {
    if (!termBody) return null;
    var div = document.createElement('div');
    if (cls) div.className = cls;
    div.innerHTML = html;
    termBody.appendChild(div);
    termBody.scrollTop = termBody.scrollHeight;
    return div;
  }
  function typeCommand(cmd, path) {
    path = path || '~/project';
    if (_replaying) {
      appendLine('<span class="c-prompt">\u276F</span> <span class="c-path">' + path + '</span> <span class="c-cmd">' + cmd + '</span>');
      return Promise.resolve();
    }
    var line = appendLine(
      '<span class="c-prompt">\u276F</span> <span class="c-path">' + path + '</span> <span class="c-cmd" id="sr-typing"></span><span class="sr-term-cursor"></span>'
    );
    var target = line.querySelector('#sr-typing');
    return (async function() {
      for (var i = 0; i < cmd.length; i++) {
        if (abortFlag) { target.textContent = cmd; break; }
        target.textContent = cmd.substring(0, i + 1);
        await wait(35 + Math.random() * 25);
      }
      target.removeAttribute('id');
      var cur = line.querySelector('.sr-term-cursor');
      if (cur) cur.remove();
    })();
  }
  function showOutput(lines, opts) {
    opts = opts || {};
    var cls = opts.cls || 'c-dim';
    if (_replaying) {
      for (var i = 0; i < lines.length; i++) {
        appendLine('<span class="' + cls + '">' + lines[i] + '</span>');
      }
      return Promise.resolve();
    }
    var delay = opts.delay || 80;
    return (async function() {
      for (var i = 0; i < lines.length; i++) {
        if (abortFlag) { delay = 0; }
        var div = appendLine('<span class="' + cls + '">' + lines[i] + '</span>');
        div.style.opacity = '0'; div.style.transform = 'translateY(3px)';
        div.style.transition = 'opacity 0.12s ease, transform 0.12s ease';
        await wait(delay);
        div.style.opacity = '1'; div.style.transform = 'translateY(0)';
      }
    })();
  }
  function blankLine() { appendLine('&nbsp;'); }

  // ── Attention: highlight (框选) ──
  function highlight(el, duration) {
    if (_replaying || !el) return Promise.resolve();
    duration = duration || 2000;
    el.classList.add('sr-highlight');
    return wait(duration).then(function() { el.classList.remove('sr-highlight'); });
  }

  // ── Snapshot & Reset (for replay-based jumping) ──
  function _snapshotInitialState() {
    _initialSnapshots = {};
    if (cfg.device === 'terminal' && termBody) {
      _initialSnapshots._termBody = termBody.innerHTML;
      return;
    }
    var screens = document.querySelectorAll('.sr-screen');
    if (screens.length > 0) {
      screens.forEach(function(s) {
        if (s.id) _initialSnapshots[s.id] = s.innerHTML;
      });
    } else {
      var page = document.querySelector('.page');
      if (page) _initialSnapshots._page = page.innerHTML;
    }
  }

  function _resetDOM() {
    if (cfg.device === 'terminal' && termBody) {
      termBody.innerHTML = _initialSnapshots._termBody || '';
    } else {
      var screens = document.querySelectorAll('.sr-screen');
      if (screens.length > 0) {
        screens.forEach(function(s) {
          if (s.id && _initialSnapshots[s.id] !== undefined) {
            s.innerHTML = _initialSnapshots[s.id];
          }
        });
      } else if (_initialSnapshots._page) {
        var page = document.querySelector('.page');
        if (page) page.innerHTML = _initialSnapshots._page;
      }
    }
    // Reset cursor
    if (cursorEl) {
      cursorEl.style.transition = 'none';
      cursorEl.style.left = '-40px';
      cursorEl.style.top = '-40px';
      void cursorEl.offsetWidth;
      cursorEl.style.transition = '';
    }
    // Hide finger
    if (fingerEl) fingerEl.classList.remove('visible');
  }

  // ── Inject DOM ──
  function injectDOM() {
    var device = cfg.device || 'web';

    // Subtitle
    var sub = document.createElement('div');
    sub.className = 'sr-subtitle'; sub.id = 'sr-subtitle';
    document.body.appendChild(sub);
    subEl = sub;

    // Cursor (web mode)
    if (device === 'web') {
      var cur = document.createElement('div');
      cur.className = 'sr-cursor'; cur.id = 'sr-cursor';
      cur.style.left = '-40px'; cur.style.top = '-40px';
      cur.innerHTML = '<svg viewBox="0 0 18 24" fill="none"><path d="M1 1l6 20.5 2.8-8H16.5L1 1z" fill="#fff" stroke="#1a1a2e" stroke-width="1.2"/></svg>';
      document.body.appendChild(cur);
      cursorEl = cur;

      var ring = document.createElement('div');
      ring.className = 'sr-click-ring'; ring.id = 'sr-click-ring';
      document.body.appendChild(ring);
      ringEl = ring;
    }

    // Finger placeholder (mobile) — user must place .sr-finger in their phone shell
    if (device === 'mobile') {
      fingerEl = document.querySelector('.sr-finger');
    }

    // Terminal body ref
    if (device === 'terminal') {
      termBody = document.querySelector('.sr-term-body') || document.getElementById('term-body');
    }

    // Dock
    var dock = document.createElement('div');
    dock.className = 'sr-dock'; dock.id = 'sr-dock';
    dock.innerHTML =
      '<button class="sr-dock-btn" id="sr-prev" title="Previous (\u2190)"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg></button>' +
      '<div class="sr-dock-dots" id="sr-dots"></div>' +
      '<button class="sr-dock-btn" id="sr-next" title="Next (\u2192)"><svg viewBox="0 0 24 24"><polyline points="9 6 15 12 9 18"/></svg></button>' +
      '<div class="sr-dock-divider"></div>' +
      '<button class="sr-dock-btn" id="sr-play" title="Space"><svg viewBox="0 0 24 24" id="sr-icon-play"><polygon points="5 3 19 12 5 21 5 3"/></svg><svg viewBox="0 0 24 24" id="sr-icon-pause" style="display:none"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg></button>' +
      '<button class="sr-dock-btn" id="sr-mute" title="M"><svg viewBox="0 0 24 24" id="sr-icon-unmuted"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg><svg viewBox="0 0 24 24" id="sr-icon-muted" style="display:none"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg></button>' +
      '<div class="sr-dock-divider"></div>' +
      '<div class="sr-dock-label" id="sr-label"><strong>1</strong> / ' + cfg.steps.length + '</div>' +
      '<div class="sr-dock-divider"></div>' +
      '<button class="sr-dock-btn" id="sr-read" title="R"><svg viewBox="0 0 24 24"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></button>';
    document.body.appendChild(dock);
    dockEl = dock;

    // Dots
    var dots = $('sr-dots');
    for (var i = 0; i < cfg.steps.length; i++) {
      var d = document.createElement('div');
      d.className = 'sr-dock-dot'; d.setAttribute('data-idx', i); d.title = cfg.steps[i].label;
      dots.appendChild(d);
    }

    // Back button for reading mode
    var rmBack = document.createElement('button');
    rmBack.className = 'sr-rm-back'; rmBack.id = 'sr-rm-back';
    rmBack.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg><span>\u6F14\u793A\u6A21\u5F0F</span>';
    document.body.appendChild(rmBack);
  }

  // ── Controller ──
  function updateDock() {
    var idx = Math.max(0, curIdx);
    $('sr-label').innerHTML = '<strong>' + (idx + 1) + '</strong> / ' + cfg.steps.length;
    document.querySelectorAll('.sr-dock-dot').forEach(function(d, i) { d.classList.toggle('active', i === idx); d.classList.toggle('done', i < idx); });
    $('sr-icon-play').style.display = playing ? 'none' : '';
    $('sr-icon-pause').style.display = playing ? '' : 'none';
  }

  async function goToStep(idx, _sequential) {
    if (idx < 0 || idx >= cfg.steps.length) return;
    var gen = ++generation;
    // Abort any in-progress animation
    stopAudio();
    abortFlag = true;
    _replaying = false;
    animating = false;
    await new Promise(function(r) { setTimeout(r, 60); });
    if (gen !== generation) return;
    abortFlag = false;
    // Clean up transient visual effects
    document.querySelectorAll('.sr-glow').forEach(function(e) { e.classList.remove('sr-glow'); });
    document.querySelectorAll('.sr-highlight').forEach(function(e) { e.classList.remove('sr-highlight'); });
    hideSub();

    // Rebuild state: sequential auto-play skips replay, everything else replays
    if (!_sequential) {
      _resetDOM();
      if (idx > 0) {
        _replaying = true;
        for (var i = 0; i < idx; i++) {
          if (gen !== generation) { _replaying = false; return; }
          try { await cfg.animations[i](); } catch(e) {}
        }
        _replaying = false;
        if (gen !== generation) return;
      }
    }

    curIdx = idx;
    updateDock();
    animating = true;
    try {
      await cfg.animations[idx]();
    } catch(e) {
      console.warn('SR: animation error at step ' + idx, e);
    }
    if (gen !== generation) return;
    animating = false;
    if (playing && curIdx < cfg.steps.length - 1) {
      await wait(300);
      if (gen !== generation) return;
      if (playing) goToStep(curIdx + 1, true);
    } else if (curIdx >= cfg.steps.length - 1) {
      playing = false; updateDock();
    }
  }

  var _pausedDuringStep = false;

  function togglePlay() {
    playing = !playing; updateDock();
    if (playing) {
      if (curIdx >= cfg.steps.length - 1) {
        // At the end, restart from beginning
        curIdx = -1;
        goToStep(0);
      } else if (_pausedDuringStep) {
        // Was paused mid-step, replay current step
        _pausedDuringStep = false;
        goToStep(curIdx);
      } else {
        // Current step finished, go next
        goToStep(curIdx + 1);
      }
    } else {
      _pausedDuringStep = animating;
      stopAudio();
      abortFlag = true; setTimeout(function() { abortFlag = false; animating = false; }, 200);
    }
  }
  function toggleMute() {
    muted = !muted;
    $('sr-icon-unmuted').style.display = muted ? 'none' : '';
    $('sr-icon-muted').style.display = muted ? '' : 'none';
    audioEl.volume = muted ? 0 : 1;
  }
  var _readingMode = false;

  async function enterReading() {
    if (_readingMode) return;
    _readingMode = true;
    if (playing) { playing = false; }
    stopAudio();
    abortFlag = true;
    document.querySelectorAll('.sr-glow').forEach(function(e) { e.classList.remove('sr-glow'); });
    document.querySelectorAll('.sr-highlight').forEach(function(e) { e.classList.remove('sr-highlight'); });
    hideSub();
    // Replay ALL animations to build full content (all device types, not just terminal)
    _resetDOM();
    _replaying = true;
    for (var i = 0; i < cfg.animations.length; i++) {
      try { await cfg.animations[i](); } catch(e) {}
    }
    _replaying = false;
    // Clean up visual artifacts left by replay
    document.querySelectorAll('.sr-glow').forEach(function(e) { e.classList.remove('sr-glow'); });
    document.querySelectorAll('.sr-highlight').forEach(function(e) { e.classList.remove('sr-highlight'); });
    setTimeout(function() { abortFlag = false; }, 100);
    document.documentElement.classList.add('sr-reading-mode');
    document.body.classList.add('sr-reading-mode');
    window.scrollTo(0, 0);
    updateDock();
  }

  function exitReading() {
    if (!_readingMode) return;
    _readingMode = false;
    document.documentElement.classList.remove('sr-reading-mode');
    document.body.classList.remove('sr-reading-mode');
    window.scrollTo(0, 0);
    goToStep(Math.max(0, curIdx));
  }

  function toggleReading() {
    if (_readingMode) exitReading(); else enterReading();
  }

  // ── Bind events ──
  function bindEvents() {
    $('sr-prev').onclick = function() { if (curIdx > 0) goToStep(curIdx - 1); };
    $('sr-next').onclick = function() { if (curIdx < cfg.steps.length - 1) goToStep(curIdx + 1); };
    $('sr-play').onclick = togglePlay;
    $('sr-mute').onclick = toggleMute;
    $('sr-read').onclick = toggleReading;
    $('sr-rm-back').onclick = function() { exitReading(); };
    $('sr-dots').onclick = function(e) { var d = e.target.closest('.sr-dock-dot'); if (d) goToStep(parseInt(d.getAttribute('data-idx'))); };
    document.addEventListener('keydown', function(e) {
      if (e.key === 'r' || e.key === 'R') { toggleReading(); return; }
      if (e.key === 'Escape') { if (_readingMode) exitReading(); return; }
      if (_readingMode) return;
      if (e.key === ' ' || e.code === 'Space') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowLeft') { if (curIdx > 0) goToStep(curIdx - 1); }
      else if (e.key === 'ArrowRight') { if (curIdx < cfg.steps.length - 1) goToStep(curIdx + 1); }
      else if (e.key === 'm' || e.key === 'M') { toggleMute(); }
    });
  }

  // ── Cover (solves browser autoplay policy) ──
  function showCover() {
    var overlay = document.createElement('div');
    overlay.className = 'sr-cover-overlay';
    overlay.id = 'sr-cover-overlay';
    overlay.innerHTML =
      '<div class="sr-cover-content">' +
        '<div class="sr-cover-title">' + (cfg.title || 'Demo') + '</div>' +
        '<div class="sr-cover-meta">' + (cfg.meta || '') + '</div>' +
        '<button class="sr-cover-play" id="sr-cover-play">' +
          '<svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>' +
        '</button>' +
        '<div class="sr-cover-hint">Click to play</div>' +
      '</div>';
    document.body.appendChild(overlay);

    function start() {
      overlay.classList.add('sr-cover-hide');
      setTimeout(function() { overlay.remove(); }, 500);
      playing = true;
      updateDock();
      dockEl.classList.add('force-show');
      setTimeout(function() { dockEl.classList.remove('force-show'); }, 3000);
      goToStep(0, true);
    }

    overlay.addEventListener('click', start);
    document.addEventListener('keydown', function onKey(e) {
      if (e.key === ' ' || e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        document.removeEventListener('keydown', onKey);
        start();
      }
    });
  }

  // ── Cleanup ──
  function _stop() {
    stopAudio();
    playing = false;
    abortFlag = true;
  }

  window.addEventListener('pagehide', _stop);

  // ── Init ──
  function init(config) {
    cfg = config;
    audioEl = new Audio();
    injectDOM();
    _snapshotInitialState();
    bindEvents();
    updateDock();
    showCover();
  }

  return {
    init: init,
    _stop: _stop,
    $: $,
    wait: wait,
    showSub: showSub, hideSub: hideSub,
    playAudio: playAudio,
    center: center, glow: glow, unglow: unglow,
    showScreen: showScreen,
    moveTo: moveTo, clickAt: clickAt, typeInto: typeInto,
    fingerTo: fingerTo, fingerTap: fingerTap, fingerHide: fingerHide,
    appendLine: appendLine, typeCommand: typeCommand, showOutput: showOutput, blankLine: blankLine,
    highlight: highlight
  };
})();
