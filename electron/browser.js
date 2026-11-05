/* ANYWHERE 内嵌浏览器（Chrome 风格窗口）交互逻辑 */
(() => {
  'use strict';

  const api = window.api || {};
  const $ = (id) => document.getElementById(id);

  const tabsEl = $('tabs');
  const viewsEl = $('views');
  const newtabEl = $('newtab');
  const ntInput = $('ntInput');
  const ntLinks = $('ntLinks');
  const urlInput = $('urlInput');
  const menuEl = $('menu');
  const panelEl = $('sidepanel');
  const spTitle = $('spTitle');
  const spList = $('spList');
  const spActions = $('spActions');
  const findbar = $('findbar');
  const findInput = $('findInput');
  const findCount = $('findCount');
  const confirmEl = $('confirm');
  const ctxmenu = $('ctxmenu');
  const toastEl = $('toast');
  const bookmarksBar = $('bookmarksBar');
  const omniSug = $('omniSug');
  const errorPage = $('errorPage');
  const errTitle = $('errTitle');
  const errDesc = $('errDesc');
  const errUrl = $('errUrl');
  const promptDlg = $('promptDlg');
  const promptTitle = $('promptTitle');
  const promptBody = $('promptBody');
  const promptInput = $('promptInput');
  const tabSwitcher = $('tabSwitcher');
  const tsInput = $('tsInput');
  const tsList = $('tsList');
  const tsCount = $('tsCount');
  const readerEl = $('reader');
  const rdBody = $('rdBody');
  const rdTitle = $('rdTitle');
  const rdScroll = $('rdScroll');

  const GROUP_COLORS = ['#8ab4f8', '#f28b82', '#fdd663', '#81c995', '#c58af9', '#78d9ec'];

  const ENGINES = {
    baidu: { label: '百度', url: (q) => `https://www.baidu.com/s?wd=${encodeURIComponent(q)}` },
    google: { label: 'Google', url: (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}` },
    bing: { label: 'Bing', url: (q) => `https://www.bing.com/search?q=${encodeURIComponent(q)}` },
  };

  const state = {
    tabs: [],
    activeId: null,
    incognito: false,
    engine: 'baidu',
    menuOpen: false,
    panel: null,
    settingsFocus: '',
    findOpen: false,
    findResults: { active: 0, total: 0 },
    bookmarks: [],
    bookmarkFolders: [],
    roleSites: [],
    roleName: '',
    guestPreload: '',
    history: [],
    downloads: [],
    creds: [],
    extensions: [],
    groups: [],
    closedTabs: [],
    settings: { home: '', restore: true, downloadDir: '', lastTabs: [] },
    dlNotified: new Set(),
    ctxTab: null,
    ctxLink: '',
    ctxTabId: null,
    sugItems: [],
    sugIndex: -1,
    tsIndex: 0,
    tsItems: [],
    tsOpenedAt: 0,
    bmFolder: '__all',
    readerFont: 18,
    reading: false,
    pausedDl: new Set(),
    user: null,
  };

  let pendingPatch = null;
  let saveTimer = null;
  let toastTimer = null;

  /* ---------- 小工具 ---------- */

  function esc(s = '') {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function safe(fn, fallback) {
    try { const v = fn(); return v === undefined ? fallback : v; } catch { return fallback; }
  }

  function hostOf(url = '') {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
  }

  // Electron 的 <webview> DOM 节点没有 isDestroyed()（那是 webContents 的方法），
  // 这里统一做安全判断，避免误调用导致导航全部抛错。
  function wvAlive(wv) {
    if (!wv) return false;
    try {
      if (typeof wv.isDestroyed === 'function') return !wv.isDestroyed();
      return !!wv.parentNode;
    } catch {
      return false;
    }
  }

  // webview 可能正处在 abort/redirect 中间态，需等它 settle 再执行 JS
  async function waitSettled(tab, ms = 800) {
    if (!tab || !wvAlive(tab.webview)) return false;
    if (!tab.loading) return true;
    await new Promise((r) => setTimeout(r, ms));
    return wvAlive(tab.webview);
  }

  function sameUrl(a = '', b = '') {
    const norm = (u) => u.replace(/\/+$/, '').replace(/#.*$/, '').toLowerCase();
    return norm(a) === norm(b);
  }

  function prettyUrl(url = '') {
    return url.replace(/\/+$/, '');
  }

  function letterOf(tab) {
    const src = tab.title && tab.title !== '新标签页' ? tab.title : hostOf(tab.url) || '·';
    return (src.trim()[0] || '·').toUpperCase();
  }

  function activeTab() {
    return state.tabs.find((t) => t.id === state.activeId) || null;
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }

  function persist(patch) {
    if (!api.storeSet) return;
    // 浏览器侧数据变更时间戳：云同步用它判断「云端 vs 本地谁更新」
    pendingPatch = Object.assign({}, pendingPatch, patch, { browserUpdatedAt: Date.now() });
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const p = pendingPatch;
      pendingPatch = null;
      Promise.resolve(api.storeSet(p)).catch(() => {});
    }, 260);
  }

  function copyText(text) {
    if (!text) return;
    try {
      navigator.clipboard.writeText(text).then(() => toast('已复制到剪贴板')).catch(() => {});
    } catch (e) { /* ignore */ }
  }

  /* ---------- 账号（与工作台账号一体化） ---------- */

  function accountName(u) {
    return (u && (u.nickname || u.email)) || '';
  }

  function renderAccount() {
    const u = state.user;
    const name = accountName(u);
    const letter = (name || '?').slice(0, 1).toUpperCase();
    const btn = $('avatarBtn');
    if (btn) {
      btn.title = u ? `${name} · 已登录` : '未登录';
      if (u && u.avatar) btn.innerHTML = `<img src="${esc(u.avatar)}" alt="" />`;
      else btn.textContent = letter;
    }
    const mAvatar = document.querySelector('#menu .mi.profile .mavatar');
    if (mAvatar) {
      if (u && u.avatar) mAvatar.innerHTML = `<img src="${esc(u.avatar)}" alt="" />`;
      else mAvatar.textContent = letter;
    }
    const mName = document.querySelector('#menu .mi.profile span:not(.mavatar)');
    if (mName) mName.textContent = u ? name : '未登录';
    const mStatus = document.querySelector('#menu .mi.profile .logged');
    if (mStatus) mStatus.textContent = u ? '已登录' : '未登录';
  }

  /* ---------- 地址解析 ---------- */

  function resolveInput(raw) {
    const s = String(raw || '').trim();
    if (!s) return null;
    if (/^(https?|file|about|view-source|data):/i.test(s)) return s;
    if (/^localhost(?::\d+)?(?:[/?#]|$)/i.test(s)) return 'http://' + s;
    if (/^[\w.-]+\.(?:[a-z]{2,}|cn|io|dev|app|me|ai|tv|org)(?::\d+)?(?:[/?#]|$)/i.test(s) && !/\s/.test(s)) {
      return 'https://' + s;
    }
    const engine = ENGINES[state.engine] || ENGINES.baidu;
    return engine.url(s);
  }

  /* ---------- 标签页 ---------- */

  function createTab(url = '') {
    const id = `t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const wv = document.createElement('webview');
    // preload 和 partition 都延后到 webview 可见后再设，避免刚 append 就并发触发 webContents load 中间态炸 Chromium
    wv.setAttribute('partition', state.incognito ? 'anywhere-incognito' : 'persist:anywhere');
    wv.hidden = true;

    const tab = {
      id,
      url: '',
      title: '新标签页',
      favicon: '',
      loading: false,
      zoom: 100,
      pinned: false,
      groupId: null,
      fail: null,
      needsRebuild: false,
      webview: wv,
    };

    state.tabs.push(tab);
    viewsEl.appendChild(wv);
    bindWebview(tab);
    state.activeId = id;

    if (url) navigate(tab, url);
    else {
      renderTabs();
      syncChrome();
      syncVisibility();
      saveSession();
      document.title = '新标签页 · ANYWHERE';
      setTimeout(() => ntInput.focus(), 40);
    }
    return tab;
  }

  function bindWebview(tab) {
    const wv = tab.webview;

    // Alt+左键快速存图：guest preload 发回图片地址
    wv.addEventListener('ipc-message', (e) => {
      if (e.channel === 'guest:alt-image') saveImageFlow(e.args && e.args[0]);
      if (e.channel === 'guest:tabs') openTabSwitcher();
    });

    wv.addEventListener('did-start-loading', () => {
      tab.loading = true;
      tab.fail = null;
      tab.translated = false;
      tab.translating = false;
      if (isActive(tab)) { hideErrorPage(); syncVisibility(); }
      renderTabs();
    });

    wv.addEventListener('did-stop-loading', () => {
      tab.loading = false;
      renderTabs();
      syncChrome();
      maybeAutoTranslate(tab);
    });

    wv.addEventListener('page-title-updated', (e) => {
      const title = (e.title || '').trim();
      if (title) tab.title = title;
      renderTabs();
      if (isActive(tab)) document.title = `${tab.title} · ANYWHERE`;
      if (!state.incognito && tab.url) {
        const hit = state.history.find((h) => sameUrl(h.url, tab.url));
        if (hit && hit.title !== tab.title) {
          hit.title = tab.title;
          persist({ history: state.history });
        }
      }
    });

    wv.addEventListener('page-favicon-updated', (e) => {
      const icons = e.favicons || [];
      if (icons.length) {
        tab.favicon = icons[icons.length - 1];
        renderTabs();
      }
    });

    wv.addEventListener('did-navigate', (e) => {
      onNavigated(tab, e.url);
    });

    wv.addEventListener('did-navigate-in-page', (e) => {
      if (e.isMainFrame) onNavigated(tab, e.url, true);
    });

    wv.addEventListener('did-fail-load', (e) => {
      if (e.errorCode === -3) {
        tab.loading = false; // 中止也要清 loading 状态，否则后续 executeJavaScript 会撞 webview 中间态
        tab.fail = null;
        renderTabs();
        syncChrome();
        return;
      }
      tab.loading = false;
      // 真正失败 → 标记「下次导航前重建」，避免复用已处在异常态的 webview 触发进程崩溃
      tab.needsRebuild = true;
      const errorText = {
        '-105': '域名无法解析，请检查网址是否正确',
        '-106': '网络连接已断开，请检查网络',
        '-102': '服务器拒绝了连接',
        '-118': '连接超时，请稍后重试',
        '-7': '页面响应超时',
        '-6': '文件不存在或无法读取',
        '-2': '页面加载失败',
      };
      const desc = errorText[String(e.errorCode)] || e.errorDescription || `网络错误 ${e.errorCode}`;
      tab.fail = { code: e.errorCode, desc: `${desc}${e.errorDescription && !errorText[String(e.errorCode)] ? '' : `（${e.errorDescription || e.errorCode}）`}`, url: e.validatedURL || tab.url };
      renderTabs();
      syncChrome();
      if (isActive(tab)) { showErrorPage(tab); syncVisibility(); }
    });

    // 页面可交互后按 origin 匹配并自动填充已保存的账号
    wv.addEventListener('dom-ready', () => {
      autofill(tab);
    });

    // guest 渲染进程被回收 / 崩溃：标记脏，下次导航重建，但不要让主窗口跟着崩
    wv.addEventListener('render-process-gone', () => {
      tab.needsRebuild = true;
      tab.loading = false;
      renderTabs();
    });
    wv.addEventListener('destroyed', () => {
      tab.needsRebuild = true;
    });

    wv.addEventListener('found-in-page', (e) => {
      if (!isActive(tab)) return;
      const r = e.result || {};
      if (r.finalUpdate === false) return;
      state.findResults = { active: r.activeMatchOrdinal || 0, total: r.matches || 0 };
      findCount.textContent = `${state.findResults.active}/${state.findResults.total}`;
    });

    wv.addEventListener('context-menu', (e) => openCtxMenu(tab, e.params || {}));

    // 兼容旧版 new-window：受管控的新窗口统一在外层窗口打开
    wv.addEventListener('new-window', (e) => {
      if (e && typeof e.preventDefault === 'function') e.preventDefault();
      if (e && e.url) createTab(e.url);
    });
  }

  function onNavigated(tab, url, inPage = false) {
    if (!url || url === 'about:blank') return;
    tab.url = url;
    tab.fail = null;
    if (isActive(tab)) hideErrorPage();
    if (!inPage) tab.title = tab.title || hostOf(url) || url;
    if (!state.incognito && !inPage) addHistory(url);
    renderTabs();
    syncChrome();
    syncVisibility();
    saveSession();
    if (state.panel === 'bookmarks') renderPanel();
  }

  function isActive(tab) {
    return tab && tab.id === state.activeId;
  }

  function navigate(tab, raw) {
    if (!tab) return;
    const url = resolveInput(raw);
    if (!url) return;

    // 稳定性优先：只有上一次加载真正出错（或被渲染进程回收）时才销毁重建 webview；
    // 正常导航直接复用，省掉 preload 重注入 + 新进程启动的开销。
    const rebuild = tab.needsRebuild || !wvAlive(tab.webview);
    if (rebuild) {
      try {
        const old = tab.webview;
        const parent = (old && old.parentNode) || viewsEl;
        if (old) {
          old.stop?.();
          old.remove();
        }
        const fresh = document.createElement('webview');
        fresh.setAttribute('partition', state.incognito ? 'anywhere-incognito' : 'persist:anywhere');
        fresh.hidden = true;
        if (state.guestPreload) fresh.setAttribute('preload', state.guestPreload);
        parent.appendChild(fresh);
        tab.webview = fresh;
        tab.needsRebuild = false;
        bindWebview(tab);
        tab.loading = false; // 重建后状态干净，did-start-loading 会重新设 true
      } catch (e) { /* ignore */ }
    }

    tab.url = url;
    tab.fail = null;
    tab.loading = true;
    if (/^view-source:/i.test(url)) tab.title = `源代码：${url.slice(12)}`;
    hideErrorPage();
    syncVisibility();
    try {
      if (rebuild) tab.webview.setAttribute('src', url);
      else tab.webview.loadURL(url);
    } catch {
      try { tab.webview.setAttribute('src', url); } catch { /* ignore */ }
    }
    renderTabs();
    syncChrome();
    saveSession();
    closeMenu();
    closeCtx();
  }

  function goHome() {
    const home = String(state.settings.home || '').trim();
    const tab = activeTab() || createTab();
    if (!tab) return;
    if (home) {
      navigate(tab, home);
      return;
    }
    tab.url = '';
    tab.title = '新标签页';
    tab.fail = null;
    hideErrorPage();
    syncVisibility();
    renderTabs();
    syncChrome();
    saveSession();
    document.title = '新标签页 · ANYWHERE';
    setTimeout(() => ntInput.focus(), 30);
  }

  function setActive(id) {
    if (state.activeId === id) {
      syncVisibility();
      return;
    }
    state.activeId = id;
    const tab = activeTab();
    document.getElementById('trPop').hidden = true;
    if (tab && tab.url) document.title = `${tab.title} · ANYWHERE`;
    else document.title = '新标签页 · ANYWHERE';
    renderTabs();
    syncChrome();
    syncVisibility();
    if (tab && tab.fail) showErrorPage(tab); else hideErrorPage();
    if (tab && !tab.url) setTimeout(() => ntInput.focus(), 40);
  }

  function closeTab(id) {
    const idx = state.tabs.findIndex((t) => t.id === id);
    if (idx < 0) return;
    const [tab] = state.tabs.splice(idx, 1);
    if (tab.url && !state.incognito) {
      state.closedTabs = [{ url: tab.url, title: tab.title, favicon: tab.favicon }, ...state.closedTabs].slice(0, 10);
    }
    try { tab.webview.remove(); } catch (e) { /* ignore */ }
    if (tab.groupId) removeEmptyGroups();

    if (state.activeId === id) {
      const next = state.tabs[idx] || state.tabs[idx - 1] || null;
      state.activeId = next ? next.id : null;
      if (!next) {
        api.winClose ? api.winClose() : null;
      }
    }
    renderTabs();
    syncChrome();
    syncVisibility();
    saveSession();
    const cur = activeTab();
    if (cur && cur.fail) showErrorPage(cur); else hideErrorPage();
  }

  function tabHtml(t) {
    const fav = t.favicon
      ? `<img src="${esc(t.favicon)}" alt="">`
      : esc(letterOf(t));
    return `<div class="tab ${t.id === state.activeId ? 'active' : ''} ${t.loading ? 'loading' : ''} ${t.pinned ? 'pinned' : ''}" data-id="${t.id}" title="${esc(t.title)}">
        <span class="fav">${fav}</span>
        <span class="ttl">${esc(t.title)}</span>
        <span class="x" data-close="${t.id}"><svg><use href="#i-x"/></svg></span>
      </div>`;
  }

  function renderTabs() {
    if (!state.tabs.length) {
      tabsEl.innerHTML = '';
      return;
    }
    const collapsed = new Set(state.groups.filter((g) => g.collapsed).map((g) => g.id));
    const renderedGroups = new Set();
    const parts = [];
    for (const t of state.tabs) {
      const group = t.groupId ? state.groups.find((g) => g.id === t.groupId) : null;
      if (group && !renderedGroups.has(group.id)) {
        renderedGroups.add(group.id);
        const isCollapsed = collapsed.has(group.id);
        const count = state.tabs.filter((x) => x.groupId === group.id).length;
        parts.push(`<button class="tg-chip" data-group="${group.id}" title="${isCollapsed ? '展开' : '折叠'}分组" style="--gc:${esc(group.color)}">
          <span class="dot"></span><span>${esc(group.name)}</span><i>${isCollapsed ? `+${count}` : '▾'}</i>
        </button>`);
      }
      if (group && collapsed.has(group.id)) continue;
      parts.push(tabHtml(t));
    }
    tabsEl.innerHTML = parts.join('');
  }

  function syncVisibility() {
    const tab = activeTab();
    for (const t of state.tabs) {
      if (!t.webview) continue;
      t.webview.hidden = !(tab && t.id === tab.id && !!t.url && !t.fail);
    }
    newtabEl.hidden = !(tab && !tab.url);
    if (!(tab && tab.url && tab.fail)) errorPage.hidden = true;
  }

  function syncChrome() {
    const tab = activeTab();
    const has = !!(tab && tab.url);
    const wv = tab && tab.webview;

    $('backBtn').disabled = !has || !safe(() => wv.canGoBack(), false);
    $('fwdBtn').disabled = !has || !safe(() => wv.canGoForward(), false);
    $('reloadBtn').disabled = false;

    if (document.activeElement !== urlInput) {
      urlInput.value = has ? prettyUrl(tab.url) : '';
    }
    const label = (ENGINES[state.engine] || ENGINES.baidu).label;
    urlInput.placeholder = `搜索 ${label} 或输入网址`;
    ntInput.placeholder = `搜索 ${label}，或输入网址`;

    const starred = has && state.bookmarks.some((b) => sameUrl(b.url, tab.url));
    $('starBtn').classList.toggle('on', !!starred);
    $('starBtn').title = starred ? '取消收藏' : '收藏此页';

    // 地址栏翻译图标（Chrome 风格）：网页可译时显示，已翻译时高亮
    const canTr = has && /^https?:/i.test(tab.url);
    $('trBtn').hidden = !canTr;
    $('trBtn').classList.toggle('on', !!(tab && tab.translated));

    $('secureIcon').innerHTML = has && /^https:/i.test(tab.url)
      ? '<svg><use href="#i-lock"/></svg>'
      : '<svg><use href="#i-search"/></svg>';

    $('omniBadge').textContent = state.incognito ? '无痕' : 'ANYWHERE';
    $('zoomVal').textContent = `${(tab && tab.zoom) || 100}%`;
  }

  /* ---------- 加载失败页 ---------- */

  function showErrorPage(tab) {
    if (!tab || !tab.fail) return;
    errTitle.textContent = '无法打开此页面';
    errDesc.textContent = tab.fail.desc || '网络连接失败，请检查网络后重试。';
    errUrl.textContent = tab.fail.url || tab.url || '';
    errorPage.hidden = false;
  }

  function hideErrorPage() {
    errorPage.hidden = true;
  }

  /* ---------- 密码自动填充 ---------- */

  async function autofill(tab) {
    if (!tab || !tab.url || state.incognito || !api.credsMatch) return;
    let origin = '';
    try { origin = new URL(tab.url).origin; } catch { return; }
    let matches = [];
    try { matches = await api.credsMatch(origin); } catch { return; }
    if (!matches || !matches.length) return;
    const c = matches[0];
    if (!c || !c.username || !c.password) return;
    const script = `(() => {
      try {
        const all = Array.from(document.querySelectorAll('input'));
        const pass = all.find((i) => i.type === 'password' && !i.value && !i.disabled) || all.find((i) => i.type === 'password' && !i.value);
        if (!pass) return false;
        const scope = pass.form || document;
        const fields = Array.from(scope.querySelectorAll('input[type="text"],input[type="email"],input[type="tel"],input:not([type])'));
        const user = fields.find((i) => !i.value && !i.disabled && (i.autocomplete === 'username' || /user|email|account|login|phone|mobile|name/i.test((i.name || '') + (i.id || '') + (i.placeholder || ''))) )
          || fields.find((i) => !i.value && !i.disabled);
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        const put = (el, val) => {
          if (!el) return;
          setter.call(el, val);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        };
        if (user) put(user, ${JSON.stringify(c.username)});
        put(pass, ${JSON.stringify(c.password)});
        return true;
      } catch (e) { return false; }
    })()`;
    try { await tab.webview.executeJavaScript(script); } catch { /* 页面可能已跳转 */ }
  }

  /* ---------- 会话 / 分组 / 提示框 ---------- */

  function sessionUrls() {
    return state.tabs.filter((t) => t.url).map((t) => t.url).slice(0, 20);
  }

  function saveSession() {
    if (state.incognito) return;
    persist({ settings: { browser: { lastTabs: sessionUrls() } } });
  }

  function removeEmptyGroups() {
    const used = new Set(state.tabs.map((t) => t.groupId).filter(Boolean));
    state.groups = state.groups.filter((g) => used.has(g.id));
  }

  function toggleGroup(groupId) {
    const g = state.groups.find((x) => x.id === groupId);
    if (!g) return;
    g.collapsed = !g.collapsed;
    if (g.collapsed) {
      const active = activeTab();
      if (active && active.groupId === g.id) {
        const target = state.tabs.find((t) => {
          if (t.id === active.id) return false;
          const tg = t.groupId ? state.groups.find((x) => x.id === t.groupId) : null;
          return !(tg && tg.collapsed);
        });
        if (target) setActive(target.id);
        else createTab();
      }
    }
    renderTabs();
    if (state.panel === 'groups') renderPanel();
  }

  function addTabToGroup(tab, groupId) {
    if (!tab) return;
    const members = state.tabs.filter((t) => t.groupId === groupId && t.id !== tab.id);
    tab.groupId = groupId;
    tab.pinned = false;
    const idx = state.tabs.indexOf(tab);
    if (idx >= 0) state.tabs.splice(idx, 1);
    let at = state.tabs.length;
    if (members.length) {
      const last = members[members.length - 1];
      const lastIdx = state.tabs.indexOf(last);
      if (lastIdx >= 0) at = lastIdx + 1;
    }
    state.tabs.splice(at, 0, tab);
    renderTabs();
    saveSession();
  }

  function askText(title, body, value = '') {
    return new Promise((resolve) => {
      promptTitle.textContent = title;
      promptBody.textContent = body;
      promptInput.value = value;
      promptDlg.classList.add('open');
      setTimeout(() => { promptInput.focus(); promptInput.select(); }, 30);
      promptDlg._resolve = resolve;
    });
  }

  function closePrompt(value) {
    const resolve = promptDlg._resolve;
    promptDlg._resolve = null;
    promptDlg.classList.remove('open');
    if (resolve) resolve(value);
  }

  async function createGroupForTab(tab) {
    if (!tab) { toast('当前没有标签页'); return; }
    const name = await askText('新建标签页分组', '给分组起一个名字，之后可在「标签页分组」里管理。', `分组 ${state.groups.length + 1}`);
    if (!name || !String(name).trim()) return;
    const group = {
      id: `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`,
      name: String(name).trim().slice(0, 20),
      color: GROUP_COLORS[state.groups.length % GROUP_COLORS.length],
      collapsed: false,
    };
    state.groups.push(group);
    addTabToGroup(tab, group.id);
    toast(`已加入分组「${group.name}」`);
  }

  /* ---------- 书签栏 ---------- */

  // 书签栏 = 当前职业身份的推荐站点 + 用户自己收藏的书签
  // 职业站点跟随工作台：切换职业后（role:changed）自动刷新
  async function loadRoleBookmarks() {
    if (!api.roleSites) return;
    try {
      const r = await api.roleSites();
      state.roleSites = Array.isArray(r && r.sites) ? r.sites : [];
      state.roleName = (r && r.roleName) || '';
      renderBookmarksBar();
    } catch (e) { /* ignore */ }
  }

  function bmBtn(b, isRole) {
    const label = b.name || b.title || hostOf(b.url) || b.url;
    const letter = (label || '·').trim()[0] || '·';
    const fav = b.favicon ? `<img src="${esc(b.favicon)}" alt="">` : esc(letter.toUpperCase());
    const tip = isRole
      ? `${esc(label)} · 职业书签（Ctrl+点击 新标签页打开）`
      : `${esc(b.title || b.url)}（Ctrl+点击 新标签页打开）`;
    return `<button class="bm ${isRole ? 'bm-role' : ''}" data-url="${esc(b.url)}" ${b.id ? `data-bmid="${esc(b.id)}"` : ''} title="${tip}">
      <span class="bm-fav">${fav}</span><span class="bm-name">${esc(label)}</span>
    </button>`;
  }

  function renderBookmarksBar() {
    const role = state.roleSites || [];
    const own = state.bookmarks || [];
    if (!role.length && !own.length) {
      bookmarksBar.hidden = true;
      bookmarksBar.innerHTML = '';
      return;
    }
    bookmarksBar.hidden = false;
    const chip = state.roleName
      ? `<span class="bm-tag" title="书签栏跟随当前工作台职业身份，切换职业自动更新">${esc(state.roleName)}</span>`
      : '';
    bookmarksBar.innerHTML = chip
      + role.slice(0, 14).map((s) => bmBtn(s, true)).join('')
      + own.slice(0, 20).map((b) => bmBtn(b, false)).join('');
  }

  /* ---------- Alt+左键快速存图 ---------- */

  async function saveImageFlow(payload) {
    const p = payload || {};
    if (!p.url) { toast('没有找到可保存的图片'); return; }
    toast('正在保存图片…');
    const tab = activeTab();
    const r = await Promise.resolve(
      api.saveImage ? api.saveImage(p.url, p.pageUrl, tab && tab.title) : { ok: false, error: '当前环境不支持' },
    ).catch((err) => ({ ok: false, error: err.message }));
    if (r && r.ok) toast(`图片已保存并加入素材库：${r.path}`);
    else toast((r && r.error) || '图片保存失败');
  }

  /* ---------- 标签页快速切换（Ctrl+Shift+A） ---------- */

  function tsMatch(tab, q) {
    if (!q) return true;
    const hay = `${tab.title || ''} ${tab.url || ''}`.toLowerCase();
    return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
  }

  function renderTabSwitcher() {
    const q = tsInput.value.trim();
    state.tsItems = state.tabs.filter((t) => tsMatch(t, q));
    if (state.tsIndex >= state.tsItems.length) state.tsIndex = Math.max(0, state.tsItems.length - 1);
    tsCount.textContent = `${state.tsItems.length}/${state.tabs.length}`;
    tsList.innerHTML = state.tsItems.length
      ? state.tsItems.map((t, i) => `<div class="ts-item ${i === state.tsIndex ? 'active' : ''}" data-tstid="${t.id}">
          <span class="ts-fav">${t.favicon ? `<img src="${esc(t.favicon)}" alt="">` : esc(letterOf(t))}</span>
          <span class="ts-txt"><span class="ts-title">${esc(t.title || '新标签页')}</span><span class="ts-host">${esc(hostOf(t.url) || '新标签页')}</span></span>
          ${t.id === state.activeId ? '<span class="ts-badge">当前</span>' : ''}
        </div>`).join('')
      : '<div class="sp-empty" style="padding:18px">没有匹配的标签页</div>';
  }

  function openTabSwitcher() {
    if (tabSwitcher.hidden) {
      tabSwitcher.hidden = false;
      state.tsOpenedAt = Date.now();
      tsInput.value = '';
      state.tsIndex = Math.max(0, state.tabs.findIndex((t) => t.id === state.activeId));
      renderTabSwitcher();
      setTimeout(() => tsInput.focus(), 30);
    } else if (Date.now() - state.tsOpenedAt > 260) {
      // 焦点在 webview 时主进程也会转发一次同样的快捷键，短时间内重复触发视为抖动
      closeTabSwitcher();
    }
  }

  function closeTabSwitcher() {
    tabSwitcher.hidden = true;
    tsInput.blur();
  }

  function pickTabSwitcher() {
    const t = state.tsItems[state.tsIndex];
    if (!t) return;
    setActive(t.id);
    closeTabSwitcher();
  }

  /* ---------- 阅读模式 ---------- */

  const READER_EXTRACT = `(() => {
    const clean = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const badTag = /^(nav|header|footer|aside|form|button|input|textarea|select|iframe|noscript)$/i;
    const candidates = [];
    const root = document.body;
    if (!root) return { title: '', blocks: [] };
    const nodes = [root, ...root.querySelectorAll('article, main, [role="main"], .article, .content, .post, #content, #article, .entry')];
    let best = null;
    let bestScore = 0;
    for (const el of nodes) {
      if (!el || !el.querySelectorAll) continue;
      let score = 0;
      const ps = el.querySelectorAll('p');
      for (const p of ps) {
        const txt = clean(p.textContent);
        if (txt.length >= 40) score += Math.min(txt.length, 400);
      }
      if (score > bestScore) { bestScore = score; best = el; }
    }
    if (!best || bestScore < 200) best = root;
    const blocks = [];
    const walker = document.createTreeWalker(best, NodeFilter.SHOW_ELEMENT, {
      acceptNode(n) {
        if (badTag.test(n.tagName)) return NodeFilter.FILTER_REJECT;
        return /^(h1|h2|h3|h4|p|li|blockquote|pre)$/i.test(n.tagName) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    let cur = walker.nextNode();
    const seen = new Set();
    while (cur && blocks.length < 400) {
      const tag = cur.tagName.toLowerCase();
      let txt = clean(cur.textContent);
      if (txt && txt.length > 1 && !seen.has(txt)) {
        seen.add(txt);
        blocks.push({ tag: tag === 'h1' ? 'h2' : tag === 'h4' ? 'h3' : tag, text: txt.slice(0, 3000) });
      }
      cur = walker.nextNode();
    }
    const t = clean((document.querySelector('h1') || {}).textContent || document.title || '');
    return { title: t, blocks, score: bestScore };
  })()`;

  async function openReader() {
    const tab = activeTab();
    if (!tab || !tab.url) { toast('当前没有可阅读的页面'); return; }
    if (readerEl.hidden) {
      toast('正在提取正文…');
      let data = null;
      try {
        data = await tab.webview.executeJavaScript(READER_EXTRACT);
      } catch (e) {
        toast('这个页面暂不支持阅读模式');
        return;
      }
      if (!data || !Array.isArray(data.blocks) || !data.blocks.length) {
        toast('没有提取到正文内容');
        return;
      }
      const keep = data.blocks.filter((b) => (b.tag === 'p' || b.tag === 'li' || b.tag === 'blockquote') ? b.text.length >= 20 : b.text.length >= 3);
      const use = keep.length ? keep : data.blocks;
      rdTitle.textContent = data.title || tab.title || '';
      rdBody.style.fontSize = `${state.readerFont}px`;
      rdBody.innerHTML = use.map((b) => {
        const tag = ['h2', 'h3', 'li', 'blockquote', 'pre'].includes(b.tag) ? b.tag : 'p';
        return `<${tag}>${esc(b.text)}</${tag}>`;
      }).join('') + `<div class="rd-note">阅读模式仅提取文字正文 · 原页面样式、图片与脚本均未加载 · 共 ${use.length} 段</div>`;
      rdScroll.scrollTop = 0;
      readerEl.hidden = false;
      state.reading = true;
      toast('已进入阅读模式');
    } else {
      closeReader();
    }
  }

  function closeReader() {
    readerEl.hidden = true;
    state.reading = false;
  }

  function readerFont(delta) {
    state.readerFont = Math.max(13, Math.min(30, state.readerFont + delta));
    rdBody.style.fontSize = `${state.readerFont}px`;
  }

  /* ---------- 地址栏建议 ---------- */

  function buildSuggestions(query) {
    const q = String(query || '').trim().toLowerCase();
    const seen = new Set();
    const out = [];
    const push = (item, kind) => {
      if (!item || !item.url || seen.has(item.url)) return;
      const title = item.title || '';
      if (q && !(title.toLowerCase().includes(q) || item.url.toLowerCase().includes(q))) return;
      seen.add(item.url);
      out.push({ url: item.url, title: title || item.url, kind });
    };
    if (q) {
      state.history.forEach((h) => push(h, '历史'));
      state.bookmarks.forEach((b) => push(b, '书签'));
    } else {
      state.history.slice(0, 5).forEach((h) => push(h, '历史'));
      state.bookmarks.slice(0, 3).forEach((b) => push(b, '书签'));
    }
    return out.slice(0, 8);
  }

  function hideSuggestions() {
    omniSug.hidden = true;
    state.sugItems = [];
    state.sugIndex = -1;
  }

  function renderSuggestions() {
    if (!state.sugItems.length) {
      hideSuggestions();
      return;
    }
    omniSug.innerHTML = state.sugItems.map((s, i) => `<button class="sug-row ${i === state.sugIndex ? 'sel' : ''}" data-sidx="${i}" data-url="${esc(s.url)}">
        <span class="sug-ic"><svg><use href="${s.kind === '书签' ? '#i-star' : '#i-history'}"/></svg></span>
        <span class="sug-t">${esc(s.title)}</span>
        <span class="sug-u">${esc(s.url)}</span>
        <span class="sug-kind">${s.kind}</span>
      </button>`).join('');
    const c = viewsEl.getBoundingClientRect();
    const r = $('omnibox').getBoundingClientRect();
    omniSug.style.left = `${Math.max(6, r.left - c.left)}px`;
    omniSug.style.top = '6px';
    omniSug.style.width = `${Math.max(260, r.width)}px`;
    omniSug.hidden = false;
  }

  function showSuggestions() {
    state.sugItems = buildSuggestions(urlInput.value);
    state.sugIndex = -1;
    renderSuggestions();
  }

  function pickSuggestion(index) {
    const s = state.sugItems[index];
    if (!s) return;
    const tab = activeTab() || createTab();
    if (tab) navigate(tab, s.url);
    hideSuggestions();
    urlInput.blur();
  }

  /* ---------- 历史 / 书签 / 下载 ---------- */

  function addHistory(url) {
    state.history = [{ url, title: hostOf(url) || url, time: Date.now() }, ...state.history.filter((h) => !sameUrl(h.url, url))]
      .slice(0, 300);
    persist({ history: state.history });
  }

  function toggleStar() {
    const tab = activeTab();
    if (!tab || !tab.url) {
      toast('当前是新标签页，无法收藏');
      return;
    }
    const i = state.bookmarks.findIndex((b) => sameUrl(b.url, tab.url));
    if (i >= 0) {
      state.bookmarks.splice(i, 1);
      toast('已取消收藏');
    } else {
      state.bookmarks.unshift({
        id: `b${Date.now().toString(36)}`,
        title: tab.title || hostOf(tab.url) || tab.url,
        url: tab.url,
        domain: hostOf(tab.url),
        favicon: tab.favicon || '',
        time: Date.now(),
      });
      toast('已添加到书签');
    }
    persist({ bookmarks: state.bookmarks });
    syncChrome();
    renderBookmarksBar();
    if (state.panel === 'bookmarks') renderPanel();
  }

  function removeBookmark(id) {
    state.bookmarks = state.bookmarks.filter((b) => b.id !== id);
    persist({ bookmarks: state.bookmarks });
    renderBookmarksBar();
    if (state.panel === 'bookmarks' || state.panel === 'settings') renderPanel();
    syncChrome();
    toast('已移除书签');
  }

  /* ---------- 侧边面板 ---------- */

  function openPanel(kind) {
    state.panel = kind;
    closeMenu();
    closeCtx();
    panelEl.classList.add('open');
    renderPanel();
  }

  function closePanel() {
    state.panel = null;
    panelEl.classList.remove('open');
  }

  async function refreshCreds() {
    if (!api.credsList) return;
    try { state.creds = (await api.credsList()) || []; } catch { state.creds = []; }
  }

  async function refreshExtensions() {
    if (!api.listExtensions) return;
    try { state.extensions = (await api.listExtensions()) || []; } catch { state.extensions = []; }
  }

  function openSettings(focus = '') {
    state.settingsFocus = focus;
    openPanel('settings');
    Promise.all([refreshCreds(), refreshExtensions()]).then(() => {
      if (state.panel === 'settings') {
        renderPanel();
        setTimeout(() => {
          const sec = spList.querySelector(`[data-sec="${focus || 'engine'}"]`);
          if (sec) sec.scrollIntoView({ block: 'start' });
        }, 20);
      }
    });
  }

  function settingsHtml() {
    const engineOpts = Object.entries(ENGINES).map(([key, e]) =>
      `<option value="${key}" ${state.engine === key ? 'selected' : ''}>${e.label}</option>`).join('');
    const dirText = state.settings.downloadDir || '系统默认下载目录';
    const credRows = state.creds.length
      ? state.creds.map((c) => `<div class="cred-row">
          <div class="ci-main"><b>${esc(c.origin)}</b><span>${esc(c.username)}</span></div>
          <button class="row-x" data-credid="${esc(c.id)}" title="删除账号"><svg><use href="#i-x"/></svg></button>
        </div>`).join('')
      : '<div class="sp-empty" style="padding:10px 0">暂无已保存的账号</div>';
    const extRows = state.extensions.length
      ? state.extensions.map((x) => `<div class="ext-row">
          <div class="ci-main"><b>${esc(x.name)}</b><span>${esc(x.version || '')} · ${esc(x.path || '')}</span></div>
          <button class="row-x" data-extid="${esc(x.id)}" title="移除扩展"><svg><use href="#i-x"/></svg></button>
        </div>`).join('')
      : '<div class="sp-empty" style="padding:10px 0">尚未加载任何扩展</div>';

    return `
      <div class="set-sec" data-sec="engine">
        <h4>默认搜索引擎</h4>
        <select id="setEngine">${engineOpts}</select>
      </div>
      <div class="set-sec" data-sec="home">
        <h4>主页</h4>
        <div class="set-line">
          <input type="text" id="setHome" placeholder="留空则使用新标签页" value="${esc(state.settings.home || '')}" />
          <button id="setHomeSave">保存</button>
        </div>
      </div>
      <div class="set-sec" data-sec="restore">
        <h4>启动</h4>
        <label class="set-toggle"><input type="checkbox" id="setRestore" ${state.settings.restore ? 'checked' : ''} /> 重新打开窗口时恢复上次未关闭的标签页</label>
      </div>
      <div class="set-sec" data-sec="download">
        <h4>下载目录</h4>
        <div class="set-path">${esc(dirText)}</div>
        <button class="set-btn" id="setPickDir">更改</button>
      </div>
      <div class="set-sec" data-sec="password">
        <h4>密码和自动填充</h4>
        <p class="set-note">密码由系统 safeStorage 加密后保存在本机，不会明文落盘。仅支持手动添加，不监听网页表单提交；打开页面时会按站点自动填充已保存的账号。同一站点有多个账号时，只自动填充最近保存的一条。</p>
        ${credRows}
        <div class="set-form">
          <input type="text" id="credSite" placeholder="站点，如 https://example.com" />
          <input type="text" id="credUser" placeholder="用户名" />
          <input type="password" id="credPass" placeholder="密码" />
          <button class="set-btn primary" id="credAdd">添加账号</button>
        </div>
      </div>
      <div class="set-sec" data-sec="extensions">
        <h4>扩展程序</h4>
        <p class="set-note">只支持未打包的 Chrome 扩展（选择含 manifest.json 的文件夹）；Electron 不支持 Chrome 应用商店，无法安装商店扩展。</p>
        ${extRows}
        <button class="set-btn" id="extLoad">加载本地扩展</button>
      </div>
      <div class="set-sec" data-sec="data">
        <h4>删除浏览数据</h4>
        <label class="set-check"><input type="checkbox" id="clrCache" checked /> 缓存文件</label>
        <label class="set-check"><input type="checkbox" id="clrCookies" checked /> Cookie 及站点数据</label>
        <label class="set-check"><input type="checkbox" id="clrHistory" checked /> 历史记录</label>
        <label class="set-check"><input type="checkbox" id="clrDownloads" checked /> 下载记录</label>
        <label class="set-check"><input type="checkbox" id="clrBookmarks" /> 书签</label>
        <div class="set-actions"><button class="set-btn" id="clearDataNow">删除所选数据</button></div>
      </div>`;
  }

  function renderPanel() {
    if (!state.panel) return;
    panelEl.classList.toggle('wide', state.panel === 'settings');
    spActions.hidden = true;
    spActions.innerHTML = '';

    if (state.panel === 'history') {
      spTitle.textContent = '历史记录';
      const rows = state.history.slice(0, 60);
      spList.innerHTML = rows.length
        ? rows.map((h) => `<div class="sp-row" data-url="${esc(h.url)}">
            <span class="t">${esc(h.title || h.url)}</span>
            <span class="u">${esc(h.url)}</span>
          </div>`).join('')
        : '<div class="sp-empty">暂无历史记录<br>浏览的网页会显示在这里</div>';
      spActions.hidden = !state.history.length;
      spActions.innerHTML = state.history.length ? '<button data-spact="clearHistory">清空历史记录</button>' : '';
      return;
    }

    if (state.panel === 'downloads') {
      spTitle.textContent = '下载内容';
      const rows = state.downloads.slice(0, 30);
      spList.innerHTML = rows.length
        ? rows.map((d) => {
          const total = d.total > 0 ? d.total : 0;
          const pct = total ? Math.min(100, Math.round((d.received / total) * 100)) : 0;
          const paused = state.pausedDl.has(d.id);
          const stateText = d.state === 'completed' ? '已完成'
            : d.state === 'cancelled' ? '已取消'
              : d.state === 'interrupted' ? '已中断'
                : paused ? `已暂停 · ${pct}%` : `${pct}%`;
          const actions = [
            d.state === 'completed' && d.path ? `<button data-dlopen="${esc(d.path)}">打开文件</button>` : '',
            d.state === 'completed' && d.path ? `<button data-dlshow="${esc(d.path)}">打开所在文件夹</button>` : '',
            d.state === 'progressing' ? `<button data-dl${paused ? 'resume' : 'pause'}="${esc(d.id)}">${paused ? '继续' : '暂停'}</button>` : '',
            d.state === 'progressing' ? `<button class="warn" data-dlcancel="${esc(d.id)}">取消下载</button>` : '',
          ].filter(Boolean).join('');
          return `<div class="sp-row dl-row">
            <span class="t">${esc(d.filename || '未命名文件')}</span>
            <span class="u">${esc(stateText)} · ${esc(hostOf(d.url) || d.url || '')}</span>
            ${d.state === 'progressing' ? `<span class="bar"><i style="width:${pct}%"></i></span>` : ''}
            ${actions ? `<div class="dl-actions">${actions}</div>` : ''}
          </div>`;
        }).join('')
        : '<div class="sp-empty">暂无下载内容<br>在网页中下载的文件会显示在这里</div>';
      spActions.hidden = !state.downloads.length;
      spActions.innerHTML = state.downloads.length ? '<button data-spact="clearDownloads">清空下载记录</button>' : '';
      return;
    }

    if (state.panel === 'bookmarks') {
      spTitle.textContent = '书签和清单';
      const folders = [...new Set([...state.bookmarkFolders, ...state.bookmarks.map((b) => b.folder).filter(Boolean)])];
      const cur = state.bmFolder;
      const visible = state.bookmarks.filter((b) => (
        cur === '__all' ? true : cur === '__none' ? !b.folder : b.folder === cur
      ));
      const tabs = [
        `<button class="bm-tab ${cur === '__all' ? 'on' : ''}" data-bmf="__all">全部 ${state.bookmarks.length}</button>`,
        `<button class="bm-tab ${cur === '__none' ? 'on' : ''}" data-bmf="__none">未分类</button>`,
        ...folders.map((f) => `<button class="bm-tab ${cur === f ? 'on' : ''}" data-bmf="${esc(f)}">${esc(f)}</button>`),
      ].join('');
      const rowsHtml = visible.length
        ? visible.slice(0, 120).map((b) => `<div class="sp-row bm-row" draggable="true" data-bmid="${esc(b.id)}" data-url="${esc(b.url)}">
            <span class="bm-grip" title="拖动排序"><svg><use href="#i-grip"/></svg></span>
            <span class="t">${esc(b.title || b.url)}</span>
            <span class="u">${esc(hostOf(b.url) || b.url)}</span>
            <select class="bm-folder" data-bmfsel="${esc(b.id)}" title="移动到文件夹">
              <option value="" ${b.folder ? '' : 'selected'}>未分类</option>
              ${folders.map((f) => `<option value="${esc(f)}" ${b.folder === f ? 'selected' : ''}>${esc(f)}</option>`).join('')}
            </select>
            <button class="sp-del" data-bmid="${esc(b.id)}" title="移除书签"><svg><use href="#i-x"/></svg></button>
          </div>`).join('')
        : '<div class="sp-empty">这个分类下还没有书签<br>点击地址栏右侧的星标即可收藏当前页面</div>';
      spList.innerHTML = `<div class="bm-tabs">${tabs}</div>${rowsHtml}`;
      spActions.hidden = false;
      spActions.innerHTML = '<button data-spact="bmNewFolder">新建文件夹</button>';
      return;
    }

    if (state.panel === 'groups') {
      spTitle.textContent = '标签页分组';
      const rows = state.groups.map((g) => {
        const count = state.tabs.filter((t) => t.groupId === g.id).length;
        return `<div class="group-row">
          <span class="group-dot" style="background:${esc(g.color)}"></span>
          <div class="ci-main"><b>${esc(g.name)}</b><span>${count} 个标签 · ${g.collapsed ? '已折叠' : '已展开'}</span></div>
          <button class="row-btn" data-gact="toggle" data-gid="${g.id}">${g.collapsed ? '展开' : '折叠'}</button>
          <button class="row-x" data-gact="remove" data-gid="${g.id}" title="移除分组"><svg><use href="#i-x"/></svg></button>
        </div>`;
      }).join('');
      spList.innerHTML = rows || '<div class="sp-empty">暂无分组<br>右键任意标签页，选择「加入新分组」。</div>';
      spActions.hidden = !state.tabs.length;
      spActions.innerHTML = state.tabs.length ? '<button data-spact="groupAddCurrent">将当前标签加入新分组</button>' : '';
      return;
    }

    if (state.panel === 'tools') {
      spTitle.textContent = '更多工具';
      spList.innerHTML = `
        <div class="tool-row" data-tool="devtools"><svg><use href="#i-tools"/></svg><div class="tt"><b>开发者工具</b><span>对当前页面打开分离式 DevTools</span></div><em>打开</em></div>
        <div class="tool-row" data-tool="source"><svg><use href="#i-search"/></svg><div class="tt"><b>查看页面源代码</b><span>在新标签页打开 view-source:</span></div><em>打开</em></div>
        <div class="tool-row" data-tool="pdf"><svg><use href="#i-print"/></svg><div class="tt"><b>保存页面为 PDF</b><span>按 A4 打印当前页面并选择保存位置</span></div><em>保存</em></div>
        <div class="tool-row" data-tool="copy"><svg><use href="#i-share"/></svg><div class="tt"><b>复制页面链接</b><span>把当前页面地址复制到剪贴板</span></div><em>复制</em></div>`;
      return;
    }

    if (state.panel === 'share') {
      spTitle.textContent = '保存和分享';
      const hasPage = !!(activeTab() && activeTab().url);
      spList.innerHTML = `
        <div class="tool-row" data-tool="pdf"><svg><use href="#i-print"/></svg><div class="tt"><b>保存页面为 PDF</b><span>${hasPage ? '当前页面可保存为 PDF' : '当前没有打开的页面'}</span></div><em>保存</em></div>
        <div class="tool-row" data-tool="copy"><svg><use href="#i-share"/></svg><div class="tt"><b>复制链接</b><span>复制当前页面地址</span></div><em>复制</em></div>
        <div class="tool-row" data-tool="exportBookmarks"><svg><use href="#i-star"/></svg><div class="tt"><b>导出书签为 HTML</b><span>生成可导入其他浏览器的书签文件</span></div><em>导出</em></div>`;
      return;
    }

    if (state.panel === 'settings') {
      spTitle.textContent = '设置';
      spList.innerHTML = settingsHtml();
      return;
    }
  }

  /* ---------- 查找 ---------- */

  function openFind() {
    if (!activeTab() || !activeTab().url) {
      toast('当前页面无法查找');
      return;
    }
    state.findOpen = true;
    findbar.classList.add('open');
    setTimeout(() => { findInput.focus(); findInput.select(); }, 20);
    if (findInput.value) doFind(true, false);
  }

  function closeFind() {
    state.findOpen = false;
    findbar.classList.remove('open');
    const wv = activeTab() && activeTab().webview;
    try { wv.stopFindInPage('clearSelection'); } catch (e) { /* ignore */ }
    findCount.textContent = '0/0';
    state.findResults = { active: 0, total: 0 };
  }

  function doFind(forward = true, findNext = false) {
    const wv = activeTab() && activeTab().webview;
    if (!wv) return;
    const text = findInput.value;
    if (!text) {
      try { wv.stopFindInPage('clearSelection'); } catch (e) { /* ignore */ }
      findCount.textContent = '0/0';
      return;
    }
    try { wv.findInPage(text, { forward, findNext }); } catch (e) { /* ignore */ }
  }

  /* ---------- 菜单 ---------- */

  function openMenu() {
    state.menuOpen = true;
    closeCtx();
    menuEl.classList.add('open');
  }

  function closeMenu() {
    state.menuOpen = false;
    menuEl.classList.remove('open');
  }

  function toggleMenu() {
    if (state.menuOpen) closeMenu(); else openMenu();
  }

  function setZoom(delta) {
    const tab = activeTab();
    if (!tab) return;
    const next = Math.max(25, Math.min(300, (tab.zoom || 100) + delta));
    tab.zoom = next;
    try { tab.webview.setZoomFactor(next / 100); } catch (e) { /* ignore */ }
    $('zoomVal').textContent = `${next}%`;
  }

  function printPage() {
    const wv = activeTab() && activeTab().webview;
    if (!wv || !activeTab().url) {
      toast('当前没有可打印的页面');
      return;
    }
    try { wv.print(); } catch (e) { toast('当前页面不支持打印'); }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      document.documentElement.requestFullscreen().catch(() => toast('无法进入全屏'));
    }
  }

  function pageWcId(tab) {
    if (!tab || !tab.webview) return null;
    try { return tab.webview.getWebContentsId(); } catch { return null; }
  }

  // ---- 网页翻译：在页面内直接替换文字，不依赖第三方整页代理（百度/微软代理经常抓不到目标页） ----
  const TR_BATCH = 900;    // 单次请求最大字符数（走主进程网络栈，批量更大）
  const TR_LIMIT = 12000;  // 单页最多翻译字符数

  function trCollectScript(limit) {
    return `(function (limit) {
      if (window.__anyTranslate) return { segs: [] };
      const SKIP = new Set(['SCRIPT','STYLE','NOSCRIPT','CODE','PRE','TEXTAREA','INPUT','SELECT','OPTION','BUTTON','SVG','CANVAS','IFRAME','VIDEO','AUDIO','MATH']);
      const nodes = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        const s = n.nodeValue;
        if (!s || !s.trim() || s.length > 4000) continue;
        const p = n.parentElement;
        if (!p || SKIP.has(p.tagName)) continue;
        if (p.closest('[contenteditable="true"], [translate="no"], .notranslate')) continue;
        if (!/[A-Za-z]{2}/.test(s)) continue;
        const cs = getComputedStyle(p);
        if (cs.display === 'none' || cs.visibility === 'hidden') continue;
        if (!p.getClientRects().length) continue;
        nodes.push({ node: n, text: s });
      }
      const segs = [];
      const map = [];
      const orig = [];
      let total = 0;
      for (let i = 0; i < nodes.length; i += 1) {
        const text = nodes[i].text;
        const core = text.trim();
        const parts = [];
        let rest = core;
        while (rest.length > 450) {
          let cut = rest.lastIndexOf('.', 450);
          if (cut < 200) cut = rest.lastIndexOf(' ', 450);
          if (cut < 120) cut = 450;
          parts.push(rest.slice(0, cut + 1));
          rest = rest.slice(cut + 1);
        }
        if (rest) parts.push(rest);
        const need = parts.reduce((a, b) => a + b.length, 0);
        if (total + need > limit) break;
        orig.push(text);
        // 分段结果都写回同一个文本节点，长段落翻译后再拼接
        parts.forEach((p) => { segs.push({ text: p }); map.push(i); });
        total += need;
      }
      if (!segs.length) return { segs, count: 0, chars: total };
      window.__anyTranslate = {
        nodes: nodes.slice(0, orig.length).map((x) => x.node),
        orig,
        map,
        apply(list) {
          if (!Array.isArray(list)) return false;
          const buf = {};
          list.forEach((t, k) => {
            if (typeof t !== 'string') return;
            const i = this.map[k];
            (buf[i] = buf[i] || []).push(t);
          });
          this.nodes.forEach((node, i) => {
            if (!buf[i]) return;
            const o = this.orig[i];
            const lead = o.match(/^\\s*/)[0];
            const tail = o.match(/\\s*$/)[0];
            node.nodeValue = lead + buf[i].join('') + tail;
          });
          return true;
        },
        restore() {
          this.nodes.forEach((node, i) => { node.nodeValue = this.orig[i]; });
          try { delete window.__anyTranslate; } catch (e) {}
        },
      };
      return { segs, count: segs.length, chars: total, map, nodes: orig.length };
    })(${limit})`;
  }

  // 翻译请求走主进程网络栈（系统代理、无 CORS、连接复用），旧版本无此 API 时退回渲染层 fetch
  async function trFetch(url, opts = {}) {
    if (api.trFetch) {
      const r = await api.trFetch(url, opts);
      if (r && r.error) throw new Error(r.error);
      if (!r || !r.ok) throw new Error(`HTTP ${(r && r.status) || 0}`);
      return r.text;
    }
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  async function trRequest(text, from, to) {
    const out = await trFetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
    const json = JSON.parse(out);
    const t = json && json.responseData && json.responseData.translatedText;
    if (typeof t !== 'string' || !t.trim()) throw new Error('翻译服务返回空结果');
    if (/MYMEMORY WARNING|QUOTA|INVALID/i.test(t)) throw new Error(t.slice(0, 80));
    return t;
  }

  // ---- 翻译引擎：优先微软 Edge（国内快且稳，批量接口精准回填），可达时用谷歌，最后兜底 MyMemory ----
  let trProvider = '';
  let trToken = { v: '', exp: 0 };

  // 各引擎语言码映射（内部统一用 Edge 的码：zh-Hans/zh-Hant/en/ja/ko/fr/de/ru/es）
  const G_TL = { 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW' };
  const MM_TL = { 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW' };
  const mmCode = (c) => MM_TL[c] || c;

  async function trEdgeToken() {
    if (trToken.v && Date.now() < trToken.exp) return trToken.v;
    if (trToken.dead && Date.now() < trToken.exp) throw new Error('edge auth unavailable');
    try {
      const t = await trFetch('https://edge.microsoft.com/translate/auth', { timeout: 8000 });
      const v = String(t).trim();
      if (!v) throw new Error('edge auth empty');
      trToken = { v, exp: Date.now() + 8 * 60 * 1000 };
      return v;
    } catch (e) {
      trToken = { dead: true, exp: Date.now() + 60 * 1000 }; // 短负缓存，避免每批都撞失败端点
      throw e;
    }
  }

  async function trEdge(lines, from, to) {
    const token = await trEdgeToken();
    const f = from && from !== 'auto' ? `&from=${from}` : '';
    const out = await trFetch(`https://api-edge.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${to}${f}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(lines.map((t) => ({ Text: t }))),
    });
    const j = JSON.parse(out);
    return (Array.isArray(j) ? j : []).map((x) => (x && x.translations && x.translations[0] && x.translations[0].text) || '');
  }

  async function trGoogle(lines, from, to) {
    const q = lines.join('\n');
    const out = await trFetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${G_TL[to] || to}&dt=t&q=${encodeURIComponent(q)}`);
    const j = JSON.parse(out);
    const txt = ((j && j[0]) || []).map((x) => (x && x[0]) || '').join('');
    const arr = String(txt).split('\n');
    if (arr.length !== lines.length) throw new Error('google line mismatch');
    return arr;
  }

  async function trMyMemory(lines, from, to) {
    const f = from === 'auto' ? 'en' : mmCode(from);
    const out = await trFetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(lines.join('\n'))}&langpair=${f}|${mmCode(to)}`);
    const j = JSON.parse(out);
    const t = j && j.responseData && j.responseData.translatedText;
    if (typeof t === 'string' && t.trim() && !/MYMEMORY WARNING|QUOTA|INVALID/i.test(t)) {
      const arr = t.split('\n');
      if (arr.length === lines.length) return arr;
    }
    const res = [];
    for (const line of lines) {
      try { res.push(await trRequest(line, f, mmCode(to))); } catch (e) { res.push(line); }
    }
    return res;
  }

  // 腾讯交互翻译：国内可达、免 key，text_list 数组进出，精准回填（首选引擎）
  const TM_TL = { 'zh-Hans': 'zh', 'zh-Hant': 'zh-TW' };
  const TM_SRC = { zh: 'zh-Hans', 'zh-TW': 'zh-Hant' };
  async function trTencent(lines, from, to) {
    const out = await trFetch('https://transmart.qq.com/api/imt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        header: { fn: 'auto_translation', session: '', client_key: 'browser_chromium-Win10-x64-131.0.0.0', user: '' },
        source: { text_list: lines, lang: from === 'auto' ? 'auto' : TM_TL[from] || from },
        target: { lang: TM_TL[to] || to },
      }),
    });
    const j = JSON.parse(out);
    const arr = j && j.auto_translation;
    if (!Array.isArray(arr) || arr.length !== lines.length) throw new Error(`tencent bad result ${(j && j.ret_code) || ''}`);
    return arr.map((x) => (typeof x === 'string' ? x : ''));
  }

  const TR_CHAIN = [
    ['tencent', trTencent],
    ['edge', trEdge],
    ['google', trGoogle],
    ['mymemory', trMyMemory],
  ];

  async function trLines(lines, from, to) {
    const order = trProvider
      ? [...TR_CHAIN.filter(([n]) => n === trProvider), ...TR_CHAIN.filter(([n]) => n !== trProvider)]
      : TR_CHAIN;
    let lastErr = null;
    for (const [name, fn] of order) {
      try {
        const out = await fn(lines, from, to);
        if (Array.isArray(out) && out.length === lines.length && out.some((x) => x && x.trim())) {
          trProvider = name;
          return out;
        }
        throw new Error(`${name} bad result`);
      } catch (e) {
        lastErr = e;
        if (trProvider === name) trProvider = '';
      }
    }
    throw lastErr || new Error('没有可用的翻译引擎');
  }

  // 语言检测：优先 Edge detect 接口，失败用字符正则兜底
  async function trDetect(text) {
    const sample = (text || '').slice(0, 400).trim();
    if (!sample) return 'en';
    try {
      const token = await trEdgeToken();
      const out = await trFetch('https://api-edge.cognitive.microsofttranslator.com/detect?api-version=3.0', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ Text: sample }]),
      });
      const j = JSON.parse(out);
      const lang = j && j[0] && j[0].language;
      if (lang) return lang;
    } catch (e) { /* fallback below */ }
    // Edge 不可用时用腾讯 transmart 的自动检测结果
    try {
      const out = await trFetch('https://transmart.qq.com/api/imt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          header: { fn: 'auto_translation', session: '', client_key: 'browser_chromium-Win10-x64-131.0.0.0', user: '' },
          source: { text_list: [sample.slice(0, 200)], lang: 'auto' },
          target: { lang: 'zh' },
        }),
      });
      const j = JSON.parse(out);
      const src = j && j.src_lang;
      if (src) return TM_SRC[src] || src;
    } catch (e) { /* regex fallback below */ }
    const zh = (sample.match(/[\u4e00-\u9fff]/g) || []).length;
    const ja = (sample.match(/[\u3040-\u30ff]/g) || []).length;
    const ko = (sample.match(/[\uac00-\ud7af]/g) || []).length;
    const n = sample.length || 1;
    if (ja / n > 0.06) return 'ja';
    if (ko / n > 0.06) return 'ko';
    if (zh / n > 0.1) return 'zh-Hans';
    return 'en';
  }

  async function translatePage(from, to) {
    const tab = activeTab();
    const wv = tab && tab.webview;
    if (!tab || !tab.url || !/^https?:/i.test(tab.url) || !wv) { toast('当前页面不支持翻译'); return; }
    if (tab.translating) return;
    if (!await waitSettled(tab, 600)) { toast('页面尚未就绪，请稍后再试'); return; }
    if (tab.translated) {
      await wv.executeJavaScript('window.__anyTranslate && window.__anyTranslate.restore()').catch(() => {});
      tab.translated = false;
      toast('已恢复网页原文');
      return;
    }
    const dst = to || 'zh-Hans';
    tab.translating = true;
    const alive = () => wvAlive(tab.webview) && state.tabs.includes(tab);
    const cleanup = () => { clearTimeout(applyTimer); tab.translating = false; };
    toast('正在翻译网页…');
    let applyTimer = null;
    try {
      if (!alive()) throw new Error('webview 已销毁');
      const plan = await wv.executeJavaScript(trCollectScript(TR_LIMIT)).catch(() => null);
      if (!plan || !plan.segs || !plan.segs.length) { toast('没有找到需要翻译的文字'); return; }
      const src = from || 'auto';
      // 按长度合批，用换行分隔，返回时按行回填
      const batches = [];
      let cur = [];
      let len = 0;
      plan.segs.forEach((s, idx) => {
        if (cur.length && (len + s.text.length + 1 > TR_BATCH || cur.length >= 16)) {
          batches.push(cur);
          cur = [];
          len = 0;
        }
        cur.push(idx);
        len += s.text.length + 1;
      });
      if (cur.length) batches.push(cur);

      const result = new Array(plan.segs.length);
      const segsDone = new Array(plan.segs.length).fill(false);
      let failedSegs = 0;
      let cursor = 0;
      let finished = 0;
      let lastApply = 0;
      // 只回填「整个文本节点已全部译完」的段落，避免长句先显示半截
      const applyNow = () => {
        if (!alive()) return Promise.resolve(false);
        const snap = result.map((v, k) => (segsDone[k] ? v : undefined));
        return wv.executeJavaScript(`window.__anyTranslate && window.__anyTranslate.apply(${JSON.stringify(snap)})`).catch(() => false);
      };
      const scheduleApply = () => {
        if (!alive()) return;
        if (Date.now() - lastApply > 400) { lastApply = Date.now(); applyNow(); return; }
        clearTimeout(applyTimer);
        applyTimer = setTimeout(() => { lastApply = Date.now(); applyNow(); }, 420);
      };
      const runBatch = async () => {
        while (cursor < batches.length) {
          if (!alive()) break;
          const idxs = batches[cursor++];
          let lines;
          try {
            lines = await trLines(idxs.map((i) => plan.segs[i].text), src, dst);
          } catch (e) {
            await new Promise((r) => setTimeout(r, 350)); // 瞬时限流时稍候重试一次
            try { lines = await trLines(idxs.map((i) => plan.segs[i].text), src, dst); } catch (e2) { lines = idxs.map((i) => plan.segs[i].text); failedSegs += idxs.length; }
          }
          idxs.forEach((i, k) => { result[i] = lines[k]; segsDone[i] = true; });
          finished += 1;
          if (finished === 1) { lastApply = Date.now(); applyNow(); }
          else scheduleApply();
          if (finished % 4 === 0 || finished === batches.length) toast(`正在翻译网页 ${finished}/${batches.length}…`);
        }
      };
      await Promise.all(Array.from({ length: Math.min(6, batches.length) }, runBatch));
      if (!alive()) return; // 用户切走/关 tab，静默放弃结果
      clearTimeout(applyTimer);
      const ok = await applyNow();
      if (!ok) throw new Error('写入翻译失败');
      if (failedSegs >= result.length) throw new Error('全部翻译服务不可用');
      tab.translated = true;
      tab.translatedTo = dst;
      toast(failedSegs
        ? `已翻译（${result.length - failedSegs}/${result.length} 段成功）`
        : `已翻译成${TR_NAMES[dst] || dst}，共 ${result.length} 段文字`);
    } catch (e) {
      toast(e && e.message === '全部翻译服务不可用' ? '翻译服务暂时都不可用，请稍后重试' : '网页翻译失败，请检查网络后重试');
    } finally {
      cleanup();
    }
  }

  /* ---------- 翻译气泡（Chrome 风格：语言选择 + 一律翻译 + 站点黑名单） ---------- */
  const TR_NAMES = {
    auto: '自动检测', 'zh-Hans': '中文（简体）', 'zh-Hant': '中文（繁体）',
    en: '英语', ja: '日语', ko: '韩语', fr: '法语', de: '德语', ru: '俄语', es: '西班牙语',
  };
  const TR_SRC_LANGS = ['auto', 'en', 'ja', 'ko', 'fr', 'de', 'ru', 'es', 'zh-Hans'];
  const TR_DST_LANGS = ['zh-Hans', 'zh-Hant', 'en', 'ja', 'ko', 'fr', 'de', 'ru', 'es'];
  let trPopTabId = -1;

  function trNeverHosts() {
    const b = state.settings && state.settings.browser;
    return (b && Array.isArray(b.noTranslateHosts)) ? b.noTranslateHosts : [];
  }
  function trAutoCfg() {
    const b = state.settings && state.settings.browser;
    return (b && b.autoTranslate && b.autoTranslate.lang) ? b.autoTranslate : null;
  }

  function updateTrPop(tab, lang) {
    const srcSel = document.getElementById('trSrc');
    const dstSel = document.getElementById('trDst');
    const auto = trAutoCfg();
    document.getElementById('trAlwaysLang').textContent = TR_NAMES[lang] || lang || '英语';
    document.getElementById('trAlways').checked = !!(auto && auto.lang === lang && auto.to === dstSel.value);
    document.getElementById('trRevert').hidden = !tab.translated;
    const go = document.getElementById('trGo');
    go.textContent = tab.translated ? `翻译成${TR_NAMES[dstSel.value] || dstSel.value}` : '翻译';
    go.disabled = !!lang && lang === dstSel.value;
    go.title = go.disabled ? '原文已是该语言' : '';
    if (auto && auto.lang === lang) document.getElementById('trAlwaysRow').title = `已开启：加载${TR_NAMES[lang]}网页时自动翻译`;
    else document.getElementById('trAlwaysRow').title = '';
  }

  async function openTrPopup() {
    const tab = activeTab();
    if (!tab || !tab.url || !/^https?:/i.test(tab.url)) { toast('当前页面不支持翻译'); return; }
    if (tab.loading) { toast('页面仍在加载，请稍后再试'); return; }
    const host = hostOf(tab.url);
    if (trNeverHosts().includes(host)) { toast('该网站已设为一律不翻译，可到菜单「设置」里恢复'); return; }
    const pop = document.getElementById('trPop');
    const srcSel = document.getElementById('trSrc');
    const dstSel = document.getElementById('trDst');
    if (!srcSel.options.length) {
      srcSel.innerHTML = TR_SRC_LANGS.map((c) => `<option value="${c}">${TR_NAMES[c] || c}</option>`).join('');
      dstSel.innerHTML = TR_DST_LANGS.map((c) => `<option value="${c}">${TR_NAMES[c] || c}</option>`).join('');
    }
    srcSel.value = 'auto';
    dstSel.value = state.trLastDst || 'zh-Hans';
    trPopTabId = tab.id;
    updateTrPop(tab, tab.detectedLang || '');
    // 气泡锚定在地址栏下方（Chrome 风格）
    const omniRect = document.getElementById('omnibox').getBoundingClientRect();
    pop.style.top = `${Math.round(omniRect.bottom + 9)}px`;
    pop.style.right = `${Math.max(12, Math.round(window.innerWidth - omniRect.right))}px`;
    pop.hidden = false;
    // 异步检测语言后回填（像 Chrome 一样显示“英语 → 中文（简体）”）
    const sample = await tab.webview.executeJavaScript('(document.body && document.body.innerText || "").slice(0, 600)').catch(() => '');
    const lang = await trDetect(sample);
    if (trPopTabId === tab.id && !pop.hidden) {
      tab.detectedLang = lang;
      srcSel.value = lang;
      updateTrPop(tab, lang);
    }
  }

  function bindTrPop() {
    const pop = document.getElementById('trPop');
    document.getElementById('trClose').addEventListener('click', () => { pop.hidden = true; });
    document.getElementById('trDst').addEventListener('change', () => {
      state.trLastDst = document.getElementById('trDst').value;
      const tab = activeTab();
      if (tab) updateTrPop(tab, tab.detectedLang || document.getElementById('trSrc').value);
    });
    document.getElementById('trGo').addEventListener('click', async () => {
      const tab = activeTab();
      if (!tab) return;
      if (tab.translated) { pop.hidden = true; translatePage(); return; }
      const from = document.getElementById('trSrc').value || 'auto';
      const to = document.getElementById('trDst').value || 'zh-Hans';
      state.trLastDst = to;
      const lang = tab.detectedLang || (from !== 'auto' ? from : 'en');
      const always = document.getElementById('trAlways').checked;
      const cfg = always ? { lang, to } : {};
      // 同步本窗口内存，立即生效（persist 只写盘不更新 state）
      if (!state.settings) state.settings = {};
      if (!state.settings.browser) state.settings.browser = {};
      state.settings.browser.autoTranslate = cfg;
      persist({ settings: { browser: { autoTranslate: cfg } } });
      pop.hidden = true;
      translatePage(from, to);
    });
    document.getElementById('trRevert').addEventListener('click', () => {
      pop.hidden = true;
      translatePage();
    });
    document.getElementById('trNever').addEventListener('click', () => {
      const tab = activeTab();
      if (!tab || !tab.url) return;
      const h = hostOf(tab.url);
      const hosts = trNeverHosts();
      if (!hosts.includes(h)) hosts.push(h);
      if (!state.settings) state.settings = {};
      if (!state.settings.browser) state.settings.browser = {};
      state.settings.browser.noTranslateHosts = hosts;
      persist({ settings: { browser: { noTranslateHosts: hosts } } });
      pop.hidden = true;
      toast(`以后不再翻译 ${h}`);
    });
    document.addEventListener('mousedown', (e) => {
      if (pop.hidden || pop.contains(e.target)) return;
      if (e.target && e.target.closest && e.target.closest('#trBtn')) return; // 点图标走 click 切换
      pop.hidden = true;
    });
  }

  /* 一律翻译：新页面加载完成后自动检测并翻译 */
  function maybeAutoTranslate(tab) {
    if (state.incognito || !tab || !tab.url || !/^https?:/i.test(tab.url)) return;
    const cfg = trAutoCfg();
    if (!cfg || !cfg.to || cfg.lang === cfg.to) return;
    if (trNeverHosts().includes(hostOf(tab.url))) return;
    if (tab.autoTried || tab.translated || tab.translating) return;
    tab.autoTried = true;
    const wv = tab.webview;
    setTimeout(async () => {
      if (tab.id !== state.activeId || tab.loading || tab.translated || tab.translating) return;
      const sample = await wv.executeJavaScript('(document.body && document.body.innerText || "").slice(0, 600)').catch(() => '');
      const lang = await trDetect(sample);
      if (lang === cfg.lang && lang !== cfg.to) {
        toast(`已自动翻译成${TR_NAMES[cfg.to] || cfg.to}`);
        translatePage(lang, cfg.to);
      }
    }, 1500);
  }

  async function saveCurrentPdf() {
    const tab = activeTab();
    if (!tab || !tab.url) { toast('当前没有可保存的页面'); return; }
    const id = pageWcId(tab);
    if (!id || !api.savePdf) { toast('无法保存当前页面'); return; }
    toast('正在生成 PDF…');
    const r = await api.savePdf(id).catch(() => ({ ok: false, error: '保存失败' }));
    if (r && r.ok) toast(`已保存 PDF：${r.path}`);
    else if (r && !r.canceled) toast(r.error || '保存 PDF 失败');
  }

  async function exportBookmarks() {
    if (!api.exportBookmarksHtml) { toast('当前环境不支持导出书签'); return; }
    if (!state.bookmarks.length) { toast('还没有书签可导出'); return; }
    const r = await api.exportBookmarksHtml(state.bookmarks).catch(() => ({ ok: false, error: '导出失败' }));
    if (r && r.ok) toast(`已导出 ${r.count || state.bookmarks.length} 个书签`);
    else if (r && !r.canceled) toast(r.error || '导出书签失败');
  }

  async function handleTool(kind) {
    const tab = activeTab();
    if (kind === 'devtools') {
      if (!tab || !tab.url) { toast('当前没有打开的页面'); return; }
      const id = pageWcId(tab);
      if (!id || !api.openDevtools) { toast('无法打开开发者工具'); return; }
      const r = await api.openDevtools(id).catch(() => ({ ok: false }));
      if (!r || !r.ok) toast((r && r.error) || '无法打开开发者工具');
      return;
    }
    if (kind === 'source') {
      if (!tab || !tab.url) { toast('当前没有打开的页面'); return; }
      createTab(`view-source:${tab.url}`);
      return;
    }
    if (kind === 'pdf') { await saveCurrentPdf(); return; }
    if (kind === 'copy') {
      if (!tab || !tab.url) { toast('当前没有打开的页面'); return; }
      copyText(tab.url);
      return;
    }
    if (kind === 'exportBookmarks') { await exportBookmarks(); }
  }

  const ACTIONS = {
    newtab: () => createTab(),
    newwin: () => { api.newBrowserWindow ? api.newBrowserWindow((activeTab() && activeTab().url) || '') : createTab(); },
    incognito: () => { api.openBrowser ? api.openBrowser({ url: (activeTab() && activeTab().url) || '', incognito: true }) : toast('无痕窗口需要桌面端支持'); },
    profile: () => {
      const u = state.user;
      toast(u ? `个人资料：${accountName(u)} · ${u.email || ''}` : '未登录：请先在主窗口登录，账号会自动同步到浏览器');
    },
    password: () => openSettings('password'),
    history: () => openPanel('history'),
    downloads: () => openPanel('downloads'),
    bookmarks: () => openPanel('bookmarks'),
    groups: () => openPanel('groups'),
    reader: () => openReader(),
    tabs: () => openTabSwitcher(),
    extensions: () => openSettings('extensions'),
    clear: () => openSettings('data'),
    print: () => printPage(),
    translate: () => openTrPopup(),
    find: () => openFind(),
    cast: () => openPanel('share'),
    tools: () => openPanel('tools'),
    help: () => toast('ANYWHERE 使用说明可在主窗口「更多」页查看'),
    settings: () => openSettings(''),
    exit: () => { if (api.winClose) api.winClose(); },
  };

  /* ---------- 右键编辑菜单 ---------- */

  function openCtxMenu(tab, params) {
    if (!tab || tab.id !== state.activeId) return;
    state.ctxTab = tab;
    state.ctxLink = params.linkURL || '';

    const flags = params.editFlags || {};
    const items = [];

    if (params.linkURL) {
      items.push({ act: 'openlink', label: '在新标签页中打开链接' });
      items.push({ act: 'copyLink', label: '复制链接地址' });
      items.push({ sep: true });
    }

    if (params.isEditable) {
      items.push({ act: 'undo', label: '撤销', disabled: !flags.canUndo });
      items.push({ act: 'redo', label: '重做', disabled: !flags.canRedo });
      items.push({ sep: true });
      items.push({ act: 'cut', label: '剪切', disabled: !flags.canCut });
      items.push({ act: 'copy', label: '复制', disabled: !flags.canCopy });
      items.push({ act: 'paste', label: '粘贴', disabled: !flags.canPaste });
      items.push({ sep: true });
      items.push({ act: 'selectall', label: '全选', disabled: !flags.canSelectAll });
    } else if (params.selectionText) {
      items.push({ act: 'copy', label: '复制' });
      items.push({ act: 'selectall', label: '全选' });
    } else {
      return;
    }

    ctxmenu.innerHTML = items.map((it) => {
      if (it.sep) return '<div class="ctx-sep"></div>';
      return `<button class="ci" data-cact="${it.act}" ${it.disabled ? 'disabled' : ''}>${esc(it.label)}</button>`;
    }).join('');

    ctxmenu.classList.add('open');

    const contentRect = $('views').getBoundingClientRect();
    const w = ctxmenu.offsetWidth || 210;
    const h = ctxmenu.offsetHeight || 200;
    const left = Math.max(4, Math.min((params.x || 0), contentRect.width - w - 4));
    const top = Math.max(4, Math.min((params.y || 0), contentRect.height - h - 4));
    ctxmenu.style.left = `${left}px`;
    ctxmenu.style.top = `${top}px`;
  }

  function closeCtx() {
    ctxmenu.classList.remove('open');
    state.ctxTab = null;
    state.ctxLink = '';
    state.ctxTabId = null;
  }

  function openTabCtxMenu(tab, tabEl) {
    if (!tab) return;
    state.ctxTab = null;
    state.ctxTabId = tab.id;
    state.ctxLink = '';

    const items = [
      { act: 'tab:close', label: '关闭标签页' },
      { act: 'tab:closeOthers', label: '关闭其他标签页', disabled: state.tabs.length <= 1 },
      { act: 'tab:duplicate', label: '复制标签页' },
      { act: tab.pinned ? 'tab:unpin' : 'tab:pin', label: tab.pinned ? '取消固定' : '固定标签页' },
      { sep: true },
      { act: 'tab:newgroup', label: '加入新分组…' },
    ];
    for (const g of state.groups) {
      items.push({ act: `tab:group:${g.id}`, label: `加入「${g.name}」` });
    }

    ctxmenu.innerHTML = items.map((it) => {
      if (it.sep) return '<div class="ctx-sep"></div>';
      return `<button class="ci" data-cact="${esc(it.act)}" ${it.disabled ? 'disabled' : ''}>${esc(it.label)}</button>`;
    }).join('');
    ctxmenu.classList.add('open');

    const contentRect = $('views').getBoundingClientRect();
    const tr = tabEl ? tabEl.getBoundingClientRect() : { left: contentRect.left + 20 };
    const w = ctxmenu.offsetWidth || 210;
    const left = Math.max(4, Math.min(tr.left - contentRect.left, contentRect.width - w - 4));
    ctxmenu.style.left = `${left}px`;
    ctxmenu.style.top = '4px';
  }

  function runCtxAction(act) {
    // 标签右键菜单
    if (state.ctxTabId && String(act).startsWith('tab:')) {
      const tab = state.tabs.find((t) => t.id === state.ctxTabId);
      const cmd = String(act).slice(4);
      closeCtx();
      if (!tab) return;
      if (cmd === 'close') { closeTab(tab.id); return; }
      if (cmd === 'closeOthers') {
        for (const t of state.tabs.slice()) {
          if (t.id !== tab.id) closeTab(t.id);
        }
        setActive(tab.id);
        return;
      }
      if (cmd === 'duplicate') {
        createTab(tab.url || '');
        return;
      }
      if (cmd === 'pin' || cmd === 'unpin') {
        tab.pinned = cmd === 'pin';
        if (tab.pinned) {
          const idx = state.tabs.indexOf(tab);
          if (idx > 0) { state.tabs.splice(idx, 1); state.tabs.unshift(tab); }
        }
        renderTabs();
        saveSession();
        toast(tab.pinned ? '标签页已固定' : '已取消固定');
        return;
      }
      if (cmd === 'newgroup') { createGroupForTab(tab); return; }
      if (cmd.startsWith('group:')) {
        const gid = cmd.slice(6);
        if (state.groups.some((g) => g.id === gid)) addTabToGroup(tab, gid);
        return;
      }
      return;
    }

    const wv = state.ctxTab && state.ctxTab.webview;
    if (!wv) {
      closeCtx();
      return;
    }
    try {
      if (act === 'openlink') {
        if (state.ctxLink) createTab(state.ctxLink);
      } else if (act === 'copyLink') {
        copyText(state.ctxLink);
      } else if (act === 'undo') wv.undo();
      else if (act === 'redo') wv.redo();
      else if (act === 'cut') wv.cut();
      else if (act === 'copy') wv.copy();
      else if (act === 'paste') wv.paste();
      else if (act === 'selectall') wv.selectAll();
    } catch (e) { /* ignore */ }
    closeCtx();
  }

  /* ---------- 快捷键 ---------- */

  function cycleTab(dir) {
    if (state.tabs.length < 2) return;
    let idx = state.tabs.findIndex((t) => t.id === state.activeId);
    if (idx < 0) idx = 0;
    idx = (idx + dir + state.tabs.length) % state.tabs.length;
    setActive(state.tabs[idx].id);
  }

  function reopenClosedTab() {
    const last = state.closedTabs[0];
    if (!last) { toast('没有最近关闭的标签页'); return; }
    state.closedTabs.shift();
    createTab(last.url);
  }

  function handleShortcut(key, shift = false) {
    switch (key) {
      case 't':
        if (shift) reopenClosedTab();
        else createTab();
        break;
      case 'tab': cycleTab(shift ? -1 : 1); break;
      case 'w': if (state.activeId) closeTab(state.activeId); break;
      case 'r': {
        const tab = activeTab();
        if (!tab || !tab.url) break;
        if (tab.loading) safe(() => tab.webview.stop(), null);
        else safe(() => tab.webview.reload(), null);
        break;
      }
      case 'f': openFind(); break;
      case 'l':
        urlInput.focus();
        urlInput.select();
        break;
      case 'j': openPanel('downloads'); break;
      case 'p': printPage(); break;
      case 'n':
        if (shift) ACTIONS.incognito();
        else ACTIONS.newwin();
        break;
      case 'shift+del': openSettings('data'); break;
      case 'a': openTabSwitcher(); break;
      default: break;
    }
  }

  function bindStatic() {
    // 窗口控制
    $('winMin').addEventListener('click', () => api.winMin && api.winMin());
    $('winMax').addEventListener('click', () => api.winMax && api.winMax());
    $('winClose').addEventListener('click', () => api.winClose && api.winClose());
    if (api.onMaximized) {
      api.onMaximized((v) => {
        const use = $('winMax').querySelector('use');
        if (use) use.setAttribute('href', v ? '#i-restore' : '#i-max');
      });
    }

    // 标签
    $('newTabBtn').addEventListener('click', () => createTab());

    tabsEl.addEventListener('click', (e) => {
      const chip = e.target.closest('.tg-chip');
      if (chip) { e.preventDefault(); toggleGroup(chip.getAttribute('data-group')); return; }
      const x = e.target.closest('.x');
      if (x) { closeTab(x.getAttribute('data-close')); return; }
      const tabEl = e.target.closest('.tab');
      if (tabEl) setActive(tabEl.getAttribute('data-id'));
    });

    tabsEl.addEventListener('contextmenu', (e) => {
      const tabEl = e.target.closest('.tab');
      if (!tabEl) return;
      e.preventDefault();
      const tab = state.tabs.find((t) => t.id === tabEl.getAttribute('data-id'));
      if (tab) openTabCtxMenu(tab, tabEl);
    });

    tabsEl.addEventListener('auxclick', (e) => {
      if (e.button !== 1) return;
      const tabEl = e.target.closest('.tab');
      if (tabEl) { e.preventDefault(); closeTab(tabEl.getAttribute('data-id')); }
    });

    // 书签栏：普通点击当前页打开；Ctrl/Cmd+点击 或 中键 新标签页打开
    const openBm = (el, newTab) => {
      const url = el.getAttribute('data-url');
      if (!url) return;
      if (newTab) { createTab(url); return; }
      const tab = activeTab() || createTab();
      if (tab) navigate(tab, url);
    };
    bookmarksBar.addEventListener('click', (e) => {
      const b = e.target.closest('.bm');
      if (!b) return;
      openBm(b, e.ctrlKey || e.metaKey);
    });
    bookmarksBar.addEventListener('auxclick', (e) => {
      if (e.button !== 1) return;
      const b = e.target.closest('.bm');
      if (!b) return;
      e.preventDefault();
      openBm(b, true);
    });
    bookmarksBar.addEventListener('contextmenu', (e) => {
      const b = e.target.closest('.bm');
      if (!b) return;
      e.preventDefault();
      const id = b.getAttribute('data-bmid');
      if (!id) { toast('职业书签跟随工作台身份，切换职业即会更新'); return; }
      removeBookmark(id);
    });

    // 导航
    $('backBtn').addEventListener('click', () => { const wv = activeTab() && activeTab().webview; if (wv) safe(() => wv.goBack(), null); });
    $('fwdBtn').addEventListener('click', () => { const wv = activeTab() && activeTab().webview; if (wv) safe(() => wv.goForward(), null); });
    $('reloadBtn').addEventListener('click', () => {
      const tab = activeTab();
      if (!tab || !tab.url) return;
      if (tab.loading) safe(() => tab.webview.stop(), null);
      else safe(() => tab.webview.reload(), null);
    });
    $('homeBtn').addEventListener('click', goHome);

    // 地址栏
    urlInput.addEventListener('focus', () => {
      urlInput.classList.add('focused');
      urlInput.select();
      showSuggestions();
    });
    urlInput.addEventListener('input', () => {
      if (document.activeElement === urlInput) {
        state.sugItems = buildSuggestions(urlInput.value);
        state.sugIndex = -1;
        renderSuggestions();
      }
    });
    urlInput.addEventListener('blur', () => {
      urlInput.classList.remove('focused');
      const tab = activeTab();
      urlInput.value = tab && tab.url ? prettyUrl(tab.url) : '';
      setTimeout(hideSuggestions, 120);
    });
    urlInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!state.sugItems.length) showSuggestions();
        if (!state.sugItems.length) return;
        e.preventDefault();
        const len = state.sugItems.length;
        if (e.key === 'ArrowDown') state.sugIndex = state.sugIndex < 0 ? 0 : (state.sugIndex + 1) % len;
        else state.sugIndex = state.sugIndex <= 0 ? len - 1 : state.sugIndex - 1;
        renderSuggestions();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (state.sugIndex >= 0 && state.sugItems[state.sugIndex]) {
          pickSuggestion(state.sugIndex);
          return;
        }
        const tab = activeTab() || createTab();
        if (tab) navigate(tab, urlInput.value);
        hideSuggestions();
        urlInput.blur();
      } else if (e.key === 'Escape') {
        hideSuggestions();
        urlInput.blur();
      }
    });

    // 地址栏建议鼠标选择
    omniSug.addEventListener('pointerdown', (e) => {
      e.preventDefault();
    });
    omniSug.addEventListener('click', (e) => {
      const row = e.target.closest('.sug-row');
      if (!row) return;
      pickSuggestion(Number(row.getAttribute('data-sidx')));
    });

    $('starBtn').addEventListener('click', toggleStar);
    $('trBtn').addEventListener('click', () => {
      const pop = document.getElementById('trPop');
      if (!pop.hidden) { pop.hidden = true; return; } // 再点一次图标关闭
      openTrPopup();
    });

    // 新标签页
    ntInput.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const tab = activeTab() || createTab();
      if (tab) navigate(tab, ntInput.value);
    });
    ntLinks.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-url]');
      if (!b) return;
      const tab = activeTab() || createTab();
      if (tab) navigate(tab, b.getAttribute('data-url'));
    });

    // 菜单与面板
    $('menuBtn').addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(); });
    $('downloadBtn').addEventListener('click', () => openPanel('downloads'));
    $('avatarBtn').addEventListener('click', () => ACTIONS.profile());
    $('spClose').addEventListener('click', closePanel);

    menuEl.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const act = b.getAttribute('data-act');
      closeMenu();
      const fn = ACTIONS[act];
      if (fn) fn();
    });

    $('zoomOut').addEventListener('click', () => setZoom(-10));
    $('zoomIn').addEventListener('click', () => setZoom(10));
    $('fullBtn').addEventListener('click', () => { closeMenu(); toggleFullscreen(); });

    spList.addEventListener('click', async (e) => {
      const del = e.target.closest('.sp-del');
      if (del) { removeBookmark(del.getAttribute('data-bmid')); return; }

      const credDel = e.target.closest('[data-credid]');
      if (credDel) {
        await api.credsRemove(credDel.getAttribute('data-credid')).catch(() => {});
        await refreshCreds();
        if (state.panel === 'settings') renderPanel();
        toast('已删除账号');
        return;
      }

      const extDel = e.target.closest('[data-extid]');
      if (extDel) {
        const r = await api.removeExtension(extDel.getAttribute('data-extid')).catch(() => ({ ok: false }));
        await refreshExtensions();
        if (state.panel === 'settings') renderPanel();
        toast(r && r.ok ? '已移除扩展' : ((r && r.error) || '移除扩展失败'));
        return;
      }

      const gbtn = e.target.closest('[data-gact]');
      if (gbtn) {
        const gid = gbtn.getAttribute('data-gid');
        if (gbtn.getAttribute('data-gact') === 'toggle') toggleGroup(gid);
        else {
          const group = state.groups.find((g) => g.id === gid);
          for (const t of state.tabs) if (t.groupId === gid) t.groupId = null;
          state.groups = state.groups.filter((g) => g.id !== gid);
          renderTabs();
          renderPanel();
          toast(`已移除分组「${group ? group.name : ''}」`);
        }
        return;
      }

      const tool = e.target.closest('[data-tool]');
      if (tool) {
        handleTool(tool.getAttribute('data-tool'));
        return;
      }

      const dlOpen = e.target.closest('[data-dlopen]');
      if (dlOpen) {
        const r = await api.downloadOpen(dlOpen.getAttribute('data-dlopen')).catch(() => ({ ok: false }));
        if (!r || !r.ok) toast((r && r.error) || '无法打开文件');
        return;
      }
      const dlShow = e.target.closest('[data-dlshow]');
      if (dlShow) {
        const r = await api.downloadShow(dlShow.getAttribute('data-dlshow')).catch(() => ({ ok: false }));
        if (!r || !r.ok) toast((r && r.error) || '无法定位文件');
        return;
      }
      const dlCancel = e.target.closest('[data-dlcancel]');
      if (dlCancel) {
        const id = dlCancel.getAttribute('data-dlcancel');
        const r = await api.downloadCancel(id).catch(() => ({ ok: false }));
        if (r && r.ok) state.pausedDl.delete(id);
        toast(r && r.ok ? '已取消下载' : ((r && r.error) || '无法取消下载'));
        return;
      }
      const dlPause = e.target.closest('[data-dlpause]');
      if (dlPause) {
        const id = dlPause.getAttribute('data-dlpause');
        const r = await api.downloadPause(id).catch(() => ({ ok: false, error: '当前环境不支持' }));
        if (r && r.ok) { state.pausedDl.add(id); renderPanel(); toast('已暂停下载'); }
        else toast((r && r.error) || '无法暂停');
        return;
      }
      const dlResume = e.target.closest('[data-dlresume]');
      if (dlResume) {
        const id = dlResume.getAttribute('data-dlresume');
        const r = await api.downloadResume(id).catch(() => ({ ok: false, error: '当前环境不支持' }));
        if (r && r.ok) { state.pausedDl.delete(id); renderPanel(); toast('已继续下载'); }
        else toast((r && r.error) || '无法继续');
        return;
      }

      const bmTab = e.target.closest('[data-bmf]');
      if (bmTab) {
        state.bmFolder = bmTab.getAttribute('data-bmf');
        renderPanel();
        return;
      }

      // 设置面板按钮
      const clickedId = e.target.closest('button') && e.target.closest('button').id;
      if (clickedId === 'setHomeSave') {
        state.settings.home = String($('setHome').value || '').trim();
        persist({ settings: { browser: { home: state.settings.home } } });
        toast(state.settings.home ? '已保存主页' : '已清空主页（使用新标签页）');
        return;
      }
      if (clickedId === 'setPickDir') {
        const r = await api.pickDownloadDir().catch(() => ({ ok: false }));
        if (r && r.ok) {
          state.settings.downloadDir = r.path;
          renderPanel();
          toast(`下载目录已更改：${r.path}`);
        } else if (r && !r.canceled) toast(r.error || '无法更改下载目录');
        return;
      }
      if (clickedId === 'credAdd') {
        const site = $('credSite').value;
        const username = $('credUser').value;
        const password = $('credPass').value;
        if (!site.trim() || !username.trim() || !password) { toast('请填写站点、用户名和密码'); return; }
        const r = await api.credsSave({ site, username, password }).catch(() => ({ ok: false, error: '保存失败' }));
        if (r && r.ok) {
          await refreshCreds();
          if (state.panel === 'settings') renderPanel();
          toast('账号已加密保存');
        } else toast((r && r.error) || '保存账号失败');
        return;
      }
      if (clickedId === 'extLoad') {
        const r = await api.pickAndLoadExtension().catch(() => ({ ok: false, error: '加载失败' }));
        if (r && r.ok) {
          await refreshExtensions();
          if (state.panel === 'settings') renderPanel();
          toast(`已加载扩展：${r.extension.name}`);
        } else if (r && !r.canceled) toast(r.error || '扩展加载失败');
        return;
      }
      if (clickedId === 'clearDataNow') {
        const opts = {
          cache: $('clrCache').checked,
          cookies: $('clrCookies').checked,
          history: $('clrHistory').checked,
          downloads: $('clrDownloads').checked,
          bookmarks: $('clrBookmarks').checked,
        };
        if (!opts.cache && !opts.cookies && !opts.history && !opts.downloads && !opts.bookmarks) {
          toast('请至少选择一项要删除的数据');
          return;
        }
        await api.clearBrowsingData({ cache: opts.cache, cookies: opts.cookies }).catch(() => {});
        const patch = {};
        if (opts.history) { state.history = []; patch.history = []; }
        if (opts.downloads) {
          try { await api.clearDownloads(); } catch (e) { /* ignore */ }
          state.downloads = [];
          patch.downloads = [];
        }
        if (opts.bookmarks) { state.bookmarks = []; patch.bookmarks = []; renderBookmarksBar(); }
        if (Object.keys(patch).length) persist(patch);
        syncChrome();
        if (state.panel === 'settings' || state.panel === 'downloads' || state.panel === 'bookmarks') renderPanel();
        toast('已删除所选浏览数据');
        return;
      }

      const row = e.target.closest('.sp-row');
      if (row && row.getAttribute('data-url') && !e.target.closest('button') && !e.target.closest('select') && !e.target.closest('.bm-grip')) {
        const tab = activeTab() || createTab();
        if (tab) navigate(tab, row.getAttribute('data-url'));
      }
    });

    spList.addEventListener('change', (e) => {
      if (e.target.id === 'setEngine') {
        const v = e.target.value;
        if (ENGINES[v]) {
          state.engine = v;
          persist({ settings: { engine: v } });
          syncChrome();
          toast(`默认搜索引擎已切换为 ${ENGINES[v].label}`);
        }
      } else if (e.target.id === 'setRestore') {
        state.settings.restore = !!e.target.checked;
        persist({ settings: { browser: { restore: state.settings.restore } } });
        toast(state.settings.restore ? '将恢复上次标签页' : '启动时不恢复标签页');
      } else if (e.target.hasAttribute && e.target.hasAttribute('data-bmfsel')) {
        const id = e.target.getAttribute('data-bmfsel');
        const folder = String(e.target.value || '').trim();
        const hit = state.bookmarks.find((b) => b.id === id);
        if (hit) {
          if (folder) hit.folder = folder;
          else delete hit.folder;
          persist({ bookmarks: state.bookmarks });
          renderPanel();
          renderBookmarksBar();
          toast(folder ? `已移动到「${folder}」` : '已移出文件夹');
        }
      }
    });

    /* ---------- 书签拖动排序 ---------- */
    let dragBmId = '';
    spList.addEventListener('dragstart', (e) => {
      const row = e.target.closest('.bm-row[data-bmid]');
      if (!row) return;
      dragBmId = row.getAttribute('data-bmid');
      row.classList.add('dragging');
      try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragBmId); } catch (err) { /* ignore */ }
    });
    spList.addEventListener('dragend', () => {
      dragBmId = '';
      spList.querySelectorAll('.bm-row').forEach((r) => r.classList.remove('dragging', 'drop-target'));
    });
    spList.addEventListener('dragover', (e) => {
      const row = e.target.closest('.bm-row[data-bmid]');
      if (!row || !dragBmId || row.getAttribute('data-bmid') === dragBmId) return;
      e.preventDefault();
      try { e.dataTransfer.dropEffect = 'move'; } catch (err) { /* ignore */ }
      spList.querySelectorAll('.bm-row').forEach((r) => r.classList.remove('drop-target'));
      row.classList.add('drop-target');
    });
    spList.addEventListener('drop', (e) => {
      const row = e.target.closest('.bm-row[data-bmid]');
      if (!row || !dragBmId) return;
      e.preventDefault();
      const targetId = row.getAttribute('data-bmid');
      if (targetId === dragBmId) return;
      const from = state.bookmarks.findIndex((b) => b.id === dragBmId);
      const to = state.bookmarks.findIndex((b) => b.id === targetId);
      if (from < 0 || to < 0) return;
      const [moved] = state.bookmarks.splice(from, 1);
      state.bookmarks.splice(to, 0, moved);
      persist({ bookmarks: state.bookmarks });
      renderPanel();
      renderBookmarksBar();
      toast('书签顺序已更新');
    });

    spActions.addEventListener('click', async (e) => {
      const b = e.target.closest('button[data-spact]');
      if (!b) return;
      const act = b.getAttribute('data-spact');
      if (act === 'clearHistory') {
        state.history = [];
        persist({ history: [] });
        renderPanel();
        toast('已清空历史记录');
      } else if (act === 'clearDownloads') {
        Promise.resolve(api.clearDownloads && api.clearDownloads()).catch(() => {});
        state.downloads = [];
        renderPanel();
        toast('已清空下载记录');
      } else if (act === 'groupAddCurrent') {
        createGroupForTab(activeTab());
      } else if (act === 'bmNewFolder') {
        const name = await askText('新建书签文件夹', '之后可以把书签用行尾下拉框移动到这个文件夹。', '');
        const clean = String(name || '').trim().slice(0, 16);
        if (!clean) return;
        if (!state.bookmarkFolders.includes(clean)) state.bookmarkFolders.push(clean);
        persist({ bookmarkFolders: state.bookmarkFolders });
        state.bmFolder = clean;
        renderPanel();
        toast(`已新建文件夹「${clean}」`);
      }
    });
    $('promptOk').addEventListener('click', () => {
      const v = promptInput.value;
      closePrompt(v);
    });
    $('promptCancel').addEventListener('click', () => closePrompt(null));
    promptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); closePrompt(promptInput.value); }
      else if (e.key === 'Escape') { e.preventDefault(); closePrompt(null); }
    });
    promptDlg.addEventListener('click', (e) => {
      if (e.target === promptDlg) closePrompt(null);
    });

    // 加载失败页重试
    $('errRetry').addEventListener('click', () => {
      const tab = activeTab();
      if (!tab || !tab.url) return;
      hideErrorPage();
      tab.fail = null;
      syncVisibility();
      try { tab.webview.reload(); } catch (e) { /* ignore */ }
    });

    // 标签页快速切换浮层
    tsInput.addEventListener('input', () => { state.tsIndex = 0; renderTabSwitcher(); });
    tsInput.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.tsIndex = Math.min(state.tsItems.length - 1, state.tsIndex + 1);
        renderTabSwitcher();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.tsIndex = Math.max(0, state.tsIndex - 1);
        renderTabSwitcher();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        pickTabSwitcher();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeTabSwitcher();
      }
    });
    tsList.addEventListener('click', (e) => {
      const item = e.target.closest('[data-tstid]');
      if (!item) return;
      setActive(item.getAttribute('data-tstid'));
      closeTabSwitcher();
    });
    tabSwitcher.addEventListener('click', (e) => {
      if (e.target === tabSwitcher) closeTabSwitcher();
    });

    // 阅读模式
    $('rdClose').addEventListener('click', closeReader);
    $('rdBack').addEventListener('click', closeReader);
    $('rdSmaller').addEventListener('click', () => readerFont(-2));
    $('rdBigger').addEventListener('click', () => readerFont(2));

    // 查找
    $('findClose').addEventListener('click', closeFind);
    $('findPrev').addEventListener('click', () => doFind(false, true));
    $('findNext').addEventListener('click', () => doFind(true, true));
    findInput.addEventListener('input', () => doFind(true, false));
    findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        doFind(!e.shiftKey, true);
      } else if (e.key === 'Escape') {
        closeFind();
      }
    });

    // 删除数据确认
    $('cfCancel').addEventListener('click', () => confirmEl.classList.remove('open'));
    $('cfOk').addEventListener('click', async () => {
      confirmEl.classList.remove('open');
      try { await api.clearCache(); } catch (e) { /* ignore */ }
      try { await api.clearDownloads(); } catch (e) { /* ignore */ }
      state.downloads = [];
      toast('已清除浏览数据');
      if (state.panel === 'downloads') renderPanel();
    });
    confirmEl.addEventListener('click', (e) => {
      if (e.target === confirmEl) confirmEl.classList.remove('open');
    });

    // 右键菜单
    ctxmenu.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-cact]');
      if (!b || b.disabled) return;
      runCtxAction(b.getAttribute('data-cact'));
    });

    // 全局点击关闭浮层
    document.addEventListener('pointerdown', (e) => {
      if (state.menuOpen && !menuEl.contains(e.target) && !e.target.closest('#menuBtn')) closeMenu();
      if (!ctxmenu.contains(e.target)) closeCtx();
    });

    // 快捷键（Chrome UI 区域）
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!tabSwitcher.hidden) { closeTabSwitcher(); return; }
        if (!readerEl.hidden) { closeReader(); return; }
        if (ctxmenu.classList.contains('open')) { closeCtx(); return; }
        if (promptDlg.classList.contains('open')) { closePrompt(null); return; }
        if (state.menuOpen) { closeMenu(); return; }
        if (state.findOpen) { closeFind(); return; }
        if (confirmEl.classList.contains('open')) { confirmEl.classList.remove('open'); return; }
        if (panelEl.classList.contains('open')) { closePanel(); return; }
      }
      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;
      const key = e.key.toLowerCase();
      if (key === 'delete' && e.shiftKey) {
        e.preventDefault();
        handleShortcut('shift+del');
        return;
      }
      if (key === 'a' && e.shiftKey) {
        e.preventDefault();
        openTabSwitcher();
        return;
      }
      const known = ['t', 'w', 'r', 'l', 'f', 'j', 'p', 'n', 'tab'];
      if (!known.includes(key)) return;
      e.preventDefault();
      handleShortcut(key, e.shiftKey);
    });

    // 来自 webview 内部快捷键
    if (api.onBrowserKey) {
      api.onBrowserKey(({ key, shift }) => handleShortcut(key, shift));
    }

    // 主应用点开站点：在同一个窗口追加标签页（已存在则直接切换）
    if (api.onBrowserAddTab) {
      api.onBrowserAddTab(({ url } = {}) => {
        if (!url) return;
        const exists = state.tabs.find((t) => t.url === url);
        if (exists) setActive(exists.id);
        else createTab(url);
      });
    }

    // 下载事件
    if (api.onDownload) {
      api.onDownload((entry) => {
        if (!entry || !entry.id) return;
        const list = [entry, ...state.downloads.filter((d) => d.id !== entry.id)]
          .sort((a, b) => (b.startedAt || 0) - (a.startedAt || 0))
          .slice(0, 30);
        state.downloads = list;
        if (entry.state === 'completed' && !state.dlNotified.has(entry.id)) {
          state.dlNotified.add(entry.id);
          toast(`下载完成：${entry.filename || '文件'}`);
        }
        if (entry.state === 'cancelled' && !state.dlNotified.has(entry.id)) {
          state.dlNotified.add(entry.id);
          toast(`下载已取消：${entry.filename || '文件'}`);
        }
        if (state.panel === 'downloads') renderPanel();
      });
    }

    window.addEventListener('beforeunload', () => {
      if (state.incognito || !api.storeSet) return;
      try { api.storeSet({ settings: { browser: { lastTabs: sessionUrls() } } }); } catch (e) { /* ignore */ }
    });
  }

  /* ---------- 初始化 ---------- */

  async function loadStore() {
    if (!api.storeGet) return;
    try {
      const d = await api.storeGet();
      state.bookmarks = (Array.isArray(d && d.bookmarks) ? d.bookmarks : []).filter((b) => b && b.url).map((b, i) => ({
        ...b,
        id: b.id || `bm${Date.now().toString(36)}${i}`,
      }));
      state.history = Array.isArray(d && d.history) ? d.history : [];
      state.bookmarkFolders = (Array.isArray(d && d.bookmarkFolders) ? d.bookmarkFolders : [])
        .map((f) => String(f).trim()).filter(Boolean);
      state.downloads = Array.isArray(d && d.downloads) ? d.downloads : [];
      state.user = (d && d.user) || null;
      const engine = d && d.settings && d.settings.engine;
      if (ENGINES[engine]) state.engine = engine;
      const bs = (d && d.settings && d.settings.browser) || {};
      state.settings.home = typeof bs.home === 'string' ? bs.home : '';
      state.settings.restore = bs.restore !== false;
      state.settings.downloadDir = typeof bs.downloadDir === 'string' ? bs.downloadDir : '';
      state.settings.lastTabs = Array.isArray(bs.lastTabs) ? bs.lastTabs : [];
    } catch (e) { /* ignore */ }
  }

  async function init() {
    bindStatic();
    bindTrPop();
    await loadStore();

    try { if (api.guestPreloadPath) state.guestPreload = await api.guestPreloadPath(); } catch (e) { /* ignore */ }
    if (api.onRoleChanged) api.onRoleChanged(() => { loadRoleBookmarks(); });
    if (api.onUserChanged) api.onUserChanged((u) => { state.user = u || null; renderAccount(); });
    if (api.onStoreChanged) api.onStoreChanged(() => {
      // 其它窗口（例如云同步 / 工作台）写入了书签或历史，重新读取并刷新界面
      loadStore().then(() => {
        renderBookmarksBar();
        if (state.panel) renderPanel();
      }).catch(() => {});
    });
    renderAccount();
    loadRoleBookmarks();

    const params = new URLSearchParams(location.search);
    state.incognito = params.get('incognito') === '1';

    const urls = (params.get('urls') || '').split('|').filter(Boolean);
    const single = params.get('url') || '';

    if (urls.length) {
      const list = urls.slice(0, 8);
      list.forEach((u, i) => {
        const t = i === 0 ? createTab(u) : createTab();
        if (i > 0) setTimeout(() => navigate(t, u), i * 250);
      });
      setActive(state.tabs[0].id);
    } else if (single) {
      createTab(single);
    } else if (!state.incognito && state.settings.restore && state.settings.lastTabs.length) {
      const urls = state.settings.lastTabs.slice(0, 8); // 最多 8 个避免并发重载崩
      urls.forEach((u, i) => {
        const t = createTab();
        // 延后导航，避免刚 append 到 DOM 就同时触发 preload+load，Chromium 并发 webview 会崩
        setTimeout(() => navigate(t, u), i * 250);
      });
      // 第一个立刻 setActive，后续加载完自然切
      setActive(state.tabs[0].id);
    } else {
      createTab();
    }

    syncChrome();
    syncVisibility();
    renderTabs();
    renderBookmarksBar();
    if (state.incognito) toast('无痕浏览：关闭窗口后不保留浏览记录');
  }

  init();
})();
