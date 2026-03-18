/* ========================================================
   Keyframe Viewer — 公共 JS
   导入方式：
   <script> const frames = [...]; </script>
   <script src="https://boom-cdn.vercel.app/viewer/keyframe-viewer.js"></script>

   前置要求：
   - 全局变量 frames 已定义
   - DOM 中有 #hlRing, #hlLabel, .view-panel, #descTag, #descTitle,
     #descInfo, #counter, #progressFill, #prevFrameBtn, #nextBtn,
     #notesList, #stepDots, #navHint

   可选回调：
   - window.onFrameChange(frameIdx, noteIdx) — 每次切帧/步时调用
   ======================================================== */

(function() {
  let frameIdx = 0, noteIdx = 0;
  const ring = document.getElementById('hlRing');
  const label = document.getElementById('hlLabel');
  const viewPanel = document.querySelector('.view-panel');

  function totalSteps() { return frames.reduce((s,f) => s + f.notes.length, 0); }
  function currentGlobalStep() {
    let s = 0;
    for (let i = 0; i < frameIdx; i++) s += frames[i].notes.length;
    return s + noteIdx;
  }

  function render() {
    const f = frames[frameIdx];
    const n = f.notes[noteIdx];

    // Slide switching (原型图模式)
    const slides = document.querySelectorAll('.slide');
    if (slides.length > 0) {
      slides.forEach(s => s.classList.remove('active'));
      const el = document.getElementById(f.id);
      if (el && el.classList.contains('slide')) el.classList.add('active');
    }

    // Header
    document.getElementById('descTag').textContent = f.tag;
    document.getElementById('descTitle').textContent = f.title;
    document.getElementById('descInfo').textContent = '\u5E27 ' + (frameIdx+1) + '/' + frames.length + ' \u00B7 \u672C\u5E27\u7B2C ' + (noteIdx+1) + '/' + f.notes.length + ' \u6B65';
    document.getElementById('counter').textContent = '\u5E27 ' + (frameIdx+1) + '/' + frames.length + ' \u00B7 \u6B65 ' + (noteIdx+1) + '/' + f.notes.length;

    // Progress
    var pct = ((currentGlobalStep() + 1) / totalSteps()) * 100;
    document.getElementById('progressFill').style.width = pct + '%';

    // Buttons
    document.getElementById('prevFrameBtn').disabled = (frameIdx === 0 && noteIdx === 0);
    var isLast = (frameIdx === frames.length - 1 && noteIdx === f.notes.length - 1);
    var nextBtn = document.getElementById('nextBtn');
    nextBtn.disabled = isLast;
    nextBtn.textContent = (noteIdx < f.notes.length - 1) ? '\u4E0B\u4E00\u6B65 \u2192' : '\u4E0B\u4E00\u5E27 \u2192\u2192';

    // Notes list
    var notesList = document.getElementById('notesList');
    notesList.innerHTML = '';
    f.notes.forEach(function(note, i) {
      var div = document.createElement('div');
      div.className = 'note' + (i === noteIdx ? ' active' : '') + (i < noteIdx ? ' done' : '');
      div.innerHTML = '<div class="note-idx">STEP ' + (i+1) + '</div><div class="note-title">' + note.title + '</div><div class="note-body">' + note.body + '</div>';
      div.addEventListener('click', function() { noteIdx = i; render(); });
      notesList.appendChild(div);
    });

    // Step dots
    var dots = document.getElementById('stepDots');
    dots.innerHTML = '';
    f.notes.forEach(function(_, i) {
      var dot = document.createElement('div');
      dot.className = 'step-dot' + (i === noteIdx ? ' active' : '') + (i < noteIdx ? ' done' : '');
      dots.appendChild(dot);
    });

    // Highlight
    highlightElement(n.hl, n.title);

    // Optional callback
    if (typeof window.onFrameChange === 'function') window.onFrameChange(frameIdx, noteIdx);
  }

  function highlightElement(hlName, labelText) {
    ring.classList.remove('visible');
    label.classList.remove('visible');
    if (!hlName) return;
    var target = document.querySelector('[data-hl="' + hlName + '"]');
    if (!target) return;
    requestAnimationFrame(function() {
      var tRect = target.getBoundingClientRect();
      var pRect = viewPanel.getBoundingClientRect();
      var pad = 4;
      ring.style.left = (tRect.left - pRect.left - pad) + 'px';
      ring.style.top = (tRect.top - pRect.top - pad) + 'px';
      ring.style.width = (tRect.width + pad * 2) + 'px';
      ring.style.height = (tRect.height + pad * 2) + 'px';
      ring.classList.add('visible');
      label.textContent = labelText;
      label.style.left = (tRect.left - pRect.left) + 'px';
      label.style.top = (tRect.top - pRect.top - 24) + 'px';
      label.classList.add('visible');
    });
  }

  function next() {
    var f = frames[frameIdx];
    if (noteIdx < f.notes.length - 1) { noteIdx++; }
    else if (frameIdx < frames.length - 1) { frameIdx++; noteIdx = 0; }
    render();
  }
  function prev() {
    if (noteIdx > 0) { noteIdx--; }
    else if (frameIdx > 0) { frameIdx--; noteIdx = frames[frameIdx].notes.length - 1; }
    render();
  }

  document.getElementById('nextBtn').addEventListener('click', next);
  document.getElementById('prevFrameBtn').addEventListener('click', prev);
  document.addEventListener('keydown', function(e) {
    if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); next(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
  });

  // Export for external use
  window.kfv = { render: render, next: next, prev: prev, getFrameIdx: function(){ return frameIdx; }, getNoteIdx: function(){ return noteIdx; } };

  render();
})();
