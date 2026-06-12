/* ============================================================
   tech-creator.js v2  –  Diabasen-Verksamhetskarta
   + Fler emojis
   + Papperskorg (ta bort teknik)
   + Redigera (uppdatera tekniksida)
   + Lösenord dolt i checklist tills man klickar
   ============================================================ */

(function () {
  const REPO      = 'sukrutaraj/Diabasen-Verksamhetskarta';
  const BRANCH    = 'main';
  const API       = 'https://api.github.com/repos/' + REPO + '/contents/';
  const BASE      = 'https://raw.githubusercontent.com/' + REPO + '/' + BRANCH + '/';
  const TOKEN_ENC = '330d1b310b5c0772544317515c1f2127065001710013333a5a3363037702605532085a5f005a5b6e';
  const PWD_HASH  = '79b497e2';

  const EMOJI_LIST = [
    // Teknik & datorer
    '💻','🖥️','🖨️','⌨️','🖱️','📱','📲','☎️','📞','📟',
    '📠','📺','📻','🎙️','🎚️','🎛️','📡','🔋','🔌','💡',
    // Musik & ljud
    '🎵','🎶','🎸','🎹','🎺','🎻','🥁','🎤','🎧','🎼',
    // Spel & kreativt
    '🎮','🕹️','🎲','🧩','🃏','♟️','🎯','🎨','✏️','📐',
    // Vetenskap & teknik
    '🔬','🔭','⚗️','🧪','🧬','🤖','⚙️','🔧','🔩','🛠️',
    '🔑','🔐','🔒','💾','💿','📀','🖲️','📷','📸','📹',
    // Transport & rörelse
    '🚗','🚌','🚲','✈️','🚀','🛸','⛵','🚁','🛺','🏎️',
    // Natur & miljö
    '🌱','🌍','⭐','🌈','❄️','🔥','💧','🌊','🌸','🍀',
    // Mat & dryck
    '🍎','🥤','☕','🍕','🎂','🍭','🥗','🍳','🧁','🍇',
    // Aktiviteter & sport
    '⚽','🏀','🎾','🏊','🧘','🤸','🎭','🎪','🏋️','🤼',
    // Skolmaterial & kontor
    '📚','📖','📝','📌','📎','🗂️','📊','📈','🗒️','🗃️',
    // Känslor & symboler
    '⭐','💫','✨','❤️','👍','🙌','💪','🧠','👁️','🎁',
  ];

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
  function slugify(str) {
    return str.toLowerCase()
      .replace(/å/g,'a').replace(/ä/g,'a').replace(/ö/g,'o')
      .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  }
  function escHtml(s) {
    return String(s).replace(/[&<>"']/g, c =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // --- GitHub API ---
  async function ghGetFile(path, token) {
    try {
      const headers = { 'Accept': 'application/vnd.github.v3+json' };
      if (token) headers['Authorization'] = 'token ' + token;
      const r = await fetch(API + path + '?ref=' + BRANCH, { headers });
      if (!r.ok) return null;
      return r.json();
    } catch(e) { return null; }
  }
  async function ghPutWithSha(path, content, sha, message, token) {
    const body = { message, content: btoa(unescape(encodeURIComponent(content))), branch: BRANCH };
    if (sha) body.sha = sha;
    const r = await fetch(API + path, {
      method: 'PUT',
      headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || r.status); }
    return r.json();
  }
  async function ghDelete(path, sha, message, token) {
    const r = await fetch(API + path, {
      method: 'DELETE',
      headers: { 'Authorization': 'token ' + token, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' },
      body: JSON.stringify({ message, sha, branch: BRANCH })
    });
    if (!r.ok) throw new Error('Borttagning: ' + r.status);
  }

  // --- HTML-generering ---
  function generateTechPage(data) {
    const { techName, emoji, groupId, groupName, backUrl, intro1, intro2, usageItems } = data;
    const usageList = usageItems.filter(u => u.trim())
      .map(u => `                    <li>${escHtml(u.trim())}</li>`).join('\n');
    return `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escHtml(techName)} – ${escHtml(groupName)}</title>
    <link rel="stylesheet" href="../css/style.css">
    <link rel="stylesheet" href="../css/checklist.css">
</head>
<body>
<div class="page-container">
    <div class="back-link">
        <a href="${backUrl}">← Tillbaka till Teknik i rummet</a>
    </div>
    <div class="read-top">
        <button class="read-button stop-button" onclick="toggleRead()">🔊 Svenska</button>
        <button class="read-button read-btn-en" onclick="readEnglish()">🔊 English</button>
        <button class="read-button read-btn-ar" onclick="readArabic()">🔊 العربية</button>
        <button class="read-button read-btn-so" onclick="readSomali()">🔊 Somali</button>
    </div>
    <h1 class="page-title">${escHtml(techName.toUpperCase())}</h1>
    <div class="readable-content">
        <div class="content-card">
            <p class="intro-text">${escHtml(intro1)}</p>
${intro2 ? `            <p class="intro-text">${escHtml(intro2)}</p>` : ''}
            <h2>Hur vi använder ${escHtml(techName)}</h2>
            <div class="tech-description">
                <ul>
${usageList}
                </ul>
            </div>
            <h2>Kom igång</h2>
            <p>Här finns checklistor för hur man använder ${escHtml(techName)} på ett tryggt sätt.</p>
            <div class="cl-widget"></div>
        </div>
    </div>
</div>
<script src="../js/read.js"></script>
<script src="../js/checklist.js"></script>
</body>
</html>`;
  }

  // Lägg till tech-item i gruppsidans HTML
  function addTechItemToPage(pageHtml, techName, emoji, techFile) {
    const newItem = `
            <a href="../tech/${techFile}.html" class="tech-item">
                <div class="tech-icon">${emoji}</div>
                <div class="tech-label">${escHtml(techName)}</div>
            </a>`;
    const marker = '\n        <!-- Avdelare -->';
    const gridEnd = pageHtml.lastIndexOf('</div>', pageHtml.indexOf(marker));
    if (gridEnd !== -1) {
      return pageHtml.slice(0, gridEnd) + newItem + '\n\n        </div>' + pageHtml.slice(gridEnd + 6);
    }
    return pageHtml;
  }

  // Ta bort tech-item från gruppsidans HTML
  function removeTechItemFromPage(pageHtml, techFile) {
    const regex = new RegExp(
      `\\s*<a href="\\.\\./tech/${techFile}\\.html"[^>]*class="tech-item"[^>]*>[\\s\\S]*?</a>`, 'g'
    );
    return pageHtml.replace(regex, '');
  }

  // Uppdatera tech-item i gruppsidans HTML (emoji + namn)
  function updateTechItemInPage(pageHtml, techFile, techName, emoji) {
    const regex = new RegExp(
      `(<a href="\\.\\./tech/${techFile}\\.html"[^>]*class="tech-item"[^>]*>[\\s\\S]*?<div class="tech-icon">)[^<]*(</div>[\\s\\S]*?<div class="tech-label">)[^<]*(</div>[\\s\\S]*?</a>)`
    );
    return pageHtml.replace(regex, `$1${emoji}$2${escHtml(techName)}$3`);
  }

  // ============================================================
  // LÖSENORDSMODAL (gemensam hjälpfunktion)
  // ============================================================
  function askPassword(title, onSuccess) {
    const overlay = document.createElement('div');
    overlay.className = 'tc-overlay';
    overlay.innerHTML = `
      <div class="tc-modal" style="max-width:340px">
        <div class="tc-modal-header">
          <span class="tc-modal-title">${title}</span>
          <button class="tc-close">✕</button>
        </div>
        <div class="tc-step">
          <label class="tc-label">Lösenord</label>
          <input type="password" class="tc-input tc-pwd" placeholder="Ange lösenord" />
          <button class="tc-btn tc-ok-btn">Bekräfta</button>
          <div class="tc-err" style="display:none"></div>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
    overlay.querySelector('.tc-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    const confirm = () => {
      const pwd = overlay.querySelector('.tc-pwd').value.trim();
      const err = overlay.querySelector('.tc-err');
      if (!pwd) { err.textContent = 'Ange lösenord.'; err.style.display = 'block'; return; }
      if (!checkPwd(pwd)) { err.textContent = 'Fel lösenord!'; err.style.display = 'block'; overlay.querySelector('.tc-pwd').value = ''; return; }
      overlay.remove();
      onSuccess(decodeToken(TOKEN_ENC, pwd));
    };
    overlay.querySelector('.tc-ok-btn').addEventListener('click', confirm);
    overlay.querySelector('.tc-pwd').addEventListener('keydown', e => { if (e.key === 'Enter') confirm(); });
    overlay.querySelector('.tc-pwd').focus();
  }

  // ============================================================
  // SKAPA / REDIGERA MODAL
  // ============================================================
  function openEditorModal(container, existingData) {
    const groupId   = container.dataset.group;
    const groupName = container.dataset.name;
    const backUrl   = container.dataset.back || '../groups/' + groupId + '-teknik.html';
    const techFile  = container.dataset.file;
    const isEdit    = !!existingData;
    const title     = isEdit ? '✏️ Redigera teknik' : '➕ Lägg till ny teknik';

    const overlay = document.createElement('div');
    overlay.className = 'tc-overlay';
    overlay.innerHTML = `
      <div class="tc-modal">
        <div class="tc-modal-header">
          <span class="tc-modal-title">${title}</span>
          <button class="tc-close">✕</button>
        </div>

        <div class="tc-step" id="tc-step1">
          <label class="tc-label">Lösenord</label>
          <input type="password" class="tc-input tc-pwd" placeholder="Ange lösenord" />
          <button class="tc-btn tc-next-btn">Fortsätt →</button>
          <div class="tc-err" style="display:none"></div>
        </div>

        <div class="tc-step" id="tc-step2" style="display:none">
          <label class="tc-label">Välj emoji</label>
          <div class="tc-emoji-grid">
            ${EMOJI_LIST.map(e => `<button class="tc-emoji-btn" data-emoji="${e}">${e}</button>`).join('')}
          </div>
          <div class="tc-selected-emoji">Vald: <span class="tc-emoji-preview">${isEdit ? existingData.emoji : '–'}</span></div>

          <label class="tc-label">Namn på tekniken</label>
          <input type="text" class="tc-input tc-techname" placeholder="T.ex. VR-headset" value="${isEdit ? escHtml(existingData.techName) : ''}" />

          <label class="tc-label">Beskrivning (mening 1)</label>
          <textarea class="tc-input tc-intro1" rows="2" placeholder="Beskriv vad tekniken är...">${isEdit ? escHtml(existingData.intro1) : ''}</textarea>

          <label class="tc-label">Beskrivning (mening 2, valfritt)</label>
          <textarea class="tc-input tc-intro2" rows="2" placeholder="Ytterligare beskrivning...">${isEdit ? escHtml(existingData.intro2 || '') : ''}</textarea>

          <label class="tc-label">Hur ni använder den (en rad per punkt)</label>
          <textarea class="tc-input tc-usage" rows="5" placeholder="Träna koordination&#10;Arbeta kreativt">${isEdit ? existingData.usageItems.join('\n') : ''}</textarea>

          <button class="tc-btn tc-save-btn">${isEdit ? '💾 Spara ändringar' : '✅ Skapa tekniksida'}</button>
          <div class="tc-err" style="display:none"></div>
          <div class="tc-progress" style="display:none">
            <div class="tc-progress-bar"><div class="tc-progress-fill"></div></div>
            <div class="tc-progress-msg">Arbetar…</div>
          </div>
        </div>

        <div class="tc-step" id="tc-step3" style="display:none">
          <div class="tc-success">
            <div class="tc-success-icon">${isEdit ? '✏️' : '✅'}</div>
            <div class="tc-success-msg">${isEdit ? 'Ändringarna är sparade!' : 'Tekniksidan är skapad!'}</div>
            <div class="tc-success-sub">Syns inom 1–2 minuter på GitHub Pages.</div>
            <button class="tc-btn tc-done-btn">Stäng</button>
          </div>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));

    let selectedEmoji = isEdit ? existingData.emoji : '';
    let unlockedToken = '';

    // Om redigering – markera befintlig emoji
    if (isEdit && existingData.emoji) {
      const btn = overlay.querySelector(`.tc-emoji-btn[data-emoji="${existingData.emoji}"]`);
      if (btn) btn.classList.add('selected');
    }

    overlay.querySelector('.tc-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    overlay.querySelectorAll('.tc-emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.tc-emoji-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedEmoji = btn.dataset.emoji;
        overlay.querySelector('.tc-emoji-preview').textContent = selectedEmoji;
      });
    });

    // Steg 1
    const step1Err = overlay.querySelector('#tc-step1 .tc-err');
    overlay.querySelector('.tc-next-btn').addEventListener('click', () => {
      const pwd = overlay.querySelector('.tc-pwd').value.trim();
      if (!pwd) { step1Err.textContent = 'Ange lösenord.'; step1Err.style.display = 'block'; return; }
      if (!checkPwd(pwd)) { step1Err.textContent = 'Fel lösenord!'; step1Err.style.display = 'block'; return; }
      unlockedToken = decodeToken(TOKEN_ENC, pwd);
      overlay.querySelector('#tc-step1').style.display = 'none';
      overlay.querySelector('#tc-step2').style.display = 'block';
    });
    overlay.querySelector('.tc-pwd').addEventListener('keydown', e => { if (e.key === 'Enter') overlay.querySelector('.tc-next-btn').click(); });

    // Steg 2 – spara
    overlay.querySelector('.tc-save-btn').addEventListener('click', async () => {
      const step2Err   = overlay.querySelector('#tc-step2 .tc-err');
      const techName   = overlay.querySelector('.tc-techname').value.trim();
      const intro1     = overlay.querySelector('.tc-intro1').value.trim();
      const intro2     = overlay.querySelector('.tc-intro2').value.trim();
      const usageItems = overlay.querySelector('.tc-usage').value.trim().split('\n').filter(u => u.trim());

      if (!selectedEmoji) { step2Err.textContent = 'Välj en emoji.'; step2Err.style.display = 'block'; return; }
      if (!techName)       { step2Err.textContent = 'Ange ett namn.'; step2Err.style.display = 'block'; return; }
      if (!intro1)         { step2Err.textContent = 'Ange en beskrivning.'; step2Err.style.display = 'block'; return; }
      if (!usageItems.length) { step2Err.textContent = 'Ange minst ett användningsområde.'; step2Err.style.display = 'block'; return; }

      step2Err.style.display = 'none';
      overlay.querySelector('.tc-save-btn').disabled = true;
      const progress    = overlay.querySelector('.tc-progress');
      const progressFill = overlay.querySelector('.tc-progress-fill');
      const progressMsg  = overlay.querySelector('.tc-progress-msg');
      progress.style.display = 'block';

      function setProgress(pct, msg) {
        progressFill.style.width = pct + '%';
        progressMsg.textContent = msg;
      }

      try {
        const fileSlug = isEdit ? existingData.fileSlug : groupId + '-' + slugify(techName);

        // 1. Skapa/uppdatera tech-sidan
        setProgress(20, isEdit ? 'Uppdaterar tekniksida…' : 'Skapar tekniksida…');
        const pageHtml = generateTechPage({ techName, emoji: selectedEmoji, groupId, groupName, backUrl, intro1, intro2, usageItems });
        const existingPage = await ghGetFile('tech/' + fileSlug + '.html', unlockedToken);
        await ghPutWithSha('tech/' + fileSlug + '.html', pageHtml, existingPage?.sha || null, (isEdit ? 'Uppdatera' : 'Ny') + ' teknik: ' + techName, unlockedToken);

        // 2. Uppdatera gruppsidan
        setProgress(55, 'Uppdaterar tekniklistan…');
        if (techFile) {
          const existingGroup = await ghGetFile(techFile, unlockedToken);
          if (existingGroup) {
            let currentHtml = decodeURIComponent(escape(atob(existingGroup.content.replace(/\n/g,''))));
            if (isEdit) {
              currentHtml = updateTechItemInPage(currentHtml, fileSlug, techName, selectedEmoji);
            } else {
              currentHtml = addTechItemToPage(currentHtml, techName, selectedEmoji, fileSlug);
            }
            await ghPutWithSha(techFile, currentHtml, existingGroup.sha, (isEdit ? 'Uppdatera' : 'Lägg till') + ' ' + techName + ' i tekniklistan', unlockedToken);
          }
        }

        // 3. Spara/uppdatera metadata
        setProgress(80, 'Sparar metadata…');
        const metaFile = 'tech-meta/meta_' + fileSlug + '.json';
        const existingMeta = await ghGetFile(metaFile, unlockedToken);
        const meta = { id: existingMeta ? JSON.parse(decodeURIComponent(escape(atob(existingMeta.content.replace(/\n/g,''))))).id : Date.now(), techName, emoji: selectedEmoji, groupId, groupName, file: fileSlug, intro1, intro2, usageItems, date: new Date().toISOString() };
        await ghPutWithSha(metaFile, JSON.stringify(meta, null, 2), existingMeta?.sha || null, 'Teknikmeta: ' + techName, unlockedToken);

        setProgress(100, 'Klart!');
        await new Promise(r => setTimeout(r, 400));
        overlay.querySelector('#tc-step2').style.display = 'none';
        overlay.querySelector('#tc-step3').style.display = 'block';

      } catch(e) {
        step2Err.textContent = 'Fel: ' + e.message;
        step2Err.style.display = 'block';
        progress.style.display = 'none';
        overlay.querySelector('.tc-save-btn').disabled = false;
      }
    });

    overlay.querySelector('.tc-done-btn').addEventListener('click', () => { overlay.remove(); window.location.reload(); });
  }

  // ============================================================
  // TA BORT TEKNIK
  // ============================================================
  async function deleteTech(fileSlug, techName, techFile, token) {
    // 1. Ta bort tech-sidan
    const page = await ghGetFile('tech/' + fileSlug + '.html', token);
    if (page) await ghDelete('tech/' + fileSlug + '.html', page.sha, 'Ta bort teknik: ' + techName, token);

    // 2. Ta bort från gruppsidan
    if (techFile) {
      const groupPage = await ghGetFile(techFile, token);
      if (groupPage) {
        const currentHtml = decodeURIComponent(escape(atob(groupPage.content.replace(/\n/g,''))));
        const updatedHtml = removeTechItemFromPage(currentHtml, fileSlug);
        await ghPutWithSha(techFile, updatedHtml, groupPage.sha, 'Ta bort ' + techName + ' från tekniklistan', token);
      }
    }

    // 3. Ta bort metadata
    const meta = await ghGetFile('tech-meta/meta_' + fileSlug + '.json', token);
    if (meta) await ghDelete('tech-meta/meta_' + fileSlug + '.json', meta.sha, 'Ta bort meta: ' + techName, token);
  }

  // ============================================================
  // HÄMTA METADATA & LÄGG TILL KNAPPAR PÅ BEFINTLIGA IKONER
  // ============================================================
  async function addManagementButtons(container) {
    const techFile = container.dataset.file;
    try {
      // Hämta alla meta-filer
      const headers = { 'Accept': 'application/vnd.github.v3+json' };
      const r = await fetch(API + 'tech-meta?ref=' + BRANCH, { headers });
      if (!r.ok) return;
      const files = await r.json();
      const metaFiles = files.filter(f => f.name.startsWith('meta_') && f.name.endsWith('.json'));

      for (const mf of metaFiles) {
        const resp = await fetch(BASE + 'tech-meta/' + mf.name);
        if (!resp.ok) continue;
        const meta = await resp.json();

        // Hitta matchande tech-item på sidan
        const link = document.querySelector(`a[href="../tech/${meta.file}.html"]`);
        if (!link) continue;

        // Lägg till knappar om de inte redan finns
        if (link.querySelector('.tc-manage-btns')) continue;

        const btns = document.createElement('div');
        btns.className = 'tc-manage-btns';
        btns.innerHTML = `
          <button class="tc-edit-btn" title="Redigera">✏️</button>
          <button class="tc-del-btn" title="Ta bort">🗑️</button>
        `;

        btns.querySelector('.tc-edit-btn').addEventListener('click', async (e) => {
          e.preventDefault();
          askPassword('✏️ Redigera – ' + meta.techName, (token) => {
            openEditorModal(container, {
              fileSlug: meta.file, techName: meta.techName, emoji: meta.emoji,
              intro1: meta.intro1 || '', intro2: meta.intro2 || '',
              usageItems: meta.usageItems || []
            });
          });
        });

        btns.querySelector('.tc-del-btn').addEventListener('click', async (e) => {
          e.preventDefault();
          if (!confirm(`Ta bort "${meta.techName}"? Detta går inte att ångra.`)) return;
          askPassword('🗑️ Ta bort – ' + meta.techName, async (token) => {
            const feedback = document.createElement('div');
            feedback.className = 'tc-deleting-msg';
            feedback.textContent = 'Tar bort…';
            link.style.opacity = '0.4';
            document.body.appendChild(feedback);
            try {
              await deleteTech(meta.file, meta.techName, techFile, token);
              feedback.remove();
              window.location.reload();
            } catch(err) {
              feedback.remove();
              link.style.opacity = '1';
              alert('Fel vid borttagning: ' + err.message);
            }
          });
        });

        link.style.position = 'relative';
        link.appendChild(btns);
      }
    } catch(e) {}
  }

  // ============================================================
  // INITIERA
  // ============================================================
  function init() {
    document.querySelectorAll('.tc-trigger').forEach(container => {
      // Lägg till-knapp
      const btn = document.createElement('button');
      btn.className = 'tc-add-btn';
      btn.innerHTML = '➕ Lägg till ny teknik';
      btn.addEventListener('click', () => openEditorModal(container, null));
      container.appendChild(btn);

      // Hantera-knappar på befintliga ikoner
      addManagementButtons(container);
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
