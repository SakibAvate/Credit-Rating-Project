// Shared track switching + system status for the integrated frontend.

let systemStatus = null;
let currentTrack = "track-a";

const TRACK_ICONS = {
  "track-a": "A",
  "track-b": "B",
};

async function fetchSystemStatus() {
  systemStatus = await apiGet("/api/system");
  return systemStatus;
}

function readyTracks() {
  return (systemStatus?.tracks || []).filter((t) => t.model_loaded);
}

function renderStatusBar(container) {
  if (!container || !systemStatus) return;
  container.innerHTML = systemStatus.tracks
    .map((t) => {
      const cls = t.model_loaded ? "ready" : t.data_available ? "pending" : "missing";
      const label = t.model_loaded ? "Ready" : t.data_available ? "Needs training" : "No data";
      return `<span class="status-chip ${cls}" title="${t.description}">${t.name}: ${label}</span>`;
    })
    .join("");
}

function buildTrackTabs(container, onSelect) {
  if (!container || !systemStatus) return;
  container.innerHTML = "";

  systemStatus.tracks.forEach((t) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "track-tab" + (t.id === currentTrack ? " active" : "");
    btn.dataset.track = t.id;
    btn.disabled = !t.model_loaded;
    btn.innerHTML = `
      <span class="track-tab-icon">${TRACK_ICONS[t.id] || "?"}</span>
      <span class="track-tab-text">
        <strong>${t.name}</strong>
        <small>${t.subtitle}</small>
      </span>`;
    btn.addEventListener("click", () => {
      if (!t.model_loaded) return;
      currentTrack = t.id;
      container.querySelectorAll(".track-tab").forEach((el) => el.classList.remove("active"));
      btn.classList.add("active");
      onSelect(t.id);
    });
    container.appendChild(btn);
  });

  const firstReady = readyTracks()[0];
  if (firstReady && !readyTracks().find((t) => t.id === currentTrack)) {
    currentTrack = firstReady.id;
    container.querySelector(`[data-track="${currentTrack}"]`)?.classList.add("active");
    onSelect(currentTrack);
  }
}

function trainHint() {
  if (!systemStatus?.any_model_loaded) {
    return "No models trained yet. Run `python main.py train` then refresh.";
  }
  return null;
}

function getCurrentTrack() {
  return currentTrack;
}

function setCurrentTrack(trackId) {
  currentTrack = trackId;
}

async function loadModelFields(trackId) {
  return apiGet(`/api/model/info?track=${encodeURIComponent(trackId)}`);
}

async function scoreApplicant(trackId, payload) {
  return apiPostJson("/api/predict", { track: trackId, ...payload });
}

async function scoreBatchCsv(trackId, file) {
  return apiPostFile(`/api/predict/batch?track=${encodeURIComponent(trackId)}`, file);
}
