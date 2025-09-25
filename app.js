let exercises = [];
let currentIndex = 0;
let timeLeft = 0;
let timerInterval = null;
let mode = "idle";

let totalSeries = 1;
let isPaused = false;
let pausedMode = null;
let pausedTimeLeft = 0;
let currentSeriesSet = 1;
let globalRest = 30;

// === UI ===
const listEl = document.getElementById("exercise-list");
const deleteRoutineBtn = document.getElementById("deleteRoutineBtn");

// === Añadir ejercicios ===
document.getElementById("exercise-form").addEventListener("submit", e => {
  e.preventDefault();
  const [es, en] = document.getElementById("exerciseSelect").value.split(",");
  const duration = parseInt(document.getElementById("duration").value);
  const rest = parseInt(document.getElementById("rest").value);

  exercises.push({ es, en, duration, rest });
  renderExercises();
});

// === Renderizar lista ===
function renderExercises() {
  listEl.innerHTML = "";

  exercises.forEach((ex, i) => {
    const li = document.createElement("li");
    li.className = "list-group-item bg-dark text-light d-flex justify-content-between align-items-center";

    const textSpan = document.createElement("span");
    textSpan.textContent = `${i + 1}. ${ex.es} / ${ex.en} - ${ex.duration}s + descanso ${ex.rest}s`;
    li.appendChild(textSpan);

    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn btn-sm btn-danger ms-2";
    deleteBtn.textContent = "Eliminar";
    deleteBtn.disabled = mode !== "idle";

    if (deleteBtn.disabled) {
      deleteBtn.title = "No puedes eliminar ejercicios mientras la rutina está en marcha";
    } else {
      deleteBtn.title = "Eliminar ejercicio";
    }

    deleteBtn.addEventListener("click", () => {
      exercises.splice(i, 1);
      renderExercises();
    });

    li.appendChild(deleteBtn);
    listEl.appendChild(li);
  });

  updateDeleteRoutineBtn();
}

// === Utilidades ===
function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function updateDisplay(text = null) {
  if (text) document.getElementById("current-exercise").textContent = text;
  document.getElementById("timer").textContent = formatTime(timeLeft);
  const progress = document.getElementById("progress-bar");

  if (mode === "exercise") {
    const duration = exercises[currentIndex].duration;
    progress.style.width = `${100 * (1 - timeLeft / duration)}%`;
  } else if (mode === "restExercise") {
    const rest = exercises[currentIndex].rest;
    progress.style.width = `${100 * (1 - timeLeft / rest)}%`;
  } else if (mode === "restSeries") {
    progress.style.width = `${100 * (1 - timeLeft / globalRest)}%`;
  } else {
    progress.style.width = "0%";
  }
}

function speak(text, lang) {
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = lang;
  speechSynthesis.speak(msg);
}

function textToSpeakFallback(texts) {
  return Object.values(texts)[0] || "";
}

function beep(frequency = 880, duration = 0.2) {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = frequency;
  osc.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function tripleBeep() {
  beep();
  setTimeout(() => beep(), 400);
  setTimeout(() => beep(), 800);
}

function softLongBeep() {
  const context = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 440;
  gainNode.gain.value = 0.2;

  oscillator.connect(gainNode);
  gainNode.connect(context.destination);

  oscillator.start();
  oscillator.stop(context.currentTime + 1);
}


// === Flujo ===
function loadRoutineConfig() {
  totalSeries = parseInt(document.getElementById("totalSeries").value);
  globalRest = parseInt(document.getElementById("globalRest").value);
}

function startCountdown(nextStep) {
  mode = "countdown";
  let countdown = 3;
  updateDisplay("Preparados...");
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (countdown > 0) {
      document.getElementById("timer").textContent = countdown;
      beep();
      countdown--;
    } else {
      clearInterval(timerInterval);
      nextStep();
    }
  }, 1000);
  updateDeleteRoutineBtn();
}

function updateDeleteRoutineBtn() {
  deleteRoutineBtn.disabled = mode !== "idle";
}

deleteRoutineBtn.addEventListener("click", () => {
  if (mode === "idle") {
    if (confirm("¿Estás seguro de eliminar toda la rutina?")) {
      exercises = [];
      renderExercises();
      updateDisplay("Selecciona los ejercicios");
      updateDeleteRoutineBtn();
    }
  }
});

function getSelectedLanguages() {
  const checkboxes = document.querySelectorAll("#language-options .form-check-input");
  const selected = [];

  checkboxes.forEach(cb => {
    if (cb.checked && cb.value) {
      selected.push(cb.value);
    }
  });

  return selected;
}

