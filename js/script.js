const display = document.getElementById('textDisplay');
const input = document.getElementById('hiddenInput');
const timerEl = document.getElementById('timer');
const wpmEl = document.getElementById('wpm');
const accuracyEl = document.getElementById('accuracy');
const progressEl = document.getElementById('progress');
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
const difficultySelect = document.getElementById('difficulty');
const categorySelect = document.getElementById('category');
const timeSelect = document.getElementById('timeSelect');

const timerDurationDefault = 60;
let timerDuration = 60;
let timeLeft = 60;
let timerInterval = null;
let isRunning = false;
let isFinished = false;

let currentText = '';
let chars = [];
let currentIndex = 0;
let correctCount = 0;
let totalTyped = 0;
let errors = 0;
let typedChars = [];

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

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
    classic: 'Дедовские мудрости',
    modern: 'Кринж века',
    science: 'Научные бредни',
    tech: 'Техно-дичь',
    prose: 'Жиза'
  };
  textCategory.textContent = catLabels[text.category] || text.category;
  return text.text;
}

function prepareText(text) {
  currentText = text;
  chars = text.split('').map((ch, i) => ({
    char: ch,
    status: 'pending',
    index: i
  }));
  currentIndex = 0;
  correctCount = 0;
  totalTyped = 0;
  errors = 0;
  typedChars = [];
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
    const currentEl = display.querySelector('.char.current');
    if (currentEl) currentEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function updateStats() {
  const elapsed = timerDuration - timeLeft;
  const minutes = elapsed / 60;

  const raw = minutes > 0 ? Math.round(totalTyped / minutes) : 0;
  const net = minutes > 0 ? Math.round((correctCount / Math.max(minutes, 0.01))) : 0;

  wpmEl.textContent = net;
  timerEl.textContent = timeLeft;
  progressEl.textContent = `${currentIndex}/${chars.length}`;
  progressFill.style.width = `${chars.length > 0 ? (currentIndex / chars.length) * 100 : 0}%`;

  const denom = correctCount + errors;
  const acc = denom > 0 ? Math.round((correctCount / denom) * 100) : 100;
  accuracyEl.textContent = acc + '%';
}

function getCharacterCount(text) {
  return text.replace(/\s/g, '').length;
}

function startGame() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  timerDuration = parseInt(timeSelect.value);
  timeLeft = timerDuration;
  isRunning = true;
  isFinished = false;
  const t = pickText();
  prepareText(t);
  input.value = '';
  input.focus();
  timerEl.textContent = timeLeft;
  resultsOverlay.classList.remove('active');
}

function endGame() {
  isRunning = false;
  isFinished = true;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  renderText();

  const elapsed = timerDuration - timeLeft;
  const minutes = elapsed / 60;
  const raw = minutes > 0 ? Math.round(totalTyped / minutes) : 0;
  const net = minutes > 0 ? Math.round((correctCount / Math.max(minutes, 0.01))) : 0;
  const denom = correctCount + errors;
  const acc = denom > 0 ? Math.round((correctCount / denom) * 100) : 100;

  resultWpm.textContent = net;
  resultAccuracy.textContent = acc + '%';
  resultRaw.textContent = raw;
  resultChars.textContent = `${correctCount}/${chars.length}`;
  resultTime.textContent = elapsed + 'с';
  resultErrors.textContent = errors;

  resultsOverlay.classList.add('active');
}

function handleChar(char) {
  if (!isRunning || isFinished) return;
  if (currentIndex >= chars.length) return;

  if (!timerInterval && timeLeft === timerDuration) {
    timerInterval = setInterval(() => {
      timeLeft--;
      timerEl.textContent = timeLeft;
      if (timeLeft <= 0) {
        timeLeft = 0;
        endGame();
      }
    }, 1000);
  }

  const expected = chars[currentIndex].char;
  const isCorrect = char === expected;

  totalTyped++;

  if (isCorrect) {
    if (chars[currentIndex].status !== 'correct') {
      correctCount++;
    }
    chars[currentIndex].status = 'correct';
    currentIndex++;
  } else {
    if (chars[currentIndex].status !== 'incorrect') {
      errors++;
    }
    chars[currentIndex].status = 'incorrect';
  }

  renderText();
  updateStats();

  if (currentIndex >= chars.length) {
    endGame();
  }
}

input.addEventListener('keydown', (e) => {
  if (isFinished) return;

  if (e.key === 'Backspace') {
    e.preventDefault();
    return;
  }

  if (e.ctrlKey || e.metaKey || e.altKey) {
    e.preventDefault();
    return;
  }
});

