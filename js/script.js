// ====== DOM REFS ======
const menuScreen = document.getElementById('menuScreen');
const gameScreen = document.getElementById('gameScreen');
const lbScreen = document.getElementById('lbScreen');
const startBtn = document.getElementById('startBtn');
const leaderboardBtn = document.getElementById('leaderboardBtn');
const backToMenu = document.getElementById('backToMenu');
const lbBack = document.getElementById('lbBack');
const themeToggle = document.getElementById('themeToggle');
const parallaxBg = document.getElementById('parallaxBg');
const particles = document.getElementById('particles');
const difficultySelect = document.getElementById('difficulty');
const categorySelect = document.getElementById('category');
const timeSelect = document.getElementById('timeSelect');
const display = document.getElementById('textDisplay');
const input = document.getElementById('hiddenInput');
const textContainer = document.getElementById('textContainer');
const timerDisplay = document.getElementById('timerDisplay');
const timerRing = document.getElementById('timerRing');
const wpmDisplay = document.getElementById('wpmDisplay');
const accuracyDisplay = document.getElementById('accuracyDisplay');
const progressFill = document.getElementById('progressFill');
const textSource = document.getElementById('textSource');
const textCategory = document.getElementById('textCategory');
const restartBtn = document.getElementById('restartBtn');
const resultsOverlay = document.getElementById('resultsOverlay');
const resultWpm = document.getElementById('resultWpm');
const resultAccuracy = document.getElementById('resultAccuracy');
const resultRaw = document.getElementById('resultRaw');
const resultChars = document.getElementById('resultChars');
const resultTime = document.getElementById('resultTime');
const resultErrors = document.getElementById('resultErrors');
const resultRestart = document.getElementById('resultRestart');
const resultNewText = document.getElementById('resultNewText');
const shareSection = document.getElementById('shareSection');
const nicknameInput = document.getElementById('nicknameInput');
const shareBtn = document.getElementById('shareBtn');
const shareMsg = document.getElementById('shareMsg');
const lbEntries = document.getElementById('lbEntries');

const RING_CIRCUMFERENCE = 97.4;

// ====== THEME ======
function getTheme() { return localStorage.getItem('iltytest-theme') || 'light'; }
function setTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  localStorage.setItem('iltytest-theme', t);
  themeToggle.textContent = t === 'dark' ? '☀️ Светлая' : '🌙 Тёмная';
}
setTheme(getTheme());
themeToggle.addEventListener('click', () => {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
});

// ====== SCREENS ======
function showScreen(screen) {
  [menuScreen, gameScreen, lbScreen].forEach(s => s.classList.remove('active'));
  screen.classList.add('active');
}

// ====== PARALLAX ======
function createParticles() {
  for (let i = 0; i < 30; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.width = p.style.height = (2 + Math.random() * 3) + 'px';
    p.style.animationDuration = (15 + Math.random() * 25) + 's';
    p.style.animationDelay = (Math.random() * 20) + 's';
    particles.appendChild(p);
  }
}
createParticles();

document.addEventListener('mousemove', (e) => {
  if (!menuScreen.classList.contains('active')) return;
  const x = (e.clientX / window.innerWidth - 0.5) * 20;
  const y = (e.clientY / window.innerHeight - 0.5) * 20;
  parallaxBg.style.transform = `translate(${x}px, ${y}px)`;
});

// ====== GAME STATE ======
let timerDuration = 60;
let timeLeft = 60;
let timerInterval = null;
let timerStart = null;
let isRunning = false;
let isFinished = false;
let isUnlimited = false;

let currentText = '';
let chars = [];
let currentIndex = 0;
let correctCount = 0;
let totalTyped = 0;
let errors = 0;

// ====== TEXT UTILS ======
function getFilteredTexts() {
  const diff = difficultySelect.value;
  const cat = categorySelect.value;
  return TEXTS.filter(t => {
    if (diff !== 'all' && t.difficulty !== diff) return false;
    if (cat !== 'all' && t.category !== cat) return false;
    return true;
  });
}

function pickText() {
  let pool = getFilteredTexts();
  if (pool.length === 0) pool = TEXTS;
  const text = pool[Math.floor(Math.random() * pool.length)];
  textSource.textContent = '📖 ' + text.source;
  const catLabels = {
    classic: 'Дедовские мудрости', modern: 'Кринж века',
    science: 'Научные бредни', tech: 'Техно-дичь', prose: 'Жиза'
  };
  textCategory.textContent = catLabels[text.category] || text.category;
  return text.text;
}

