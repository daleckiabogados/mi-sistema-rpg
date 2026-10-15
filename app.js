(() => {
  "use strict";

  const STORAGE_KEY = "projectAwakeningData";
  const LEGACY_KEY = "miSistemaRPG";
  const LEGACY_MISSIONS_KEY = "miSistemaRPG_customMissions";

  const $ = (id) => document.getElementById(id);

  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

  const escapeHTML = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);

  const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const defaultMissions = [
    { id: "daily-water", name: "Recuperación e hidratación", description: "Bebe agua con regularidad durante el día.", difficulty: "facile", xp: 10, category: "vitality", type: "daily" },
    { id: "daily-movement", name: "Activación física", description: "Dedica al menos 10 minutos a moverte, adaptándolo a tus posibilidades.", difficulty: "facile", xp: 15, category: "strength", type: "daily" },
    { id: "daily-learning", name: "Adquirir conocimiento", description: "Aprende algo útil durante 15 minutos.", difficulty: "normal", xp: 20, category: "intelligence", type: "daily" },
    { id: "daily-focus", name: "Bloque de concentración", description: "Dedica 20 minutos a una tarea importante sin distracciones.", difficulty: "normal", xp: 20, category: "focus", type: "daily" },
    { id: "daily-order", name: "Restablecer el entorno", description: "Ordena una pequeña zona de tu espacio.", difficulty: "facile", xp: 10, category: "discipline", type: "daily" },
    { id: "weekly-review", name: "Revisión semanal", description: "Revisa tus objetivos y prepara la próxima semana.", difficulty: "dificil", xp: 60, category: "discipline", type: "weekly" },
    { id: "special-challenge", name: "Superar un desafío personal", description: "Completa una tarea que lleves tiempo posponiendo.", difficulty: "epica", xp: 80, category: "discipline", type: "special" }
  ];

  const randomEvents = [
    { name: "Anomalía: enfoque", description: "Dedica 10 minutos a una tarea pendiente.", xp: 15, category: "focus" },
    { name: "Prueba de movilidad", description: "Haz una pausa activa y muévete de forma segura durante 5 minutos.", xp: 10, category: "agility" },
    { name: "Fragmento de conocimiento", description: "Lee o estudia algo durante 10 minutos.", xp: 15, category: "intelligence" },
    { name: "Orden del cazador", description: "Organiza un objeto, archivo o espacio que utilices a menudo.", xp: 10, category: "discipline" },
    { name: "Recuperación de energía", description: "Haz una pausa consciente, respira con calma y revisa cómo te encuentras.", xp: 10, category: "vitality" },
    { name: "Desafío de voluntad", description: "Avanza durante 10 minutos en una tarea que suelas aplazar.", xp: 20, category: "discipline" },
    { name: "Exploración", description: "Descubre una idea nueva y anota qué has aprendido.", xp: 15, category: "intelligence" },
    { name: "Misión oculta: pequeño avance", description: "Completa una acción pequeña que te acerque a un objetivo personal.", xp: 20, category: "focus" }
  ];

  const achievements = [
    { id: "first", name: "Primer despertar", description: "Completa tu primera misión.", test: (s) => s.completedCount >= 1 },
    { id: "ten", name: "Constancia inicial", description: "Completa 10 misiones.", test: (s) => s.completedCount >= 10 },
    { id: "fifty", name: "Fuerza de voluntad", description: "Completa 50 misiones.", test: (s) => s.completedCount >= 50 },
    { id: "level5", name: "Despertar avanzado", description: "Alcanza el nivel 5.", test: (s) => s.level >= 5 },
    { id: "streak3", name: "Racha emergente", description: "Mantén una racha de 3 días.", test: (s) => s.bestStreak >= 3 },
    { id: "streak7", name: "Disciplina semanal", description: "Mantén una racha de 7 días.", test: (s) => s.bestStreak >= 7 },
    { id: "event", name: "Cazador de anomalías", description: "Completa un evento sorpresa.", test: (s) => s.eventsCompleted >= 1 },
    { id: "coins", name: "Primer botín", description: "Consigue 100 monedas virtuales en total.", test: (s) => s.totalCoinsEarned >= 100 }
  ];

  function makeInitialState() {
    return {
      version: 1,
      playerName: "Jugador",
      xp: 0,
      level: 1,
      streak: 0,
      bestStreak: 0,
      lastActiveDate: "",
      lastDailyReset: today(),
      reputation: 100,
      coins: 0,
      totalCoinsEarned: 0,
      completedCount: 0,
      failedCount: 0,
      eventsCompleted: 0,
      strictMode: true,
      penaltyType: "streak",
      dailyEventLimit: 3,
      eventDate: today(),
      eventsGeneratedToday: 0,
      missions: defaultMissions.map((mission) => ({ ...mission, done: false, accepted: false })),
      customMissions: [],
      events: [],
      inventory: [],
      unlockedAchievements: [],
      history: [],
      penaltyLog: [],
      completedDates: []
    };
  }

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return normalizeState(JSON.parse(saved));
    } catch (error) {
      console.warn("No se pudo leer el guardado nuevo.", error);
    }

    const state = makeInitialState();

    try {
      const oldRaw = localStorage.getItem(LEGACY_KEY);
      if (oldRaw) {
        const old = JSON.parse(oldRaw);
        state.xp = Math.max(0, number(old.xp));
        state.level = Math.max(1, number(old.level, 1));
        state.completedCount = Math.max(0, number(old.completedCount));
        state.reputation = Math.max(0, number(old.reputation, 100));
        state.streak = Math.max(0, number(old.streak));
        state.bestStreak = state.streak;
        state.lastActiveDate = old.lastActiveDate || old.lastDate || "";
        state.playerName = old.playerName || old.name || "Jugador";

        if (old.stats && typeof old.stats === "object") {
          state.legacyStats = old.stats;
        }

        if (Array.isArray(old.history)) state.history = old.history.slice(-200);
        if (Array.isArray(old.completedDates)) state.completedDates = old.completedDates;
      }
    } catch (error) {
      console.warn("No se pudieron migrar algunos datos antiguos.", error);
    }

    try {
      const customRaw = localStorage.getItem(LEGACY_MISSIONS_KEY);
      if (customRaw) {
        const custom = JSON.parse(customRaw);
        if (Array.isArray(custom)) {
          state.customMissions = custom.map((m) => ({
            id: String(m.id || uid()),
            name: String(m.name || m.title || "Misión personalizada"),
            description: String(m.description || ""),
            difficulty: m.difficulty || "normal",
            xp: Math.max(1, number(m.xp, 25)),
            category: m.category || "discipline",
            type: "custom",
            done: Boolean(m.done || m.completed),
            accepted: false
          }));
        }
      }
    } catch (error) {
      console.warn("No se pudieron migrar algunas misiones antiguas.", error);
    }

    return normalizeState(state);
  }

  function normalizeState(input) {
    const state = { ...makeInitialState(), ...(input || {}) };

    state.xp = Math.max(0, number(state.xp));
    state.level = Math.max(1, number(state.level, 1));
    state.streak = Math.max(0, number(state.streak));
    state.bestStreak = Math.max(state.streak, number(state.bestStreak));
    state.reputation = Math.max(0, Math.min(1000, number(state.reputation, 100)));
    state.coins = Math.max(0, number(state.coins));
    state.totalCoinsEarned = Math.max(0, number(state.totalCoinsEarned));
    state.completedCount = Math.max(0, number(state.completedCount));
    state.failedCount = Math.max(0, number(state.failedCount));
    state.eventsCompleted = Math.max(0, number(state.eventsCompleted));
    state.dailyEventLimit = [2, 3, 5].includes(Number(state.dailyEventLimit)) ? Number(state.dailyEventLimit) : 3;
    state.eventsGeneratedToday = Math.max(0, number(state.eventsGeneratedToday));
    state.missions = Array.isArray(state.missions) ? state.missions : [];
    state.customMissions = Array.isArray(state.customMissions) ? state.customMissions : [];
    state.events = Array.isArray(state.events) ? state.events : [];
    state.inventory = Array.isArray(state.inventory) ? state.inventory : [];
    state.unlockedAchievements = Array.isArray(state.unlockedAchievements) ? state.unlockedAchievements : [];
    state.history = Array.isArray(state.history) ? state.history.slice(-200) : [];
    state.penaltyLog = Array.isArray(state.penaltyLog) ? state.penaltyLog.slice(-100) : [];
    state.completedDates = Array.isArray(state.completedDates) ? state.completedDates : [];

    for (const mission of state.missions) {
      if (!mission.id) mission.id = uid();
      mission.xp = Math.max(1, number(mission.xp, 10));
      mission.done = Boolean(mission.done);
      mission.accepted = Boolean(mission.accepted);
    }

    for (const mission of state.customMissions) {
      if (!mission.id) mission.id = uid();
      mission.type = "custom";
      mission.xp = Math.max(1, number(mission.xp, 25));
      mission.done = Boolean(mission.done);
    }

    state.playerName = String(state.playerName || "Jugador").slice(0, 40);
    return state;
  }

  let state = loadState();
  let activeFilter = "all";

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      localStorage.setItem(LEGACY_KEY, JSON.stringify({
        xp: state.xp,
        level: state.level,
        completedCount: state.completedCount,
        reputation: state.reputation,
        streak: state.streak,
        lastActiveDate: state.lastActiveDate,
        playerName: state.playerName
      }));
      localStorage.setItem(LEGACY_MISSIONS_KEY, JSON.stringify(state.customMissions));
    } catch (error) {
      notify("No se pudo guardar. Exporta una copia de seguridad y libera espacio del navegador.");
      console.error(error);
    }
  }

  function notify(message) {
    const el = $("system-notice");
    if (el) {
      el.textContent = message;
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  function log(message) {
    state.history.unshift({ id: uid(), message, date: new Date().toLocaleString("es-ES") });
    state.history = state.history.slice(0, 200);
  }

  function xpForNextLevel(level = state.level) {
    return 100 + Math.max(0, level - 1) * 50;
  }

  function calculateLevel() {
    let remaining = state.xp;
    let level = 1;
    while (remaining >= xpForNextLevel(level) && level < 999) {
      remaining -= xpForNextLevel(level);
      level++;
    }
    state.level = level;
    return { level, remaining, needed: xpForNextLevel(level) };
  }

  function rankForLevel(level) {
    if (level >= 50) return "S";
    if (level >= 35) return "A";
    if (level >= 25) return "B";
    if (level >= 15) return "C";
    if (level >= 8) return "D";
    return "E";
  }

  function allMissions() {
    return [...state.missions, ...state.customMissions];
  }

  function awardXP(amount, category, source) {
    const xp = Math.max(0, Math.round(number(amount)));
    state.xp += xp;

    const categoryMap = {
      strength: "Fuerza",
      vitality: "Vitalidad",
      intelligence: "Inteligencia",
      discipline: "Disciplina",
      agility: "Agilidad",
      focus: "Concentración"
    };

    const categoryName = categoryMap[category] || "Disciplina";
    const oldLevel = state.level;
    calculateLevel();

    state.coins += Math.max(1, Math.round(xp / 5));
    state.totalCoinsEarned += Math.max(1, Math.round(xp / 5));

    state.inventory.push({
      id: uid(),
      name: `${source || "Recompensa"} · ${xp} XP`,
      description: `Recompensa registrada en ${new Date().toLocaleDateString("es-ES")}.`,
      kind: "relic"
    });
    state.inventory = state.inventory.slice(-50);

    state.lastActiveDate = today();
    if (!state.completedDates.includes(today())) state.completedDates.push(today());
    state.completedDates = state.completedDates.slice(-365);

    if (oldLevel !== state.level) {
      log(`¡Subida de nivel! Ahora eres nivel ${state.level}.`);
    }

    log(`+${xp} XP · ${source || "Misión completada"} · Atributo: ${categoryName}.`);
    checkAchievements();
  }

  function updateStreak() {
    const current = today();
    if (state.lastActiveDate === current) return;

    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, "0")}-${String(yesterdayDate.getDate()).padStart(2, "0")}`;

    state.streak = state.lastActiveDate === yesterday ? state.streak + 1 : 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.lastActiveDate = current;
  }

  function checkAchievements() {
    for (const achievement of achievements) {
      if (!state.unlockedAchievements.includes(achievement.id) && achievement.test(state)) {
        state.unlockedAchievements.push(achievement.id);
        log(`🏆 Logro desbloqueado: ${achievement.name}.`);
        state.inventory.push({
          id: uid(),
          name: `Insignia: ${achievement.name}`,
          description: achievement.description,
          kind: "achievement"
        });
      }
    }
  }

  function rolloverDay() {
    const current = today();
    if (state.lastDailyReset === current) return;

    const yesterday = state.lastDailyReset;
    const missed = allMissions().filter((m) =>
      m.accepted && !m.done && m.deadlineDate && m.deadlineDate <= yesterday
    );

    for (const mission of missed) applyPenalty(mission);

    state.missions = state.missions.map((mission) => {
      if (mission.type === "daily") return { ...mission, done: false, accepted: false, deadlineDate: "" };
      return mission;
    });

    state.events = state.events.filter((event) => event.status !== "completed");
    state.eventDate = current;
    state.eventsGeneratedToday = 0;
    state.lastDailyReset = current;
    log("El Sistema ha actualizado el protocolo diario.");
    save();
  }

  function applyPenalty(mission) {
    if (!state.strictMode) return;

    const type = state.penaltyType;
    if (type === "streak" || type === "combined") state.streak = 0;
    if (type === "reputation" || type === "combined") state.reputation = Math.max(0, state.reputation - 5);

    if (type === "recovery" || type === "combined") {
      state.customMissions.push({
        id: uid(),
        name: "Misión de recuperación",
        description: `Retoma con calma el objetivo pendiente: ${mission.name}.`,
        difficulty: "normal",
        xp: 15,
        category: mission.category || "discipline",
        type: "custom",
        done: false,
        accepted: false
      });
    }

    state.failedCount++;
    state.penaltyLog.unshift({
      id: uid(),
      message: `Plazo incumplido: ${mission.name}. Consecuencia: ${type}.`,
      date: new Date().toLocaleString("es-ES")
    });
    state.penaltyLog = state.penaltyLog.slice(0, 50);
    mission.accepted = false;
    log(`Protocolo de responsabilidad: plazo incumplido en "${mission.name}".`);
  }

  function renderHeader() {
    const progress = calculateLevel();
    const xpPercent = Math.min(100, (progress.remaining / progress.needed) * 100);

    if ($("player-name")) $("player-name").textContent = state.playerName;
    if ($("player-name-input")) $("player-name-input").value = state.playerName;
    if ($("player-rank")) $("player-rank").textContent = rankForLevel(state.level);
    if ($("player-level")) $("player-level").textContent = state.level;
    if ($("player-xp")) $("player-xp").textContent = state.xp.toLocaleString("es-ES");
    if ($("xp-progress")) $("xp-progress").style.width = `${xpPercent}%`;
    if ($("xp-next-level")) $("xp-next-level").textContent = `${progress.remaining} / ${progress.needed} XP para el siguiente nivel`;
    if ($("streak-count")) $("streak-count").textContent = state.streak;
    if ($("reputation")) $("reputation").textContent = state.reputation;
    if ($("player-coins")) $("player-coins").textContent = state.coins;
    if ($("daily-event-limit")) $("daily-event-limit").value = String(state.dailyEventLimit);
    if ($("strict-mode")) $("strict-mode").checked = state.strictMode;
    if ($("penalty-type")) $("penalty-type").value = state.penaltyType;
  }

  function renderMissions() {
    const container = $("mission-list");
    if (!container) return;

    const missions = allMissions().filter((mission) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "daily") return mission.type === "daily" || mission.type === "weekly";
      if (activeFilter === "special") return mission.type === "special";
      if (activeFilter === "custom") return mission.type === "custom";
      return true;
    });

    const completedToday = allMissions().filter((m) => m.done && (m.completedDate === today() || m.type === "weekly" || m.type === "special" || m.type === "custom")).length;
    const dailyTotal = allMissions().filter((m) => m.type === "daily").length;

    if ($("mission-counter")) $("mission-counter").textContent = `${state.completedCount} completadas`;
    if ($("daily-progress-text")) $("daily-progress-text").textContent = `${allMissions().filter((m) => m.type === "daily" && m.done).length} / ${dailyTotal}`;
    if ($("daily-progress-bar")) {
      const dailyDone = allMissions().filter((m) => m.type === "daily" && m.done).length;
      $("daily-progress-bar").style.width = `${dailyTotal ? dailyDone / dailyTotal * 100 : 0}%`;
    }

    if (!missions.length) {
      container.innerHTML = '<p class="muted">No hay misiones en esta categoría.</p>';
      return;
    }

    container.innerHTML = missions.map((mission) => {
      const difficulty = ["facile", "normal", "dificil", "epica"].includes(mission.difficulty) ? mission.difficulty : "normal";
      const difficultyLabel = { facile: "FÁCIL", normal: "NORMAL", dificil: "DIFÍCIL", epica: "ÉPICA" }[difficulty];
      const typeLabel = { daily: "DIARIA", weekly: "SEMANAL", special: "ESPECIAL", custom: "PERSONALIZADA", event: "EVENTO" }[mission.type] || "MISIÓN";

      return `<article class="mission difficulty-${difficulty} ${mission.done ? "completed" : ""}">
        <div class="mission-heading">
          <h3>${escapeHTML(mission.name)}</h3>
          <span class="difficulty-badge difficulty-${difficulty}">${difficultyLabel}</span>
        </div>
        <p>${escapeHTML(mission.description || "Completa el objetivo indicado.")}</p>
        <p class="mission-reward">✦ +${number(mission.xp)} XP · ${typeLabel}</p>
        ${mission.deadlineDate ? `<p class="muted">Plazo: ${escapeHTML(mission.deadlineDate)}</p>` : ""}
        <div class="mission-actions">
          ${mission.done
            ? '<button type="button" disabled>✓ Completada</button>'
            : `<button type="button" data-complete-mission="${escapeHTML(mission.id)}">Completar misión</button>
               <button type="button" data-accept-mission="${escapeHTML(mission.id)}">Aceptar con plazo</button>`}
          ${mission.type === "custom" ? `<button type="button" class="delete-mission" data-delete-mission="${escapeHTML(mission.id)}">Eliminar</button>` : ""}
        </div>
      </article>`;
    }).join("");
  }

  function renderEvents() {
    const container = $("event-list");
    if (!container) return;

    if (!state.events.length) {
      container.innerHTML = '<p class="muted">No hay eventos activos. Puedes generar uno cuando quieras.</p>';
      return;
    }

    container.innerHTML = state.events.slice().reverse().map((event) => `
      <article class="event-card">
        <h3>${escapeHTML(event.name)}</h3>
        <p>${escapeHTML(event.description)}</p>
        <p class="mission-reward">✦ +${number(event.xp)} XP</p>
        ${event.status === "completed"
          ? '<button type="button" disabled>✓ Evento completado</button>'
          : `<button type="button" data-complete-event="${escapeHTML(event.id)}">Completar evento</button>`}
      </article>
    `).join("");
  }

  function renderInventory() {
    const container = $("inventory-list");
    if (!container) return;

    if (!state.inventory.length) {
      container.innerHTML = '<p class="muted">Todavía no tienes objetos desbloqueados.</p>';
      return;
    }

    container.innerHTML = state.inventory.slice().reverse().map((item) => `
      <article class="inventory-item">
        <strong>${escapeHTML(item.name)}</strong>
        <p>${escapeHTML(item.description || "")}</p>
      </article>
    `).join("");
  }

  function renderAchievements() {
    const container = $("achievement-list");
    if (!container) return;

    container.innerHTML = achievements.map((achievement) => {
      const unlocked = state.unlockedAchievements.includes(achievement.id);
      return `<article class="log-entry">
        <strong>${unlocked ? "🏆" : "🔒"} ${escapeHTML(achievement.name)}</strong>
        <p>${escapeHTML(achievement.description)}</p>
        <p>${unlocked ? "Desbloqueado" : "Pendiente"}</p>
      </article>`;
    }).join("");
  }

  function renderHistory() {
    const historyContainer = $("history-list");
    if (historyContainer) {
      historyContainer.innerHTML = state.history.length
        ? state.history.slice(0, 60).map((entry) => `
          <article class="log-entry">
            <p>${escapeHTML(entry.message)}</p>
            <p>${escapeHTML(entry.date || "")}</p>
          </article>
        `).join("")
        : '<p class="muted">Tu aventura comienza aquí.</p>';
    }

    const penalties = $("penalty-log");
    if (penalties) {
      penalties.innerHTML = state.penaltyLog.length
        ? state.penaltyLog.map((entry) => `
          <article class="log-entry">
            <p>${escapeHTML(entry.message)}</p>
            <p>${escapeHTML(entry.date || "")}</p>
          </article>
        `).join("")
        : '<p class="muted">No hay incumplimientos registrados.</p>';
    }

    if ($("missions-completed")) $("missions-completed").textContent = state.completedCount;
    if ($("missions-created")) $("missions-created").textContent = state.customMissions.length;
    if ($("missions-failed")) $("missions-failed").textContent = state.failedCount;
  }

  function render() {
    renderHeader();
    renderMissions();
    renderEvents();
    renderInventory();
    renderAchievements();
    renderHistory();
  }

  function completeMission(id) {
    const mission = allMissions().find((m) => String(m.id) === String(id));
    if (!mission || mission.done) return;

    mission.done = true;
    mission.completedDate = today();
    mission.accepted = false;
    state.completedCount++;
    updateStreak();
    awardXP(mission.xp, mission.category, mission.name);
    notify(`Misión completada: ${mission.name}. +${mission.xp} XP.`);
    save();
    render();
  }

  function acceptMission(id) {
    const mission = allMissions().find((m) => String(m.id) === String(id));
    if (!mission || mission.done) return;

    mission.accepted = true;
    mission.deadlineDate = today();
    save();
    notify("Misión aceptada. Su plazo termina hoy. Puedes completar el objetivo antes del cierre del día.");
    render();
  }

  function createMission(form) {
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) {
      notify("Escribe un nombre para la misión.");
      return;
    }

    const mission = {
      id: uid(),
      name: name.slice(0, 100),
      description: String(data.get("description") || "").trim().slice(0, 500),
      difficulty: data.get("difficulty") || "normal",
      xp: Math.max(1, Math.min(1000, number(data.get("xp"), 25))),
      category: data.get("category") || "discipline",
      type: "custom",
      done: false,
      accepted: false
    };

    state.customMissions.push(mission);
    log(`Nueva misión creada: ${mission.name}.`);
    save();
    render();
    form.reset();
    if ($("mission-xp")) $("mission-xp").value = 25;
    notify("Nueva misión incorporada al Sistema.");
  }

  function generateEvent() {
    if (state.eventDate !== today()) {
      state.eventDate = today();
      state.eventsGeneratedToday = 0;
    }

    if (state.eventsGeneratedToday >= state.dailyEventLimit) {
      notify(`Has alcanzado el límite de ${state.dailyEventLimit} eventos de hoy. Mañana habrá nuevas oportunidades.`);
      return;
    }

    const available = randomEvents.filter((candidate) =>
      !state.events.some((event) => event.name === candidate.name && event.status !== "completed")
    );
    const pool = available.length ? available : randomEvents;
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    const event = { ...chosen, id: uid(), status: "active", date: today(), type: "event" };
    state.events.push(event);
    state.events = state.events.slice(-20);
    state.eventsGeneratedToday++;
    log(`Anomalía detectada: ${event.name}.`);
    save();
    render();
    notify(`¡Evento generado! ${event.name}`);
  }

  function completeEvent(id) {
    const event = state.events.find((e) => String(e.id) === String(id));
    if (!event || event.status === "completed") return;

    event.status = "completed";
    state.eventsCompleted++;
    state.completedCount++;
    updateStreak();
    awardXP(event.xp, event.category, event.name);
    notify(`Evento superado. +${event.xp} XP.`);
    save();
    render();
  }

  function saveSettings() {
    state.playerName = String($("player-name-input")?.value || "Jugador").trim().slice(0, 40) || "Jugador";
    state.strictMode = Boolean($("strict-mode")?.checked);
    state.penaltyType = $("penalty-type")?.value || "streak";
    state.dailyEventLimit = number($("daily-event-limit")?.value, 3);
    save();
    render();
    notify("Configuración guardada.");
  }

  function exportBackup() {
    const payload = {
      application: "Project Awakening",
      exportedAt: new Date().toISOString(),
      data: state
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `project-awakening-${today()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify("Copia de seguridad preparada.");
  }

  function importBackup(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || ""));
        const imported = parsed.data || parsed;

        if (!imported || typeof imported !== "object" || !Array.isArray(imported.missions) || !Array.isArray(imported.customMissions)) {
          throw new Error("Formato no reconocido");
        }

        const confirmed = window.confirm("La importación sustituirá el progreso actual de este navegador. ¿Has exportado una copia y quieres continuar?");
        if (!confirmed) return;

        state = normalizeState(imported);
        save();
        render();
        notify("Copia de seguridad importada correctamente.");
      } catch (error) {
        notify("No se pudo importar el archivo. Comprueba que sea una copia válida de Project Awakening.");
        console.error(error);
      }
    };
    reader.onerror = () => notify("No se pudo leer el archivo.");
    reader.readAsText(file);
  }

  function bindEvents() {
    $("mission-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      createMission(event.currentTarget);
    });

    $("mission-list")?.addEventListener("click", (event) => {
      const button = event.target.closest("button");
      if (!button) return;

      if (button.dataset.completeMission) completeMission(button.dataset.completeMission);
      if (button.dataset.acceptMission) acceptMission(button.dataset.acceptMission);
      if (button.dataset.deleteMission) {
        const id = button.dataset.deleteMission;
        state.customMissions = state.customMissions.filter((m) => String(m.id) !== String(id));
        log("Se eliminó una misión personalizada.");
        save();
        render();
        notify("Misión eliminada.");
      }
    });

    document.querySelectorAll("[data-filter]").forEach((button) => {
      button.addEventListener("click", () => {
        activeFilter = button.dataset.filter || "all";
        document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("active", item === button));
        renderMissions();
      });
    });

    $("generate-event-button")?.addEventListener("click", generateEvent);
    $("new-event-button")?.addEventListener("click", generateEvent);

    $("event-list")?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-complete-event]");
      if (button) completeEvent(button.dataset.completeEvent);
    });

    $("save-settings-button")?.addEventListener("click", saveSettings);
    $("export-data-button")?.addEventListener("click", exportBackup);
    $("import-data-button")?.addEventListener("click", () => $("import-file-input")?.click());

    $("import-file-input")?.addEventListener("change", (event) => {
      importBackup(event.target.files && event.target.files[0]);
      event.target.value = "";
    });

    window.addEventListener("beforeunload", save);
  }

  function start() {
    rolloverDay();
    calculateLevel();

    if (state.legacyStats) {
      const map = {
        strength: "strength",
        vitality: "vitality",
        intelligence: "intelligence",
        discipline: "discipline",
        agility: "agility",
        focus: "focus"
      };

      for (const [oldKey, newKey] of Object.entries(map)) {
        const el = $(newKey);
        if (el) el.textContent = Math.max(0, number(state.legacyStats[oldKey]));
      }
      delete state.legacyStats;
    }

    bindEvents();
    render();

    const statIds = ["strength", "vitality", "intelligence", "discipline", "agility", "focus"];
    const counts = Object.fromEntries(statIds.map((id) => [id, 0]));

    for (const mission of allMissions()) {
      if (mission.done) counts[mission.category] = (counts[mission.category] || 0) + 1;
    }

    for (const id of statIds) {
      if ($(id)) $(id).textContent = counts[id] || 0;
    }

    save();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
