let isReading = false;
let currentSpeech = null;

/* =========================
   LADDA RÖSTER (MOBIL FIX)
   ========================= */

let voices = [];

function loadVoices() {

    voices = speechSynthesis.getVoices();

}

speechSynthesis.onvoiceschanged = loadVoices;

loadVoices();


/* =========================
   HÄMTA TEXT
   ========================= */

function getReadableText(){

    let content =
        document.querySelector('.readable-content') ||
        document.querySelector('.readable-content-wrapper');

    if(!content) return "";

    return content.innerText;

}


/* =========================
   GOOGLE ÖVERSÄTTNING
   ========================= */

async function translateText(text,target){

    try{

        const url =
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl=sv&tl=" +
        target +
        "&dt=t&q=" +
        encodeURIComponent(text);

        const response = await fetch(url);

        const data = await response.json();

        return data[0].map(x=>x[0]).join("");

    }catch(e){

        console.warn("Översättning misslyckades",e);

        return text;

    }

}


/* =========================
   STARTA UPPLÄSNING
   ========================= */

function startReading(text,lang){

    window.speechSynthesis.cancel();

    currentSpeech = new SpeechSynthesisUtterance(text);

let voice = voices.find(v => v.lang.startsWith(lang));

if (voice) {
    currentSpeech.voice = voice;
}

    currentSpeech.lang = lang;
    currentSpeech.rate = 1;

    currentSpeech.onend = function(){

        isReading=false;
        updateButtons();

    };

    speechSynthesis.speak(currentSpeech);

    isReading=true;

    updateButtons();

}


/* =========================
   STOPPA
   ========================= */

function stopReading(){

    speechSynthesis.cancel();

    isReading=false;

    updateButtons();

}


/* =========================
   SVENSKA
   ========================= */

function toggleRead(){

    if(isReading){

        stopReading();
        return;

    }

    let text = getReadableText();

    startReading(text,"sv-SE");

}


/* =========================
   ARABISKA
   ========================= */

let arabicAudio = null;
let arabicPlaying = false;

async function readArabic(){

    if(arabicPlaying){
        if(arabicAudio){
            arabicAudio.pause();
            arabicAudio = null;
        }
        arabicPlaying = false;
        return;
    }

    let text = getReadableText();

    let translated = await translateText(text,"ar");

    let chunks = translated.match(/.{1,180}/g);

    if(!chunks) return;

    arabicPlaying = true;

    let i = 0;

    function playNext(){

        if(!arabicPlaying) return;

        if(i >= chunks.length){
            arabicPlaying = false;
            return;
        }

        let url =
        "https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ar&q=" +
        encodeURIComponent(chunks[i]);

        arabicAudio = new Audio(url);

        arabicAudio.onended = function(){
            i++;
            playNext();
        };

        arabicAudio.play();

    }

    playNext();

}

/* =========================
   SOMALISKA
   ========================= */

async function readSomali(){

    if(isReading){
        stopReading();
        return;
    }

    let text = getReadableText();

    let translated = await translateText(text,"so");

    startReading(translated,"so-SO");

}


/* =========================
   UPPDATERA KNAPP
   ========================= */

function updateButtons(){

    const buttons = document.querySelectorAll(".stop-button");

    buttons.forEach(button=>{

        if(isReading){
            button.innerText="⏹ Stoppa";
        }else{
            button.innerText="🔊 Svenska";
        }

    });

}


/* =========================
   STÖD FÖR GAMLA KNAPPAR
   ========================= */

document.addEventListener("DOMContentLoaded",function(){

    const oldButton = document.getElementById("readBtn");

    if(oldButton){

        oldButton.addEventListener("click",toggleRead);

    }

});