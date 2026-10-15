
(() => {
  "use strict";

  const STORAGE_KEY = "miSistemaRPG";
  const CUSTOM_KEY = "miSistemaRPG_customMissions";
  const NEW_KEY = "projectAwakeningData";

  const $ = id => document.getElementById(id);
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const defaults = [
    { id: "daily-strength", name: "Entrena tu cuerpo", desc: "Haz ejercicio o camina.", xp: 30, stat: "strength", difficulty: "normal", category: "daily" },
    { id: "daily-intelligence", name: "Aprende algo nuevo", desc: "Dedica 20 minutos a aprender.", xp: 25, stat: "intelligence", difficulty: "normal", category: "daily" },
    { id: "daily-vitality", name: "Cuida tu descanso", desc: "Reserva tiempo para recuperarte.", xp: 20, stat: "vitality", difficulty: "facile", category: "daily" },
    { id: "daily-discipline", name: "Completa una tarea pendiente", desc: "Haz algo que llevas posponiendo.", xp: 25, stat: "discipline", difficulty: "normal", category: "daily" }
  ];

  function read(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
      return fallback;
    }
  }

  const old = read(STORAGE_KEY, {});
  const stored = read(NEW_KEY, null);
  const legacyCustom = read(CUSTOM_KEY, []);

  let data = stored && typeof stored === "object" ? stored : {
    xp: Number(old.xp) || 0,
    stats: old.stats && typeof old.stats === "object" ? old.stats : {},
    done: Array.isArray(old.done) ? old.done : [],
    completedCount: Number(old.completedCount) || 0,
    date: old.date || today(),
    name: "Jugador",
    reputation: 100,
    streak: 0,
    lastActiveDate: "",
    missions: [],
    history: [],
    events: [],
    inventory: [],
    achievements: [],
    failedCount: 0,
    coins: 0,
    strictMode: true,
    penaltyType: "streak",
    dailyEventLimit: 3,
    eventDate: today(),
    eventCount: 0
  };

  data.stats ||= {};
  data.done ||= [];
  data.missions ||= [];
  data.history ||= [];
  data.events ||= [];
  data.inventory ||= [];
  data.achievements ||= [];
  data.xp = Number(data.xp) || 0;
  data.reputation = Number(data.reputation ?? 100);
  data.streak = Number(data.streak) || 0;
  data.coins = Number(data.coins) || 0;
  data.failedCount = Number(data.failedCount) || 0;
  data.completedCount = Number(data.completedCount) || 0;
  data.date = today();
  data.eventDate ||= today();
  data.eventCount = data.eventDate === today() ? Number(data.eventCount) || 0 : 0;
  data.eventDate = today();

  let customMissions = Array.isArray(data.missions) && data.missions.length
    ? data.missions
    : (Array.isArray(legacyCustom) ? legacyCustom : []).map(m => ({
        id: String(m.id || `custom-${Date.now()}-${Math.random()}`),
        name: m.name || "Misión personalizada",
        desc: m.desc || m.description || "",
        xp: Number(m.xp) || 25,
        stat: m.stat || "discipline",
        difficulty: m.difficulty || "normal",
        category: "custom",
        custom: true
      }));

  if (!data.lastActiveDate && old.date && old.date === today() && old.completedCount > 0) {
    data.lastActiveDate = today();
  }

  let activeFilter = "all";

  function save() {
    data.missions = customMissions;
    localStorage.setItem(NEW_KEY, JSON.stringify(data));
    // Compatibilidad con la versión anterior.
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      xp: data.xp,
      stats: data.stats,
      date: data.date,
      done: data.done,
      completedCount: data.completedCount
    }));
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(customMissions));
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, c => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
  }

  function level() {
    return Math.floor(data.xp / 100) + 1;
  }

  function rank() {
    const n = level();
    return n >= 30 ? "S" : n >= 20 ? "A" : n >= 12 ? "B" : n >= 7 ? "C" : n >= 4 ? "D" : "E";
  }

  function notice(message) {
    const el = $("system-notice");
    if (el) el.textContent = message;
    const hero = $("system-message");
    if (hero) hero.textContent = message;
  }

  function addHistory(message) {
    data.history.unshift({ date: new Date().toLocaleString("es-ES"), message });
    data.history = data.history.slice(0, 80);
  }

  function updateStreak() {
    const now = today();
    if (data.lastActiveDate === now) return;
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;
    data.streak = data.lastActiveDate === y ? data.streak + 1 : 1;
    data.lastActiveDate = now;
  }

  function checkAchievements() {
    const checks = [
      ["first-mission", "Primer despertar", "Completa tu primera misión.", data.completedCount >= 1],
      ["ten-missions", "Cazador constante", "Completa 10 misiones.", data.completedCount >= 10],
      ["level-five", "Poder creciente", "Alcanza el nivel 5.", level() >= 5],
      ["streak-seven", "Voluntad de acero", "Consigue una racha de 7 días.", data.streak >= 7]
    ];
    for (const [id, name, desc, passed] of checks) {
      if (passed && !data.achievements.some(a => a.id === id)) {
        data.achievements.push({ id, name, desc });
        data.inventory.push({ name: `Insignia: ${name}`, desc: "Recompensa de logro" });
        addHistory(`🏆 Logro desbloqueado: ${name}`);
      }
    }
  }

  function renderPlayer() {
    const values = {
      "player-name": data.name || "Jugador",
      "player-level": level(),
      "player-rank": rank(),
      "player-xp": data.xp,
      "xp-next-level": `${data.xp % 100} / 100 XP para el siguiente nivel`,
      "streak-count": data.streak,
      "reputation": data.reputation,
      "player-coins": data.coins
    };
    Object.entries(values).forEach(([id, value]) => {
      const el = $(id);
      if (el) el.textContent = value;
    });
    const progress = $("xp-progress");
    if (progress) progress.style.width = `${data.xp % 100}%`;

    for (const stat of ["strength", "vitality", "intelligence", "discipline", "agility", "focus"]) {
      const el = $(stat);
      if (el) el.textContent = Number(data.stats[stat]) || 0;
    }
  }

  function getMissions() {
    return [...defaults, ...customMissions];
  }

  function renderMissions() {
    const container = $("mission-list");
    if (!container) return;
    const missions = getMissions().filter(m => {
      if (activeFilter === "all") return true;
      if (activeFilter === "custom") return !!m.custom || m.category === "custom";
      return m.category === activeFilter;
    });

    container.innerHTML = missions.map(m => {
      const completed = data.done.includes(m.id);
      const diff = m.difficulty || "normal";
      return `<article class="mission difficulty-${escapeHTML(diff)} ${completed ? "completed" : ""}">
        <div class="mission-heading"><h3>${escapeHTML(m.name)}</h3><span class="difficulty-badge">${escapeHTML(diff.toUpperCase())}</span></div>
        <p>${escapeHTML(m.desc || "")}</p>
        <p class="mission-reward">RECOMPENSA: +${Number(m.xp) || 0} XP</p>
        <div class="mission-actions">
          <button type="button" data-complete="${escapeHTML(m.id)}" ${completed ? "disabled" : ""}>${completed ? "✓ MISIÓN COMPLETADA" : "COMPLETAR MISIÓN"}</button>
          ${m.custom ? `<button type="button" class="delete-mission" data-delete="${escapeHTML(m.id)}">Eliminar</button>` : ""}
        </div></article>`;
    }).join("") || '<p class="muted">No hay misiones en este filtro.</p>';

    const doneCount = data.completedCount;
    if ($("missions-completed")) $("missions-completed").textContent = doneCount;
    if ($("missions-created")) $("missions-created").textContent = customMissions.length;
    if ($("missions-failed")) $("missions-failed").textContent = data.failedCount;
    if ($("mission-counter")) $("mission-counter").textContent = `${doneCount} completadas`;
    const total = defaults.length;
    const doneToday = defaults.filter(m => data.done.includes(m.id)).length;
    if ($("daily-progress-text")) $("daily-progress-text").textContent = `${doneToday} / ${total}`;
    if ($("daily-progress-bar")) $("daily-progress-bar").style.width = `${doneToday / total * 100}%`;
  }

  function renderHistory() {
    const el = $("history-list");
    if (el) el.innerHTML = data.history.length
      ? data.history.map(h => `<p><strong>${escapeHTML(h.date)}</strong> — ${escapeHTML(h.message)}</p>`).join("")
      : '<p class="muted">Tu aventura comienza aquí.</p>';

    const penalties = $("penalty-log");
    if (penalties) penalties.innerHTML = data.history.filter(h => /fallo|incumpl/i.test(h.message))
      .map(h => `<p>${escapeHTML(h.date)} — ${escapeHTML(h.message)}</p>`).join("") || '<p class="muted">No hay incumplimientos registrados.</p>';
  }

  function renderEvents() {
    const el = $("event-list");
    if (!el) return;
    el.innerHTML = data.events.length
      ? data.events.map(e => `<article class="event-card"><h3>${escapeHTML(e.title)}</h3><p>${escapeHTML(e.desc)}</p><p>Recompensa: ${e.xp} XP</p><button type="button" data-event="${escapeHTML(e.id)}">Aceptar desafío</button></article>`).join("")
      : '<p class="muted">Esperando el siguiente evento...</p>';
  }

  function renderInventory() {
    const el = $("inventory-list");
    if (el) el.innerHTML = data.inventory.length
      ? data.inventory.map(i => `<article class="inventory-item"><strong>${escapeHTML(i.name)}</strong><p>${escapeHTML(i.desc || "")}</p></article>`).join("")
      : '<p class="muted">Todavía no tienes objetos desbloqueados.</p>';
    const achievements = $("achievement-list");
    if (achievements) achievements.innerHTML = data.achievements.length
      ? data.achievements.map(a => `<article class="achievement-card"><h3>🏆 ${escapeHTML(a.name)}</h3><p>${escapeHTML(a.desc)}</p></article>`).join("")
      : '<p class="muted">Tus logros aparecerán aquí.</p>';
  }

  function renderAll() {
    renderPlayer();
    renderMissions();
    renderHistory();
    renderEvents();
    renderInventory();
  }

  function completeMission(id) {
    const mission = getMissions().find(m => m.id === id);
    if (!mission || data.done.includes(id)) return;
    data.done.push(id);
    data.xp += Number(mission.xp) || 0;
    data.completedCount += 1;
    data.coins += Math.max(1, Math.floor((Number(mission.xp) || 0) / 10));
    if (mission.stat) data.stats[mission.stat] = (Number(data.stats[mission.stat]) || 0) + 1;
    updateStreak();
    checkAchievements();
    addHistory(`Misión completada: ${mission.name} (+${mission.xp} XP)`);
    save();
    renderAll();
    notice(`Misión completada: ${mission.name}. ¡Has ganado ${mission.xp} XP!`);
  }

  const form = $("mission-form");
  if (form) form.addEventListener("submit", event => {
    event.preventDefault();
    const name = $("mission-name").value.trim();
    if (!name) return;
    const difficulty = $("mission-difficulty").value;
    const preset = { facile: 10, normal: 25, dificil: 50, epica: 100 };
    const xp = Math.max(1, Math.min(1000, Number($("mission-xp").value) || preset[difficulty] || 25));
    const category = $("mission-category") ? $("mission-category").value : "discipline";
    customMissions.push({
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      desc: $("mission-description").value.trim(),
      xp,
      difficulty,
      stat: category,
      category: "custom",
      custom: true
    });
    addHistory(`Nueva misión creada: ${name}`);
    save();
    renderAll();
    form.reset();
    if ($("mission-xp")) $("mission-xp").value = 25;
    notice("Nueva misión incorporada al Sistema.");
  });

  const list = $("mission-list");
  if (list) list.addEventListener("click", event => {
    const complete = event.target.closest("[data-complete]");
    const remove = event.target.closest("[data-delete]");
    if (complete && !complete.disabled) completeMission(complete.dataset.complete);
    if (remove) {
      customMissions = customMissions.filter(m => m.id !== remove.dataset.delete);
      addHistory("Misión personalizada eliminada.");
      save();
      renderAll();
    }
  });

  document.querySelectorAll("[data-filter]").forEach(button => {
    button.addEventListener("click", () => {
      activeFilter = button.dataset.filter;
      document.querySelectorAll("[data-filter]").forEach(b => b.classList.toggle("active", b === button));
      renderMissions();
    });
  });

  function generateEvent() {
    if (data.eventDate !== today()) {
      data.eventDate = today();
      data.eventCount = 0;
    }
    const limit = Number($("daily-event-limit")?.value || data.dailyEventLimit || 3);
    if (data.eventCount >= limit) {
      notice("Has alcanzado el límite de eventos sorpresa de hoy.");
      return;
    }
    const choices = [
      { title: "Desafío de concentración", desc: "Dedica 15 minutos a una tarea sin distracciones.", xp: 15 },
      { title: "Desafío de movimiento", desc: "Camina o estira durante 10 minutos.", xp: 15 },
      { title: "Desafío de aprendizaje", desc: "Aprende una idea nueva y anótala.", xp: 20 },
      { title: "Desafío de orden", desc: "Ordena una pequeña zona de tu espacio.", xp: 10 }
    ];
    const e = choices[Math.floor(Math.random() * choices.length)];
    const event = { ...e, id: `event-${Date.now()}` };
    data.events.unshift(event);
    data.events = data.events.slice(0, 10);
    data.eventCount += 1;
    addHistory(`Evento generado: ${event.title}`);
    save();
    renderEvents();
    notice("Nuevo desafío sorpresa disponible.");
  }

  ["generate-event-button", "new-event-button"].forEach(id => {
    if ($(id)) $(id).addEventListener("click", generateEvent);
  });

  const events = $("event-list");
  if (events) events.addEventListener("click", event => {
    const button = event.target.closest("[data-event]");
    if (!button) return;
    const e = data.events.find(item => item.id === button.dataset.event);
    if (!e) return;
    data.xp += Number(e.xp) || 0;
    data.completedCount += 1;
    data.coins += Math.max(1, Math.floor((Number(e.xp) || 0) / 10));
    updateStreak();
    data.events = data.events.filter(item => item.id !== e.id);
    addHistory(`Desafío completado: ${e.title} (+${e.xp} XP)`);
    checkAchievements();
    save();
    renderAll();
    notice(`Desafío completado. +${e.xp} XP`);
  });

  if ($("strict-mode")) {
    $("strict-mode").checked = data.strictMode !== false;
    $("strict-mode").addEventListener("change", () => {
      data.strictMode = $("strict-mode").checked;
      save();
      notice("Modo estricto actualizado.");
    });
  }
  if ($("penalty-type")) {
    $("penalty-type").value = data.penaltyType || "streak";
    $("penalty-type").addEventListener("change", () => {
      data.penaltyType = $("penalty-type").value;
      save();
    });
  }
  if ($("daily-event-limit")) {
    $("daily-event-limit").value = String(data.dailyEventLimit || 3);
    $("daily-event-limit").addEventListener("change", () => {
      data.dailyEventLimit = Number($("daily-event-limit").value) || 3;
      save();
    });
  }
  if ($("player-name-input")) $("player-name-input").value = data.name || "Jugador";
  if ($("save-settings-button")) {
    $("save-settings-button").addEventListener("click", () => {
      data.name = $("player-name-input")?.value.trim() || "Jugador";
      save();
      renderPlayer();
      notice("Configuración guardada.");
    });
  }

  if ($("export-data-button")) {
    $("export-data-button").addEventListener("click", () => {
      save();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "project-awakening-backup.json";
      a.click();
      URL.revokeObjectURL(url);
      notice("Copia de seguridad exportada.");
    });
  }

  if ($("import-data-button") && $("import-file-input")) {
    $("import-data-button").addEventListener("click", () => $("import-file-input").click());
    $("import-file-input").addEventListener("change", async () => {
      const file = $("import-file-input").files[0];
      if (!file) return;
      try {
        const imported = JSON.parse(await file.text());
        if (!imported || typeof imported !== "object" || !("xp" in imported)) throw new Error("Archivo no válido");
        data = { ...data, ...imported };
        data.stats ||= {};
        data.done ||= [];
        customMissions = Array.isArray(data.missions) ? data.missions : [];
        save();
        renderAll();
        notice("Copia de seguridad importada correctamente.");
      } catch {
        notice("No se pudo importar: el archivo JSON no es válido.");
      }
      $("import-file-input").value = "";
    });
  }

  checkAchievements();
  save();
  renderAll();
})();
