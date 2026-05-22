/* =========================
   VERKSAMHETSKARTA – UPPLÄSNING
   Svenska | English | العربية | Somali
   ========================= */

let isReading = false;
let currentSpeech = null;
let currentAudio = null;

/* =========================
   RÖSTER – laddas asynkront
   (mobil och Chrome laddar röster
   efter sidan laddats, därav retry)
   ========================= */

let voices = [];

function loadVoices() {
    voices = speechSynthesis.getVoices();
}

speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

/* Vänta tills röster finns – max 3 sek */
function waitForVoices() {
    return new Promise(resolve => {
        if (speechSynthesis.getVoices().length > 0) {
            voices = speechSynthesis.getVoices();
            resolve();
            return;
        }
        let attempts = 0;
        const interval = setInterval(() => {
            voices = speechSynthesis.getVoices();
            if (voices.length > 0 || attempts > 30) {
                clearInterval(interval);
                resolve();
            }
            attempts++;
        }, 100);
    });
}

/* =========================
   HÄMTA LÄSBAR TEXT
   ========================= */

function getReadableText() {
    const el =
        document.querySelector('.readable-content') ||
        document.querySelector('.readable-content-wrapper');
    return el ? el.innerText.trim() : '';
}

/* =========================
   ÖVERSÄTTNING
   Primär: Google (gtx) – ingen API-nyckel
   Fallback: MyMemory – öppen, ingen CORS
   ========================= */

async function translateText(text, targetLang) {
    /* Primär: Google inofficiell */
    try {
        const url =
            'https://translate.googleapis.com/translate_a/single?client=gtx&sl=sv&tl=' +
            encodeURIComponent(targetLang) +
            '&dt=t&q=' +
            encodeURIComponent(text);
        const res = await fetch(url);
        if (!res.ok) throw new Error('Google translate failed');
        const data = await res.json();
        const result = data[0].map(x => x[0]).join('');
        if (result && result.length > 0) return result;
        throw new Error('Empty result');
    } catch (e) {
        console.warn('Google translate misslyckades, försöker MyMemory:', e);
    }

    /* Fallback: MyMemory (gratis, öppen CORS, 5000 tecken/dag) */
    try {
        /* Korta ner texten om den är lång */
        const shortText = text.length > 500 ? text.slice(0, 500) + '...' : text;
        const url =
            'https://api.mymemory.translated.net/get?q=' +
            encodeURIComponent(shortText) +
            '&langpair=sv|' +
            encodeURIComponent(targetLang);
        const res = await fetch(url);
        const data = await res.json();
        if (data.responseStatus === 200) return data.responseData.translatedText;
    } catch (e) {
        console.warn('MyMemory misslyckades:', e);
    }

    /* Sista utväg: returnera originaltexten */
    return text;
}

/* =========================
   STARTA UPPLÄSNING (Web Speech)
   ========================= */

function startReading(text, langCode) {
    stopAll();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.9;

    /* Matcha röst på språkkod (t.ex. "ar", "ar-SA", "ar-EG") */
    const prefix = langCode.toLowerCase().slice(0, 2);
    const match = voices.find(v => v.lang.toLowerCase().startsWith(prefix));
    if (match) utterance.voice = match;

    utterance.onend  = () => { isReading = false; updateButtons(); };
    utterance.onerror = (e) => {
        console.warn('SpeechSynthesis fel:', e);
        isReading = false;
        updateButtons();
    };

    speechSynthesis.speak(utterance);
    currentSpeech = utterance;
    isReading = true;
    updateButtons();
}

/* =========================
   STOPPA ALLT
   ========================= */

function stopAll() {
    speechSynthesis.cancel();
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
    isReading = false;
    updateButtons();
}

/* =========================
   SVENSKA
   ========================= */

function toggleRead() {
    if (isReading) { stopAll(); return; }
    const text = getReadableText();
    if (text) startReading(text, 'sv-SE');
}

/* =========================
   ENGELSKA
   ========================= */

async function readEnglish() {
    if (isReading) { stopAll(); return; }
    const text = getReadableText();
    if (!text) return;
    setButtonLoading('en');
    const translated = await translateText(text, 'en');
    startReading(translated, 'en-GB');
}

