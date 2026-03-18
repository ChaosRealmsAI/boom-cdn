/**
 * comments.js — Figma-style comment system for presenter
 * Depends on Presenter being loaded first.
 *
 * Usage:
 *   PresenterComments.init({
 *     storageKey: 'my_comments_v1',
 *     defaultComments: { 'view-id': [{ id, targetId, label, text, createdAt }] }
 *   });
 */
(function(global) {
  'use strict';

  var C = {};
  var cfg = {};
  var commentsStore = {};
  var commentsOpen = false;
  var hoverCommentElement = null;
  var selectedCommentElements = [];
  var selectedCommentPageKey = null;
  var commentTargetCounter = 0;

  // DOM refs
  var commentHoverBox, commentSelectBox;
  var commentPageTitle, commentHistoryMeta;
  var commentCurrentTarget, commentClear;
  var commentList, commentInput, commentSubmit, commentStatus;

  /* ---- Storage ---- */
  function loadComments() {
    try {
      var raw = localStorage.getItem(cfg.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return JSON.parse(JSON.stringify(cfg.defaultComments || {}));
  }

  function saveComments() {
    try {
      localStorage.setItem(cfg.storageKey, JSON.stringify(commentsStore));
    } catch (e) {}
  }

  /* ---- Helpers ---- */
  function getCurrentViewKey() {
    return global.Presenter ? global.Presenter.getCurrentViewKey() : '';
  }
  function getViewLabel(key) {
    return global.Presenter ? global.Presenter.getViewLabel(key) : key;
  }

  function formatTime(value) {
    var d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }

  /* ---- Comment box positioning ---- */
  function positionBox(box, el) {
    if (!box || !el) return;
    var r = el.getBoundingClientRect();
    var style = window.getComputedStyle(el);
    var radius = style.borderRadius && style.borderRadius !== '0px' ? style.borderRadius : '12px';
    box.style.top = Math.round(r.top) + 'px';
    box.style.left = Math.round(r.left) + 'px';
    box.style.width = Math.round(r.width) + 'px';
    box.style.height = Math.round(r.height) + 'px';
    box.style.borderRadius = radius;
    box.classList.add('on');
  }

  function hideBox(box) { if (box) box.classList.remove('on'); }

  function syncBoxes() {
    var ps = global.Presenter ? global.Presenter.getState() : {};
    if (!ps.readingMode || !commentsOpen) {
      hideBox(commentHoverBox);
      if (commentSelectBox) { commentSelectBox.classList.remove('on'); commentSelectBox.innerHTML = ''; }
      return;
    }
    if (hoverCommentElement) positionBox(commentHoverBox, hoverCommentElement);
    else hideBox(commentHoverBox);

    if (!commentSelectBox) return;
    commentSelectBox.innerHTML = '';
    if (!selectedCommentElements.length) { commentSelectBox.classList.remove('on'); return; }
    selectedCommentElements.forEach(function(el) {
      if (!el || !document.body.contains(el)) return;
      var r = el.getBoundingClientRect();
      var style = window.getComputedStyle(el);
      var radius = style.borderRadius && style.borderRadius !== '0px' ? style.borderRadius : '12px';
      var box = document.createElement('div');
      box.className = 'comment-select-box-item';
      box.style.top = Math.round(r.top) + 'px';
      box.style.left = Math.round(r.left) + 'px';
      box.style.width = Math.round(r.width) + 'px';
      box.style.height = Math.round(r.height) + 'px';
      box.style.borderRadius = radius;
      commentSelectBox.appendChild(box);
    });
    commentSelectBox.classList.toggle('on', !!commentSelectBox.childElementCount);
  }

  /* ---- Comment targets ---- */
  function buildLabel(el) {
    return el.getAttribute('data-commentable') || el.getAttribute('aria-label') || el.getAttribute('title') ||
      (el.innerText || '').replace(/\s+/g,' ').trim().slice(0,48) || el.tagName.toLowerCase();
  }

  function isEligible(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.closest('#comment-panel,#bottom-dock,#dock-hitbox,#scene-index,#scene-backdrop,#spotlight,#comment-hover-box,#comment-select-box')) return false;
    if (/^(html|body|script|style|meta|link|path|line|polyline|svg|defs|clippath)$/i.test(el.tagName)) return false;
    var rect = el.getBoundingClientRect();
    if (rect.width < 6 || rect.height < 6) return false;
    var s = window.getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
    if (el.classList && (el.classList.contains('presenter-view') || el.classList.contains('page-shell') || el.classList.contains('page-body'))) return false;
    return true;
  }

  function ensureTarget(el) {
    if (!isEligible(el)) return null;
    if (!el.id) { commentTargetCounter++; el.id = 'comment-target-' + commentTargetCounter; }
    if (!el.dataset.commentable) el.dataset.commentable = buildLabel(el);
    return el;
  }

  function buildTargets() {
    document.querySelectorAll('.presenter-view *').forEach(function(el) { ensureTarget(el); });
  }

  function resolveTarget(start) {
    var cur = start && start.nodeType === 1 ? start : start && start.parentElement;
    var view = cur && cur.closest ? cur.closest('.presenter-view') : null;
    if (!cur || !view) return null;
    while (cur && cur !== document.body) {
      if (cur === view) break;
      if (view.contains(cur)) { var t = ensureTarget(cur); if (t) return t; }
      cur = cur.parentElement;
    }
    return null;
  }

  /* ---- Selection ---- */
  function clearHover() { hoverCommentElement = null; hideBox(commentHoverBox); }

  function setHover(el) {
    if (hoverCommentElement === el) return;
    clearHover();
    hoverCommentElement = el || null;
    if (hoverCommentElement) positionBox(commentHoverBox, hoverCommentElement);
  }

  function getPageKey(el) {
    var view = el && el.closest ? el.closest('.presenter-view') : null;
    return view ? view.id : getCurrentViewKey();
  }

  function setSelected(elements) {
    clearHover();
    selectedCommentElements = [];
    selectedCommentPageKey = null;
    (elements || []).forEach(function(el) {
      var t = ensureTarget(el);
      if (!t) return;
      var pk = getPageKey(t);
      if (!selectedCommentPageKey) selectedCommentPageKey = pk;
      if (pk !== selectedCommentPageKey) return;
      if (!selectedCommentElements.some(function(i) { return i.id === t.id; }))
        selectedCommentElements.push(t);
    });
    if (!selectedCommentElements.length) selectedCommentPageKey = null;
    syncBoxes();
    renderPanel();
  }

  function toggleSelected(el) {
    var t = ensureTarget(el);
    if (!t) return;
    var pk = getPageKey(t);
    if (selectedCommentPageKey && selectedCommentPageKey !== pk) {
      selectedCommentElements = [];
      selectedCommentPageKey = pk;
    } else if (!selectedCommentPageKey) {
      selectedCommentPageKey = pk;
    }
    var idx = selectedCommentElements.findIndex(function(i) { return i.id === t.id; });
    if (idx >= 0) selectedCommentElements.splice(idx, 1);
    else selectedCommentElements.push(t);
    if (!selectedCommentElements.length) selectedCommentPageKey = null;
    syncBoxes();
    renderPanel();
  }

  function ensureSelectionInPage() {
    selectedCommentElements = selectedCommentElements.filter(function(el) {
      return el && document.body.contains(el);
    });
    if (!selectedCommentElements.length) selectedCommentPageKey = null;
  }

  /* ---- Render panel ---- */
  function groupThreads(items) {
    var groups = {};
    items.forEach(function(item) {
      var k = item.groupId || item.id;
      if (!groups[k]) groups[k] = { id: k, createdAt: item.createdAt, text: item.text, targets: [] };
      if (!groups[k].targets.some(function(t) { return t.id === item.targetId; }))
        groups[k].targets.push({ id: item.targetId, label: item.label || item.targetId || '未命名' });
    });
    return Object.keys(groups).map(function(k) { return groups[k]; })
      .sort(function(a,b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }

  function renderPanel() {
    var pk = selectedCommentPageKey || getCurrentViewKey();
    var label = getViewLabel(pk);
    var items = (commentsStore[pk] || []).slice().sort(function(a,b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    var threads = groupThreads(items);

    if (commentPageTitle) commentPageTitle.textContent = label;
    if (commentHistoryMeta) commentHistoryMeta.textContent = threads.length ? (threads.length + ' cards') : 'No cards';

    // Selection area
    if (commentCurrentTarget) {
      if (selectedCommentElements.length) {
        commentCurrentTarget.classList.remove('empty');
        commentCurrentTarget.innerHTML = '<div class="comment-selection-grid">' +
          selectedCommentElements.map(function(item, i) {
            return '<div class="comment-selection-item">' +
              '<div class="comment-selection-copy">' +
                '<div class="comment-selection-title">' + esc(item.dataset.commentable || item.id) + '</div>' +
                '<div class="comment-selection-meta">Selection ' + (i+1) + '</div>' +
              '</div>' +
              '<button class="comment-selection-remove" data-remove-target-id="' + esc(item.id) + '" title="Remove">\u00d7</button>' +
            '</div>';
          }).join('') + '</div>';
        if (commentSubmit) commentSubmit.disabled = false;
        if (commentClear) commentClear.disabled = false;
      } else {
        commentCurrentTarget.classList.add('empty');
        commentCurrentTarget.innerHTML = '<div class="comment-selection-empty-title">No selection</div>' +
          '<div class="comment-selection-empty-body">点击页面区域选中后，在此输入评论。</div>';
        if (commentSubmit) commentSubmit.disabled = true;
        if (commentClear) commentClear.disabled = true;
      }
    }

    // Thread list
    if (commentList) {
      if (!threads.length) {
        commentList.innerHTML = '<div class="comment-empty">当前页还没有评论。</div>';
        return;
      }
      commentList.innerHTML = threads.map(function(thread) {
        var ids = thread.targets.map(function(t) { return t.id; }).join(',');
        return '<article class="comment-thread" data-target-ids="' + esc(ids) + '">' +
          '<div class="comment-thread-meta"><div class="comment-thread-time">' + formatTime(thread.createdAt) + '</div>' +
          '<div class="comment-thread-count">' + thread.targets.length + ' targets</div></div>' +
          '<div class="comment-thread-targets">' + thread.targets.map(function(t) {
            return '<span class="comment-chip">' + esc(t.label) + '</span>';
          }).join('') + '</div>' +
          '<div class="comment-thread-body">' + esc(thread.text) + '</div></article>';
      }).join('');
    }
  }

  /* ---- Open / Close ---- */
  function setOpen(open) {
    var ps = global.Presenter ? global.Presenter.getState() : {};
    commentsOpen = !!open && ps.readingMode;
    document.body.classList.toggle('comments-open', commentsOpen);
    if (!commentsOpen) {
      clearHover();
      setSelected([]);
      if (commentSelectBox) { commentSelectBox.classList.remove('on'); commentSelectBox.innerHTML = ''; }
    } else {
      syncBoxes();
      renderPanel();
    }
  }
  C.setOpen = setOpen;
  C.isOpen = function() { return commentsOpen; };

  /* ---- Event binding ---- */
  function bindEvents() {
    // Comment button in dock
    var btnComments = document.getElementById('btn-comments');
    if (btnComments) btnComments.addEventListener('click', function(e) {
      e.stopPropagation();
      var ps = global.Presenter ? global.Presenter.getState() : {};
      if (!ps.readingMode) return;
      setOpen(!commentsOpen);
    });

    // Clear button
    if (commentClear) commentClear.addEventListener('click', function() { setSelected([]); });

    // Submit
    if (commentSubmit) commentSubmit.addEventListener('click', function() {
      var text = commentInput ? commentInput.value.trim() : '';
      var pk = selectedCommentPageKey || getCurrentViewKey();
      var ps = global.Presenter ? global.Presenter.getState() : {};
      if (!ps.readingMode || !commentsOpen || !selectedCommentElements.length || !text) return;
      if (!commentsStore[pk]) commentsStore[pk] = [];
      var now = new Date().toISOString();
      var bid = 'c-' + Date.now();
      selectedCommentElements.forEach(function(el, i) {
        commentsStore[pk].push({
          id: bid + '-' + i, groupId: bid,
          targetId: el.id, label: el.dataset.commentable || el.id || '未命名',
          text: text, createdAt: now
        });
      });
      if (commentInput) commentInput.value = '';
      saveComments();
      renderPanel();
    });

    // Click: remove selection item / click thread / click commentable
    document.addEventListener('click', function(e) {
      var remove = e.target.closest('[data-remove-target-id]');
      if (remove) {
        setSelected(selectedCommentElements.filter(function(i) { return i.id !== remove.dataset.removeTargetId; }));
        return;
      }
      var card = e.target.closest('.comment-thread');
      if (card) {
        var ids = (card.dataset.targetIds || '').split(',').filter(Boolean);
        var targets = ids.map(function(id) { return document.getElementById(id); }).filter(Boolean);
        if (targets.length) {
          setSelected(targets);
          targets[0].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
        return;
      }
      if (e.target.closest('#comment-panel')) return;
      var ps = global.Presenter ? global.Presenter.getState() : {};
      var commentable = ps.readingMode && commentsOpen ? resolveTarget(e.target) : null;
      if (commentable) {
        toggleSelected(commentable);
        if (commentInput) commentInput.focus();
        return;
      }
    });

    // Mousemove: hover highlight
    document.addEventListener('mousemove', function(e) {
      var ps = global.Presenter ? global.Presenter.getState() : {};
      if (!ps.readingMode || !commentsOpen) { clearHover(); return; }
      if (e.target.closest('#comment-panel,#bottom-dock,#dock-hitbox,#scene-index,#scene-backdrop,#spotlight,#comment-hover-box,#comment-select-box')) {
        clearHover(); return;
      }
      setHover(resolveTarget(e.target));
    });

    // Presenter events
    if (global.Presenter) {
      global.Presenter.on('render', function() {
        ensureSelectionInPage();
        syncBoxes();
        renderPanel();
      });
      global.Presenter.on('modeChange', function(data) {
        if (!data.readingMode) setOpen(false);
      });
      global.Presenter.on('escape', function() {
        if (commentsOpen) setOpen(false);
      });
      global.Presenter.on('resize', syncBoxes);
      global.Presenter.on('scroll', syncBoxes);
    }
  }

  /* ---- Init ---- */
  C.init = function(config) {
    cfg = Object.assign({
      storageKey: 'presenter_comments_v1',
      defaultComments: {}
    }, config);

    // Cache DOM
    commentHoverBox = document.getElementById('comment-hover-box');
    commentSelectBox = document.getElementById('comment-select-box');
    commentPageTitle = document.getElementById('comment-page-title');
    commentHistoryMeta = document.getElementById('comment-history-meta');
    commentCurrentTarget = document.getElementById('comment-current-target');
    commentClear = document.getElementById('comment-clear');
    commentList = document.getElementById('comment-list');
    commentInput = document.getElementById('comment-input');
    commentSubmit = document.getElementById('comment-submit');
    commentStatus = document.getElementById('comment-status');

    // Load
    commentsStore = loadComments();

    // Build targets
    buildTargets();

    // Bind
    bindEvents();

    // Initial render
    renderPanel();
  };

  global.PresenterComments = C;
})(window);
