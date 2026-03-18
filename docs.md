# boom-cdn — 公共组件 CDN

基础地址：`https://boom-cdn.vercel.app`

## 总览

| 组件 | 用途 | 文件 |
|------|------|------|
| [engine](#engine) | Walkthrough 讲解引擎 | [CSS](https://boom-cdn.vercel.app/engine/engine.css) · [JS](https://boom-cdn.vercel.app/engine/engine.js) |
| [themes](#themes) | UI 组件框架 + 17 套主题 | [base.css](https://boom-cdn.vercel.app/themes/base.css) |
| [viewer](#viewer) | 关键帧 / 宪法 / 版本索引 | [CSS](https://boom-cdn.vercel.app/viewer/keyframe-viewer.css) · [JS](https://boom-cdn.vercel.app/viewer/keyframe-viewer.js) |
| [presenter](#presenter) | 幻灯片演示器 | [CSS](https://boom-cdn.vercel.app/presenter/presenter.css) · [JS](https://boom-cdn.vercel.app/presenter/presenter.js) |

---

## engine

Walkthrough 讲解引擎。逐步高亮 + 动画 + 语音旁白 + 键盘控制。

### 引用

```html
<link rel="stylesheet" href="https://boom-cdn.vercel.app/engine/engine.css">
<script src="https://boom-cdn.vercel.app/engine/engine.js"></script>
```

### HTML 结构

```html
<div class="page">
  <div class="sr-screen active" id="s-page1">...</div>
  <div class="sr-screen" id="s-page2">...</div>
</div>
```

### 初始化

```javascript
SR.init({
  steps: [{label:'标题', sub:'副标题', audio:'s1'}, ...],
  animations: [
    async () => { SR.showScreen('s-page1'); await SR.wait(500); },
    async () => { SR.glow(SR.$('elem')); await SR.playAudio('s2'); SR.unglow(SR.$('elem')); }
  ],
  audioDir: 'audio/demo-name/',
  title: 'Demo Title',
  meta: '10 steps',
  device: 'presentation'
});
```

### API

| 方法 | 说明 |
|------|------|
| `SR.$(id)` | getElementById |
| `SR.wait(ms)` | 可中断等待 |
| `SR.showSub(text)` | 显示字幕 |
| `SR.hideSub()` | 隐藏字幕 |
| `SR.playAudio(id)` | 播放音频，await 等播完 |
| `SR.glow(el)` | 蓝色聚焦高亮 |
| `SR.unglow(el)` | 取消高亮 |
| `SR.showScreen(id)` | 切换 .sr-screen 页面 |
| `SR.highlight(el, ms?)` | 框选高亮，默认 2s 消失 |
| `SR.center(el)` | 返回元素中心坐标 {x,y} |

### 键盘

Space 播放 · ← → 翻页 · M 静音 · R 阅读模式 · Esc 退出

---

## themes

完整 UI 组件系统。主题文件自动 @import base.css，只需引一个文件。

### 引用

```html
<!-- 引入一个主题（自动包含 base.css） -->
<link rel="stylesheet" href="https://boom-cdn.vercel.app/themes/neo-tokyo.css">

<!-- body 必须加 boom class -->
<body class="boom">
```

### 17 套主题

| 主题 | 风格 | CSS | 预览 |
|------|------|-----|------|
| neo-tokyo | 赛博东京 | [CSS](https://boom-cdn.vercel.app/themes/neo-tokyo.css) | [预览](https://boom-cdn.vercel.app/demo/neo-tokyo.html) |
| obsidian-velvet | 黑曜丝绒 | [CSS](https://boom-cdn.vercel.app/themes/obsidian-velvet.css) | [预览](https://boom-cdn.vercel.app/demo/obsidian-velvet.html) |
| champagne-silk | 香槟丝绸 | [CSS](https://boom-cdn.vercel.app/themes/champagne-silk.css) | [预览](https://boom-cdn.vercel.app/demo/champagne-silk.html) |
| matte-carbon | 哑光碳黑 | [CSS](https://boom-cdn.vercel.app/themes/matte-carbon.css) | [预览](https://boom-cdn.vercel.app/demo/matte-carbon.html) |
| soft-pastel | 柔和粉彩 | [CSS](https://boom-cdn.vercel.app/themes/soft-pastel.css) | [预览](https://boom-cdn.vercel.app/demo/soft-pastel.html) |
| swiss-minimal | 瑞士极简 | [CSS](https://boom-cdn.vercel.app/themes/swiss-minimal.css) | [预览](https://boom-cdn.vercel.app/demo/swiss-minimal.html) |
| terminal-green | 终端绿 | [CSS](https://boom-cdn.vercel.app/themes/terminal-green.css) | [预览](https://boom-cdn.vercel.app/demo/terminal-green.html) |
| zen-ink | 禅意水墨 | [CSS](https://boom-cdn.vercel.app/themes/zen-ink.css) | [预览](https://boom-cdn.vercel.app/demo/zen-ink.html) |
| aurora-gradient | 极光渐变 | [CSS](https://boom-cdn.vercel.app/themes/aurora-gradient.css) | — |
| candy-pop | 糖果波普 | [CSS](https://boom-cdn.vercel.app/themes/candy-pop.css) | — |
| copper-industrial | 铜工业风 | [CSS](https://boom-cdn.vercel.app/themes/copper-industrial.css) | — |
| emerald-dynasty | 翡翠王朝 | [CSS](https://boom-cdn.vercel.app/themes/emerald-dynasty.css) | — |
| forest-zen | 森林禅 | [CSS](https://boom-cdn.vercel.app/themes/forest-zen.css) | — |
| frost-glass | 霜冻玻璃 | [CSS](https://boom-cdn.vercel.app/themes/frost-glass.css) | — |
| golden-luxury | 黄金奢华 | [CSS](https://boom-cdn.vercel.app/themes/golden-luxury.css) | — |
| ink-editorial | 墨水社论 | [CSS](https://boom-cdn.vercel.app/themes/ink-editorial.css) | — |
| ocean-depth | 深海蓝 | [CSS](https://boom-cdn.vercel.app/themes/ocean-depth.css) | — |

### 组件类（base.css 提供，所有主题共享）

**排版**：`.b-display` `.b-h1~h5` `.b-body` `.b-muted` `.b-subtle` `.b-label` `.b-mono` `.b-serif` `.b-accent`

**布局**：`.b-container` `.b-container-sm/lg` `.b-section` `.b-grid` `.b-grid-2~4` `.b-flex` `.b-flex-col` `.b-center` `.b-between` `.b-stack` `.b-wrap`

**按钮**：`.b-btn` `.b-btn-primary` `.b-btn-ghost` `.b-btn-outline` `.b-btn-danger` `.b-btn-sm/lg/xl` `.b-btn-icon` `.b-btn-full` `.b-btn-group`

**卡片**：`.b-card` `.b-card-flat` `.b-card-header` `.b-card-title` `.b-card-desc` `.b-card-footer` `.b-card-image` `.b-card-accent`

**表单**：`.b-input` `.b-textarea` `.b-select` `.b-checkbox` `.b-radio` `.b-toggle` `.b-input-group` `.b-field` `.b-label-text` `.b-helper`

**标记**：`.b-badge` `.b-badge-success/warning/error/info` `.b-tag` `.b-dot` `.b-chip` `.b-chip-group` `.b-chip-input`

**数据展示**：`.b-table` `.b-table-wrap` `.b-list` `.b-list-item` `.b-list-bordered` `.b-stat` `.b-stat-value` `.b-stat-label`

**导航**：`.b-tabs` `.b-tab` `.b-tab-pills` `.b-navbar` `.b-breadcrumb` `.b-pagination` `.b-sidebar` `.b-sidebar-item` `.b-switch-group`

**弹出层**：`.b-overlay` `.b-dialog` `.b-dropdown` `.b-dropdown-item` `.b-toast` `.b-popover` `.b-sheet`

**反馈**：`.b-alert` `.b-alert-success/warning/error/info` `.b-banner` `.b-spinner` `.b-progress` `.b-skeleton`

**高级**：`.b-avatar` `.b-avatar-group` `.b-steps` `.b-timeline` `.b-accordion` `.b-pricing` `.b-testimonial` `.b-empty` `.b-hero` `.b-footer` `.b-meter` `.b-gallery` `.b-details`

**工具**：`.b-separator` `.b-code` `.b-code-inline` `.b-kbd` `.b-truncate` `.b-hidden` `.b-fade-in` `.b-stagger-1~4` `.b-grain` `.b-scroll` `.b-scroll-x` `.b-gap-2~8` `.b-mt-2~8` `.b-mb-2~8` `.b-p-4~8`

完整源码：[base.css](https://boom-cdn.vercel.app/themes/base.css)

---

## viewer

### keyframe-viewer（关键帧查看器）

原型图 / 流程图的逐帧讲解。

```html
<link rel="stylesheet" href="https://boom-cdn.vercel.app/viewer/keyframe-viewer.css">
<script src="https://boom-cdn.vercel.app/viewer/keyframe-viewer.js"></script>
```

前置：定义全局 `frames` 数组，DOM 中需要 `#hlRing` `#hlLabel` `.view-panel` 等元素。

骨架参考（WebFetch 可读）：https://boom-cdn.vercel.app/viewer/keyframe-viewer.html

### manifesto-viewer（宪法渲染器）

从 manifesto.json 自动生成项目宪法页面。

```bash
curl -o index.html https://boom-cdn.vercel.app/viewer/manifesto-viewer.html
# 同目录放 manifesto.json，打开 index.html 自动渲染
```

模板（WebFetch 可读）：https://boom-cdn.vercel.app/viewer/manifesto-viewer.html

### version-index（版本索引）

版本导航首页。

```bash
curl -o index.html https://boom-cdn.vercel.app/viewer/version-index.html
```

模板（WebFetch 可读）：https://boom-cdn.vercel.app/viewer/version-index.html

---

## presenter

幻灯片演示器 + 可选评论系统。

```html
<link rel="stylesheet" href="https://boom-cdn.vercel.app/presenter/presenter.css">
<script src="https://boom-cdn.vercel.app/presenter/presenter.js"></script>

<!-- 评论（可选） -->
<link rel="stylesheet" href="https://boom-cdn.vercel.app/presenter/comments.css">
<script src="https://boom-cdn.vercel.app/presenter/comments.js"></script>
```

---

## 规则

- 所有组件通过 CDN 引用，禁止复制到项目本地
- CORS 已开启，任何域名可访问
- Cache-Control: immutable
- 更新组件：改 boom-cdn 仓库 → push → Vercel 自动部署
