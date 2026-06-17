// --- 1. CONFIGURACIÓN FIREBASE Y USUARIO ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAizbSbjMglW2BZjPt658z8LFtpj6kybOY",
    authDomain: "procrastinever-sync.firebaseapp.com",
    projectId: "procrastinever-sync",
    storageBucket: "procrastinever-sync.firebasestorage.app",
    messagingSenderId: "528915845360",
    appId: "1:528915845360:web:02ce4ca65c66d72ae57235"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const params = new URLSearchParams(window.location.search);
let userId = params.get('user');

if (userId) {
    localStorage.setItem('procrastiActiveUser', userId);
} else {
    userId = localStorage.getItem('procrastiActiveUser') || null;
}

// Si no hay usuario, mostrar pantalla de login y detener el resto
if (!userId) {
    // Ocultar todo el contenido de la app
    document.querySelectorAll('body > *').forEach(el => {
        if(el.id !== 'loginScreen') el.style.display = 'none';
    });

    // Crear pantalla de login
    const loginScreen = document.createElement('div');
    loginScreen.id = 'loginScreen';
    loginScreen.style.cssText = 'max-width:600px; margin:0 auto; padding:20px;';
    loginScreen.innerHTML = `
        <div class="header" style="margin-bottom:30px;">
            <h1>🎴 ProcrastiNever</h1>
            <div class="subtitle">Coleccionista de hábitos</div>
        </div>
        <div style="background:var(--color-card); border-radius:15px; padding:30px; box-shadow:0 4px 15px rgba(0,0,0,0.05); text-align:center;">
            <div style="font-size:2.5rem; margin-bottom:10px;">👤</div>
            <h2 style="font-size:1.2rem; margin-bottom:8px; color:var(--color-accent);">¿Quién eres?</h2>
            <p style="font-size:0.85rem; color:var(--color-text-secondary); margin-bottom:20px;">Escribe tu nombre de usuario para acceder a tu perfil.</p>
            <input id="loginInput" type="text" placeholder="Ej: LeriusDrago" autocomplete="off" autocapitalize="off"
                style="width:100%; padding:12px 16px; border-radius:12px; border:2px solid var(--color-border); background:var(--color-bg-primary); color:var(--color-text-primary); font-size:1rem; margin-bottom:14px; text-align:center; outline:none; transition:border 0.2s;"
                onkeydown="if(event.key==='Enter') loginUser()">
            <button class="btn" onclick="loginUser()" style="width:100%; font-size:1rem; padding:14px;">Ingresar 🚀</button>
        </div>
    `;
    document.body.appendChild(loginScreen);

    // Aplicar tema guardado globalmente (sin userId)
    const savedTheme = localStorage.getItem('procrastiTheme_global') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);

    window.loginUser = () => {
        const input = document.getElementById('loginInput').value.trim();
        if(!input) { document.getElementById('loginInput').style.borderColor = 'var(--color-fail)'; return; }
        window.location.href = `${window.location.origin}${window.location.pathname}?user=${encodeURIComponent(input)}`;
    };

    // Detener todo lo demás — no inicializar la app
    throw new Error('LOGIN_REQUIRED');
}

userId = userId || 'Invitado';

const userDocRef = doc(db, "userData", userId);
console.log("Sesión activa para:", userId);

// --- 2. VARIABLES DE ESTADO (AISLADAS POR USUARIO) ---
let userSchedule = JSON.parse(localStorage.getItem(`userSchedule_${userId}`)) || [];
let historyData = JSON.parse(localStorage.getItem(`procrastiHistory_${userId}`)) || {};
let totalXP = parseFloat(localStorage.getItem(`totalXP_${userId}`)) || 0;
let unlockedTrophies = JSON.parse(localStorage.getItem(`procrastiTrophies_${userId}`)) || {};
let allLogs = JSON.parse(localStorage.getItem(`procrastiAllLogs_${userId}`)) || {};
let currentTheme = localStorage.getItem(`procrastiTheme_${userId}`) || 'light';
let currentLogDate = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
let dailyLogs = allLogs[currentLogDate] || [];

let timeLeft, timerId = null, isRunning = false, currentMode = 'study', currentCycle = 1, currentBlock = 1;
let timerStartTime = null, timerStartTimeLeft = 0;
let currentPomoMode = 'personalizado';

const trophyData = [
    { pts: 1, icon: '🥉', name: 'Primer Paso' }, { pts: 30, icon: '🥈', name: 'En Racha' },
    { pts: 50, icon: '🥇', name: 'A Mitad de Camino' }, { pts: 100, icon: '💎', name: 'Casi Perfecto' },
    { pts: 210, icon: '👑', name: 'Día Legendario' }, { pts: 300, icon: '🚀', name: 'Imparable' },
    { pts: 400, icon: '🦸', name: 'Superhéroe' }, { pts: 500, icon: '🔥', name: 'Máquina Productiva' },
    { pts: 600, icon: '🌟', name: 'Estrella Absoluta' }, { pts: 1000, icon: '🌌', name: 'Dios del Olimpo' }
];

const emojis = [
    // Originales y Productividad
    '📚', '💻', '🏃', '🧘', '🍳', '🍎', '🧹', '🎸', '🎨', '🚶', 
    '💧', '💤', '💪', '🛒', '📝', '🧠', '🛠️', '🌱', '🎵', '🏆',
    '🧪', '🍿', '🧗', '🛹', '🧶', '📸', '🗺️', '🧸', '🔋', '🛸',
    '🪐', '🎭', '🥊', '🍣', '🍦', '🚲', '⏰', '💎', '🔥', '✨',
    // Salud y Deporte
    '🥗', '🥑', '💊', '🏥', '🦷', '🚴', '🏊', '🚣', '⚽', '🏀', 
    '🏐', '🥾', '🧘‍♀️', '🛌', '🥤',
    // Trabajo y Estudio
    '🖋️', '📊', '📉', '📈', '📅', '📎', '📁', '💡', '🔍', '📢', 
    '💻', '🖱️', '⌨️', '📖', '🎓',
    // Hogar y Vida Diaria
    '🏠', '🚿', '🧺', '🪠', '🔧', '📦', '🔑', '🚗', '🛵', '🐾', 
    '🐶', '🐱', '🪴', '☕', '🍵',
    // Ocio y Varios
    '🎮', '🎲', '🧩', '🎬', '🎧', '🎤', '🎪', '🎨', '🕶️', '🏖️', 
    '🏔️', '⛺', '🛸', '👾', '🍀'
];

