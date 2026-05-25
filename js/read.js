/* =========================
   VERKSAMHETSKARTA – UPPLÄSNING
   Svenska | English | العربية | Somali
   ========================= */

let isReading = false;
let currentSpeech = null;
let currentAudio = null;

/* Röster – laddas asynkront på mobil */
let voices = [];

function loadVoices() {
    voices = speechSynthesis.getVoices();
}

speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

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
   GOOGLE ÖVERSÄTTNING
   (använder googleapis – stabilare än translate.google.com)
   ========================= */

async function translateText(text, targetLang) {
    try {
        const url =
            'https://translate.googleapis.com/translate_a/single?client=gtx&sl=sv&tl=' +
            encodeURIComponent(targetLang) +
            '&dt=t&q=' +
            encodeURIComponent(text);
        const res = await fetch(url);
        const data = await res.json();
        return data[0].map(x => x[0]).join('');
    } catch (e) {
        console.warn('Översättning misslyckades:', e);
        return text; /* fallback: läs originaltexten */
    }
}

/* =========================
   STARTA UPPLÄSNING
   ========================= */

function startReading(text, langCode) {
    stopAll();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 0.95;

    /* Försök hitta matchande röst */
    const match = voices.find(v => v.lang.toLowerCase().startsWith(langCode.toLowerCase().slice(0, 2)));
    if (match) utterance.voice = match;

    utterance.onend = () => { isReading = false; updateButtons(); };
    utterance.onerror = () => { isReading = false; updateButtons(); };

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
   (använder Google TTS via googleapis för bättre arabisk röst)
   ========================= */

async function readArabic() {
    if (isReading) { stopAll(); return; }
    const text = getReadableText();
    if (!text) return;

    setButtonLoading('ar');

    /* Försök webb-TTS med arabisk röst först */
    const arabicVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith('ar'));
    if (arabicVoice) {
        const translated = await translateText(text, 'ar');
        startReading(translated, 'ar');
        return;
    }

    /* Fallback: Google TTS (chunkat för långa texter) */
    const translated = await translateText(text, 'ar');
    const chunks = chunkText(translated, 180);
    playChunks(chunks, 'ar');
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
   SPELA LJUD I DELAR (Google TTS fallback)
   ========================= */

function chunkText(text, size) {
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.slice(i, i + size));
    }
    return chunks;
}

function playChunks(chunks, lang) {
    isReading = true;
    updateButtons();
    let i = 0;

    function next() {
        if (!isReading || i >= chunks.length) {
            isReading = false;
            updateButtons();
            return;
        }
        const url =
            'https://translate.googleapis.com/translate_tts?ie=UTF-8&client=tw-ob&tl=' +
            encodeURIComponent(lang) +
            '&q=' +
            encodeURIComponent(chunks[i]);
        currentAudio = new Audio(url);
        currentAudio.onended = () => { i++; next(); };
        currentAudio.onerror = () => { isReading = false; updateButtons(); };
        currentAudio.play().catch(() => { isReading = false; updateButtons(); });
    }

    next();
}

/* =========================
   LADDNINGSINDIKATOR
   ========================= */

function setButtonLoading(lang) {
    const map = { sv: '🔊 Svenska', en: '🔊 English', ar: '🔊 العربية', so: '🔊 Somali' };
    document.querySelectorAll('.read-btn-' + lang).forEach(btn => {
        btn.textContent = '⏳ Laddar...';
    });
}

/* =========================
   UPPDATERA KNAPPAR
   ========================= */

function updateButtons() {
    /* Svenska stopp-knapp */
    document.querySelectorAll('.stop-button').forEach(btn => {
        btn.textContent = isReading ? '⏹ Stoppa' : '🔊 Svenska';
    });
    /* Engelska */
    document.querySelectorAll('.read-btn-en').forEach(btn => {
        btn.textContent = isReading ? '⏹ Stoppa' : '🔊 English';
    });
    /* Arabiska */
    document.querySelectorAll('.read-btn-ar').forEach(btn => {
        btn.textContent = isReading ? '⏹ Stoppa' : '🔊 العربية';
    });
    /* Somaliska */
    document.querySelectorAll('.read-btn-so').forEach(btn => {
        btn.textContent = isReading ? '⏹ Stoppa' : '🔊 Somali';
    });
}

/* Legacy-stöd */
document.addEventListener('DOMContentLoaded', function () {
    const old = document.getElementById('readBtn');
    if (old) old.addEventListener('click', toggleRead);
});
