const DEFAULT_MISSIONS = [
  { id: "daily-strength", name: "Entrena tu cuerpo", desc: "Haz ejercicio o camina.", xp: 30, stat: "strength", difficulty: "normal", custom: false },
  { id: "daily-intelligence", name: "Aprende algo nuevo", desc: "Dedica 20 minutos a aprender.", xp: 25, stat: "intelligence", difficulty: "normal", custom: false },
  { id: "daily-vitality", name: "Cuida tu descanso", desc: "Reserva tiempo para recuperarte.", xp: 20, stat: "vitality", difficulty: "facile", custom: false },
  { id: "daily-discipline", name: "Completa una tarea pendiente", desc: "Haz algo que llevas posponiendo.", xp: 25, stat: "discipline", difficulty: "normal", custom: false }
];

const STORAGE_KEY = "miSistemaRPG";
const CUSTOM_KEY = "miSistemaRPG_customMissions";
const today = new Date().toLocaleDateString("en-CA");

function readStorage(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

const oldData = readStorage(STORAGE_KEY, {});
let data = {
  xp: Number(oldData.xp) || 0,
  stats: oldData.stats && typeof oldData.stats === "object" ? oldData.stats : {},
  date: oldData.date || today,
  done: Array.isArray(oldData.done) ? oldData.done : [],
  completedCount: Number(oldData.completedCount) || 0
};

let customMissions = readStorage(CUSTOM_KEY, []);
if (!Array.isArray(customMissions)) customMissions = [];

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

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function difficultyLabel(difficulty) {
  return ({
    facile: "FÁCIL",
    normal: "NORMAL",
    dificil: "DIFÍCIL",
    epica: "ÉPICA"
  })[difficulty] || "NORMAL";
}

function renderPlayer() {
  const level = Math.floor(data.xp / 100) + 1;
  const progress = data.xp % 100;

  document.getElementById("player-level").textContent = level;
  document.getElementById("player-rank").textContent = getRank(level);
  document.getElementById("player-xp").textContent = data.xp;
  document.getElementById("xp-progress").style.width = progress + "%";
  document.getElementById("xp-next-level").textContent =
    `${progress} / 100 XP para el siguiente nivel`;

  for (const stat of ["strength", "vitality", "intelligence", "discipline"]) {
    const element = document.getElementById(stat);
    if (element) element.textContent = data.stats[stat] || 0;
  }
}

function renderMissions() {
  const container = document.getElementById("mission-list");

  container.innerHTML = getMissions().map(mission => {
    const completed = data.done.includes(mission.id);
    const difficulty = mission.difficulty || "normal";

    return `
      <article class="mission difficulty-${difficulty} ${completed ? "completed" : ""}">
        <div class="mission-heading">
          <h3>${escapeHTML(mission.name)}</h3>
          <span class="difficulty-badge difficulty-${difficulty}">
            ${difficultyLabel(difficulty)}
          </span>
        </div>
        <p>${escapeHTML(mission.desc || "")}</p>
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

const form = document.getElementById("mission-form");

form.addEventListener("submit", event => {
  event.preventDefault();

  const nameInput = document.getElementById("mission-name");
  const descInput = document.getElementById("mission-description");
  const difficultyInput = document.getElementById("mission-difficulty");
  const xpInput = document.getElementById("mission-xp");

  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    return;
  }

  const difficulty = difficultyInput.value;
  const presetXP = { facile: 10, normal: 25, dificil: 50, epica: 100 };
  const xp = Math.max(1, Math.min(1000, Number(xpInput.value) || presetXP[difficulty] || 25));

  customMissions.push({
    id: "custom-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7),
    name,
    desc: descInput.value.trim(),
    xp,
    difficulty,
    stat: "discipline",
    custom: true
  });

  save();
  renderMissions();
  form.reset();
  document.getElementById("mission-xp").value = 25;
});

document.getElementById("mission-list").addEventListener("click", event => {
  const completeButton = event.target.closest("[data-complete]");
  const deleteButton = event.target.closest("[data-delete]");

  if (completeButton && !completeButton.disabled) {
    const mission = getMissions().find(item => item.id === completeButton.dataset.complete);
    if (!mission) return;

    data.done.push(mission.id);
    data.xp += Number(mission.xp) || 0;
    data.completedCount += 1;

    if (mission.stat) {
      data.stats[mission.stat] = (Number(data.stats[mission.stat]) || 0) + 1;
    }

    save();
    renderPlayer();
    renderMissions();
  }

  if (deleteButton) {
    customMissions = customMissions.filter(item => item.id !== deleteButton.dataset.delete);
    save();
    renderMissions();
  }
});

save();
renderPlayer();
renderMissions();
