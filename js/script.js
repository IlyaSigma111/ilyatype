// ====== DOM ======
const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const lbScreen = document.getElementById('lbScreen');
const startBtn = document.getElementById('startBtn');
const lbBtn = document.getElementById('leaderboardBtn');
const backToMenu = document.getElementById('backToMenu');
const lbBack = document.getElementById('lbBack');
const themeToggle = document.getElementById('themeToggle');
const parallaxBg = document.getElementById('parallaxBg');
const particles = document.getElementById('particles');
const diffSel = document.getElementById('difficulty');
const catSel = document.getElementById('category');
const timeSel = document.getElementById('timeSelect');
const modeSel = document.getElementById('modeSelect');
const display = document.getElementById('textDisplay');
const input = document.getElementById('hiddenInput');
const textContainer = document.getElementById('textContainer');
const timerDisplay = document.getElementById('timerDisplay');
const timerRing = document.getElementById('timerRing');
const wpmDisplay = document.getElementById('wpmDisplay');
const accDisplay = document.getElementById('accuracyDisplay');
const progressFill = document.getElementById('progressFill');
const textSource = document.getElementById('textSource');
const textCategory = document.getElementById('textCategory');
const restartBtn = document.getElementById('restartBtn');
const overlay = document.getElementById('resultsOverlay');
const rWpm = document.getElementById('resultWpm');
const rAcc = document.getElementById('resultAccuracy');
const rRaw = document.getElementById('resultRaw');
const rChars = document.getElementById('resultChars');
const rTime = document.getElementById('resultTime');
const rErrors = document.getElementById('resultErrors');
const rRestart = document.getElementById('resultRestart');
const rNewText = document.getElementById('resultNewText');
const shareSection = document.getElementById('shareSection');
const nickInput = document.getElementById('nicknameInput');
const shareBtn = document.getElementById('shareBtn');
const shareMsg = document.getElementById('shareMsg');
const lbEntries = document.getElementById('lbEntries');
const modeLabel = document.getElementById('modeLabel');
const closeResults = document.getElementById('closeResults');

const CIRC = 97.4;

// ====== SETTINGS STATE ======
let textType = localStorage.getItem('ilt-textType') || 'funny';
let gameMode = localStorage.getItem('ilt-mode') || 'text';

// ====== THEME ======
function getTheme() { return localStorage.getItem('ilt-theme') || 'light'; }
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('ilt-theme', t);
  document.querySelectorAll('[name="theme"]').forEach(r => r.checked = r.value === t);
}
setTheme(getTheme());

// ====== SCREENS ======
function showScreen(s) {
  [menuScreen, gameScreen, lbScreen].forEach(x => x.classList.remove('active'));
  s.classList.add('active');
}

// ====== PARALLAX ======
for (let i = 30; i--;) {
  const p = document.createElement('div');
  p.className = 'particle';
  p.style.cssText = `left:${Math.random()*100}%;width:${p.style.height=2+Math.random()*3+'px'};animation-duration:${15+Math.random()*25}s;animation-delay:${Math.random()*20}s`;
  particles.appendChild(p);
}
document.addEventListener('mousemove', e => {
  if (!menuScreen.classList.contains('active')) return;
  parallaxBg.style.transform = `translate(${(e.clientX/innerWidth-.5)*20}px,${(e.clientY/innerHeight-.5)*20}px)`;
});

// ====== GAME STATE ======
let mode = 'text';         // 'text' | 'timed'
let timerVal = 0;          // seconds elapsed (text mode) or remaining (timed mode)
let timerStart = null;
let timerInterval = null;
let isRunning = false;
let isFinished = false;

let chars = [];
let currentIndex = 0;
let correctCount = 0;
let totalTyped = 0;
let errors = 0;

// timed mode cumulative
let tTotalTyped = 0;
let tCorrect = 0;
let tErrors = 0;

// ====== TEXTS ======
function getTextPool() {
  const pool = textType === 'normal' ? NORMAL_TEXTS : TEXTS;
  const d = diffSel.value, c = catSel.value;
  return pool.filter(t => (d === 'all' || t.difficulty === d) && (c === 'all' || t.category === c));
}

