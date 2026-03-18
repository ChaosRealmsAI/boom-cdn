# boom-cdn — 公共组件 CDN

基础地址：`https://boom-cdn.vercel.app`

## 组件目录

| 组件 | 用途 | 引用方式 |
|------|------|---------|
| **engine** | walkthrough 讲解引擎（逐步高亮 + 动画 + 旁白） | [用法](#engine) |
| **viewer** | 关键帧查看器 + 宪法渲染器 + 版本索引 | [用法](#viewer) |
| **presenter** | 幻灯片演示器 + 评论系统 | [用法](#presenter) |
| **themes** | PPT/演示主题样式（8 套） | [用法](#themes) |

---

## engine

Walkthrough 讲解引擎。逐步高亮 + 动画 + 语音旁白 + 键盘控制。

```html
<link rel="stylesheet" href="https://boom-cdn.vercel.app/engine/engine.css">
<script src="https://boom-cdn.vercel.app/engine/engine.js"></script>
```

初始化：
```javascript
SR.init({
  steps: [{label:'标题', sub:'副标题'}, ...],
  animations: [async()=>{ SR.showScreen('s-page1'); }, ...],
  audioDir: 'audio/demo-name/',
  title: 'Demo Title',
  meta: '10 steps',
  device: 'presentation'
});
```

API：`SR.$(id)` `SR.wait(ms)` `SR.showSub(text)` `SR.playAudio(id)` `SR.glow(el)` `SR.unglow(el)` `SR.showScreen(id)` `SR.highlight(el)`

键盘：Space 播放 / ← → 翻页 / M 静音 / R 阅读模式

详细用法见 walkthrough skill。

## viewer

### keyframe-viewer（关键帧查看器）

用于原型图和流程图的逐帧讲解。

```html
<link rel="stylesheet" href="https://boom-cdn.vercel.app/viewer/keyframe-viewer.css">
<script src="https://boom-cdn.vercel.app/viewer/keyframe-viewer.js"></script>
```

前置：全局变量 `frames` 数组已定义，DOM 中有 `#hlRing` `#hlLabel` `.view-panel` 等元素。参考骨架：`https://boom-cdn.vercel.app/viewer/keyframe-viewer.html`

### manifesto-viewer（宪法渲染器）

从 `manifesto.json` 自动生成项目宪法页面。

```
下载到项目：
curl -o spec/v{X}/final/manifesto/index.html https://boom-cdn.vercel.app/viewer/manifesto-viewer.html
```

同目录放 `manifesto.json`，渲染器自动 fetch 并展示。

### version-index（版本索引）

版本导航首页，列出原型/流程图/BDD/宪法等产出。

```
curl -o spec/v{X}/final/index.html https://boom-cdn.vercel.app/viewer/version-index.html
```

## presenter

幻灯片演示器 + 评论系统。

```html
<link rel="stylesheet" href="https://boom-cdn.vercel.app/presenter/presenter.css">
<script src="https://boom-cdn.vercel.app/presenter/presenter.js"></script>

<!-- 评论（可选） -->
<link rel="stylesheet" href="https://boom-cdn.vercel.app/presenter/comments.css">
<script src="https://boom-cdn.vercel.app/presenter/comments.js"></script>
```

## themes

PPT 主题样式，8 套可选。每套包含颜色、字体、布局变量。

```html
<!-- 基础样式（必须） -->
<link rel="stylesheet" href="https://boom-cdn.vercel.app/themes/base.css">
<!-- 选一个主题 -->
<link rel="stylesheet" href="https://boom-cdn.vercel.app/themes/neo-tokyo.css">
```

可选主题：`champagne-silk` `matte-carbon` `neo-tokyo` `obsidian-velvet` `soft-pastel` `swiss-minimal` `terminal-green` `zen-ink`

预览：`https://boom-cdn.vercel.app/demo/{主题名}.html`

## 规则

- 所有组件通过 CDN 引用，禁止复制到项目本地
- CORS 已开启，任何域名可访问
- Cache-Control: immutable，浏览器永久缓存
- 更新组件：改 boom-cdn 仓库 → push → Vercel 自动部署
