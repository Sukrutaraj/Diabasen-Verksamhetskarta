/* ============================================================
   tech-creator.js  –  Diabasen-Verksamhetskarta
   Låter personal skapa nya tekniksidor via GitHub API
   ============================================================ */

(function () {
  const REPO      = 'sukrutaraj/Diabasen-Verksamhetskarta';
  const BRANCH    = 'main';
  const API       = 'https://api.github.com/repos/' + REPO + '/contents/';
  const TOKEN_ENC = '330d1b310b5c0772544317515c1f2127065001710013333a5a3363037702605532085a5f005a5b6e';
  const PWD_HASH  = '79b497e2';

  // Vanliga emojis att välja bland
  const EMOJI_LIST = [
    '💻','🖥️','📱','🖨️','🎵','🎮','📷','📹','🎙️','🎧',
    '🖱️','⌨️','📡','📺','🔊','🎛️','🤖','🔬','⚡','🔋',
    '📟','☎️','📠','🖲️','💾','💿','📀','🕹️','🔭','📡',
    '🧰','🔧','🔩','⚙️','🛠️','📲','🌐','📅','🗓️','📋'
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

  async function ghGet(path, token) {
    const headers = { 'Accept': 'application/vnd.github.v3+json' };
    if (token) headers['Authorization'] = 'token ' + token;
    const r = await fetch(API + path + '?ref=' + BRANCH, { headers });
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  async function ghPut(path, content, message, token) {
    const r = await fetch(API + path, {
      method: 'PUT',
      headers: {
        'Authorization': 'token ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify({
        message,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: BRANCH
      })
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || r.status); }
    return r.json();
  }

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
      headers: {
        'Authorization': 'token ' + token,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json'
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.message || r.status); }
    return r.json();
  }

  function slugify(str) {
    return str.toLowerCase()
      .replace(/å/g,'a').replace(/ä/g,'a').replace(/ö/g,'o')
      .replace(/[^a-z0-9]+/g,'-')
      .replace(/^-|-$/g,'');
  }

  // Generera HTML för den nya tekniksidan
  function generateTechPage(data) {
    const { techName, emoji, groupId, groupName, backUrl, intro1, intro2, usageItems } = data;
    const usageList = usageItems
      .filter(u => u.trim())
      .map(u => `                    <li>${u.trim()}</li>`)
      .join('\n');

    return `<!DOCTYPE html>
<html lang="sv">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${techName} – ${groupName}</title>
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

    <h1 class="page-title">${techName.toUpperCase()}</h1>

    <div class="readable-content">
        <div class="content-card">

            <p class="intro-text">
                ${intro1}
            </p>
${intro2 ? `
            <p class="intro-text">
                ${intro2}
            </p>` : ''}

            <h2>Hur vi använder ${techName}</h2>

            <div class="tech-description">
                <ul>
${usageList}
                </ul>
            </div>

            <h2>Kom igång</h2>

            <p>
                Här finns checklistor för hur man använder ${techName} på ett tryggt sätt.
            </p>

            <div class="cl-widget"></div>

        </div>
    </div>

</div>

<script src="../js/read.js"></script>
<script src="../js/checklist.js"></script>

</body>
</html>`;
  }

  // Lägg till nytt tech-item i gruppsidan HTML
  function addTechItemToPage(pageHtml, techName, emoji, techFile) {
    const newItem = `
            <a href="../tech/${techFile}.html" class="tech-item">
                <div class="tech-icon">${emoji}</div>
                <div class="tech-label">${techName}</div>
            </a>`;

    // Hitta slutet av tech-grid och lägg till före </div>
    const marker = '</div>\n\n        <!-- Avdelare -->';
    if (pageHtml.includes(marker)) {
      return pageHtml.replace(marker, newItem + '\n\n        </div>\n\n        <!-- Avdelare -->');
    }
    // Fallback: hitta sista tech-item och lägg efter
    const lastItem = pageHtml.lastIndexOf('</a>\n\n            </div>');
    if (lastItem !== -1) {
      return pageHtml.slice(0, lastItem + 4) + newItem + '\n\n            </div>' + pageHtml.slice(lastItem + 24);
    }
    return pageHtml;
  }

  // ============================================================
  // MODAL UI
  // ============================================================
  function createModal(container) {
    const groupId   = container.dataset.group;   // t.ex. "grupp1"
    const groupName = container.dataset.name;    // t.ex. "Grupp 1"
    const backUrl   = container.dataset.back;    // t.ex. "../groups/grupp1-teknik.html"
    const techFile  = container.dataset.file;    // t.ex. "groups/grupp1-teknik.html" (för uppdatering)

    const overlay = document.createElement('div');
    overlay.className = 'tc-overlay';
    overlay.innerHTML = `
      <div class="tc-modal">
        <div class="tc-modal-header">
          <span class="tc-modal-title">➕ Lägg till ny teknik</span>
          <button class="tc-close">✕</button>
        </div>

        <div class="tc-step" id="tc-step1">
          <label class="tc-label">Lösenord</label>
          <input type="password" class="tc-input tc-pwd" placeholder="Ange lösenord" />
          <button class="tc-btn tc-next-btn">Fortsätt →</button>
          <div class="tc-err" style="display:none"></div>
        </div>

        <div class="tc-step" id="tc-step2" style="display:none">
          <label class="tc-label">Välj emoji för tekniken</label>
          <div class="tc-emoji-grid">
            ${EMOJI_LIST.map(e => `<button class="tc-emoji-btn" data-emoji="${e}">${e}</button>`).join('')}
          </div>
          <div class="tc-selected-emoji">Vald: <span class="tc-emoji-preview">–</span></div>

          <label class="tc-label">Namn på tekniken</label>
          <input type="text" class="tc-input tc-techname" placeholder="T.ex. VR-headset" />

          <label class="tc-label">Beskrivning (mening 1)</label>
          <textarea class="tc-input tc-intro1" rows="2" placeholder="Beskriv vad tekniken är och hur den används i gruppen..."></textarea>

          <label class="tc-label">Beskrivning (mening 2, valfritt)</label>
          <textarea class="tc-input tc-intro2" rows="2" placeholder="Ytterligare beskrivning..."></textarea>

          <label class="tc-label">Hur ni använder den (en rad per punkt)</label>
          <textarea class="tc-input tc-usage" rows="4" placeholder="Träna koordination&#10;Arbeta kreativt&#10;Samarbeta i grupp"></textarea>

          <button class="tc-btn tc-save-btn">✅ Skapa tekniksida</button>
          <div class="tc-err" style="display:none"></div>
          <div class="tc-progress" style="display:none">
            <div class="tc-progress-bar"><div class="tc-progress-fill"></div></div>
            <div class="tc-progress-msg">Skapar sida…</div>
          </div>
        </div>

        <div class="tc-step" id="tc-step3" style="display:none">
          <div class="tc-success">
            <div class="tc-success-icon">✅</div>
            <div class="tc-success-msg">Tekniksidan är skapad!</div>
            <div class="tc-success-sub">Sidan syns inom 1–2 minuter på GitHub Pages.</div>
            <button class="tc-btn tc-done-btn">Stäng</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    let selectedEmoji = '';
    let unlockedToken = '';

    // Stäng
    overlay.querySelector('.tc-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    // Emoji-val
    overlay.querySelectorAll('.tc-emoji-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.tc-emoji-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedEmoji = btn.dataset.emoji;
        overlay.querySelector('.tc-emoji-preview').textContent = selectedEmoji;
      });
    });

    // Steg 1 – lösenord
    const step1Err = overlay.querySelector('#tc-step1 .tc-err');
    overlay.querySelector('.tc-next-btn').addEventListener('click', () => {
      const pwd = overlay.querySelector('.tc-pwd').value.trim();
      if (!pwd) { step1Err.textContent = 'Ange lösenord.'; step1Err.style.display = 'block'; return; }
      if (!checkPwd(pwd)) { step1Err.textContent = 'Fel lösenord!'; step1Err.style.display = 'block'; return; }
      unlockedToken = decodeToken(TOKEN_ENC, pwd);
      overlay.querySelector('#tc-step1').style.display = 'none';
      overlay.querySelector('#tc-step2').style.display = 'block';
    });
    overlay.querySelector('.tc-pwd').addEventListener('keydown', e => {
      if (e.key === 'Enter') overlay.querySelector('.tc-next-btn').click();
    });

    // Steg 2 – spara
    overlay.querySelector('.tc-save-btn').addEventListener('click', async () => {
      const step2Err  = overlay.querySelector('#tc-step2 .tc-err');
      const techName  = overlay.querySelector('.tc-techname').value.trim();
      const intro1    = overlay.querySelector('.tc-intro1').value.trim();
      const intro2    = overlay.querySelector('.tc-intro2').value.trim();
      const usageRaw  = overlay.querySelector('.tc-usage').value.trim();
      const usageItems = usageRaw.split('\n').filter(u => u.trim());

      if (!selectedEmoji) { step2Err.textContent = 'Välj en emoji.'; step2Err.style.display = 'block'; return; }
      if (!techName)       { step2Err.textContent = 'Ange ett namn.'; step2Err.style.display = 'block'; return; }
      if (!intro1)         { step2Err.textContent = 'Ange en beskrivning.'; step2Err.style.display = 'block'; return; }
      if (usageItems.length === 0) { step2Err.textContent = 'Ange minst ett användningsområde.'; step2Err.style.display = 'block'; return; }

      step2Err.style.display = 'none';
      const saveBtn = overlay.querySelector('.tc-save-btn');
      saveBtn.disabled = true;
      const progress = overlay.querySelector('.tc-progress');
      const progressFill = overlay.querySelector('.tc-progress-fill');
      const progressMsg  = overlay.querySelector('.tc-progress-msg');
      progress.style.display = 'block';

      function setProgress(pct, msg) {
        progressFill.style.width = pct + '%';
        progressMsg.textContent = msg;
      }

      try {
        const fileSlug = groupId + '-' + slugify(techName);

        // 1. Skapa tech-sidan
        setProgress(20, 'Skapar tekniksida…');
        const pageHtml = generateTechPage({
          techName, emoji: selectedEmoji, groupId, groupName,
          backUrl: backUrl || '../groups/' + groupId + '-teknik.html',
          intro1, intro2, usageItems
        });
        await ghPut('tech/' + fileSlug + '.html', pageHtml, 'Ny teknik: ' + techName, unlockedToken);

        // 2. Uppdatera gruppsidan med ny ikon
        setProgress(60, 'Uppdaterar tekniklistan…');
        if (techFile) {
          const existing = await ghGetFile(techFile, unlockedToken);
          if (existing) {
            const currentHtml = decodeURIComponent(escape(atob(existing.content.replace(/\n/g,''))));
            const updatedHtml = addTechItemToPage(currentHtml, techName, selectedEmoji, fileSlug);
            await ghPutWithSha(techFile, updatedHtml, existing.sha, 'Lägg till ' + techName + ' i tekniklistan', unlockedToken);
          }
        }

        // 3. Spara metadata för tekniköversikten
        setProgress(85, 'Sparar till översikt…');
        const meta = {
          id: Date.now(),
          techName, emoji: selectedEmoji,
          groupId, groupName,
          file: fileSlug,
          date: new Date().toISOString()
        };
        await ghPut('tech-meta/meta_' + fileSlug + '.json', JSON.stringify(meta, null, 2), 'Teknikmeta: ' + techName, unlockedToken);

        setProgress(100, 'Klart!');
        await new Promise(r => setTimeout(r, 400));

        overlay.querySelector('#tc-step2').style.display = 'none';
        overlay.querySelector('#tc-step3').style.display = 'block';

      } catch(e) {
        step2Err.textContent = 'Fel: ' + e.message;
        step2Err.style.display = 'block';
        progress.style.display = 'none';
        saveBtn.disabled = false;
      }
    });

    overlay.querySelector('.tc-done-btn').addEventListener('click', () => {
      overlay.remove();
      window.location.reload();
    });

    // Visa modal
    requestAnimationFrame(() => overlay.classList.add('open'));
  }

  // ============================================================
  // INITIERA – lägg till knapp för alla .tc-trigger element
  // ============================================================
  function init() {
    document.querySelectorAll('.tc-trigger').forEach(container => {
      const btn = document.createElement('button');
      btn.className = 'tc-add-btn';
      btn.innerHTML = '➕ Lägg till ny teknik';
      btn.addEventListener('click', () => createModal(container));
      container.appendChild(btn);
    });
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
