/* =========================
   VERKSAMHETSKARTA – UPPLÄSNING
   Svenska | English | العربية | Somali
   Samma TTS-motor som Språktavla-byggaren
   ========================= */

let isReading = false;
let currentSpeech = null;

/* =========================
   RÖSTER – laddas asynkront
   (Chrome/mobil laddar röster efter sidan)
   ========================= */

window.speechSynthesis.onvoiceschanged = function () {};

function getVoiceForLang(langCode) {
    const voices = window.speechSynthesis.getVoices();
    const prefix = langCode.split('-')[0];
    return voices.find(v => v.lang.startsWith(prefix)) || null;
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
   UPPLÄSNING – kärnan
   (identisk logik som språktavlan)
   ========================= */

function speak(text, langCode) {
    const synth = window.speechSynthesis;
    synth.cancel();

    const utt = new SpeechSynthesisUtterance(text);
    utt.lang   = langCode;
    utt.rate   = 0.9;

    const voice = getVoiceForLang(langCode);
    if (voice) utt.voice = voice;

    utt.onend  = () => { isReading = false; updateButtons(); };
    utt.onerror = () => { isReading = false; updateButtons(); };

    synth.speak(utt);
    currentSpeech = utt;
    isReading = true;
    updateButtons();
}

/* =========================
   STOPPA
   ========================= */

function stopAll() {
    window.speechSynthesis.cancel();
    isReading = false;
    updateButtons();
}

/* =========================
   ÖVERSÄTTNING
   Primär: MyMemory (gratis, öppen CORS, ingen nyckel)
   Fallback: Google gtx
   ========================= */

async function translateText(text, targetLang) {
    const chunk = text.length > 450 ? text.slice(0, 450) + '…' : text;

    /* 1. MyMemory */
    try {
        const url =
            'https://api.mymemory.translated.net/get?q=' +
            encodeURIComponent(chunk) +
            '&langpair=sv|' +
            encodeURIComponent(targetLang);
        const res  = await fetch(url);
        const data = await res.json();
        if (data.responseStatus === 200 && data.responseData.translatedText) {
            return data.responseData.translatedText;
        }
    } catch (e) {
        console.warn('MyMemory misslyckades:', e);
    }

    /* 2. Google gtx fallback */
    try {
        const url =
            'https://translate.googleapis.com/translate_a/single?client=gtx&sl=sv&tl=' +
            encodeURIComponent(targetLang) +
            '&dt=t&q=' +
            encodeURIComponent(chunk);
        const res  = await fetch(url);
        const data = await res.json();
        const result = data[0].map(x => x[0]).join('');
        if (result) return result;
    } catch (e) {
        console.warn('Google translate misslyckades:', e);
    }

    return text;
}

/* =========================
   SVENSKA
   ========================= */

function toggleRead() {
    if (isReading) { stopAll(); return; }
    const text = getReadableText();
    if (text) speak(text, 'sv-SE');
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
    speak(translated, 'en-GB');
}

/* =========================
   ARABISKA
   Text översätts via MyMemory, läses upp med
   speechSynthesis – samma sätt som Språktavlan
   ========================= */

async function readArabic() {
    if (isReading) { stopAll(); return; }
    const text = getReadableText();
    if (!text) return;
    setButtonLoading('ar');
    const translated = await translateText(text, 'ar');
    speak(translated, 'ar-SA');
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
    speak(translated, 'so-SO');
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