/* =========================
   ARABISKA
   
   Strategi:
   1. Vänta tills röster är laddade
   2. Hitta arabisk röst (ar-SA, ar-EG, ar, osv.)
   3. Översätt texten till arabiska
   4. Läs upp med Web Speech API
   
   Arabiska röster finns inbyggt i:
   - Windows: Microsoft Naayf (ar-SA)
   - macOS/iOS: Maged (ar-SA)  
   - Android: Google Arabic
   - Chrome på desktop: Google arabisk röst
   ========================= */

async function readArabic() {
    if (isReading) { stopAll(); return; }
    const text = getReadableText();
    if (!text) return;

    setButtonLoading('ar');

    /* Vänta på att röster laddas (viktigt på mobil) */
    await waitForVoices();

    /* Sök arabisk röst – testa flera varianter */
    const arabicVoice =
        voices.find(v => v.lang === 'ar-SA') ||
        voices.find(v => v.lang === 'ar-EG') ||
        voices.find(v => v.lang.toLowerCase().startsWith('ar'));

    /* Översätt texten */
    const translated = await translateText(text, 'ar');

    if (arabicVoice) {
        /* Använd inbyggd arabisk röst */
        stopAll();
        const utterance = new SpeechSynthesisUtterance(translated);
        utterance.voice = arabicVoice;
        utterance.lang  = arabicVoice.lang;
        utterance.rate  = 0.85; /* Lite långsammare för tydlighet */
        utterance.onend  = () => { isReading = false; updateButtons(); };
        utterance.onerror = () => { isReading = false; updateButtons(); };
        speechSynthesis.speak(utterance);
        currentSpeech = utterance;
        isReading = true;
        updateButtons();
    } else {
        /* Ingen arabisk röst hittades – visa texten istället */
        showArabicText(translated);
        isReading = false;
        updateButtons();
    }
}

/* =========================
   VISA ARABISK TEXT
   (visas om ingen arabisk röst finns)
   ========================= */

function showArabicText(text) {
    /* Ta bort eventuell befintlig ruta */
    const old = document.getElementById('arabic-text-box');
    if (old) old.remove();

    const box = document.createElement('div');
    box.id = 'arabic-text-box';
    box.style.cssText = `
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        max-height: 50vh;
        overflow-y: auto;
        background: #fff8e1;
        border-top: 3px solid #f5c518;
        padding: 20px 24px;
        font-size: 1.2rem;
        line-height: 2;
        direction: rtl;
        text-align: right;
        font-family: 'Arial', sans-serif;
        z-index: 9999;
        box-shadow: 0 -4px 20px rgba(0,0,0,0.15);
    `;

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ إغلاق';
    closeBtn.style.cssText = `
        display: block;
        margin-bottom: 12px;
        padding: 8px 16px;
        background: #f5c518;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        font-family: Arial, sans-serif;
    `;
    closeBtn.onclick = () => box.remove();

    const content = document.createElement('p');
    content.style.margin = '0';
    content.textContent = text;

    box.appendChild(closeBtn);
    box.appendChild(content);
    document.body.appendChild(box);
}

/* =========================
   SOMALISKA
   ========================= */

async function readSomali() {
    if (isReading) { stopAll(); return; }
    const text = getReadableText();
    if (!text) return;
    setButtonLoading('so');
    const translated = await translateText(text, 'so');
    startReading(translated, 'so-SO');
}

/* =========================
   LADDNINGSINDIKATOR
   ========================= */

function setButtonLoading(lang) {
    document.querySelectorAll('.read-btn-' + lang).forEach(btn => {
        btn.textContent = '⏳ Laddar...';
    });
}

/* =========================
   UPPDATERA KNAPPAR
   ========================= */

function updateButtons() {
    document.querySelectorAll('.stop-button').forEach(btn => {
        btn.textContent = isReading ? '⏹ Stoppa' : '🔊 Svenska';
    });
    document.querySelectorAll('.read-btn-en').forEach(btn => {
        btn.textContent = isReading ? '⏹ Stoppa' : '🔊 English';
    });
    document.querySelectorAll('.read-btn-ar').forEach(btn => {
        btn.textContent = isReading ? '⏹ Stoppa' : '🔊 العربية';
    });
    document.querySelectorAll('.read-btn-so').forEach(btn => {
        btn.textContent = isReading ? '⏹ Stoppa' : '🔊 Somali';
    });
}

/* Legacy-stöd */
document.addEventListener('DOMContentLoaded', function () {
    const old = document.getElementById('readBtn');
    if (old) old.addEventListener('click', toggleRead);
});
