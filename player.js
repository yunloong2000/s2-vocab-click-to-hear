const UNITS = {
  A: { title: "A Digital Devices & Tech", zh: "數碼裝置與科技" },
  B: { title: "B Online Behavior & Risks", zh: "網上行為與風險" },
  C: { title: "C Communication & Media", zh: "溝通與媒體" },
  D: { title: "D Actions & Interactions", zh: "行動與互動" },
  E: { title: "E States & Conditions", zh: "狀態與情況" }
};

window.WORDS = window.WORDS || [];
const WORDS = window.WORDS;
const NO_GB = new Set(["identity","online","podcast","hackers","radiation","secret","knowledge","aware","emergency"]);
const audio = new Audio();
let currentBtn = null;

function googleUrl(key, accent) {
  return `https://ssl.gstatic.com/dictionary/static/sounds/20200429/${key}--_${accent}_1.mp3`;
}
function youdaoUrl(key, accent) {
  return `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(key)}&type=${accent === "gb" ? 2 : 1}`;
}
function wordKey(item, accent) {
  if (accent === "us" && item.audioUS) return item.audioUS;
  return item.audio || item.word.toLowerCase();
}
function sourcesFor(item, accent) {
  const key = wordKey(item, accent);
  const list = [];
  if (accent === "gb" && !NO_GB.has(item.word) && item.word !== "hackers" && item.word !== "podcast") {
    list.push(googleUrl(key, "gb"));
  }
  list.push(googleUrl(key, "us"));
  list.push(youdaoUrl(item.speak || item.word, accent));
  return list;
}

function playFromList(urls, rate) {
  return new Promise((resolve, reject) => {
    let i = 0;
    const tryNext = () => {
      if (i >= urls.length) { reject(new Error("no audio")); return; }
      audio.pause();
      audio.src = urls[i++];
      audio.playbackRate = rate;
      const onOk = () => { cleanup(); resolve(); };
      const onErr = () => { cleanup(); tryNext(); };
      const cleanup = () => {
        audio.removeEventListener("playing", onOk);
        audio.removeEventListener("error", onErr);
      };
      audio.addEventListener("playing", onOk);
      audio.addEventListener("error", onErr);
      audio.play().catch(onErr);
    };
    tryNext();
  });
}

function speakText(text, accent, rate) {
  return new Promise((resolve) => {
    if (!window.speechSynthesis) { resolve(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = accent === "us" ? "en-US" : "en-GB";
    u.rate = Math.max(0.7, Number(rate) * 0.95);
    const voices = speechSynthesis.getVoices();
    const prefer = voices.find(v => v.lang.toLowerCase().startsWith(u.lang.toLowerCase()));
    if (prefer) u.voice = prefer;
    u.onend = resolve;
    u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

async function playWord(item, btn) {
  markPlaying(btn, true);
  const accent = document.getElementById("accent").value;
  const rate = Number(document.getElementById("speed").value);
  try {
    await playFromList(sourcesFor(item, accent), rate);
  } catch (e) {
    await speakText(item.speak || item.word, accent, rate);
  }
  audio.onended = () => markPlaying(btn, false);
  setTimeout(() => { if (audio.paused) markPlaying(btn, false); }, 2500);
}

async function playSentence(text) {
  const accent = document.getElementById("accent").value;
  const rate = Number(document.getElementById("speed").value);
  toast("Playing sentence…");
  await speakText(text, accent, rate);
}

function markPlaying(btn, on) {
  if (currentBtn) currentBtn.classList.remove("playing");
  currentBtn = on ? btn : null;
  if (btn) btn.classList.toggle("playing", on);
}

function toast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 1400);
}

function render() {
  const grid = document.getElementById("grid");
  grid.innerHTML = WORDS.map((w, i) => `
    <article class="card" data-unit="${w.unit}" data-word="${w.word.toLowerCase()}" data-zh="${w.zh}">
      <span class="unit-tag u${w.unit}">${UNITS[w.unit].title}</span>
      <div class="word-row">
        <button class="speak" data-i="${i}" aria-label="Play ${w.word}">▶</button>
        <button class="word-btn" data-i="${i}">${w.word}</button>
      </div>
      <div class="pos">${w.pos} · <span class="ipa">${w.ipa}</span></div>
      <div class="meaning">${w.en}</div>
      <div class="zh">${w.zh}</div>
      <div class="ex">
        <div class="ex-head">Example 1 <button class="mini" data-s="${encodeURIComponent(w.ex1en)}">▶ sentence</button></div>
        <p>${w.ex1en}</p>
        <p class="zh-s">${w.ex1zh}</p>
      </div>
      <div class="ex">
        <div class="ex-head">Example 2 <button class="mini" data-s="${encodeURIComponent(w.ex2en)}">▶ sentence</button></div>
        <p>${w.ex2en}</p>
        <p class="zh-s">${w.ex2zh}</p>
      </div>
    </article>
  `).join("");
}

function filter() {
  const unit = document.querySelector(".chip.active")?.dataset.unit || "all";
  const q = document.getElementById("search").value.trim().toLowerCase();
  document.querySelectorAll(".card").forEach(card => {
    const okUnit = unit === "all" || card.dataset.unit === unit;
    const okQ = !q || card.dataset.word.includes(q) || card.dataset.zh.includes(q);
    card.classList.toggle("hidden", !(okUnit && okQ));
  });
}

function setupUnits() {
  const box = document.getElementById("units");
  const items = ["all", "A", "B", "C", "D", "E"];
  box.innerHTML = items.map((u, idx) =>
    `<button class="chip${idx===0?" active":""}" data-unit="${u}">${u==="all"?"All 全部":u}</button>`
  ).join("");
  box.addEventListener("click", e => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    box.querySelectorAll(".chip").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    filter();
  });
}

document.addEventListener("click", e => {
  const wordBtn = e.target.closest("[data-i]");
  if (wordBtn && (wordBtn.classList.contains("word-btn") || wordBtn.classList.contains("speak"))) {
    playWord(WORDS[Number(wordBtn.dataset.i)], wordBtn);
    return;
  }
  const sen = e.target.closest("[data-s]");
  if (sen) playSentence(decodeURIComponent(sen.dataset.s));
});

document.getElementById("search").addEventListener("input", filter);
if (window.speechSynthesis) speechSynthesis.getVoices();
setupUnits();
render();
