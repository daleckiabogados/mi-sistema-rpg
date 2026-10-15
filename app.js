
const missions = [
  { name: "Entrena tu cuerpo", desc: "Haz ejercicio o camina.", xp: 30, stat: "strength" },
  { name: "Aprende algo nuevo", desc: "Dedica 20 minutos a aprender.", xp: 25, stat: "intelligence" },
  { name: "Cuida tu descanso", desc: "Reserva tiempo para recuperarte.", xp: 20, stat: "vitality" },
  { name: "Completa una tarea pendiente", desc: "Haz algo que llevas posponiendo.", xp: 25, stat: "discipline" }
];

const today = new Date().toLocaleDateString("en-CA");
let data;

try {
  data = JSON.parse(localStorage.getItem("miSistemaRPG")) || {};
} catch {
  data = {};
}

if (data.date !== today) {
  data = { date: today, xp: data.xp || 0, stats: data.stats || {}, done: [] };
}

data.xp ||= 0;
data.stats ||= {};
data.done ||= [];

function save() {
  localStorage.setItem("miSistemaRPG", JSON.stringify(data));
}

function render() {
  const level = Math.floor(data.xp / 100) + 1;
  const progress = data.xp % 100;
  const rank = level >= 30 ? "S" : level >= 20 ? "A" :
    level >= 12 ? "B" : level >= 7 ? "C" :
    level >= 4 ? "D" : "E";

  document.getElementById("level").textContent = level;
  document.getElementById("xp").textContent = progress;
  document.getElementById("rank").textContent = rank;
  document.getElementById("xp-bar").style.width = progress + "%";

  for (const stat of ["strength", "vitality", "intelligence", "discipline"]) {
    document.getElementById(stat).textContent = data.stats[stat] || 0;
  }

  document.getElementById("missions").innerHTML = missions.map((m, i) => `
    <div class="mission">
      <strong>${m.name}</strong>
      <p>${m.desc}</p>
      <p>RECOMPENSA: +${m.xp} EXP</p>
      <button data-mission="${i}" ${data.done.includes(i) ? "disabled" : ""}>
        ${data.done.includes(i) ? "✓ MISIÓN COMPLETADA" : "COMPLETAR MISIÓN"}
      </button>
    </div>
  `).join("");
}

document.getElementById("missions").addEventListener("click", event => {
  const button = event.target.closest("button[data-mission]");
  if (!button) return;

  const i = Number(button.dataset.mission);
  if (data.done.includes(i)) return;

  data.done.push(i);
  data.xp += missions[i].xp;
  const stat = missions[i].stat;
  data.stats[stat] = (data.stats[stat] || 0) + 1;

  save();
  render();
});

save();
render();
