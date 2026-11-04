/* YCDT Solar website admin: edit pages visually, publish by committing to GitHub through /api/save. */
(function () {
  const $ = id => document.getElementById(id);
  const frame = $('frame'), statusEl = $('status');
  const MAX_IMG = 1800, MAX_BATCH = 3.4e6;   // Vercel functions accept about 4.5 MB per request

  // Text that can be edited in place (only the innermost match on any branch is used)
  const EDITABLE = 'h1,h2,h3,h4,h5,p,li,summary,th,td,figcaption,legend,.eyebrow,.stat-l,.stat-n,.big,.btn,.text-link,.tol,.when,.loc,.card-tag,.step-n,.sol-n,.n,.flow span,.sites span,.trusted-track span,.trusted-label,.badge,.strip span,.tab,.cmd-text,.reason b,.reason span,.specs li>span,.case-nums b,.case-nums span,.rows div>span:first-child,.sun-list b,.field>label,.checks span,.tabs-label,.lede span,.side-card small,.crumbs span:last-child';
  const NOT_EDITABLE = '.stage,.view-toggle,[aria-hidden="true"],.req,[data-count-out],#o-year,#o-year2,#o-hour,#o-day,#o-month,.field output,.form-status,.err';
  // Items that can be duplicated, deleted and reordered
  const REPEAT = '.ess-part,.shot,.case,.strip>a,.sol,.ind,.value,.market,.service,.step,.reason,.faq details,.specs li,.sun-list li,.side-card li,.sites span,.flow span,.trusted-track:first-of-type span,.load,tbody tr,.film';

  let page = 'index.html', source = '', doc = null;
  let dirty = false, uploads = new Map(), seo = null, fileCb = null;

  /* ---------- API ---------- */
  async function api(path, body) {
    const r = await fetch(path, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {});
    const j = await r.json().catch(() => ({}));
    if (r.status === 401 && !path.includes('login')) { showLogin('Your session has ended. Please sign in again.'); throw new Error('auth'); }
    if (!r.ok) throw new Error(j.error || `Request failed (${r.status})`);
    return j;
  }

  /* ---------- status ---------- */
  function say(text, cls) { statusEl.textContent = text; statusEl.className = 'status ' + (cls || ''); }
  function setDirty(v) {
    dirty = v;
    $('save').disabled = !v; $('discard').disabled = !v;
    if (v) say('Unsaved changes', 'dirty');
  }
  addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- sign in ---------- */
  function showLogin(msg) { $('editor').hidden = true; $('login').hidden = false; $('login-msg').textContent = msg || ''; }
  async function boot() {
    const s = await fetch('/api/session').then(r => r.json()).catch(() => null);
    if (!s) return showLogin('The admin service is not available.');
    if (!s.configured) return showLogin('Admin is not set up yet. Add ADMIN_PASSWORD, GITHUB_TOKEN and GITHUB_REPO in Vercel, then redeploy.');
    if (!s.authed) return showLogin();
    $('login').hidden = true; $('editor').hidden = false;
    loadPage(page);
  }
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    $('login-msg').textContent = '';
    try { await api('/api/login', { password: $('pw').value }); $('pw').value = ''; boot(); }
    catch (err) { $('login-msg').textContent = err.message; }
  });
  $('logout').addEventListener('click', async () => {
    if (dirty && !confirm('You have unsaved changes. Sign out anyway?')) return;
    setDirty(false); await api('/api/logout', {}); showLogin();
  });

  /* ---------- load a page into the frame ---------- */
  async function loadPage(p) {
    say('Loading…');
    setDirty(false); uploads = new Map(); seo = null; doc = null;
    page = p;
    const { content } = await api('/api/source?path=' + encodeURIComponent(p));
    source = content.replace(/\r\n/g, '\n');
    frame.onload = () => setup(frame.contentDocument);
    frame.srcdoc = source.replace(/<head>/i, '<head><base href="/"><script>window.__ADMIN=1<\/script>');
  }
  $('page').addEventListener('change', e => {
    if (dirty && !confirm('Discard unsaved changes on this page?')) { e.target.value = page; return; }
    loadPage(e.target.value);
  });
  $('discard').addEventListener('click', () => { if (confirm('Discard your unsaved changes?')) loadPage(page); });
  $('v-desk').addEventListener('click', () => view(false));
  $('v-phone').addEventListener('click', () => view(true));
  function view(phone) { frame.classList.toggle('phone', phone); $('v-desk').setAttribute('aria-pressed', !phone); $('v-phone').setAttribute('aria-pressed', phone); }

  /* ---------- editing inside the frame ---------- */
  const FRAME_CSS = `
    [data-admin-edit]{cursor:text;border-radius:3px;transition:outline-color .1s}
    [data-admin-edit]:hover{outline:1.5px dashed rgba(200,32,47,.65);outline-offset:2px}
    [data-admin-edit]:focus{outline:2px solid #c8202f;outline-offset:2px;background:rgba(200,32,47,.04)}
    main img{cursor:pointer}
    .reveal,.rise{opacity:1!important;transform:none!important;animation:none!important;transition:none!important}
    .trusted-track{animation:none!important}
    .film video{pointer-events:none}
    [data-admin-ui]{all:initial;position:absolute;z-index:9999;display:none;gap:2px;padding:3px;background:#17171a;border-radius:9px;box-shadow:0 6px 24px rgba(0,0,0,.3);font:500 12px/1 Geist,system-ui,sans-serif}
    [data-admin-ui] button{all:unset;cursor:pointer;color:#fff;padding:7px 9px;border-radius:6px;font:inherit;white-space:nowrap}
    [data-admin-ui] button:hover{background:rgba(255,255,255,.16)}
    [data-admin-ui] button.danger:hover{background:#c8202f}
    [data-admin-bg]{all:initial;position:absolute;right:20px;top:84px;z-index:50;cursor:pointer;background:#17171a;color:#fff;padding:9px 13px;border-radius:8px;font:500 13px Geist,system-ui,sans-serif}
  `;

  function setup(d) {
    doc = d;
    const st = d.createElement('style'); st.setAttribute('data-admin-style', ''); st.textContent = FRAME_CSS; d.head.appendChild(st);
    const main = d.getElementById('main');
    markEditable(main);

    // nothing in the frame navigates or submits while editing
    d.addEventListener('click', e => {
      const a = e.target.closest('a,button,summary,label');
      if (a && !a.closest('[data-admin-ui],[data-admin-bg]') && !a.closest('.view-toggle')) {
        if (a.tagName !== 'SUMMARY' || a.isContentEditable) e.preventDefault();
      }
      const tab = e.target.closest('.tab');
      if (tab) selectTab(tab);
      const img = e.target.closest('main img');
      if (img && !img.closest('.stage')) replaceImage(img);
    }, true);
    d.addEventListener('submit', e => e.preventDefault(), true);
    d.addEventListener('keydown', e => {
      const el = e.target;
      if (el.hasAttribute && el.hasAttribute('data-admin-edit') && e.key === 'Enter') { e.preventDefault(); el.blur(); }
      if (el.hasAttribute && el.hasAttribute('data-admin-edit') && e.key === ' ' && el.matches('button,summary')) { e.stopPropagation(); }
    }, true);
    d.addEventListener('paste', e => {
      if (!e.target.closest || !e.target.closest('[data-admin-edit]')) return;
      e.preventDefault();
      d.execCommand('insertText', false, (e.clipboardData.getData('text/plain') || '').replace(/\s+/g, ' '));
    }, true);
    d.addEventListener('input', e => {
      const t = e.target;
      if (!t.closest || !t.closest('[data-admin-edit]')) return;
      if (t.closest('.cmd-text')) { const sel = d.querySelector('.tab[aria-selected="true"]'); if (sel) sel.dataset.cmd = t.closest('.cmd-text').textContent.trim(); }
      setDirty(true);
    }, true);

    buildBar(d, main);
    const hero = main.querySelector('.page-hero-bg img');
    if (hero) {
      const b = d.createElement('button'); b.setAttribute('data-admin-bg', ''); b.textContent = 'Change background';
      b.addEventListener('click', e => { e.preventDefault(); replaceImage(hero); });
      d.body.appendChild(b);
    }
    say('All changes published', 'ok');
  }

  function markEditable(root) {
    const all = [...root.querySelectorAll(EDITABLE)].filter(e => !e.closest(NOT_EDITABLE) && !e.matches(NOT_EDITABLE));
    const set = new Set(all);
    all.forEach(e => {
      if ([...e.querySelectorAll('*')].some(c => set.has(c))) return;      // only the innermost
      if (!e.textContent.trim()) return;
      e.setAttribute('data-admin-edit', '');
      e.setAttribute('contenteditable', 'plaintext-only');
      if (e.contentEditable !== 'plaintext-only') e.setAttribute('contenteditable', 'true');
      e.setAttribute('spellcheck', 'true');
    });
  }

  function selectTab(tab) {
    const d = tab.ownerDocument;
    d.querySelectorAll('.tab').forEach(t => t.setAttribute('aria-selected', t === tab ? 'true' : 'false'));
    const cmd = d.querySelector('.cmd-text'); if (cmd) cmd.textContent = tab.dataset.cmd || '';
    d.dispatchEvent(new CustomEvent('panel:select', { detail: tab.dataset.id }));
  }

  /* floating item toolbar */
  function buildBar(d, main) {
    const bar = d.createElement('div'); bar.setAttribute('data-admin-ui', '');
    const btn = (label, fn, cls) => { const b = d.createElement('button'); b.type = 'button'; b.textContent = label; if (cls) b.className = cls; b.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); fn(); }); return b; };
    let item = null, img = null, link = null, hideT = 0;
    const bPhoto = btn('Replace photo', () => img && replaceImage(img));
    const bAlt = btn('Alt text', () => {
      if (!img) return; const v = prompt('Describe this photo (for screen readers and Google):', img.alt);
      if (v !== null) { img.alt = v; setDirty(true); }
    });
    const bLink = btn('Link', () => {
      if (!link) return; const v = prompt('Where should this link go?', link.getAttribute('href'));
      if (v !== null && v.trim()) { link.setAttribute('href', v.trim()); setDirty(true); }
    });
    const bUp = btn('←', () => { if (item && item.previousElementSibling) { item.parentNode.insertBefore(item, item.previousElementSibling); setDirty(true); place(); } });
    const bDown = btn('→', () => { if (item && item.nextElementSibling) { item.parentNode.insertBefore(item.nextElementSibling, item); setDirty(true); place(); } });
    const bDup = btn('Duplicate', () => {
      if (!item) return; const c = item.cloneNode(true); item.after(c); setDirty(true);
    });
    const bDel = btn('Delete', () => {
      if (!item) return; if (!confirm('Delete this item?')) return;
      item.remove(); item = null; bar.style.display = 'none'; setDirty(true);
    }, 'danger');
    bar.append(bPhoto, bAlt, bLink, bUp, bDown, bDup, bDel);
    d.body.appendChild(bar);

    function place() {
      const t = img || item || link; if (!t) return;
      const r = t.getBoundingClientRect(), bw = bar.offsetWidth, win = d.defaultView;
      bar.style.left = Math.max(6, Math.min(win.innerWidth - bw - 6, r.right - bw - 6)) + win.scrollX + 'px';
      bar.style.top = Math.max(win.scrollY + 70, r.top + win.scrollY + 6) + 'px';
    }
    main.addEventListener('mouseover', e => {
      const t = e.target;
      const nextImg = t.closest('img'), nextItem = t.closest(REPEAT), nextLink = t.closest('a[href]');
      if (t.closest('.stage,.view-toggle') || (!nextImg && !nextItem && !nextLink)) return;
      clearTimeout(hideT);
      img = nextImg; item = nextItem; link = nextLink;
      bPhoto.style.display = bAlt.style.display = img ? '' : 'none';
      bLink.style.display = link ? '' : 'none';
      [bUp, bDown, bDup, bDel].forEach(b => { b.style.display = item ? '' : 'none'; });
      bar.style.display = 'flex'; place();
    });
    const scheduleHide = () => { clearTimeout(hideT); hideT = setTimeout(() => { bar.style.display = 'none'; }, 500); };
    main.addEventListener('mouseleave', scheduleHide);
    main.addEventListener('mouseout', e => { if (!e.relatedTarget || !e.relatedTarget.closest || !e.relatedTarget.closest(REPEAT + ',img,a[href]')) scheduleHide(); });
    bar.addEventListener('mouseenter', () => clearTimeout(hideT));
    bar.addEventListener('mouseleave', scheduleHide);
  }

  /* ---------- images ---------- */
  $('file').addEventListener('change', async e => {
    const f = e.target.files[0]; e.target.value = '';
    if (f && fileCb) fileCb(f);
  });
  function replaceImage(img) {
    fileCb = async file => {
      try {
        say('Preparing photo…');
        const bmp = await createImageBitmap(file);
        const k = Math.min(1, MAX_IMG / Math.max(bmp.width, bmp.height));
        const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
        c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
        const url = c.toDataURL('image/jpeg', .85);
        const slug = file.name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'photo';
        const path = `assets/img/uploads/${slug}-${Date.now().toString(36)}.jpg`;
        uploads.set(path, url.split(',')[1]);
        img.src = url; img.dataset.adminSrc = path; img.width = c.width; img.height = c.height;
        setDirty(true);
      } catch (err) { say('Could not read that photo. Try a JPG or PNG.', 'bad'); }
    };
    $('file').click();
  }

  /* ---------- build the saved page ---------- */
  function escAttr(s) { return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function buildPage() {
    const tmp = new DOMParser().parseFromString(source, 'text/html');
    const main = doc.getElementById('main').cloneNode(true);
    // the 3D stage and toggle are rebuilt by script at load: always save them as they were
    const st = main.querySelector('.stage'), srcSt = tmp.querySelector('.stage');
    if (st && srcSt) st.replaceWith(doc.importNode(srcSt, true));
    const vt = main.querySelector('.view-toggle'), srcVt = tmp.querySelector('.view-toggle');
    if (vt && srcVt) vt.replaceWith(doc.importNode(srcVt, true));
    main.querySelectorAll('[data-admin-edit]').forEach(e => { e.removeAttribute('data-admin-edit'); e.removeAttribute('contenteditable'); e.removeAttribute('spellcheck'); });
    main.querySelectorAll('[data-admin-src]').forEach(i => { i.setAttribute('src', i.dataset.adminSrc); i.removeAttribute('data-admin-src'); });
    // counters animate up to data-count
    main.querySelectorAll('[data-count]').forEach(e => {
      const n = parseFloat(e.textContent.replace(/,/g, ''));
      if (!isNaN(n)) { e.dataset.count = String(n); const dec = (e.textContent.split('.')[1] || '').length; if (dec) e.dataset.dec = String(dec); else e.removeAttribute('data-dec'); }
    });
    // the marquee's second track mirrors the first
    main.querySelectorAll('.trusted').forEach(t => { const tr = t.querySelectorAll('.trusted-track'); if (tr[1]) tr[1].innerHTML = tr[0].innerHTML; });
    // the hero always opens on its default tab
    const tabs = main.querySelectorAll('.tab');
    if (tabs.length) {
      const def = [...tabs].find(t => t.dataset.id === 'cells') || tabs[0];
      tabs.forEach(t => { t.setAttribute('aria-selected', t === def ? 'true' : 'false'); t.tabIndex = t === def ? 0 : -1; });
      const cmd = main.querySelector('.cmd-text'); if (cmd) cmd.textContent = def.dataset.cmd || '';
    }
    let html = source.replace(/(<main id="main">)[\s\S]*?(<\/main>)/, (_, a, b) => `${a}\n${main.innerHTML.trim()}\n${b}`);
    if (seo) {
      const t = escAttr(seo.title), desc = escAttr(seo.desc);
      html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${t}</title>`)
        .replace(/<meta name="description" content="[^"]*">/, () => `<meta name="description" content="${desc}">`)
        .replace(/<meta property="og:title" content="[^"]*">/, () => `<meta property="og:title" content="${t}">`)
        .replace(/<meta property="og:description" content="[^"]*">/, () => `<meta property="og:description" content="${desc}">`);
    }
    return html;
  }

  /* ---------- publish ---------- */
  $('save').addEventListener('click', async () => {
    if (!doc) return;
    const btn = $('save'); btn.disabled = true; $('discard').disabled = true;
    try {
      say('Publishing…');
      const html = buildPage();
      const label = $('page').selectedOptions[0].textContent;
      // photos first (in batches that fit a request), then the page that uses them
      const used = [...uploads].filter(([p]) => html.includes(p));
      let batch = [], size = 0;
      for (const [path, content] of used) {
        if (size + content.length > MAX_BATCH && batch.length) { await api('/api/save', { files: batch, message: `Upload photos (${label})` }); batch = []; size = 0; }
        batch.push({ path, content, encoding: 'base64' }); size += content.length;
      }
      if (batch.length) await api('/api/save', { files: batch, message: `Upload photos (${label})` });
      await api('/api/save', { files: [{ path: page, content: html }], message: `Update ${label} page` });
      source = html; uploads = new Map(); seo = null;
      // show uploaded files from memory until they deploy, but remember they're saved
      setDirty(false);
      say('Published. Live in about a minute.', 'ok');
    } catch (err) {
      if (err.message !== 'auth') { say(err.message, 'bad'); btn.disabled = false; $('discard').disabled = false; }
    }
  });

  /* ---------- SEO ---------- */
  $('seo').addEventListener('click', () => {
    const d = doc; if (!d) return;
    $('seo-title').value = seo ? seo.title : (d.querySelector('title')?.textContent || '');
    $('seo-desc').value = seo ? seo.desc : (d.querySelector('meta[name="description"]')?.content || '');
    $('dlg-seo').showModal();
  });
  $('dlg-seo').querySelector('form').addEventListener('submit', e => {
    e.preventDefault();
    const ok = e.submitter && e.submitter.value === 'ok';
    $('dlg-seo').close();
    if (!ok) return;
    seo = { title: $('seo-title').value.trim(), desc: $('seo-desc').value.trim() };
    setDirty(true);
  });

  /* ---------- settings ---------- */
  let settingsSrc = '';
  $('settings').addEventListener('click', async () => {
    try {
      const { content } = await api('/api/source?path=' + encodeURIComponent('assets/js/settings.js'));
      settingsSrc = content;
      const m = content.match(/window\.SITE\s*=\s*(\{[\s\S]*?\});/);
      const s = m ? JSON.parse(m[1]) : {};
      $('s-email').value = s.email || ''; $('s-phone').value = s.phone || ''; $('s-whatsapp').value = s.whatsapp || ''; $('s-endpoint').value = s.formEndpoint || '';
      $('dlg-settings').showModal();
    } catch (err) { if (err.message !== 'auth') say(err.message, 'bad'); }
  });
  $('dlg-settings').querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const ok = e.submitter && e.submitter.value === 'ok';
    $('dlg-settings').close();
    if (!ok) return;
    const next = {
      email: $('s-email').value.trim(), phone: $('s-phone').value.trim(),
      whatsapp: $('s-whatsapp').value.replace(/\D/g, ''), formEndpoint: $('s-endpoint').value.trim(),
    };
    const content = settingsSrc.replace(/window\.SITE\s*=\s*\{[\s\S]*?\};/, () => `window.SITE = ${JSON.stringify(next, null, 2)};`);
    try {
      say('Publishing settings…');
      await api('/api/save', { files: [{ path: 'assets/js/settings.js', content }], message: 'Update contact settings' });
      say('Settings published. Live in about a minute.', 'ok');
    } catch (err) { if (err.message !== 'auth') say(err.message, 'bad'); }
  });

  boot();
})();