let currentTextObj = null;

function pickText() {
  let pool = getTextPool();
  if (!pool.length) pool = textType === 'normal' ? NORMAL_TEXTS : TEXTS;
  currentTextObj = pool[Math.floor(Math.random() * pool.length)];
  textSource.textContent = '📖 ' + currentTextObj.source;
  const labels = {classic:'Классика',modern:'Современное',science:'Наука',tech:'Технологии',prose:'Проза'};
  textCategory.textContent = labels[currentTextObj.category] || currentTextObj.category;
  return currentTextObj.text;
}

function prepText(text) {
  chars = [...text].map(ch => ({ char: ch, status: 'pending' }));
  currentIndex = 0;
  if (mode === 'text') { correctCount = 0; totalTyped = 0; errors = 0; }
  renderText();
  updateStats();
}

function renderText() {
  display.innerHTML = chars.map((ch, i) => {
    let cls = 'char';
    if (ch.char === ' ') cls += ' space';
    if (ch.status === 'pending') cls += ' pending';
    if (ch.status === 'correct') cls += ' correct';
    if (ch.status === 'incorrect') cls += ' incorrect';
    if (i === currentIndex && !isFinished) cls += ' current';
    const txt = ch.char === ' ' ? '\u00A0' : ch.char;
    return `<span class="${cls}">${txt}</span>`;
  }).join('');
  if (!isFinished) {
    const el = display.querySelector('.char.current');
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function updateStats() {
  const elapsed = timerStart ? (Date.now() - timerStart) / 1000 : 0;
  const mins = elapsed / 60;
  const cc = mode === 'timed' ? tCorrect : correctCount;
  const tt = mode === 'timed' ? tTotalTyped : totalTyped;
  const ee = mode === 'timed' ? tErrors : errors;
  const raw = mins > 0 ? Math.round(tt / mins) : 0;
  const net = mins > 0 ? Math.round(cc / mins) : 0;
  const dnom = cc + ee;
  const acc = dnom > 0 ? Math.round(cc / dnom * 100) : 100;

  wpmDisplay.textContent = net;
  accDisplay.textContent = acc + '%';

  const idx = mode === 'timed' ? currentIndex : currentIndex;
  progressFill.style.width = chars.length > 0 ? (idx / chars.length * 100) + '%' : '0%';
}

function updateTimer() {
  if (!timerStart) return;
  const elapsed = (Date.now() - timerStart) / 1000;
  if (mode === 'text') {
    timerVal = elapsed;
    const m = Math.floor(timerVal / 60);
    const s = Math.floor(timerVal % 60);
    timerDisplay.textContent = m + ':' + String(s).padStart(2, '0');
    updateTimerRing(0);
  } else {
    timerVal = Math.max(0, 60 - elapsed);
    timerDisplay.textContent = Math.ceil(timerVal);
    updateTimerRing(timerVal);
    if (timerVal <= 0) { timerVal = 0; updateTimerRing(0); endGame(); }
  }
  updateStats();
}

function updateTimerRing(t) {
  if (mode === 'text') { timerRing.setAttribute('stroke-dashoffset', 0); return; }
  const frac = timerVal / 60;
  timerRing.setAttribute('stroke-dashoffset', CIRC * (1 - frac));
}

function stopTimer() { if (timerInterval) { clearInterval(timerInterval); timerInterval = null; } }

// ====== GAME ======
function startGame() {
  stopTimer();
  timerStart = null;
  mode = gameMode;
  isRunning = true;
  isFinished = false;
  tTotalTyped = 0; tCorrect = 0; tErrors = 0;
  overlay.classList.remove('active');
  showScreen(gameScreen);
  loadText();
  input.value = '';
  input.focus();
  timerDisplay.textContent = mode === 'text' ? '0:00' : '60';
  updateTimerRing(0);
  modeLabel.textContent = mode === 'text' ? '⏱ ' : '⏳ ';
}

function loadText() {
  const t = pickText();
  prepText(t);
}

function endGame() {
  isRunning = false;
  isFinished = true;
  stopTimer();
  renderText();

  const elapsed = timerStart ? (Date.now() - timerStart) / 1000 : 0;
  const mins = elapsed / 60;
  const cc = mode === 'timed' ? tCorrect : correctCount;
  const tt = mode === 'timed' ? tTotalTyped : totalTyped;
  const ee = mode === 'timed' ? tErrors : errors;
  const net = mins > 0 ? Math.round(cc / mins) : 0;
  const raw = mins > 0 ? Math.round(tt / mins) : 0;
  const dnom = cc + ee;
  const acc = dnom > 0 ? Math.round(cc / dnom * 100) : 100;

  rWpm.textContent = net;
  rAcc.textContent = acc + '%';
  rRaw.textContent = raw;
  rChars.textContent = cc + '/' + (cc + ee);
  rTime.textContent = Math.round(elapsed) + 'с';
  rErrors.textContent = ee;

  lastResult = { wpm: net, accuracy: acc };
  shareBtn.disabled = false;
  nickInput.disabled = false;
  nickInput.value = '';
  shareMsg.textContent = '';
  shareMsg.className = 'share-msg';
  shareSection.style.display = firebaseReady ? 'block' : 'none';

  overlay.classList.add('active');
}

function handleChar(char) {
  if (!isRunning || isFinished) return;
  if (currentIndex >= chars.length) return;

  if (!timerStart) { timerStart = Date.now(); timerInterval = setInterval(updateTimer, 100); }

  const expected = chars[currentIndex].char;
  const isCorrect = char === expected;
  totalTyped++;

  if (isCorrect) {
    if (chars[currentIndex].status !== 'correct') correctCount++;
    chars[currentIndex].status = 'correct';
    currentIndex++;
  } else {
    if (chars[currentIndex].status !== 'incorrect') errors++;
    chars[currentIndex].status = 'incorrect';
  }

  renderText();
  updateStats();

  if (currentIndex >= chars.length) {
    if (mode === 'timed') {
      tCorrect += correctCount;
      tTotalTyped += totalTyped;
      tErrors += errors;
      if (timerVal > 0) { loadText(); input.focus(); return; }
      else { endGame(); return; }
    } else {
      endGame();
    }
  }
}

// ====== INPUT ======
input.addEventListener('keydown', e => {
  if (e.key === 'Backspace' || e.ctrlKey || e.metaKey || e.altKey) e.preventDefault();
});
input.addEventListener('input', () => {
  if (isFinished) { input.value = ''; return; }
  const v = input.value;
  if (v.length) handleChar(v[v.length - 1]);
  input.value = '';
});
textContainer.addEventListener('click', () => { if (!isFinished) input.focus(); });

// ====== NAV ======
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
rRestart.addEventListener('click', () => { overlay.classList.remove('active'); startGame(); });
rNewText.addEventListener('click', () => { overlay.classList.remove('active'); showScreen(menuScreen); });
backToMenu.addEventListener('click', () => { stopTimer(); isRunning = false; isFinished = true; showScreen(menuScreen); });
lbBtn.addEventListener('click', () => { loadLeaderboard(); showScreen(lbScreen); });
lbBack.addEventListener('click', () => showScreen(menuScreen));

closeResults.addEventListener('click', () => overlay.classList.remove('active'));
overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('active'); });

