const grid = document.getElementById("field-grid"),
  hint = document.getElementById("hint"),
  submitBtn = document.getElementById("submit-btn"),
  form = document.getElementById("applicant-form"),
  errorBox = document.getElementById("error"),
  spinner = document.getElementById("spinner"),
  resultCard = document.getElementById("result-card"),
  scoreNumber = document.getElementById("score-number"),
  scoreBar = document.getElementById("score-bar"),
  decisionBadge = document.getElementById("decision-badge"),
  ratingPill = document.getElementById("rating-pill"),
  reasonsBox = document.getElementById("reasons");
let fields = [];
const defaults = {
  monthly_income: 45000,
  income_stability: 0.9,
  avg_monthly_balance: 75000,
  min_monthly_balance: 25000,
  monthly_expense: 27000,
  emi_amount: 6000,
  emi_to_income_ratio: 0.13,
  bounce_rate_6m: 0.02,
  savings_rate: 0.4,
  savings_trend: 0.1,
  transaction_volatility: 0.18,
  cash_flow_surplus: 12000,
  salary_credit_frequency: 1,
};
function showError(m) {
  errorBox.textContent = m;
  errorBox.style.display = "block";
}
function clearError() {
  errorBox.style.display = "none";
}
function makeField(f) {
  const w = document.createElement("div");
  w.className = "field";
  const l = document.createElement("label");
  l.textContent = f.name;
  l.htmlFor = f.name;
  w.appendChild(l);
  const i = document.createElement("input");
  i.type = "number";
  i.step = "any";
  i.value = defaults[f.name] ?? 0;
  i.id = f.name;
  i.name = f.name;
  w.appendChild(i);
  return w;
}
async function load() {
  try {
    const info = await apiGet("/api/track-b/model/info");
    fields = info.fields;
    grid.innerHTML = "";
    fields.forEach((f) => grid.appendChild(makeField(f)));
    hint.textContent = `${fields.length} fields · consented financial summary · Track B`;
    submitBtn.disabled = false;
  } catch (e) {
    showError(e.message);
  }
}
function render(r) {
  resultCard.classList.add("visible");
  scoreNumber.textContent = Math.round(r.creditworthiness_score);
  scoreBar.style.width = `${Math.max(0, Math.min(100, ((r.creditworthiness_score - 300) / 550) * 100))}%`;
  decisionBadge.textContent = r.decision;
  decisionBadge.className = `badge ${r.decision}`;
  ratingPill.textContent = `${r.scored_by} · Rating ${r.rating} · PD ${(r.pred_default_prob * 100).toFixed(1)}%`;
  reasonsBox.innerHTML = r.top_reasons
    ? `<strong>Top drivers:</strong> ${r.top_reasons}`
    : "";
}
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearError();
  spinner.style.display = "block";
  submitBtn.disabled = true;
  const p = {};
  fields.forEach(
    (f) => (p[f.name] = Number(document.getElementById(f.name).value)),
  );
  try {
    render(await apiPostJson("/api/predict/track-b", p));
  } catch (e) {
    showError(e.message);
  } finally {
    spinner.style.display = "none";
    submitBtn.disabled = false;
  }
});
load();