let selectedEmoji = '📝'; let logSelectedEmoji = '📝';
let editingIndex = -1; let logEditingIndex = -1;
let chartInstance = null; let pieChartInstance = null;
const themes = ['light', 'dark', 'winter', 'spring', 'summer', 'purple'];
const themeIcons = { 'light': '🍂', 'dark': '🌙', 'winter': '❄️', 'spring': '🌸', 'summer': '🏖️', 'purple': '🔮' };

// --- 3. SINCRONIZACIÓN CLOUD ---
async function syncToCloud() {
    try {
        const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const data = { userSchedule, historyData, totalXP, unlockedTrophies, allLogs, currentTheme, lastActiveDate: today, lastUpdated: Date.now() };
        await setDoc(userDocRef, data);
    } catch (e) { console.error("Error al sincronizar:", e); }
}

onSnapshot(userDocRef, (doc) => {
    if (doc.exists()) {
        const cloud = doc.data();
        const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

        userSchedule = cloud.userSchedule || [];
        historyData = cloud.historyData || {};
        totalXP = cloud.totalXP || 0;
        unlockedTrophies = cloud.unlockedTrophies || {};
        allLogs = cloud.allLogs || {};

        // Reseteo automático de día: si el último uso fue otro día, limpiar tildeos
        const lastActiveDate = cloud.lastActiveDate || today;
        if(lastActiveDate !== today) {
            userSchedule.forEach(t => t.done = false);
            // No se sincronizan aún para no crear un bucle — la siguiente acción del usuario sincroniza
        }
        
        if (cloud.currentTheme && cloud.currentTheme !== currentTheme) {
            applyTheme(cloud.currentTheme);
        }

        localStorage.setItem(`userSchedule_${userId}`, JSON.stringify(userSchedule));
        localStorage.setItem(`totalXP_${userId}`, totalXP);
        localStorage.setItem(`procrastiAllLogs_${userId}`, JSON.stringify(allLogs));
        localStorage.setItem(`procrastiHistory_${userId}`, JSON.stringify(historyData)); 
        localStorage.setItem(`procrastiTrophies_${userId}`, JSON.stringify(unlockedTrophies)); 

        dailyLogs = allLogs[currentLogDate] || [];
        renderSchedule(); updateLevelUI(); renderLog(); renderCollection();

        // Si fue un nuevo día, sincronizar el reset a la nube
        if(lastActiveDate !== today) { syncToCloud(); }
    }
});

// --- 4. FUNCIONES GLOBALES ---
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    document.getElementById('themeToggleBtn').textContent = themeIcons[theme];
    localStorage.setItem(`procrastiTheme_${userId}`, theme);
    currentTheme = theme;
    if(document.getElementById('historyTab').classList.contains('active')) { renderChart(); renderPieChart(); }
}

window.toggleTheme = () => {
    let currentIndex = themes.indexOf(currentTheme);
    let nextIndex = (currentIndex + 1) % themes.length;
    applyTheme(themes[nextIndex]);
    syncToCloud();
};

window.switchTab = (ev, tab) => {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tab + 'Tab').classList.add('active');
    ev.target.classList.add('active');
    if(tab === 'history') { renderChart(); renderPieChart(); calcStreak(); }
};

function updateLevelUI() {
    const level = Math.floor(totalXP / 50) + 1;
    const xpInLevel = totalXP % 50;
    const progress = (xpInLevel / 50) * 100;
    let rank = "🐣 Novato del Enfoque";
    if(level >= 5) rank = "⚔️ Guerrero";
    if(level >= 10) rank = "⚡ Maestro";
    if(level >= 20) rank = "🔥 Titán";
    if(level >= 40) rank = "👑 Leyenda";
    document.getElementById('levelBadge').textContent = `Nivel ${level}`;
    document.getElementById('rankText').textContent = rank;
    document.getElementById('xpBar').style.width = `${progress}%`;
    localStorage.setItem(`totalXP_${userId}`, totalXP);
}

function renderSchedule() {
    const container = document.getElementById('scheduleContainer');
    if(!container) return;
    container.innerHTML = '';
    userSchedule.sort((a,b) => a.time.localeCompare(b.time));
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    userSchedule.forEach((item, index) => {
        const catClass = `cat-border-${item.category || 'work'}`;
        const tagClass = `tag-${item.category || 'work'}`;
        const isCurrent = (item.end && currentTime >= item.time && currentTime <= item.end) && !item.done;
        
        const div = document.createElement('div');
        div.className = `schedule-item ${item.done ? 'task-done' : ''} ${catClass} ${isCurrent ? 'current-task' : ''}`;
        div.innerHTML = `
            <div>
                <div style="font-size:0.7rem; color:var(--color-text-secondary);">
                    ${item.time} - ${item.end} • 🪙 ${item.points} pts
                    <span class="category-tag ${tagClass}">${item.category || 'work'}</span>
                </div>
                <div style="font-weight:bold;">${item.emoji} ${item.activity}</div>
            </div>
            <div class="action-icons">
                <button class="btn" style="padding:5px 10px; background:var(--color-surface); color:var(--color-text-primary);" onclick="toggleTask(${index})">✅</button>
                <span onclick="openEditor(${index})">✏️</span>
                <span onclick="deleteActivity(${index})">🗑️</span>
            </div>
        `;
        container.appendChild(div);
    });
    updateScore();
}

