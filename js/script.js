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
let textType = localStorage.getItem('ilt-textType') || 'normal';
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
  const pool = textType === 'normal' ? NORMAL_TEXTS : textType === 'alabuga' ? TEXTS_ALABUGA : TEXTS;
  const d = diffSel.value, c = catSel.value;
  return pool.filter(t => (d === 'all' || t.difficulty === d) && (c === 'all' || t.category === c));
}

let currentTextObj = null;

function pickText() {
  if (selectedTextObj) {
    currentTextObj = selectedTextObj;
    selectedTextObj = null;
    textSource.textContent = '📖 ' + currentTextObj.source;
    const labels = {classic:'Классика',modern:'Современное',science:'Наука',tech:'Технологии',prose:'Проза'};
    textCategory.textContent = labels[currentTextObj.category] || currentTextObj.category;
    return currentTextObj.text;
  }
  let pool = getTextPool();
  if (!pool.length) pool = textType === 'normal' ? NORMAL_TEXTS : textType === 'alabuga' ? TEXTS_ALABUGA : TEXTS;
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

  const normalize = c => c === 'ё' ? 'е' : c === 'Ё' ? 'Е' : c;
  const expected = chars[currentIndex].char;
  const isCorrect = normalize(char) === normalize(expected);
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

// ====== TEXT PICKER ======
const textPickerOverlay = document.getElementById('textPickerOverlay');
const textPickerList = document.getElementById('textPickerList');
const closeTextPicker = document.getElementById('closeTextPicker');
const pickTextBtn = document.getElementById('pickTextBtn');

let selectedTextObj = null;

function openTextPicker() {
  const pool = getTextPool();
  textPickerList.innerHTML = '';
  if (!pool.length) {
    textPickerList.innerHTML = '<div class="text-picker-empty">Нет текстов под эти фильтры</div>';
  } else {
    pool.forEach((t, i) => {
      const item = document.createElement('div');
      item.className = 'text-picker-item' + (selectedTextObj === t ? ' selected' : '');
      const preview = t.text.length > 80 ? t.text.slice(0, 80) + '…' : t.text;
      const diffLabels = {easy:'Лёгкая',medium:'Средняя',hard:'АДСКАЯ'};
      const catLabels = {classic:'Классика',modern:'Современное',science:'Наука',tech:'Технологии',prose:'Проза'};
      item.innerHTML = `
        <div class="text-picker-item-source">${escHtml(t.source)}</div>
        <div class="text-picker-item-meta">${catLabels[t.category]||t.category} · ${diffLabels[t.difficulty]||t.difficulty}</div>
        <div class="text-picker-item-preview">${escHtml(preview)}</div>
      `;
      item.addEventListener('click', () => {
        selectedTextObj = t;
        textSource.innerHTML = '📖 ' + escHtml(t.source) + ' <span class="text-picker-selected-badge">📚 Выбран</span>';
        textPickerOverlay.classList.remove('active');
      });
      textPickerList.appendChild(item);
    });
  }
  textPickerOverlay.classList.add('active');
}

pickTextBtn.addEventListener('click', openTextPicker);
closeTextPicker.addEventListener('click', () => textPickerOverlay.classList.remove('active'));
textPickerOverlay.addEventListener('click', e => { if (e.target === textPickerOverlay) textPickerOverlay.classList.remove('active'); });

// ====== INIT ======
shareSection.style.display = 'none';
loadLeaderboard();
showScreen(menuScreen);

// ====== BATTLE MODE ======
const battleLobbyScreen = document.getElementById('battleLobbyScreen');
const battleWaitScreen = document.getElementById('battleWaitScreen');
const battleGameScreen = document.getElementById('battleGameScreen');
const battleBtn = document.getElementById('battleBtn');
const battleLobbyBack = document.getElementById('battleLobbyBack');
const battleWaitBack = document.getElementById('battleWaitBack');
const battleGameBack = document.getElementById('battleGameBack');
const battleCreateBtn = document.getElementById('battleCreateBtn');
const battleJoinBtn = document.getElementById('battleJoinBtn');
const battleNickCreate = document.getElementById('battleNickCreate');
const battleNickJoin = document.getElementById('battleNickJoin');
const battleCodeInput = document.getElementById('battleCodeInput');
const battleCategory = document.getElementById('battleCategory');
const battleError = document.getElementById('battleError');
const battleRoomCode = document.getElementById('battleRoomCode');
const bpName1 = document.getElementById('bpName1');
const bpName2 = document.getElementById('bpName2');
const bpStatus1 = document.getElementById('bpStatus1');
const bpStatus2 = document.getElementById('bpStatus2');
const battleWaitMsg = document.getElementById('battleWaitMsg');
const boNick = document.getElementById('boNick');
const boWpm = document.getElementById('boWpm');
const boStatus = document.getElementById('boStatus');
const boProgress = document.getElementById('boProgress');
const closeBattleResults = document.getElementById('closeBattleResults');
const battleResultTitle = document.getElementById('battleResultTitle');
const battleResultPlayers = document.getElementById('battleResultPlayers');
const battleResultMenu = document.getElementById('battleResultMenu');
const battleResultsOverlay = document.getElementById('battleResultsOverlay');
const battleStartBtn = document.getElementById('battleStartBtn');
const battleSpinner = document.getElementById('battleSpinner');

let battleRoom = null;
let battlePlayerNum = 0;
let battleNick = '';
let battleOpponentNick = '';
let battleListeners = [];

function genRoomCode() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

function showBattleScreen(s) {
  [menuScreen, gameScreen, lbScreen, battleLobbyScreen, battleWaitScreen, battleGameScreen].forEach(x => x.classList.remove('active'));
  s.classList.add('active');
}

battleBtn.addEventListener('click', () => {
  battleError.textContent = '';
  showBattleScreen(battleLobbyScreen);
});

battleLobbyBack.addEventListener('click', () => showScreen(menuScreen));
battleWaitBack.addEventListener('click', () => {
  if (battleRoom) {
    firebase.database().ref('battles/' + battleRoom).remove().catch(() => {});
  }
  cleanupBattle();
  showBattleScreen(battleLobbyScreen);
});
battleGameBack.addEventListener('click', () => {
  cleanupBattle();
  showScreen(menuScreen);
});

function cleanupBattle() {
  battleListeners.forEach(ref => { try { ref.off(); } catch(e) {} });
  battleListeners = [];
  battleRoom = null;
  battleStartBtn.disabled = false;
  battleStartBtn.textContent = '🚀 Начать игру';
  document.getElementById('opponentBar').style.display = 'none';
  if (battleTimerInterval) { clearInterval(battleTimerInterval); battleTimerInterval = null; }
  battleResultsOverlay.classList.remove('active');
}

battleCreateBtn.addEventListener('click', () => {
  const nick = battleNickCreate.value.trim();
  if (!nick) { battleError.textContent = 'Введи ник'; return; }
  battleError.textContent = '';
  const code = genRoomCode();
  battleRoom = code;
  battleNick = nick;
  battlePlayerNum = 1;
  const cat = battleCategory.value;

  const ref = firebase.database().ref('battles/' + code);
  ref.set({
    status: 'waiting',
    category: cat,
    players: {
      player1: { nickname: nick, progress: 0, wpm: 0, accuracy: 100, finished: false, joinedAt: Date.now() }
    },
    createdAt: Date.now()
  }).then(() => {
    battleRoomCode.textContent = code;
    bpName1.textContent = nick;
    bpStatus1.textContent = '👤 Вы';
    bpName2.textContent = '—';
    bpStatus2.textContent = '⏳ Ожидание';
    battleSpinner.style.display = '';
    battleStartBtn.style.display = 'none';
    battleWaitMsg.textContent = 'Ожидание противника...';
    showBattleScreen(battleWaitScreen);
    listenBattle(code, true);
  }).catch((err) => {
    battleError.textContent = err.code === 'PERMISSION_DENIED' ? '❌ Ошибка: открой доступ к battles/ в Firebase консоли!' : 'Не удалось создать комнату';
    console.error('Battle create error:', err);
  });
});

battleJoinBtn.addEventListener('click', () => {
  const code = battleCodeInput.value.trim();
  const nick = battleNickJoin.value.trim();
  if (!code || code.length !== 4) { battleError.textContent = 'Введи код комнаты (4 цифры)'; return; }
  if (!nick) { battleError.textContent = 'Введи ник'; return; }
  battleError.textContent = '';
  battleRoom = code;
  battleNick = nick;
  battlePlayerNum = 2;

  const ref = firebase.database().ref('battles/' + code);
  ref.once('value', snap => {
    const data = snap.val();
    if (!data) { battleError.textContent = 'Комната не найдена'; return; }
    if (data.status !== 'waiting') { battleError.textContent = 'Комната уже занята или игра началась'; return; }
    if (data.players.player2) { battleError.textContent = 'Комната уже заполнена'; return; }

    ref.child('players/player2').set({
      nickname: nick, progress: 0, wpm: 0, accuracy: 100, finished: false, ready: false, joinedAt: Date.now()
    }).then(() => {
      bpName1.textContent = data.players.player1.nickname;
      battleOpponentNick = data.players.player1.nickname;
      bpStatus1.textContent = '👤 Противник';
      bpName2.textContent = nick;
      bpStatus2.textContent = '👤 Вы';
      battleSpinner.style.display = 'none';
      battleStartBtn.style.display = '';
      battleWaitMsg.textContent = 'Противник найден! Нажми Начать игру';
      battleRoomCode.textContent = code;
      showBattleScreen(battleWaitScreen);
      listenBattle(code, false);
    }).catch((err) => {
      battleError.textContent = err.code === 'PERMISSION_DENIED' ? '❌ Ошибка: открой доступ к battles/ в Firebase консоли!' : 'Не удалось присоединиться';
      console.error('Battle join error:', err);
    });
  }, (err) => {
    battleError.textContent = 'Не удалось найти комнату';
    console.error('Battle read error:', err);
  });
});

function listenBattle(code, isCreator) {
  const ref = firebase.database().ref('battles/' + code);
  const listener = ref.on('value', snap => {
    const data = snap.val();
    if (!data) return;

    if (data.status === 'waiting') {
      if (data.players.player2) {
        battleOpponentNick = data.players.player2.nickname;
        bpName2.textContent = data.players.player2.nickname;
        bpStatus2.textContent = '👤 Противник';
        battleSpinner.style.display = 'none';
        battleStartBtn.style.display = '';
        battleWaitMsg.textContent = 'Противник найден! Нажми Начать игру';
        const me = 'player' + battlePlayerNum;
        if (data.players[me] && data.players[me].ready) {
          battleStartBtn.disabled = true;
          battleStartBtn.textContent = '⏳ Ожидание соперника...';
        } else {
          battleStartBtn.disabled = false;
          battleStartBtn.textContent = '🚀 Начать игру';
        }
      }
      const p1r = data.players.player1 && data.players.player1.ready;
      const p2r = data.players.player2 && data.players.player2.ready;
      if (p1r && p2r && isCreator) {
        startBattleCountdown(battleRoom);
      }
    }

    if (data.status === 'playing') {
      if (!battleGameScreen.classList.contains('active')) {
        const text = data.text;
        const textObj = data.textObj || { category: 'prose', difficulty: 'medium', source: 'Текст' };
        startBattleGame(text, textObj, code);
      }
    }

    if (data.status === 'playing' || data.status === 'finished') {
      const me = 'player' + battlePlayerNum;
      const opp = battlePlayerNum === 1 ? 'player2' : 'player1';
      const op = data.players && data.players[opp];
      if (op) {
        boNick.textContent = op.nickname;
        boWpm.textContent = op.wpm + ' б/м';
        const pct = data.text ? Math.round(op.progress / data.text.length * 100) : 0;
        boProgress.style.width = Math.min(pct, 100) + '%';
        boStatus.textContent = op.finished ? '🏁 готов' : 'печатает';
      }
      if (data.status === 'finished') {
        showBattleResults(data);
      }
    }
  });
  battleListeners.push({ ref, off: () => ref.off('value', listener) });
}

function startBattleCountdown(code) {
  battleRoom = code;

  const ref = firebase.database().ref('battles/' + code);

  const textPool = [...TEXTS, ...NORMAL_TEXTS, ...TEXTS_ALABUGA];
  const cat = battleCategory.value;
  let pool = textPool.filter(t => cat === 'all' || t.category === cat);
  if (!pool.length) pool = textPool;
  const textObj = pool[Math.floor(Math.random() * pool.length)];
  const sharedText = textObj.text;

  ref.update({
    status: 'playing',
    text: sharedText,
    textObj: { category: textObj.category, difficulty: textObj.difficulty, source: textObj.source },
    startedAt: Date.now()
  });
}

battleStartBtn.addEventListener('click', () => {
  const me = 'player' + battlePlayerNum;
  const ref = firebase.database().ref('battles/' + battleRoom);
  ref.child('players/' + me + '/ready').set(true).then(() => {
    battleStartBtn.disabled = true;
    battleStartBtn.textContent = '⏳ Ожидание соперника...';
  });
});

function startBattleGame(text, textObj, code) {
  battleRoom = code;
  document.getElementById('opponentBar').style.display = '';
  const bChars = [...text].map(ch => ({ char: ch, status: 'pending' }));
  let bCurrentIndex = 0;
  let bCorrect = 0;
  let bTotal = 0;
  let bErrors = 0;
  let bTimerStart = null;
  let bTimerInterval = null;
  let bIsFinished = false;

  const bDisplay = document.getElementById('battleTextDisplay');
  const bInput = document.getElementById('battleHiddenInput');
  const bTimerDisplay = document.getElementById('battleTimerDisplay');
  const bTimerRing = document.getElementById('battleTimerRing');
  const bWpmDisplay = document.getElementById('battleWpmDisplay');
  const bAccDisplay = document.getElementById('battleAccDisplay');
  const bProgressFill = document.getElementById('battleProgressFill');
  const bTextSource = document.getElementById('battleTextSource');
  const bTextCategory = document.getElementById('battleTextCategory');

  bTextSource.textContent = textObj.source;
  const labels = {classic:'Классика',modern:'Современное',science:'Наука',tech:'Технологии',prose:'Проза'};
  bTextCategory.textContent = labels[textObj.category] || textObj.category;

  function bRender() {
    bDisplay.innerHTML = bChars.map((ch, i) => {
      let cls = 'char';
      if (ch.char === ' ') cls += ' space';
      if (ch.status === 'pending') cls += ' pending';
      if (ch.status === 'correct') cls += ' correct';
      if (ch.status === 'incorrect') cls += ' incorrect';
      if (i === bCurrentIndex && !bIsFinished) cls += ' current';
      const txt = ch.char === ' ' ? '\u00A0' : ch.char;
      return `<span class="${cls}">${txt}</span>`;
    }).join('');
    if (!bIsFinished) {
      const el = bDisplay.querySelector('.char.current');
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function bUpdateStats() {
    const elapsed = bTimerStart ? (Date.now() - bTimerStart) / 1000 : 0;
    const mins = elapsed / 60;
    const net = mins > 0 ? Math.round(bCorrect / mins) : 0;
    const dnom = bCorrect + bErrors;
    const acc = dnom > 0 ? Math.round(bCorrect / dnom * 100) : 100;
    bWpmDisplay.textContent = net;
    bAccDisplay.textContent = acc + '%';
    bProgressFill.style.width = (bCurrentIndex / bChars.length * 100) + '%';

    const m = Math.floor(elapsed / 60);
    const s = Math.floor(elapsed % 60);
    bTimerDisplay.textContent = m + ':' + String(s).padStart(2, '0');
    bTimerRing.setAttribute('stroke-dashoffset', 0);

    const me = 'player' + battlePlayerNum;
    const data = {};
    data['players/' + me + '/progress'] = bCurrentIndex;
    data['players/' + me + '/wpm'] = net;
    data['players/' + me + '/accuracy'] = acc;
    firebase.database().ref('battles/' + battleRoom).update(data);
  }

  function bHandleChar(char) {
    if (bIsFinished) return;
    if (bCurrentIndex >= bChars.length) return;
    if (!bTimerStart) { bTimerStart = Date.now(); bTimerInterval = setInterval(bUpdateStats, 200); }

    const normalize = c => c === 'ё' ? 'е' : c === 'Ё' ? 'Е' : c;
    const expected = bChars[bCurrentIndex].char;
    const isCorrect = normalize(char) === normalize(expected);
    bTotal++;

    if (isCorrect) {
      if (bChars[bCurrentIndex].status !== 'correct') bCorrect++;
      bChars[bCurrentIndex].status = 'correct';
      bCurrentIndex++;
    } else {
      if (bChars[bCurrentIndex].status !== 'incorrect') bErrors++;
      bChars[bCurrentIndex].status = 'incorrect';
    }

    bRender();
    bUpdateStats();

    if (bCurrentIndex >= bChars.length) {
      bIsFinished = true;
      if (bTimerInterval) { clearInterval(bTimerInterval); bTimerInterval = null; }
      const elapsed = bTimerStart ? (Date.now() - bTimerStart) / 1000 : 0;
      firebase.database().ref('battles/' + battleRoom + '/players/player' + battlePlayerNum).update({
        finished: true, finishedAt: Date.now(), time: elapsed
      });
    }
  }

  bInput.addEventListener('keydown', function bKeydown(e) {
    if (e.key === 'Backspace' || e.ctrlKey || e.metaKey || e.altKey) e.preventDefault();
  });
  bInput.addEventListener('input', function bInputHandler() {
    if (bIsFinished) { bInput.value = ''; return; }
    const v = bInput.value;
    if (v.length) bHandleChar(v[v.length - 1]);
    bInput.value = '';
  });
  document.getElementById('battleTextContainer').addEventListener('click', () => { if (!bIsFinished) bInput.focus(); });

  bRender();
  bInput.value = '';
  bInput.focus();

  showBattleScreen(battleGameScreen);
}

function showBattleResults(data) {
  const p1 = data.players.player1 || {};
  const p2 = data.players.player2 || {};
  let winner = null;
  if (p1.finished && p2.finished) {
    winner = p1.finishedAt < p2.finishedAt ? 'player1' : 'player2';
  } else if (p1.finished) {
    winner = 'player1';
  } else if (p2.finished) {
    winner = 'player2';
  }

  const myKey = 'player' + battlePlayerNum;
  const oppKey = battlePlayerNum === 1 ? 'player2' : 'player1';
  const isWinner = winner === myKey;

  battleResultTitle.textContent = isWinner ? '🏆 Вы победили!' : '😔 Вы проиграли';

  battleResultPlayers.innerHTML = '';
  [p1, p2].forEach((p, i) => {
    const key = i === 0 ? 'player1' : 'player2';
    const row = document.createElement('div');
    row.className = 'battle-result-row' + (key === winner ? ' winner' : '');
    row.innerHTML = `
      <div>
        <div class="br-name">${escHtml(p.nickname || '—')}</div>
        <div class="br-stats">${p.wpm||0} б/м · ${p.accuracy||100}% · ${p.finished ? '✅' : '❌'}</div>
      </div>
      <div class="br-badge ${key === winner ? 'win' : 'lose'}">${key === winner ? 'Победа' : 'Поражение'}</div>
    `;
    battleResultPlayers.appendChild(row);
  });

  battleResultsOverlay.classList.add('active');
}

closeBattleResults.addEventListener('click', () => { cleanupBattle(); showScreen(menuScreen); });
battleResultsOverlay.addEventListener('click', e => { if (e.target === battleResultsOverlay) { cleanupBattle(); showScreen(menuScreen); } });
battleResultMenu.addEventListener('click', () => { cleanupBattle(); showScreen(menuScreen); });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    battleResultsOverlay.classList.remove('active');
    settingsOverlay.classList.remove('active');
    overlay.classList.remove('active');
    if (battleGameScreen.classList.contains('active')) { cleanupBattle(); showScreen(menuScreen); }
  }
});