function startExercise() {
  const ex = exercises[currentIndex];
  mode = "exercise";
  timeLeft = ex.duration;
  updateDisplay(`${ex.es} / ${ex.en}`);
  speak(ex.es, "es-ES");
  speak(ex.en, "en-US");

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      tripleBeep();
      const isLastExercise = currentIndex === exercises.length - 1;
      const restTime = isLastExercise ? 0 : ex.rest;
      if (restTime > 0) {
        startRestExercise(restTime);
      } else {
        nextExercise();
      }
    }
  }, 1000);
  updateDeleteRoutineBtn();
}

function startRestExercise(restDuration) {
  const ex = exercises[currentIndex];
  mode = "restExercise";
  timeLeft = restDuration;
  updateDisplay("Descanso...");
  speak(`Descanso de ${timeLeft} segundos`, "es-ES");
  speak(`Rest for ${timeLeft} seconds`, "en-US");

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      nextExercise();
    }
  }, 1000);
}

function nextExercise() {
  currentIndex++;
  if (currentIndex < exercises.length) {
    startCountdown(startExercise);
  } else {
    endOfRoutine();
  }
}

function endOfRoutine() {
  if (currentSeriesSet < totalSeries) {
    currentSeriesSet++;
    startSeriesRest();
  } else {
    finishAll();
  }
}

function startSeriesRest() {
  mode = "restSeries";
  timeLeft = globalRest;
  updateDisplay(`Descanso entre series (${currentSeriesSet - 1}/${totalSeries})`);
  speak(`Descanso de ${timeLeft} segundos entre series`, "es-ES");
  speak(`Rest of ${timeLeft} seconds between series`, "en-US");

  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    updateDisplay();

    if (timeLeft > 0 && timeLeft <= 3) {
      beep();
    }

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      speak(`Iniciando serie ${currentSeriesSet}`, "es-ES");
      speak(`Starting series ${currentSeriesSet}`, "en-US");
      currentIndex = 0;
      startCountdown(startExercise);
    }
  }, 1000);
}

function finishAll() {
  mode = "finished";
  updateDisplay("¡Entrenamiento terminado!");
  softLongBeep();
  speak("Entrenamiento terminado", "es-ES");
  speak("Training finished", "en-US");
  updateDeleteRoutineBtn();
}

// === Controles ===
document.getElementById("startBtn").addEventListener("click", () => {
  if (exercises.length > 0 && mode === "idle") {
    loadRoutineConfig();
    currentIndex = 0;
    currentSeriesSet = 1;
    speak(`Iniciando serie ${currentSeriesSet}`, "es-ES");
    speak(`Starting series ${currentSeriesSet}`, "en-US");
    renderExercises();
    startCountdown(startExercise);
  }
});

document.getElementById("pauseBtn").addEventListener("click", () => {
  const btn = document.getElementById("pauseBtn");

  if (!isPaused) {
    clearInterval(timerInterval);
    pausedMode = mode;
    pausedTimeLeft = timeLeft;
    isPaused = true;
    btn.textContent = "Continuar";
    btn.classList.remove("btn-warning");
    btn.classList.add("btn-info");
  } else {
    isPaused = false;
    btn.textContent = "Pausar";
    btn.classList.remove("btn-info");
    btn.classList.add("btn-warning");
    resumeTimer();
  }
});

function resumeTimer() {
  timeLeft = pausedTimeLeft;

  timerInterval = setInterval(() => {
    timeLeft--;
    updateDisplay();

    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      timerInterval = null;

      if (pausedMode === "exercise") {
        tripleBeep();
        if (exercises[currentIndex].rest > 0) {
          startRestExercise();
        } else {
          nextExercise();
        }
      } else if (pausedMode === "restExercise") {
        nextExercise();
      } else if (pausedMode === "restSeries") {
        currentIndex = 0;
        startCountdown(startExercise);
      } else if (pausedMode === "countdown") {
        startExercise();
      }
    }
  }, 1000);
}

document.getElementById("resetBtn").addEventListener("click", () => {
  clearInterval(timerInterval);
  timerInterval = null;
  mode = "idle";
  currentIndex = 0;
  currentSeriesSet = 1;
  timeLeft = 0;
  updateDisplay("Selecciona los ejercicios");
  renderExercises();
  updateDeleteRoutineBtn();
});

document.addEventListener("DOMContentLoaded", () => {
  mode = "idle";
  updateDisplay("Selecciona los ejercicios");
  updateDeleteRoutineBtn();
  renderExercises();
});