window.toggleTask = (index) => {
    const task = userSchedule[index];
    const pts = parseFloat(task.points) || 0;
    const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2,'0') + ':' + now.getMinutes().toString().padStart(2,'0');

    if (!task.done) {
        totalXP += pts;
        triggerConfetti();
        playSound(800, 0.2);
        // Calcular horas de duración de la actividad
        let hrs = 0;
        if(task.time && task.end) {
            const [sh, sm] = task.time.split(':').map(Number);
            const [eh, em] = task.end.split(':').map(Number);
            hrs = parseFloat(Math.max(0, (eh * 60 + em) - (sh * 60 + sm)) / 60).toFixed(2);
        }
        // Agregar al registro del día
        if(!allLogs[today]) allLogs[today] = [];
        allLogs[today].push({ activity: task.activity, time: currentTime, emoji: task.emoji, hours: parseFloat(hrs), category: task.category || 'work', points: pts, fromRutina: true });
        if(today === currentLogDate) dailyLogs = allLogs[today];
    } else {
        totalXP = Math.max(0, totalXP - pts);
        // Quitar del registro (la entrada más reciente de esta actividad fromRutina)
        if(allLogs[today]) {
            const idx = allLogs[today].map((l,i) => ({l,i})).reverse().find(({l}) => l.fromRutina && l.activity === task.activity);
            if(idx !== undefined) allLogs[today].splice(idx.i, 1);
            if(today === currentLogDate) dailyLogs = allLogs[today];
        }
    }
    task.done = !task.done;
    renderSchedule(); updateLevelUI(); renderLog(); syncToCloud();
};

function updateScore() {
    let earned = 0, total = 0;
    const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
    userSchedule.forEach(t => { 
        total += parseFloat(t.points); 
        if(t.done) earned += parseFloat(t.points); 
    });
    // Sumar puntos de extras registrados manualmente hoy
    (allLogs[today] || []).forEach(l => {
        if(l.isExtra && (parseFloat(l.points) || 0) > 0) earned += parseFloat(l.points) || 0;
    });
    const cappedEarned = Math.min(earned, 10);
    document.getElementById('scoreDisplay').textContent = `${cappedEarned.toFixed(1)} / 10`;
    document.getElementById('progressBar').style.width = Math.min((cappedEarned / 10) * 100, 100) + '%';
    historyData[today] = { earned: cappedEarned, total };
    checkTrophies(totalXP);
}

window.selectLogDate = (dateStr) => {
    if (!dateStr) return; currentLogDate = dateStr;
    document.getElementById('logDateSelector').value = currentLogDate;
    dailyLogs = allLogs[currentLogDate] || [];
    renderLog();
};

window.changeLogDate = (offset) => {
    let d = new Date(currentLogDate + "T12:00:00");
    d.setDate(d.getDate() + offset);
    window.selectLogDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]);
};

function renderLog() {
    const container = document.getElementById('logContainer');
    if(!container) return;
    container.innerHTML = '';
    let logTotalHrs = 0;
    dailyLogs.forEach((item, index) => {
        const hrs = parseFloat(item.hours) || parseFloat(item.points) || 0;
        logTotalHrs += hrs;
        const catClass = `cat-border-${item.category || 'work'}`;
        const tagClass = `tag-${item.category || 'work'}`;
        const div = document.createElement('div');
        div.className = `schedule-item ${catClass}`;
        div.innerHTML = `
            <div>
                <div style="font-size:0.7rem; color:var(--color-text-secondary);">${item.time} <span class="category-tag ${tagClass}">${item.category || 'work'}</span> • ⏱️ ${hrs.toFixed(2)} h</div>
                <div style="font-weight:bold;">${item.emoji} ${item.activity}</div>
            </div>
            <div class="action-icons">
                <span onclick="openLogEditor(${index})">✏️</span>
                <span onclick="deleteLogActivity(${index})">🗑️</span>
            </div>
        `;
        container.appendChild(div);
    });
    const logScoreEl = document.getElementById('logScoreDisplay');
    if(logScoreEl) {
        logScoreEl.textContent = `Total del día: ${logTotalHrs.toFixed(2)} h registradas`;
    }
    if(document.getElementById('historyTab').classList.contains('active')) renderPieChart();
}

function checkTrophies(earnedPts) {
    let newlyUnlocked = false;
    trophyData.forEach(t => {
        if (earnedPts >= t.pts && !unlockedTrophies[t.pts]) {
            unlockedTrophies[t.pts] = true; newlyUnlocked = true;
            setTimeout(() => showToast(`🏆 ¡Desbloqueaste: ${t.name}!`), 400);
        }
    });
    if (newlyUnlocked) { renderCollection(); triggerConfetti(); }
}

function renderCollection() {
    const container = document.getElementById('trophyCase');
    if(!container) return; container.innerHTML = '';
    trophyData.forEach(t => {
        const isUnlocked = unlockedTrophies[t.pts];
        const div = document.createElement('div');
        div.className = `trophy-slot ${isUnlocked ? 'unlocked' : ''}`;
        div.innerHTML = `<div class="trophy-icon">${t.icon}</div><div class="trophy-title">${isUnlocked ? t.name : 'Bloqueado'}</div><div class="trophy-req">${t.pts} pts</div>`;
        container.appendChild(div);
    });
}

window.openEditor = (index = -1) => {
    editingIndex = index; document.getElementById('editModal').style.display = 'flex';
    if(index >= 0) {
        const t = userSchedule[index];
        document.getElementById('editActivity').value = t.activity;
        document.getElementById('editPoints').value = t.points;
        document.getElementById('editStart').value = t.time;
        document.getElementById('editEnd').value = t.end;
        document.getElementById('editCategory').value = t.category || 'work';
        selectedEmoji = t.emoji;
    } else { document.getElementById('editActivity').value = ''; }
    updateEmojiSelection('edit');
};

window.closeEditor = () => { document.getElementById('editModal').style.display = 'none'; };

window.saveActivity = () => {
    const name = document.getElementById('editActivity').value;
    const start = document.getElementById('editStart').value;
    const end = document.getElementById('editEnd').value;
    const cat = document.getElementById('editCategory').value;
    const pts = parseFloat(document.getElementById('editPoints').value) || 0;
    if(!name || !start) return;
    const obj = { activity: name, time: start, end: end, emoji: selectedEmoji, points: pts, category: cat, done: false };
    if(editingIndex >= 0) userSchedule[editingIndex] = {...obj, done: userSchedule[editingIndex].done};
    else userSchedule.push(obj);
    renderSchedule(); window.closeEditor(); syncToCloud();
};