function prepareText(text) {
  currentText = text;
  chars = text.split('').map((ch, i) => ({ char: ch, status: 'pending', index: i }));
  currentIndex = 0;
  correctCount = 0;
  totalTyped = 0;
  errors = 0;
  renderText();
  updateStats();
}

function renderText() {
  display.innerHTML = '';
  chars.forEach((ch, i) => {
    const span = document.createElement('span');
    span.className = 'char';
    if (ch.char === ' ') span.classList.add('space');
    if (ch.status === 'pending') span.classList.add('pending');
    if (ch.status === 'correct') span.classList.add('correct');
    if (ch.status === 'incorrect') span.classList.add('incorrect');
    if (i === currentIndex && !isFinished) span.classList.add('current');
    span.textContent = ch.char === ' ' ? '\u00A0' : ch.char;
    display.appendChild(span);
  });
  if (!isFinished) {
    const el = display.querySelector('.char.current');
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function updateStats() {
  const elapsed = isRunning && timerStart ? (Date.now() - timerStart) / 1000 : 0;
  const minutes = elapsed / 60;
  const raw = minutes > 0 ? Math.round(totalTyped / minutes) : 0;
  const net = minutes > 0 ? Math.round(correctCount / minutes) : 0;
  const denom = correctCount + errors;
  const acc = denom > 0 ? Math.round((correctCount / denom) * 100) : 100;

  wpmDisplay.textContent = net;
  accuracyDisplay.textContent = acc + '%';
  progressFill.style.width = chars.length > 0 ? (currentIndex / chars.length) * 100 + '%' : '0%';
}

// ====== TIMER ======
function updateTimerRing(t) {
  const frac = timerDuration > 0 ? t / timerDuration : 0;
  const offset = RING_CIRCUMFERENCE * (1 - frac);
  timerRing.setAttribute('stroke-dashoffset', offset);
  timerDisplay.textContent = Math.ceil(t);
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function startTimer() {
  if (isUnlimited) return;
  timerStart = Date.now();
  if (timerInterval) stopTimer();
  timerInterval = setInterval(() => {
    const elapsed = (Date.now() - timerStart) / 1000;
    timeLeft = Math.max(0, timerDuration - elapsed);
    timerDisplay.textContent = Math.ceil(timeLeft);
    updateTimerRing(timeLeft);
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateTimerRing(0);
      endGame();
    }
  }, 100);
}

// ====== GAME FLOW ======
function startGame() {
  stopTimer();
  timerStart = null;
  const tVal = timeSelect.value;
  isUnlimited = tVal === '0';
  timerDuration = isUnlimited ? 60 : parseInt(tVal);
  timeLeft = timerDuration;
  isRunning = true;
  isFinished = false;

  const text = pickText();
  prepareText(text);
  input.value = '';
  input.focus();
  timerDisplay.textContent = isUnlimited ? '♾' : timerDuration;
  updateTimerRing(timerDuration);
  resultsOverlay.classList.remove('active');
  showScreen(gameScreen);
}

function endGame() {
  isRunning = false;
  isFinished = true;
  stopTimer();
  renderText();

  const elapsed = timerStart ? (Date.now() - timerStart) / 1000 : 0;
  const minutes = elapsed / 60;
  const raw = minutes > 0 ? Math.round(totalTyped / minutes) : 0;
  const net = minutes > 0 ? Math.round(correctCount / minutes) : 0;
  const denom = correctCount + errors;
  const acc = denom > 0 ? Math.round((correctCount / denom) * 100) : 100;

  resultWpm.textContent = net;
  resultAccuracy.textContent = acc + '%';
  resultRaw.textContent = raw;
  resultChars.textContent = currentIndex + '/' + chars.length;
  resultTime.textContent = Math.round(elapsed) + 'с';
  resultErrors.textContent = errors;

  lastResult = { wpm: net, accuracy: acc };
  shareBtn.disabled = false;
  nicknameInput.disabled = false;
  nicknameInput.value = '';
  shareMsg.textContent = '';
  shareMsg.className = 'share-msg';
  shareSection.style.display = firebaseReady ? 'block' : 'none';

  resultsOverlay.classList.add('active');
}

function handleChar(char) {
  if (!isRunning || isFinished) return;
  if (currentIndex >= chars.length) return;

  if (!timerStart && !isUnlimited) {
    startTimer();
  }

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
    endGame();
  }
}

// ====== INPUT ======
input.addEventListener('keydown', (e) => {
  if (isFinished) return;
  if (e.key === 'Backspace' || e.ctrlKey || e.metaKey || e.altKey) {
    e.preventDefault();
  }
});

input.addEventListener('input', () => {
  if (isFinished) { input.value = ''; return; }
  const val = input.value;
  if (val.length > 0) {
    const char = val[val.length - 1];
    if (char.length === 1) handleChar(char);
  }
  input.value = '';
});

textContainer.addEventListener('click', () => { if (!isFinished) input.focus(); });

// ====== NAVIGATION ======
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
resultRestart.addEventListener('click', () => {
  resultsOverlay.classList.remove('active');
  startGame();
});
resultNewText.addEventListener('click', () => {
  resultsOverlay.classList.remove('active');
  showScreen(menuScreen);
});
backToMenu.addEventListener('click', () => {
  stopTimer();
  isRunning = false;
  isFinished = true;
  showScreen(menuScreen);
});

leaderboardBtn.addEventListener('click', () => {
  loadLeaderboard();
  showScreen(lbScreen);
});
lbBack.addEventListener('click', () => showScreen(menuScreen));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') { e.preventDefault(); if (isFinished || !isRunning) startGame(); input.focus(); }
  if (e.key === 'Escape') { resultsOverlay.classList.remove('active'); showScreen(menuScreen); }
  if (e.key === 'Enter' && resultsOverlay.classList.contains('active')) { resultRestart.click(); }
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
try {
  firebase.initializeApp(FIREBASE_CONFIG);
  firebaseReady = true;
} catch (e) { console.warn('Firebase not configured'); }

let lastResult = null;

function saveResult(nickname, wpm, accuracy) {
  if (!firebaseReady) return Promise.reject('Firebase not ready');
  return firebase.database().ref('leaderboard').push({ nickname, wpm, accuracy, timestamp: Date.now() });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function loadLeaderboard() {
  if (!firebaseReady) {
    lbEntries.innerHTML = '<tr><td colspan="4" class="lb-empty">Firebase не настроен</td></tr>';
    return;
  }
  const ref = firebase.database().ref('leaderboard');
  ref.orderByChild('wpm').limitToLast(50).on('value', (snap) => {
    const data = snap.val();
    lbEntries.innerHTML = '';
    if (!data) {
      lbEntries.innerHTML = '<tr><td colspan="4" class="lb-empty">Пока никого нет. Будь первым!</td></tr>';
      return;
    }
    const entries = Object.values(data).sort((a, b) => b.wpm - a.wpm);
    entries.slice(0, 20).forEach((entry, i) => {
      const tr = document.createElement('tr');
      const r = i + 1;
      tr.innerHTML = `
        <td class="lb-rank ${r <= 3 ? 'r' + r : ''}">${r}</td>
        <td class="lb-nick">${escapeHtml(entry.nickname || 'Анонимус')}</td>
        <td class="lb-wpm">${entry.wpm}</td>
        <td class="lb-acc">${entry.accuracy}%</td>
      `;
      lbEntries.appendChild(tr);
    });
  });
}

shareBtn.addEventListener('click', () => {
  const nick = nicknameInput.value.trim();
  if (!nick) { shareMsg.textContent = 'Введи никнейм, енот'; shareMsg.className = 'share-msg error'; return; }
  if (!lastResult) return;
  shareBtn.disabled = true;
  shareMsg.textContent = 'Отправляем...';
  shareMsg.className = 'share-msg';
  saveResult(nick, lastResult.wpm, lastResult.accuracy)
    .then(() => {
      shareMsg.textContent = '✅ Улетело в топ!';
      shareMsg.className = 'share-msg success';
      nicknameInput.disabled = true;
    })
    .catch(() => {
      shareMsg.textContent = '❌ Не вышло. Попробуй ещё';
      shareMsg.className = 'share-msg error';
      shareBtn.disabled = false;
    });
});
nicknameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') shareBtn.click(); });

// ====== INIT ======
shareSection.style.display = 'none';
loadLeaderboard();
