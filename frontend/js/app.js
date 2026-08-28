// Builds the applicant form dynamically from GET /api/model/info, then
// submits to POST /api/predict and renders the result.

const grid = document.getElementById("field-grid");
const hint = document.getElementById("hint");
const submitBtn = document.getElementById("submit-btn");
const form = document.getElementById("applicant-form");
const errorBox = document.getElementById("error");
const spinner = document.getElementById("spinner");

const resultCard = document.getElementById("result-card");
const scoreNumber = document.getElementById("score-number");
const scoreBar = document.getElementById("score-bar");
const decisionBadge = document.getElementById("decision-badge");
const ratingPill = document.getElementById("rating-pill");
const reasonsBox = document.getElementById("reasons");

let fieldDefs = [];

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = "block";
}

function clearError() {
  errorBox.style.display = "none";
}

function buildField(field) {
  const wrapper = document.createElement("div");
  wrapper.className = "field";

  const label = document.createElement("label");
  label.textContent = field.name;
  label.setAttribute("for", field.name);
  wrapper.appendChild(label);

  let input;
  if (field.type === "numeric") {
    input = document.createElement("input");
    input.type = "number";
    input.step = "any";
    input.value = "0";
  } else {
    input = document.createElement("select");
    field.options.forEach((opt) => {
      const o = document.createElement("option");
      o.value = opt;
      o.textContent = opt;
      input.appendChild(o);
    });
  }
  input.id = field.name;
  input.name = field.name;
  input.dataset.type = field.type;
  wrapper.appendChild(input);
  return wrapper;
}

async function loadModelInfo() {
  try {
    const info = await apiGet("/api/model/info");
    fieldDefs = info.fields;
    grid.innerHTML = "";
    fieldDefs.forEach((f) => grid.appendChild(buildField(f)));
    hint.textContent = `${fieldDefs.length} fields required, pre-filled with sensible defaults -- adjust and score.`;
    submitBtn.disabled = false;
  } catch (err) {
    hint.textContent = "";
    showError(
      err.message.includes("503")
        ? "Model not trained yet. Run `python main.py train`, then reload this page."
        : `Could not load model info: ${err.message}`
    );
  }
}

function renderResult(result) {
  resultCard.classList.add("visible");

  scoreNumber.textContent = Math.round(result.creditworthiness_score);
  const pct = ((result.creditworthiness_score - 300) / (850 - 300)) * 100;
  scoreBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;

  decisionBadge.textContent = result.decision;
  decisionBadge.className = `badge ${result.decision}`;
  ratingPill.textContent = `Rating ${result.rating} · PD ${(result.pred_default_prob * 100).toFixed(1)}%`;

  reasonsBox.innerHTML = result.top_reasons
    ? `<strong>Top drivers:</strong> ${result.top_reasons}`
    : "";
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  spinner.style.display = "block";
  submitBtn.disabled = true;

  const payload = {};
  fieldDefs.forEach((f) => {
    const el = document.getElementById(f.name);
    payload[f.name] = f.type === "numeric" ? Number(el.value) : el.value;
  });

  try {
    const result = await apiPostJson("/api/predict", payload);
    renderResult(result);
  } catch (err) {
    showError(err.message);
  } finally {
    spinner.style.display = "none";
    submitBtn.disabled = false;
  }
});

loadModelInfo();