window.deleteActivity = (index) => { userSchedule.splice(index, 1); renderSchedule(); syncToCloud(); };
window.resetDay = () => { userSchedule.forEach(t => t.done = false); renderSchedule(); syncToCloud(); };

window.openLogEditor = (index = -1) => {
    logEditingIndex = index; document.getElementById('logModal').style.display = 'flex';
    if(index >= 0) {
        const t = dailyLogs[index];
        document.getElementById('logActivity').value = t.activity;
        document.getElementById('logPoints').value = t.hours || t.points || 0.5;
        document.getElementById('logTime').value = t.time;
        document.getElementById('logCategory').value = t.category || 'work';
        logSelectedEmoji = t.emoji;
    } else { 
        document.getElementById('logActivity').value = ''; 
        const now = new Date();
        document.getElementById('logTime').value = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
    }
    updateEmojiSelection('log');
};

window.closeLogEditor = () => { document.getElementById('logModal').style.display = 'none'; };

window.saveLogActivity = () => {
    const name = document.getElementById('logActivity').value;
    const start = document.getElementById('logTime').value;
    const cat = document.getElementById('logCategory').value;
    const hrs = parseFloat(document.getElementById('logPoints').value) || 0;
    if(!name || !start) return;
    // Los extras aportan sus horas como puntos al header (con el mismo cap de 10)
    const obj = { activity: name, time: start, emoji: logSelectedEmoji, hours: hrs, points: hrs, category: cat, isExtra: true };
    if(logEditingIndex >= 0) dailyLogs[logEditingIndex] = obj;
    else dailyLogs.push(obj);
    allLogs[currentLogDate] = dailyLogs;
    triggerConfetti(); renderLog(); window.closeLogEditor();
    updateScore(); syncToCloud();
};

window.deleteLogActivity = (index) => { dailyLogs.splice(index, 1); allLogs[currentLogDate] = dailyLogs; renderLog(); syncToCloud(); };

// --- POMODORO ESTÁNDAR ---
function getPomoDoc() {
    return document;
}

function updateDisplay() {
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
    getPomoDoc().getElementById('timerDisplay').textContent = timeStr;
    updatePipDisplay(timeStr);
}

function renderDots() {
    const c = getPomoDoc().getElementById('cycleDots');
    const tot = parseInt(getPomoDoc().getElementById('totalCycles').value);
    const totBlocks = parseInt(getPomoDoc().getElementById('totalBlocks').value);
    c.innerHTML = '';
    for(let i = 1; i <= tot; i++) {
        const d = document.createElement('div');
        d.className = `dot ${i < currentCycle ? 'completed' : (i == currentCycle ? 'active' : '')}`;
        c.appendChild(d);
    }
    getPomoDoc().getElementById('cycleText').textContent = `Ronda ${currentCycle} / ${tot}`;
    const badge = getPomoDoc().getElementById('blockBadge');
    if(badge) badge.textContent = `Bloque ${currentBlock} / ${totBlocks}`;
}

const POMO_PRESETS = {
    normal:        { study: 25, rest: 5,  cycles: 4, blocks: 2, longRest: 15,
                     info: 'Pomodoro clásico (Cirillo). Ideal para tareas cognitivas del día a día.' },
    intenso:       { study: 50, rest: 10, cycles: 3, blocks: 2, longRest: 20,
                     info: 'Ratio óptimo observado por Draugiem Group (52:17 redondeado). Para trabajo profundo.' },
    ultra:         { study: 90, rest: 20, cycles: 2, blocks: 1, longRest: 30,
                     info: 'Ciclo ultradiano de Kleitman. Máxima atención sostenida. Solo para sesiones de alta exigencia.' },
    personalizado: { study: null, rest: null, cycles: null, blocks: null, longRest: null, info: '' }
};

window.setPomoMode = (mode) => {
    currentPomoMode = mode;
    localStorage.setItem(`pomoMode_${userId}`, mode);

    document.querySelectorAll('.pomo-mode-btn').forEach(b => b.classList.remove('active'));
    const btnId = 'mode' + mode.charAt(0).toUpperCase() + mode.slice(1);
    const activeBtn = document.getElementById(btnId);
    if(activeBtn) activeBtn.classList.add('active');

    const isPersonal = mode === 'personalizado';
    ['studyMin', 'restMin', 'totalCycles', 'totalBlocks', 'longRestMin'].forEach(id => {
        const el = getPomoDoc().getElementById(id);
        if(el) el.disabled = !isPersonal;
    });

    const endTimeEl = getPomoDoc().getElementById('pomoEndTime');
    if(endTimeEl) endTimeEl.style.display = 'block';

    if(!isPersonal) {
        const p = POMO_PRESETS[mode];
        getPomoDoc().getElementById('studyMin').value    = p.study;
        getPomoDoc().getElementById('restMin').value     = p.rest;
        getPomoDoc().getElementById('totalCycles').value = p.cycles;
        getPomoDoc().getElementById('totalBlocks').value = p.blocks;
        getPomoDoc().getElementById('longRestMin').value = p.longRest;
        localStorage.setItem(`pomoStudy_${userId}`,    p.study);
        localStorage.setItem(`pomoRest_${userId}`,     p.rest);
        localStorage.setItem(`pomoCycles_${userId}`,   p.cycles);
        localStorage.setItem(`pomoBlocks_${userId}`,   p.blocks);
        localStorage.setItem(`pomoLongRest_${userId}`, p.longRest);
    }

    window.resetTimer();
};