document.addEventListener('keydown', e => {
  if (e.key === 'Tab') { e.preventDefault(); if (!isRunning || isFinished) startGame(); input.focus(); }
  if (e.key === 'Escape') { overlay.classList.remove('active'); settingsOverlay.classList.remove('active'); if (gameScreen.classList.contains('active')) showScreen(menuScreen); }
  if (e.key === 'Enter' && overlay.classList.contains('active')) rRestart.click();
});

// ====== FIREBASE ======
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBVVo_3CoMGJrMYAmCexOFeZS3AIAzO-ck",
  authDomain: "ilyatype-5e336.firebaseapp.com",
  databaseURL: "https://ilyatype-5e336-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "ilyatype-5e336",
  storageBucket: "ilyatype-5e336.firebasestorage.app",
  messagingSenderId: "728309192779",
  appId: "1:728309192779:web:33af0253e48713c32d95ce"
};
let firebaseReady = false;
try { firebase.initializeApp(FIREBASE_CONFIG); firebaseReady = true; } catch (e) {}

let lastResult = null;
function saveResult(nick, wpm, acc) {
  return firebase.database().ref('leaderboard').push({ nickname: nick, wpm, accuracy: acc, timestamp: Date.now() });
}
function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function loadLeaderboard() {
  if (!firebaseReady) { lbEntries.innerHTML = '<tr><td colspan="4" class="lb-empty">Firebase не настроен</td></tr>'; return; }
  firebase.database().ref('leaderboard').orderByChild('wpm').limitToLast(50).on('value', snap => {
    const data = snap.val();
    lbEntries.innerHTML = '';
    if (!data) { lbEntries.innerHTML = '<tr><td colspan="4" class="lb-empty">Пока никого нет</td></tr>'; return; }
    const entries = Object.values(data).sort((a, b) => b.wpm - a.wpm).slice(0, 20);
    entries.forEach((e, i) => {
      const r = i + 1;
      lbEntries.innerHTML += `<tr><td class="lb-rank ${r<=3?'r'+r:''}">${r}</td><td class="lb-nick">${escHtml(e.nickname||'Анонимус')}</td><td class="lb-wpm">${e.wpm}</td><td class="lb-acc">${e.accuracy}%</td></tr>`;
    });
  });
}