input.addEventListener('input', (e) => {
  if (isFinished) {
    input.value = '';
    return;
  }

  const val = input.value;
  if (val.length > 0) {
    const char = val[val.length - 1];
    if (char.length === 1) {
      handleChar(char);
    }
  }
  input.value = '';
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    if (!isRunning || isFinished) {
      startGame();
    }
    input.focus();
  }
  if (e.key === 'Escape') {
    resultsOverlay.classList.remove('active');
  }
  if (e.key === 'Enter' && resultsOverlay.classList.contains('active')) {
    resultRestart.click();
  }
});

restartBtn.addEventListener('click', startGame);
resultRestart.addEventListener('click', () => {
  resultsOverlay.classList.remove('active');
  startGame();
});
resultNewText.addEventListener('click', () => {
  resultsOverlay.classList.remove('active');
  startGame();
});

difficultySelect.addEventListener('change', startGame);
categorySelect.addEventListener('change', startGame);
timeSelect.addEventListener('change', startGame);

document.getElementById('textContainer').addEventListener('click', () => {
  if (!isFinished) input.focus();
});

// ====== Firebase ======
const FIREBASE_CONFIG = {
  apiKey: "XXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxx"
};

let firebaseReady = false;
try {
  firebase.initializeApp(FIREBASE_CONFIG);
  firebaseReady = true;
} catch (e) {
  console.warn('Firebase not configured');
}

const shareSection = document.getElementById('shareSection');
const nicknameInput = document.getElementById('nicknameInput');
const shareBtn = document.getElementById('shareBtn');
const shareMsg = document.getElementById('shareMsg');
const lbEntries = document.getElementById('lbEntries');
const lbToggle = document.getElementById('lbToggle');
const lbBody = document.getElementById('lbBody');
shareSection.style.display = 'none';

let lastResult = null;

function saveResult(nickname, wpm, accuracy) {
  if (!firebaseReady) return Promise.reject('Firebase not ready');
  const ref = firebase.database().ref('leaderboard');
  return ref.push({
    nickname,
    wpm,
    accuracy,
    timestamp: Date.now()
  });
}

function loadLeaderboard() {
  if (!firebaseReady) {
    lbEntries.innerHTML = '<tr><td colspan="4" class="leaderboard-empty">Firebase не настроен. Впиши свои ключи в script.js</td></tr>';
    return;
  }
  const ref = firebase.database().ref('leaderboard');
  ref.orderByChild('wpm').limitToLast(50).on('value', (snap) => {
    const data = snap.val();
    lbEntries.innerHTML = '';
    if (!data) {
      lbEntries.innerHTML = '<tr><td colspan="4" class="leaderboard-empty">Пока никого нет. Будь первым!</td></tr>';
      return;
    }
    const entries = Object.entries(data).map(([id, v]) => v).sort((a, b) => b.wpm - a.wpm);
    entries.slice(0, 20).forEach((entry, i) => {
      const tr = document.createElement('tr');
      const rank = i + 1;
      tr.innerHTML = `
        <td class="rank rank-${rank <= 3 ? rank : ''}">${rank}</td>
        <td class="nickname">${escapeHtml(entry.nickname || 'Анонимус')}</td>
        <td class="lb-wpm">${entry.wpm}</td>
        <td class="lb-acc">${entry.accuracy}%</td>
      `;
      lbEntries.appendChild(tr);
    });
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

shareBtn.addEventListener('click', () => {
  const nick = nicknameInput.value.trim();
  if (!nick) {
    shareMsg.textContent = 'Введи никнейм, енот';
    shareMsg.className = 'share-msg error';
    return;
  }
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
    .catch((err) => {
      shareMsg.textContent = '❌ Не вышло. Попробуй ещё';
      shareMsg.className = 'share-msg error';
      shareBtn.disabled = false;
    });
});

nicknameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') shareBtn.click();
});

lbToggle.addEventListener('click', () => {
  lbBody.classList.toggle('collapsed');
  lbToggle.textContent = lbBody.classList.contains('collapsed') ? '▼ развернуть' : '▲ свернуть';
});

loadLeaderboard();

// Patch endGame to save last result and reset share UI
const origEndGame = endGame;
endGame = function() {
  origEndGame.call(this);
  const elapsed = timerDuration - timeLeft;
  const minutes = elapsed / 60;
  const net = minutes > 0 ? Math.round((correctCount / Math.max(minutes, 0.01))) : 0;
  const denom = correctCount + errors;
  const acc = denom > 0 ? Math.round((correctCount / denom) * 100) : 100;
  lastResult = { wpm: net, accuracy: acc };
  shareBtn.disabled = false;
  nicknameInput.disabled = false;
  nicknameInput.value = '';
  shareMsg.textContent = '';
  shareMsg.className = 'share-msg';
  shareSection.style.display = firebaseReady ? 'block' : 'none';
};

startGame();