function calcRemainingSeconds() {
    const studySec    = (parseInt(getPomoDoc().getElementById('studyMin').value)    || 25) * 60;
    const restSec     = (parseInt(getPomoDoc().getElementById('restMin').value)     || 5)  * 60;
    const cycles      =  parseInt(getPomoDoc().getElementById('totalCycles').value) || 4;
    const blocks      =  parseInt(getPomoDoc().getElementById('totalBlocks').value) || 2;
    const longRestSec = (parseInt(getPomoDoc().getElementById('longRestMin').value) || 15) * 60;
    const fullBlock   = cycles * studySec + (cycles - 1) * restSec;
    let remaining = timeLeft;
    if(currentMode === 'study') {
        const roundsLeft = cycles - currentCycle;
        const blocksLeft = blocks - currentBlock;
        remaining += roundsLeft * (restSec + studySec);
        remaining += blocksLeft > 0 ? longRestSec : 0;
        remaining += blocksLeft * fullBlock + Math.max(0, blocksLeft - 1) * longRestSec;
    } else if(currentMode === 'rest') {
        const roundsLeft = cycles - (currentCycle + 1);
        const blocksLeft = blocks - currentBlock;
        remaining += studySec;
        remaining += roundsLeft * (restSec + studySec);
        remaining += blocksLeft > 0 ? longRestSec : 0;
        remaining += blocksLeft * fullBlock + Math.max(0, blocksLeft - 1) * longRestSec;
    } else if(currentMode === 'longrest') {
        const blocksLeft = blocks - currentBlock;
        remaining += blocksLeft * fullBlock + Math.max(0, blocksLeft - 1) * longRestSec;
    }
    return remaining;
}

function calcEndTime() {
    const el = getPomoDoc().getElementById('pomoEndTime');
    if(!el) return;
    const remainingSec = calcRemainingSeconds();
    const end = new Date(Date.now() + remainingSec * 1000);
    const endStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const totalMin = Math.round(remainingSec / 60);
    const h = Math.floor(totalMin / 60), m = totalMin % 60;
    const durStr = h > 0 ? `${h}h ${m}min` : `${m}min`;
    const sessionActive = isRunning || currentCycle > 1 || currentBlock > 1 || currentMode !== 'study';
    const label = sessionActive ? 'restantes' : 'en total';
    el.textContent = `⏰ Terminas ~${endStr} (${durStr} ${label})`;
    el.style.display = 'block';
}

window.savePomoSettings = () => {
    if(currentPomoMode !== 'personalizado') return;
    const studyMin = parseInt(getPomoDoc().getElementById('studyMin').value) || 25;
    const blocks   = parseInt(getPomoDoc().getElementById('totalBlocks').value) || 2;

    // Auto-sugerir Pausa: 20% del Enfoque, mínimo 5 min (evidencia cognitiva)
    const suggestedRest = Math.max(5, Math.round(studyMin * 0.2));
    const prevStudy = parseInt(localStorage.getItem(`pomoStudy_${userId}`)) || 25;
    const prevSuggestedRest = Math.max(5, Math.round(prevStudy * 0.2));
    const currentRest = parseInt(getPomoDoc().getElementById('restMin').value);
    if(currentRest === prevSuggestedRest || isNaN(currentRest)) {
        getPomoDoc().getElementById('restMin').value = suggestedRest;
    }

    // Auto-sugerir Recuperación: min(30, max(15, bloques×7))
    const suggestedLong = Math.min(30, Math.max(15, blocks * 7));
    const prevBlocks = parseInt(localStorage.getItem(`pomoBlocks_${userId}`)) || 2;
    const prevSuggestedLong = Math.min(30, Math.max(15, prevBlocks * 7));
    const currentLong = parseInt(getPomoDoc().getElementById('longRestMin').value);
    if(currentLong === prevSuggestedLong || isNaN(currentLong)) {
        getPomoDoc().getElementById('longRestMin').value = suggestedLong;
    }

    localStorage.setItem(`pomoStudy_${userId}`, getPomoDoc().getElementById('studyMin').value);
    localStorage.setItem(`pomoRest_${userId}`,  getPomoDoc().getElementById('restMin').value);
    localStorage.setItem(`pomoCycles_${userId}`, getPomoDoc().getElementById('totalCycles').value);
    localStorage.setItem(`pomoBlocks_${userId}`, blocks);
    localStorage.setItem(`pomoLongRest_${userId}`, getPomoDoc().getElementById('longRestMin').value);
    window.resetTimer();
};

window.toggleTimer = () => {
    if(isRunning) {
        clearInterval(timerId); isRunning = false;
        // Calcular tiempo real restante al pausar
        if(timerStartTime) {
            const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
            timeLeft = Math.max(0, timerStartTimeLeft - elapsed);
        }
        getPomoDoc().getElementById('startBtn').textContent = "▶️ Reanudar";
        document.body.classList.remove('deep-focus');
        calcEndTime();
    } else {
        isRunning = true;
        timerStartTime = Date.now();
        timerStartTimeLeft = timeLeft;
        getPomoDoc().getElementById('startBtn').textContent = "⏸️ Pausar";
        if(!pipWindow) document.body.classList.add('deep-focus');
        timerId = setInterval(() => {
            const elapsed = Math.floor((Date.now() - timerStartTime) / 1000);
            timeLeft = Math.max(0, timerStartTimeLeft - elapsed);
            updateDisplay();
            if(timeLeft <= 0) { clearInterval(timerId); handlePhaseEnd(); }
        }, 500);
    }
};

window.resetTimer = () => {
    clearInterval(timerId); isRunning = false; currentMode = 'study'; currentCycle = 1; currentBlock = 1; document.body.classList.remove('deep-focus');
    
    const sMin = localStorage.getItem(`pomoStudy_${userId}`) || 25;
    getPomoDoc().getElementById('studyMin').value = sMin;
    getPomoDoc().getElementById('restMin').value = localStorage.getItem(`pomoRest_${userId}`) || 5;
    getPomoDoc().getElementById('totalCycles').value = localStorage.getItem(`pomoCycles_${userId}`) || 4;
    getPomoDoc().getElementById('totalBlocks').value = localStorage.getItem(`pomoBlocks_${userId}`) || 2;
    getPomoDoc().getElementById('longRestMin').value = localStorage.getItem(`pomoLongRest_${userId}`) || 15;

    timeLeft = sMin * 60;
    getPomoDoc().getElementById('pomoStatus').textContent = "Listo para Empezar";
    getPomoDoc().getElementById('pomoCard').classList.remove('mode-rest');
    getPomoDoc().getElementById('startBtn').textContent = "▶️ Empezar";
    updateDisplay(); renderDots(); calcEndTime();
};

