// Small wrapper around fetch() so both pages share the same error handling.
// Same-origin by default (frontend and API are served by the same FastAPI
// app) so no base URL is needed -- change API_BASE if you split them apart.
const API_BASE = "";

async function apiGet(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

async function apiPostJson(path, payload) {
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

async function apiPostFile(path, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(API_BASE + path, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.blob();
}
