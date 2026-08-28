// Uploads a CSV to POST /api/predict/batch and triggers a browser download
// of the scored result.

const form = document.getElementById("batch-form");
const fileInput = document.getElementById("csv-file");
const submitBtn = document.getElementById("submit-btn");
const spinner = document.getElementById("spinner");
const errorBox = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.style.display = "none";

  const file = fileInput.files[0];
  if (!file) return;

  spinner.style.display = "block";
  submitBtn.disabled = true;

  try {
    const blob = await apiPostFile("/api/predict/batch", file);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "scored_applicants.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    errorBox.textContent = err.message.includes("503")
      ? "Model not trained yet. Run `python main.py train`, then try again."
      : err.message;
    errorBox.style.display = "block";
  } finally {
    spinner.style.display = "none";
    submitBtn.disabled = false;
  }
});
