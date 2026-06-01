/* ============================================================
   checklist.js  –  Diabasen-Verksamhetskarta
   Checklista-bibliotek via GitHub API
   ============================================================ */

(function () {
  const REPO   = 'sukrutaraj/Diabasen-Verksamhetskarta';
  const BRANCH = 'main';
  const FOLDER = 'checklists';
  const BASE   = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/';
  const API    = 'https://api.github.com/repos/' + REPO + '/contents/';

  const TOKEN_ENC = '330d1b310b5c0772544317515c1f2127065001710013333a5a3363037702605532085a5f005a5b6e';
  const PWD_HASH  = '79b497e2';

  function checkPwd(pwd) {
    let h = 0;
    for (let i = 0; i < pwd.length; i++) h = (Math.imul(31, h) + pwd.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16) === PWD_HASH;
  }

  function xorStr(str, key) {
    let out = '';
    for (let i = 0; i < str.length; i++)
      out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    return out;
  }

  function decodeToken(enc, pwd) {
    const bytes = enc.match(/.{1,2}/g).map(h => String.fromCharCode(parseInt(h, 16)));
    return xorStr(bytes.join(''), pwd);
  }

  async function ghGet(path, token) {
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = 'token ' + token;
    const r = await fetch(API + path + '?ref=' + BRANCH, { headers });
    if (!r.ok) throw new Error('GitHub GET: ' + r.status);
    return r.json();
  }

  async function ghPut(path, content, sha, message, token) {
    const body = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
      branch: BRANCH
    };
    if (sha) body.sha = sha;
    const r = await fetch(API + path, {
      method: 'PUT',
      headers: {
        'Authorization': 'token ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.message || r.status);
    }
    return r.json();
  }

  async function ghDelete(path, sha, message, token) {
    const r = await fetch(API + path, {
      method: 'DELETE',
      headers: {
        'Authorization': 'token ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({ message, sha, branch: BRANCH })
    });
    if (!r.ok) throw new Error('Borttagning: ' + r.status);
  }

  async function fetchChecklists() {
    try {
      const files = await ghGet(FOLDER);
      const metaFiles = files.filter(f => f.name.startsWith('meta_') && f.name.endsWith('.json'));
      const items = [];
      for (const mf of metaFiles) {
        try {
          const r = await fetch(BASE + FOLDER + '/' + mf.name);
          if (!r.ok) continue;
          const meta = await r.json();
          items.push({ ...meta, _file: mf.name, _sha: mf.sha });
        } catch (e) {}
      }
      return items;
    } catch (e) {
      return [];
    }
  }

  async function saveChecklist(title, url, addedBy, token) {
    const id   = Date.now();
    const meta = { id, title, url, addedBy, date: new Date().toISOString() };
    const filename = FOLDER + '/meta_' + id + '.json';
    await ghPut(filename, JSON.stringify(meta, null, 2), null, 'Lägg till checklista: ' + title, token);
    return meta;
  }

  async function deleteChecklist(item, token) {
    await ghDelete(FOLDER + '/' + item._file, item._sha, 'Ta bort checklista: ' + item.title, token);
  }

  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])
    );
  }

  function renderWidget(container) {
    container.innerHTML = `
      <div class="cl-box">
        <h2 class="cl-heading"><span class="cl-icon">📋</span> Checklistor</h2>
        <div class="cl-list" id="cl-list-${container.dataset.id}">
          <div class="cl-loading">Laddar checklistor…</div>
        </div>
        <details class="cl-add-section">
          <summary class="cl-add-toggle">+ Lägg till checklista</summary>
          <div class="cl-add-form">
            <label class="cl-label">Lösenord</label>
            <input type="password" class="cl-input cl-pwd" placeholder="Ange lösenord" />
            <label class="cl-label">Titel</label>
            <input type="text" class="cl-input cl-title" placeholder="T.ex. Morgonrutin" />
            <label class="cl-label">Länk till checklistan</label>
            <input type="url" class="cl-input cl-url" placeholder="https://sukrutaraj.github.io/digital-checklist-maker/…" />
            <label class="cl-label">Ditt namn</label>
            <input type="text" class="cl-input cl-name" placeholder="Förnamn" />
            <button class="cl-btn cl-save-btn">Spara checklista</button>
            <div class="cl-msg" style="display:none"></div>
          </div>
        </details>
      </div>
    `;

    const listEl     = container.querySelector('.cl-list');
    const savBtn     = container.querySelector('.cl-save-btn');
    const msgEl      = container.querySelector('.cl-msg');
    const pwdInput   = container.querySelector('.cl-pwd');
    const titleInput = container.querySelector('.cl-title');
    const urlInput   = container.querySelector('.cl-url');
    const nameInput  = container.querySelector('.cl-name');

    function showMsg(text, ok) {
      msgEl.textContent = text;
      msgEl.style.display = 'block';
      msgEl.className = 'cl-msg ' + (ok ? 'cl-msg-ok' : 'cl-msg-err');
    }

    async function loadList() {
      listEl.innerHTML = '<div class="cl-loading">Laddar…</div>';
      const items = await fetchChecklists();
      if (items.length === 0) {
        listEl.innerHTML = '<div class="cl-empty">Inga checklistor tillagda ännu.</div>';
        return;
      }
      listEl.innerHTML = '';
      items.sort((a, b) => b.id - a.id);
      items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'cl-item';
        div.innerHTML = `
          <a href="${item.url}" target="_blank" rel="noopener" class="cl-link">
            <span class="cl-item-icon">✅</span>
            <span class="cl-item-title">${escHtml(item.title)}</span>
          </a>
          <span class="cl-item-meta">Tillagd av ${escHtml(item.addedBy || '?')}</span>
          <button class="cl-del-btn" title="Ta bort">🗑</button>
        `;
        div.querySelector('.cl-del-btn').addEventListener('click', async () => {
          const pwd = prompt('Lösenord för att ta bort:');
          if (!pwd) return;
          if (!checkPwd(pwd)) { alert('Fel lösenord!'); return; }
          const token = decodeToken(TOKEN_ENC, pwd);
          div.style.opacity = '0.5';
          try {
            await deleteChecklist(item, token);
            loadList();
          } catch (e) {
            alert('Fel: ' + e.message);
            div.style.opacity = '1';
          }
        });
        listEl.appendChild(div);
      });
    }

    savBtn.addEventListener('click', async () => {
      const pwd   = pwdInput.value.trim();
      const title = titleInput.value.trim();
      const url   = urlInput.value.trim();
      const name  = nameInput.value.trim();
      if (!pwd || !title || !url) { showMsg('Fyll i lösenord, titel och länk.', false); return; }
      if (!checkPwd(pwd)) { showMsg('Fel lösenord!', false); return; }
      const token = decodeToken(TOKEN_ENC, pwd);
      savBtn.disabled = true;
      savBtn.textContent = 'Sparar…';
      try {
        await saveChecklist(title, url, name || 'Okänd', token);
        showMsg('✅ Checklistan är sparad!', true);
        titleInput.value = urlInput.value = nameInput.value = '';
        loadList();
      } catch (e) {
        showMsg('Fel: ' + e.message, false);
      } finally {
        savBtn.disabled = false;
        savBtn.textContent = 'Spara checklista';
      }
    });

    loadList();
  }

  function init() {
    document.querySelectorAll('.cl-widget').forEach((el, i) => {
      el.dataset.id = i;
      renderWidget(el);
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