function handlePhaseEnd() {
    clearInterval(timerId); isRunning = false; document.body.classList.remove('deep-focus');
    playAlarm();
    const totalRounds = parseInt(getPomoDoc().getElementById('totalCycles').value);
    const totalBlocksVal = parseInt(getPomoDoc().getElementById('totalBlocks').value);
    const studyMinutes = parseInt(getPomoDoc().getElementById('studyMin').value) || 25;
    const longRest = parseInt(getPomoDoc().getElementById('longRestMin').value) || 15;

    if(currentMode === 'study') {
        const esUltimaRonda = currentCycle >= totalRounds;
        const esUltimoBloque = currentBlock >= totalBlocksVal;

        if(esUltimaRonda) {
            if(esUltimoBloque) {
                // ✅ FIN DE SESIÓN COMPLETA — registrar en log y terminar
                const now = new Date();
                const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
                // Buscar tarea activa: primero en ventana exacta, luego la más reciente que haya iniciado
                let activeTask = userSchedule.find(t => t.time && t.end && currentTime >= t.time && currentTime <= t.end && !t.done);
                if(!activeTask) {
                    const started = userSchedule.filter(t => t.time && t.time <= currentTime && !t.done);
                    if(started.length > 0) {
                        started.sort((a, b) => b.time.localeCompare(a.time));
                        activeTask = started[0];
                    }
                }
                if(activeTask) {
                    const [startH, startM] = activeTask.time.split(':').map(Number);
                    const [endH, endM] = activeTask.end.split(':').map(Number);
                    const activityDuration = (endH * 60 + endM) - (startH * 60 + startM);
                    const totalStudyMinutes = studyMinutes * totalRounds * totalBlocksVal;
                    const covers80 = activityDuration > 0 && (totalStudyMinutes / activityDuration) >= 0.8;
                    const hoursWorked = parseFloat((studyMinutes * totalRounds * totalBlocksVal / 60).toFixed(2));
                    if(!allLogs[currentLogDate]) allLogs[currentLogDate] = [];
                    const label = covers80 ? " (Pomo ✓)" : " (Pomo)";
                    allLogs[currentLogDate].push({ activity: activeTask.activity + label, time: currentTime, emoji: activeTask.emoji, hours: hoursWorked, category: activeTask.category, points: parseFloat(activeTask.points) || 0, fromRutina: true });
                    if(currentLogDate === new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]) dailyLogs = allLogs[currentLogDate];
                    if(!activeTask.done) {
                        const pts = parseFloat(activeTask.points) || 0;
                        totalXP += pts;
                        activeTask.done = true;
                        renderSchedule(); updateLevelUI(); updateScore();
                        showToast(`✅ "${activeTask.activity}" marcada como completada en Rutina`);
                    }
                    syncToCloud(); renderLog();
                }
                notifyPip("🎉 ¡Sesión completa! Todos los bloques finalizados.");
                showToast("🍅 ¡Sesión completa! Todos los bloques finalizados.");
                window.resetTimer();
                return;
            } else {
                // ☕ FIN DE BLOQUE — descanso largo antes del siguiente bloque
                currentMode = 'longrest';
                timeLeft = longRest * 60;
                getPomoDoc().getElementById('pomoStatus').textContent = `🌿 Recuperación — Bloque ${currentBlock} completado`;
                getPomoDoc().getElementById('pomoCard').classList.add('mode-rest');
                notifyPip(`🌿 ¡Bloque ${currentBlock} completado! Recuperación de ${longRest} min.`);
                showToast(`🌿 ¡Bloque ${currentBlock} de ${totalBlocksVal} completado! Descansa ${longRest} min.`);
                setPipMode('rest');
            }
        } else {
            // ☕ FIN DE RONDA — pausa corta
            currentMode = 'rest';
            timeLeft = getPomoDoc().getElementById('restMin').value * 60;
            getPomoDoc().getElementById('pomoStatus').textContent = "☕ Pausa corta";
            getPomoDoc().getElementById('pomoCard').classList.add('mode-rest');
            notifyPip(`☕ Pausa corta — Ronda ${currentCycle} de ${totalRounds} completada.`);
            setPipMode('rest');
        }
    } else if(currentMode === 'rest') {
        // Siguiente ronda dentro del mismo bloque
        currentCycle++;
        currentMode = 'study';
        timeLeft = getPomoDoc().getElementById('studyMin').value * 60;
        getPomoDoc().getElementById('pomoStatus').textContent = `✍️ Enfoque — Ronda ${currentCycle}`;
        getPomoDoc().getElementById('pomoCard').classList.remove('mode-rest');
        notifyPip(`✍️ ¡A enfocarse! Ronda ${currentCycle} de ${totalRounds} — Bloque ${currentBlock}.`);
        setPipMode('study');
    } else if(currentMode === 'longrest') {
        // Inicio de nuevo bloque
        currentBlock++;
        currentCycle = 1;
        currentMode = 'study';
        timeLeft = getPomoDoc().getElementById('studyMin').value * 60;
        getPomoDoc().getElementById('pomoStatus').textContent = `✍️ Enfoque — Bloque ${currentBlock}`;
        getPomoDoc().getElementById('pomoCard').classList.remove('mode-rest');
        notifyPip(`🚀 ¡Bloque ${currentBlock} de ${totalBlocksVal}! Primera ronda.`);
        setPipMode('study');
    }

    renderDots(); updateDisplay(); window.toggleTimer();
}

// --- PiP: DOCUMENT PICTURE-IN-PICTURE API ---
let pipWindow = null;
const pomoCard = document.getElementById('pomoCard');

