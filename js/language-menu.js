/* =========================
   SPRÅKVAL
========================= */

function setLanguage(lang){

    localStorage.setItem("selectedLanguage", lang);

}

/* =========================
   HÄMTA SPRÅK
========================= */

function getLanguage(){

    return localStorage.getItem("selectedLanguage") || "sv";

}