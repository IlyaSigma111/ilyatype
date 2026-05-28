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

  const acc = totalTyped > 0 ? Math.round((correctCount / totalTyped) * 100) : 100;
  accuracyEl.textContent = acc + '%';
}

function getCharacterCount(text) {
  return text.replace(/\s/g, '').length;
}

function startGame() {
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
  const acc = totalTyped > 0 ? Math.round((correctCount / totalTyped) * 100) : 100;

  resultWpm.textContent = net;
  resultAccuracy.textContent = acc + '%';
  resultRaw.textContent = raw;
  resultChars.textContent = `${correctCount}/${totalTyped}`;
  resultTime.textContent = elapsed + 'с';
  resultErrors.textContent = errors;

  resultsOverlay.classList.add('active');
}

function handleChar(char) {
  if (!isRunning || isFinished) return;

  if (currentIndex >= chars.length) return;

  if (timeLeft === timerDuration) {
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

  typedChars.push({ typed: char, expected, isCorrect });

  if (isCorrect) {
    chars[currentIndex].status = 'correct';
    correctCount++;
  } else {
    chars[currentIndex].status = 'incorrect';
    errors++;
  }
  totalTyped++;
  currentIndex++;
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

startGame();