function updatePipDisplay(timeStr) {
    const doc = (pipWindow && !pipWindow.closed) ? pipWindow.document : document;
    const pipTimer = doc.getElementById('pipTimerDisplay');
    if(pipTimer) pipTimer.textContent = timeStr;
}

function setPipMode(mode) {
    const doc = (pipWindow && !pipWindow.closed) ? pipWindow.document : document;
    const pipContainer = doc.getElementById('pipContainer');
    if(!pipContainer) return;
    if(mode === 'rest') pipContainer.classList.add('rest-mode');
    else pipContainer.classList.remove('rest-mode');
}

function notifyPip(msg) {
    if(Notification && Notification.permission === 'granted') {
        new Notification('🍅 ProcrastiNever', { body: msg, icon: 'logo.png' });
    }
    showToast(msg);
}

window.openPip = async () => {
    if(!('documentPictureInPicture' in window)) {
        showToast('⚠️ Usa Chrome o Edge para el modo PiP');
        return;
    }

    if(pipWindow) {
        pipWindow.close();
        return;
    }

    if(Notification && Notification.permission === 'default') {
        await Notification.requestPermission();
    }

    pipWindow = await documentPictureInPicture.requestWindow({ width: 160, height: 280, disallowReturnToOpener: false });

    // Copiar estilos de la app al PiP
    [...document.styleSheets].forEach(ss => {
        try {
            const s = pipWindow.document.createElement('style');
            s.textContent = [...ss.cssRules].map(r => r.cssText).join('');
            pipWindow.document.head.appendChild(s);
        } catch(e) {
            const l = pipWindow.document.createElement('link');
            l.rel = 'stylesheet'; l.href = ss.href;
            pipWindow.document.head.appendChild(l);
        }
    });

    // Aplicar tema y layout al body del PiP
    pipWindow.document.body.setAttribute('data-theme', currentTheme);
    pipWindow.document.body.style.cssText = 'margin:0; padding:0; overflow:hidden; width:100vw; height:100vh; display:flex; flex-direction:column; background:var(--color-card); min-width:0;';
    pipWindow.document.title = 'ProcrastiNever';
    const pipFavicon = pipWindow.document.createElement('link');
    pipFavicon.rel = 'icon'; pipFavicon.type = 'image/png';
    pipFavicon.href = new URL('logo.png', document.baseURI).href;
    pipWindow.document.head.appendChild(pipFavicon);

    // Mover pipContainer al PiP y mostrarlo
    const pipContainer = document.getElementById('pipContainer');
    pipContainer.style.display = 'flex';
    setPipMode(currentMode);

    // Sincronizar timer actual
    const m = Math.floor(timeLeft / 60), s = timeLeft % 60;
    document.getElementById('pipTimerDisplay').textContent = `${m}:${s < 10 ? '0' : ''}${s}`;

    pipWindow.document.body.appendChild(pipContainer);

    pipWindow.addEventListener('pagehide', () => {
        pipContainer.style.display = 'none';
        document.body.appendChild(pipContainer);
        pipWindow = null;
    });

    showToast('🪟 PiP abierto — redimensiona la ventana libremente');
};

function calcStreak() {
    let streak = 0;
    const today = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000);
    let checking = new Date(today);
    while(true) {
        const dateStr = new Date(checking.getTime() - checking.getTimezoneOffset() * 60000).toISOString().split('T')[0];
        const dayData = historyData[dateStr];
        const routinePts = dayData ? (dayData.earned || 0) : 0;
        if(routinePts >= 3) {
            streak++;
            checking.setDate(checking.getDate() - 1);
        } else {
            break;
        }
    }
    const banner = document.getElementById('streakBanner');
    if(banner) {
        if(streak === 0) { banner.textContent = '🔥 Racha: 0 días — ¡Empieza hoy!'; }
        else if(streak === 1) { banner.textContent = `🔥 Racha: 1 día — ¡Buen comienzo!`; }
        else { banner.textContent = `🔥 Racha: ${streak} días consecutivos — ¡Imparable!`; }
    }
}

function showToast(msg, duration = 3500) {
    const toast = document.getElementById('toastNotification');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
}

function playSound(freq, duration) { const ctx = new (window.AudioContext || window.webkitAudioContext)(); const osc = ctx.createOscillator(), gain = ctx.createGain(); osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = freq; gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration); osc.start(); osc.stop(ctx.currentTime + duration); }
function playAlarm() { playSound(523.25, 1); setTimeout(() => playSound(659.25, 1), 200); }
function triggerConfetti() { confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } }); }

window.renderChart = () => {
    const rangeType = parseInt(document.getElementById('chartTimeRange').value) || 7;
    const ctx = document.getElementById('historyChart').getContext('2d');
    let labels = [], data = [];

    function getHoursForDate(dateStr) {
        const dayLog = allLogs[dateStr];
        if(!dayLog) return 0;
        return dayLog.reduce((sum, t) => sum + (parseFloat(t.hours) || parseFloat(t.points) || 0), 0);
    }

    if (rangeType === 7 || rangeType === 30) {
        for(let i=rangeType-1; i>=0; i--) {
            const d = new Date(); d.setDate(d.getDate()-i);
            const s = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0];
            labels.push(s.split('-')[2] + '/' + s.split('-')[1]);
            data.push(parseFloat(getHoursForDate(s).toFixed(2)));
        }
    } else if (rangeType === 90) {
        for(let w = 12; w >= 0; w--) {
            let weekTotal = 0;
            for(let d = 6; d >= 0; d--) {
                const day = new Date(); day.setDate(day.getDate() - (w * 7 + d));
                const s = new Date(day.getTime() - day.getTimezoneOffset() * 60000).toISOString().split('T')[0];
                weekTotal += getHoursForDate(s);
            }
            const refDay = new Date(); refDay.setDate(refDay.getDate() - w * 7);
            labels.push('S' + refDay.toLocaleDateString('es', { day: '2-digit', month: '2-digit' }));
            data.push(parseFloat(weekTotal.toFixed(2)));
        }
    } else if (rangeType === 365) {
        for(let m = 11; m >= 0; m--) {
            const ref = new Date(); ref.setMonth(ref.getMonth() - m);
            const year = ref.getFullYear(); const month = ref.getMonth();
            let monthTotal = 0;
            Object.keys(allLogs).forEach(dateStr => {
                const d = new Date(dateStr + 'T12:00:00');
                if(d.getFullYear() === year && d.getMonth() === month) {
                    monthTotal += getHoursForDate(dateStr);
                }
            });
            labels.push(ref.toLocaleDateString('es', { month: 'short' }));
            data.push(parseFloat(monthTotal.toFixed(2)));
        }
    }
    if(chartInstance) chartInstance.destroy();
    const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim();
    chartInstance = new Chart(ctx, { type:'bar', data: { labels, datasets: [{ label: 'Horas', data, backgroundColor: accentColor, borderRadius: 5 }] } });
};