shareBtn.addEventListener('click', () => {
  const nick = nickInput.value.trim();
  if (!nick) { shareMsg.textContent = 'Введи никнейм, енот'; shareMsg.className = 'share-msg error'; return; }
  if (!lastResult) return;
  shareBtn.disabled = true;
  shareMsg.textContent = 'Отправляем...';
  shareMsg.className = 'share-msg';
  saveResult(nick, lastResult.wpm, lastResult.accuracy).then(() => {
    shareMsg.textContent = '✅ Улетело!'; shareMsg.className = 'share-msg success'; nickInput.disabled = true;
  }).catch(() => {
    shareMsg.textContent = '❌ Не вышло'; shareMsg.className = 'share-msg error'; shareBtn.disabled = false;
  });
});
nickInput.addEventListener('keydown', e => { if (e.key === 'Enter') shareBtn.click(); });

// ====== SETTINGS ======
const settingsOverlay = document.getElementById('settingsOverlay');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettings = document.getElementById('closeSettings');

function openSettings() {
  document.querySelectorAll('[name="mode"]').forEach(r => r.checked = r.value === gameMode);
  document.querySelectorAll('[name="textType"]').forEach(r => r.checked = r.value === textType);
  settingsOverlay.classList.add('active');
}

settingsBtn.addEventListener('click', openSettings);
closeSettings.addEventListener('click', () => settingsOverlay.classList.remove('active'));
settingsOverlay.addEventListener('click', e => { if (e.target === settingsOverlay) settingsOverlay.classList.remove('active'); });

document.querySelectorAll('[name="mode"]').forEach(r => r.addEventListener('change', () => {
  if (r.checked) { gameMode = r.value; localStorage.setItem('ilt-mode', gameMode); settingsOverlay.classList.remove('active'); }
}));

document.querySelectorAll('[name="textType"]').forEach(r => r.addEventListener('change', () => {
  if (r.checked) { textType = r.value; localStorage.setItem('ilt-textType', textType); settingsOverlay.classList.remove('active'); }
}));

document.querySelectorAll('[name="theme"]').forEach(r => r.addEventListener('change', () => {
  if (r.checked) setTheme(r.value);
}));

// ====== INIT ======
shareSection.style.display = 'none';
loadLeaderboard();
showScreen(menuScreen);
