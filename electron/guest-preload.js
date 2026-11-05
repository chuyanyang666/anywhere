// guest 页 preload：Alt + 左键 快速保存图片 / Ctrl+Shift+A 切换标签页
// 捕获阶段拦截点击，命中图片元素时把图片地址发回浏览器窗口
const { ipcRenderer } = require('electron');

window.addEventListener('keydown', (e) => {
  try {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && String(e.key).toLowerCase() === 'a') {
      e.preventDefault();
      e.stopPropagation();
      ipcRenderer.sendToHost('guest:tabs');
    }
  } catch (err) { /* ignore */ }
}, true);

window.addEventListener('click', (e) => {
  try {
    if (!e.altKey || e.button !== 0) return;
    const t = e.target;
    if (!t || !t.closest) return;
    let url = '';
    const img = t.closest('img');
    if (img) url = img.currentSrc || img.src || '';
    if (!url) {
      const src = t.closest('source, video');
      if (src && src.src) url = src.src;
    }
    if (!url) {
      const bg = t.closest('[style*="background"], [style*="Background"]');
      if (bg) {
        const m = (getComputedStyle(bg).backgroundImage || '').match(/url\((["']?)([^"')]+)\1\)/i);
        if (m) url = m[2];
      }
    }
    if (!url) return;
    e.preventDefault();
    e.stopPropagation();
    ipcRenderer.sendToHost('guest:alt-image', { url, pageUrl: location.href });
  } catch (err) { /* ignore */ }
}, true);