window.renderPieChart = () => {
    const ctxPie = document.getElementById('categoryPieChart').getContext('2d');
    let catHours = { work: 0, study: 0, health: 0, leisure: 0, chores: 0 };
    let hasData = false;
    dailyLogs.forEach(t => { catHours[t.category || 'work'] += parseFloat(t.hours) || parseFloat(t.points) || 0; hasData = true; });
    const msgEl = document.getElementById('emptyPieMsg');
    const canvasEl = document.getElementById('categoryPieChart');
    if (!hasData) { msgEl.style.display = 'block'; canvasEl.style.display = 'none'; return; } 
    else { msgEl.style.display = 'none'; canvasEl.style.display = 'block'; }
    if(pieChartInstance) pieChartInstance.destroy();
    const bgColors = [
        getComputedStyle(document.documentElement).getPropertyValue('--cat-work').trim(), getComputedStyle(document.documentElement).getPropertyValue('--cat-study').trim(),
        getComputedStyle(document.documentElement).getPropertyValue('--cat-health').trim(), getComputedStyle(document.documentElement).getPropertyValue('--cat-leisure').trim(),
        getComputedStyle(document.documentElement).getPropertyValue('--cat-chores').trim()
    ];
    pieChartInstance = new Chart(ctxPie, { type: 'doughnut', data: { labels: ['💼', '📚', '🍏', '🎮', '🏠'], datasets: [{ data: [catHours.work, catHours.study, catHours.health, catHours.leisure, catHours.chores], backgroundColor: bgColors }] } });
};

window.exportData = () => {
    const data = { userSchedule, allLogs, historyData, totalXP, unlockedTrophies };
    const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `ProcrastiNever_${userId}_Backup.json`; a.click();
};

window.importData = (event) => {
    const file = event.target.files[0]; const reader = new FileReader();
    reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        userSchedule = data.userSchedule || []; allLogs = data.allLogs || {};
        totalXP = data.totalXP || 0; unlockedTrophies = data.unlockedTrophies || {};
        syncToCloud(); location.reload();
    };
    reader.readAsText(file);
};

function updateEmojiSelection(type) {
    if(type === 'edit') document.querySelectorAll('#emojiPicker .emoji-option').forEach(opt => opt.classList.toggle('selected', opt.textContent === selectedEmoji));
    if(type === 'log') document.querySelectorAll('#logEmojiPicker .emoji-option').forEach(opt => opt.classList.toggle('selected', opt.textContent === logSelectedEmoji));
}

function renderEmojiPickers() {
    const picker1 = document.getElementById('emojiPicker'); const picker2 = document.getElementById('logEmojiPicker');
    emojis.forEach(e => {
        const s1 = document.createElement('span'); s1.className='emoji-option'; s1.textContent = e;
        s1.onclick = () => { selectedEmoji = e; updateEmojiSelection('edit'); }; picker1.appendChild(s1);
        const s2 = document.createElement('span'); s2.className='emoji-option'; s2.textContent = e;
        s2.onclick = () => { logSelectedEmoji = e; updateEmojiSelection('log'); }; picker2.appendChild(s2);
    });
}

let _clockTick = 0;
function updateClock() {
    const now = new Date();
    document.getElementById('miniClock').textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    _clockTick++;
    if(_clockTick >= 60) { _clockTick = 0; calcEndTime(); }
}

// --- 5. INICIALIZACIÓN ---
applyTheme(currentTheme); updateLevelUI(); renderEmojiPickers();
renderCollection(); renderSchedule(); renderLog();
window.setPomoMode(localStorage.getItem(`pomoMode_${userId}`) || 'personalizado');

const greetingElement = document.getElementById('welcomeMessage');
if (greetingElement) {
    const greetings = [ `¡Qué bueno verte otra vez, ${userId}!`, `Bienvenido de nuevo, ${userId}. ¿Qué vamos a lograr hoy?`, `Sesión activa: ${userId}. ¡A darle con todo!` ];
    greetingElement.textContent = greetings[Math.floor(Math.random() * greetings.length)];
}

setInterval(updateClock, 1000); updateClock();
setInterval(() => { if(document.getElementById('scheduleTab').classList.contains('active')) renderSchedule(); }, 60000);

// --- 6. PWA INSTALL PROMPT ---
let deferredPrompt;
const installBtn = document.getElementById('installAppBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir que el prompt automático se muestre en navegadores antiguos
    e.preventDefault();
    // Guardar el evento para dispararlo cuando el usuario haga clic en el botón
    deferredPrompt = e;
    // Mostrar el botón de instalación (el icono de 📥)
    if(installBtn) installBtn.style.display = 'block';
});

if(installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            // Mostrar el aviso del sistema para instalar la app
            deferredPrompt.prompt();
            // Esperar a que el usuario acepte o rechace
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`Respuesta a la instalación: ${outcome}`);
            // Limpiar el evento guardado
            deferredPrompt = null;
            installBtn.style.display = 'none';
        }
    });
}

window.addEventListener('appinstalled', () => {
    // Si la PWA se instala exitosamente, escondemos el botón
    if(installBtn) installBtn.style.display = 'none';
    console.log('ProcrastiNever instalada exitosamente');
});
