const DEFAULT_MISSIONS = [
  { id: "daily-strength", name: "Entrena tu cuerpo", desc: "Haz ejercicio o camina.", xp: 30, stat: "strength", difficulty: "normal", custom: false },
  { id: "daily-intelligence", name: "Aprende algo nuevo", desc: "Dedica 20 minutos a aprender.", xp: 25, stat: "intelligence", difficulty: "normal", custom: false },
  { id: "daily-vitality", name: "Cuida tu descanso", desc: "Reserva tiempo para recuperarte.", xp: 20, stat: "vitality", difficulty: "facile", custom: false },
  { id: "daily-discipline", name: "Completa una tarea pendiente", desc: "Haz algo que llevas posponiendo.", xp: 25, stat: "discipline", difficulty: "normal", custom: false }
];

const XP_BY_DIFFICULTY = {
  facile: 10,
  normal: 25,
  dificil: 50,
  epica: 100
};

const STORAGE_KEY = "miSistemaRPG";
const CUSTOM_KEY = "miSistemaRPG_customMissions";
const today = new Date().toLocaleDateString("en-CA");

function readStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

const oldData = readStorage(STORAGE_KEY, {});
const savedCustomMissions = readStorage(CUSTOM_KEY, []);

let data = {
  xp: Number(oldData.xp) || 0,
  stats: oldData.stats && typeof oldData.stats === "object" ? oldData.stats : {},
  date: oldData.date || today,
  done: Array.isArray(oldData.done) ? oldData.done : [],
  completedCount: Number(oldData.completedCount) || 0
};

let customMissions = Array.isArray(savedCustomMissions) ? savedCustomMissions : [];

if (data.date !== today) {
  data.date = today;
  data.done = [];
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(customMissions));
}

function getMissions() {
  return [...DEFAULT_MISSIONS, ...customMissions];
}

function getRank(level) {
  if (level >= 30) return "S";
  if (level >= 20) return "A";
  if (level >= 12) return "B";
  if (level >= 7) return "C";
  if (level >= 4) return "D";
  return "E";
}

function renderPlayer() {
  const level = Math.floor(data.xp / 100) + 1;
  const progress = data.xp % 100;

  document.getElementById("player-level").textContent = level;
  document.getElementById("player-rank").textContent = getRank(level);
  document.getElementById("player-xp").textContent = data.xp;

  const progressBar = document.getElementById("xp-progress");
  progressBar.style.width = progress + "%";

  document.getElementById("xp-next-level").textContent =
    `${progress} / 100 XP para el siguiente nivel`;

  for (const stat of ["strength", "vitality", "intelligence", "discipline"]) {
    const element = document.getElementById(stat);
    if (element) element.textContent = data.stats[stat] || 0;
  }
}

function renderMissions() {
  const container = document.getElementById("mission-list");
  const missions = getMissions();

  container.innerHTML = missions.map(mission => {
    const completed = data.done.includes(mission.id);
    const difficulty = mission.difficulty || "normal";
    const safeName = escapeHTML(mission.name);
    const safeDesc = escapeHTML(mission.desc || "");

    return `
      <article class="mission difficulty-${difficulty} ${completed ? "completed" : ""}">
        <div class="mission-heading">
          <h3>${safeName}</h3>
          <span class="difficulty-badge difficulty-${difficulty}">
            ${difficultyLabel(difficulty)}
          </span>
        </div>
        <p>${safeDesc}</p>
        <p class="mission-reward">RECOMPENSA: +${Number(mission.xp) || 0} XP</p>
        <div class="mission-actions">
          <button type="button" data-complete="${escapeHTML(mission.id)}" ${completed ? "disabled" : ""}>
            ${completed ? "✓ MISIÓN COMPLETADA" : "COMPLETAR MISIÓN"}
          </button>
          ${mission.custom ? `<button type="button" class="delete-mission" data-delete="${escapeHTML(mission.id)}">Eliminar</button>` : ""}
        </div>
      </article>
    `;
  }).join("");

  document.getElementById("missions-completed").textContent = data.completedCount;
  document.getElementById("missions-created").textContent = customMissions.length;
}

function difficultyLabel(difficulty) {
  return ({
    facile: "FÁCIL",
    normal: "NORMAL",
    dificil: "DIFÍCIL",
    epica: "ÉPICA"
  })[difficulty] || "NORMAL";
}

function escapeHTML(value) {
  return String(value).replace(/[&
