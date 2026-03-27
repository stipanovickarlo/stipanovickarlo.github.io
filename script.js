// ═══════════════════════════════════════════════════════════════
// NEUTRALIZAM — script.js
// Firebase + Parallax + Language + Login + Stats + Surveys
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  increment, collection, addDoc, serverTimestamp,
  query, where, getDocs, writeBatch, orderBy, limit, onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  getAuth, signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ─────────────────────────────────────────────────────────────
// !! ZAMIJENI OVO SA SVOJIM FIREBASE KONFIGOM !!
// 1. Idi na https://console.firebase.google.com
// 2. Stvori novi projekt "neutralizam"
// 3. Dodaj web app → kopiraj firebaseConfig
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyC3BEOxM6Z-gVVtEmwKkxdKmSOE1zOYFMY",
  authDomain:        "neutralizam.firebaseapp.com",
  projectId:         "neutralizam",
  storageBucket:     "neutralizam.firebasestorage.app",
  messagingSenderId: "451169994851",
  appId:             "1:451169994851:web:2b6be52342c655d5c61056"
};

let db;
let firebaseReady = false;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  window._fbAuth = getAuth(app);
  firebaseReady = true;
} catch (e) {
  console.warn("Firebase nije konfiguriran. Radi u demo modu.", e);
}


// ─────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────
function showToast(msg) {
  let t = document.getElementById("toastMsg");
  if (!t) {
    t = document.createElement("div");
    t.id = "toastMsg";
    t.style.cssText = "position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:#1A1E2E;border:1px solid #C9A84C;color:#E5E3DE;padding:0.9rem 1.8rem;border-radius:4px;font-family:'DM Sans',sans-serif;font-size:0.9rem;z-index:9999;opacity:0;transition:opacity 0.3s;max-width:90vw;text-align:center;pointer-events:none";
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.opacity = "1";
  clearTimeout(t._t);
  t._t = setTimeout(() => { t.style.opacity = "0"; }, 3000);
}

// ─────────────────────────────────────────────────────────────
// SETTINGS — Language, Theme, Font, Zoom
// ─────────────────────────────────────────────────────────────
let currentLang  = localStorage.getItem("lang")  || "hr";
let currentTheme = localStorage.getItem("theme") || "dark";
let currentFont  = localStorage.getItem("font")  || "playfair";
let currentZoom  = parseInt(localStorage.getItem("zoom") || "100");

// ── Language ──
function applyLang(lang) {
  document.documentElement.setAttribute("data-lang", lang);
  document.querySelectorAll("[data-hr]").forEach(el => {
    const val = el.dataset[lang] || el.dataset.hr;
    el.textContent = val;
  });
  document.querySelectorAll("[data-hr-placeholder]").forEach(el => {
    el.placeholder = el.dataset[lang + "Placeholder"] || el.dataset.hrPlaceholder;
  });
  // Update badge on settings button
  const badge = document.getElementById("settingsLangBadge");
  if (badge) badge.textContent = lang.toUpperCase();
  localStorage.setItem("lang", lang);
  currentLang = lang;
  // Highlight active chip
  document.querySelectorAll(".lang-chip").forEach(c => {
    c.classList.toggle("active", c.dataset.lang === lang);
  });
}

// ── Theme ──
const themeVars = {
  dark: {
    "--bg": "#0B0D12", "--surface": "#131620", "--surface2": "#1A1E2E",
    "--gold": "#C9A84C", "--gold-dim": "#8A7035",
    "--text": "#E5E3DE", "--text-sub": "#7A7870", "--border": "#232737",
    "--navbar-bg-scroll": "rgba(11,13,18,0.97)", "--navbar-bg": "rgba(11,13,18,0.85)"
  },
  light: {
    "--bg": "#F5F2EC", "--surface": "#EEEBE3", "--surface2": "#E6E2D8",
    "--gold": "#9A6E1A", "--gold-dim": "#C49A3A",
    "--text": "#1A1814", "--text-sub": "#7A7060", "--border": "#D8D2C5",
    "--navbar-bg-scroll": "rgba(245,242,236,0.97)", "--navbar-bg": "rgba(245,242,236,0.85)"
  }
};

function applyTheme(theme) {
  const vars = themeVars[theme];
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  currentTheme = theme;
  // Navbar bg fix
  const nb = document.getElementById("navbar");
  if (nb) nb.style.background = vars["--navbar-bg"];
  // Light-specific scrollbar tint
  document.querySelectorAll(".theme-chip").forEach(c => {
    c.classList.toggle("active", c.dataset.theme === theme);
  });
}

// ── Font ──
const fontFamilies = {
  playfair:  { disp: "'Playfair Display', Georgia, serif",  body: "'DM Sans', system-ui, sans-serif" },
  lora:      { disp: "'Lora', Georgia, serif",              body: "'DM Sans', system-ui, sans-serif" },
  cormorant: { disp: "'Cormorant Garamond', Georgia, serif", body: "'DM Sans', system-ui, sans-serif" },
  inter:     { disp: "'Inter', system-ui, sans-serif",      body: "'Inter', system-ui, sans-serif" }
};

function applyFont(font) {
  const f = fontFamilies[font] || fontFamilies.playfair;
  document.documentElement.style.setProperty("--font-disp", f.disp);
  document.documentElement.style.setProperty("--font-body", f.body);
  localStorage.setItem("font", font);
  currentFont = font;
  document.querySelectorAll(".font-chip").forEach(c => {
    c.classList.toggle("active", c.dataset.font === font);
  });
}

// ── Zoom ──
function applyZoom(zoom) {
  zoom = Math.max(80, Math.min(150, zoom));
  document.documentElement.style.fontSize = (zoom / 100) * 16 + "px";
  const el = document.getElementById("zoomValue");
  if (el) el.textContent = zoom + "%";
  localStorage.setItem("zoom", zoom);
  currentZoom = zoom;
}

// ── Settings panel open/close ──
const settingsOverlay = document.getElementById("settingsOverlay");

document.getElementById("openSettings").addEventListener("click", () => {
  settingsOverlay.classList.remove("hidden");
  // Sync chip states
  applyLang(currentLang);
  applyTheme(currentTheme);
  applyFont(currentFont);
  applyZoom(currentZoom);
});
document.getElementById("closeSettings").addEventListener("click", () => {
  settingsOverlay.classList.add("hidden");
});
settingsOverlay.addEventListener("click", e => {
  if (e.target === settingsOverlay) settingsOverlay.classList.add("hidden");
});

// ── Chip listeners ──
document.querySelectorAll(".lang-chip").forEach(btn => {
  btn.addEventListener("click", () => applyLang(btn.dataset.lang));
});
document.querySelectorAll(".theme-chip").forEach(btn => {
  btn.addEventListener("click", () => applyTheme(btn.dataset.theme));
});
document.querySelectorAll(".font-chip").forEach(btn => {
  btn.addEventListener("click", () => applyFont(btn.dataset.font));
});

document.getElementById("zoomIn").addEventListener("click",  () => applyZoom(currentZoom + 10));
document.getElementById("zoomOut").addEventListener("click", () => applyZoom(currentZoom - 10));

// ── Init all settings ──
applyLang(currentLang);
applyTheme(currentTheme);
applyFont(currentFont);
applyZoom(currentZoom);


// ─────────────────────────────────────────────────────────────
// PARALLAX SCROLL
// ─────────────────────────────────────────────────────────────
const parallaxBgs = document.querySelectorAll(".parallax-bg");

function updateParallax() {
  const scrollY = window.scrollY;
  parallaxBgs.forEach(bg => {
    const section = bg.parentElement;
    const rect = section.getBoundingClientRect();
    const offset = rect.top + scrollY;
    const speed = 0.15;
    const y = (scrollY - offset) * speed;
    bg.style.transform = `translateY(${y}px)`;
  });
}

window.addEventListener("scroll", updateParallax, { passive: true });
updateParallax();

// ─────────────────────────────────────────────────────────────
// NAVBAR SCROLL EFFECT
// ─────────────────────────────────────────────────────────────
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
  const vars = themeVars[currentTheme];
  navbar.style.background = window.scrollY > 50
    ? vars["--navbar-bg-scroll"]
    : vars["--navbar-bg"];
}, { passive: true });

// ─────────────────────────────────────────────────────────────
// REVEAL ON SCROLL
// ─────────────────────────────────────────────────────────────
const reveals = document.querySelectorAll(".reveal, .reveal-item");

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (!entry.isIntersecting) return;
    const delay = entry.target.classList.contains("reveal-item") ? i * 120 : 0;
    setTimeout(() => entry.target.classList.add("visible"), delay);
  });
}, { threshold: 0.12 });

reveals.forEach(el => revealObserver.observe(el));

// ─────────────────────────────────────────────────────────────
// HERO TITLE ANIMATION (blur-fade per word, triggered once)
// ─────────────────────────────────────────────────────────────
(function initHeroAnim() {
  const title = document.querySelector(".hero-title");
  if (!title) return;
  // Trigger after loading screen clears (~900ms)
  setTimeout(() => title.classList.add("htx-anim"), 900);
})();


// ─────────────────────────────────────────────────────────────
// STATISTICS
// ─────────────────────────────────────────────────────────────
async function loadStats() {
  if (!firebaseReady) {
    // Demo brojevi ako Firebase nije konfiguriran
    animateCounter("statVisitors", 0, 42);
    animateCounter("statSurveys", 0, 7);
    animateCounter("statDownloads", 0, 15);
    return;
  }

  try {
    const statsRef = doc(db, "meta", "stats");
    const snap = await getDoc(statsRef);
    if (snap.exists()) {
      const d = snap.data();
      animateCounter("statVisitors", 0, d.visitors || 0);
      animateCounter("statSurveys", 0, d.surveys || 0);
      animateCounter("statDownloads", 0, d.downloads || 0);
    } else {
      await setDoc(statsRef, { visitors: 1, surveys: 0, downloads: 0 });
      animateCounter("statVisitors", 0, 1);
      animateCounter("statSurveys", 0, 0);
      animateCounter("statDownloads", 0, 0);
    }

    // Inkrementiraj posjete (samo jednom po sesiji)
    if (!sessionStorage.getItem("visited")) {
      await updateDoc(statsRef, { visitors: increment(1) });
      sessionStorage.setItem("visited", "1");
    }
  } catch (e) {
    console.warn("Stats load error:", e);
  }
}

function animateCounter(id, from, to) {
  const el = document.getElementById(id);
  if (!el) return;
  const duration = 1800;
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(from + (to - from) * ease);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Pokreni stats kad je stats sekcija vidljiva
const statsObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    loadStats();
    statsObserver.disconnect();
  }
}, { threshold: 0.3 });
statsObserver.observe(document.getElementById("stats"));

// ─────────────────────────────────────────────────────────────
// SCALE BUTTONS (anketa)
// ─────────────────────────────────────────────────────────────
const surveyData = { pre: {}, post: {} };

document.querySelectorAll(".scale-btns").forEach(group => {
  const key = group.dataset.key;
  const isPre = key.startsWith("post_") ? false : true;
  const target = isPre ? surveyData.pre : surveyData.post;

  group.querySelectorAll(".scale-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      group.querySelectorAll(".scale-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      target[key] = parseInt(btn.dataset.val);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// ANONYMOUS AUTH / USER SYSTEM
// ─────────────────────────────────────────────────────────────
// Koristimo Firestore "users" kolekciju s hash lozinke
// Identifikator: ime_prezime (lowercase, bez razmaka)
// NE pamtimo email, OIB ni osobne podatke

let currentUser = null;

function hashPass(pass) {
  // Jednostavan hash za demo — u produkciji koristiti bcrypt ili Firebase Auth
  let hash = 0;
  for (let i = 0; i < pass.length; i++) {
    hash = ((hash << 5) - hash) + pass.charCodeAt(i);
    hash |= 0;
  }
  return "h" + Math.abs(hash).toString(36) + pass.length;
}


function generateUID() {
  return 'u_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

function makeUserId(name, surname) {
  return (name + "_" + surname).toLowerCase().replace(/\s+/g, "").replace(/[^a-z_\u00C0-\u017E]/g, "");
}

async function loginUser(name, surname, pass) {
  if (!firebaseReady) {
    currentUser = { id: generateUID(), name, surname };
    localStorage.setItem("user", JSON.stringify(currentUser));
    return { ok: true };
  }

  const loginKey = makeUserId(name, surname);
  const snap = await getDocs(query(collection(db, "users"), where("loginKey", "==", loginKey)));

  if (snap.empty) {
    return { ok: false, msg: currentLang === "hr" ? "Korisnik ne postoji. Registriraj se." : "User not found. Please register." };
  }

  const userDoc = snap.docs[0];
  const data = userDoc.data();

  if (data.passHash !== hashPass(pass)) {
    return { ok: false, msg: currentLang === "hr" ? "Pogrešna šifra." : "Wrong password." };
  }

  currentUser = { id: userDoc.id, name: data.name, surname: data.surname };
  localStorage.setItem("user", JSON.stringify(currentUser));
  return { ok: true };
}

async function registerUser(name, surname, pass) {
  if (pass.length < 6) {
    return { ok: false, msg: currentLang === "hr" ? "Šifra mora imati min. 6 znakova." : "Password must be at least 6 chars." };
  }

  if (!firebaseReady) {
    const uid = generateUID();
    currentUser = { id: uid, name, surname };
    localStorage.setItem("user", JSON.stringify(currentUser));
    return { ok: true };
  }

  const loginKey = makeUserId(name, surname);

  // Check if loginKey already active (existing non-deleted user)
  const { query: q2, where: w2 } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const existing = await getDocs(query(collection(db, "users"), where("loginKey", "==", loginKey)));
  if (!existing.empty) {
    return { ok: false, msg: currentLang === "hr" ? "Ime već postoji. Prijavi se." : "Username exists. Log in instead." };
  }

  const uid = generateUID();
  await setDoc(doc(db, "users", uid), {
    name,
    surname,
    loginKey,
    passHash: hashPass(pass),
    createdAt: serverTimestamp()
  });

  currentUser = { id: uid, name, surname };
  localStorage.setItem("user", JSON.stringify(currentUser));
  return { ok: true };
}

function loadStoredUser() {
  const stored = localStorage.getItem("user");
  if (stored) {
    try { currentUser = JSON.parse(stored); } catch { }
  }
}

function updateLoginUI() {
  const btn = document.getElementById("openLogin");
  if (currentUser) {
    btn.dataset.hr = currentUser.name;
    btn.dataset.en = currentUser.name;
    btn.textContent = currentUser.name;
  } else {
    btn.dataset.hr = "Prijava";
    btn.dataset.en = "Login";
    btn.textContent = currentLang === "hr" ? "Prijava" : "Login";
  }
}

// ─────────────────────────────────────────────────────────────
// MODAL LOGIC
// ─────────────────────────────────────────────────────────────
const overlay   = document.getElementById("loginOverlay");
const loginForm = document.getElementById("loginForm");
const regForm   = document.getElementById("registerForm");
const loggedView= document.getElementById("loggedInView");

function clearModalInputs() {
  ["loginName","loginSurname","loginPass",
   "regName","regSurname","regPass",
   "adminEmailInput","adminPassInput"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  document.getElementById("loginError").classList.add("hidden");
  document.getElementById("regError").classList.add("hidden");
  document.getElementById("adminLoginError").classList.add("hidden");
}

function showModal() {
  overlay.classList.remove("hidden");
  // Reset to mode select if not logged in
  if (!currentUser) {
    clearModalInputs();
    document.getElementById("modeSelect").classList.remove("hidden");
    document.getElementById("anonSection").classList.add("hidden");
    document.getElementById("adminSection").classList.add("hidden");
  }
  if (currentUser) {
    document.getElementById("modeSelect").classList.add("hidden");
    document.getElementById("anonSection").classList.add("hidden");
    document.getElementById("adminSection").classList.add("hidden");
    loginForm.classList.add("hidden");
    regForm.classList.add("hidden");
    loggedView.classList.remove("hidden");
    document.getElementById("loggedAvatar").textContent = currentUser.name[0].toUpperCase();
    document.getElementById("loggedName").textContent = currentUser.name + " " + currentUser.surname;
    const statusEl = document.getElementById("accountStatusMsg");
    if (statusEl) {
      if (currentUser.deactivated) {
        statusEl.textContent = currentLang === "hr" ? "Račun je deaktiviran" : "Account is deactivated";
        statusEl.className = "account-status deactivated";
        statusEl.classList.remove("hidden");
        document.getElementById("doDeactivate").textContent = currentLang === "hr" ? "Reaktiviraj račun" : "Reactivate account";
      } else {
        statusEl.classList.add("hidden");
        document.getElementById("doDeactivate").textContent = currentLang === "hr" ? "Deaktiviraj račun" : "Deactivate account";
      }
    }
  } else {
    loginForm.classList.remove("hidden");
    regForm.classList.add("hidden");
    loggedView.classList.add("hidden");
  }
}

function hideModal() {
  overlay.classList.add("hidden");
  document.getElementById("modeSelect").classList.remove("hidden");
  document.getElementById("anonSection").classList.add("hidden");
  document.getElementById("adminSection").classList.add("hidden");
}

document.getElementById("openLogin").addEventListener("click", showModal);
document.getElementById("closeLogin").addEventListener("click", hideModal);


// ─────────────────────────────────────────────────────────────
// MODE SELECTION
// ─────────────────────────────────────────────────────────────
document.getElementById("pickAnon").addEventListener("click", () => {
  document.getElementById("modeSelect").classList.add("hidden");
  document.getElementById("anonSection").classList.remove("hidden");
  loginForm.classList.remove("hidden");
  regForm.classList.add("hidden");
});

document.getElementById("pickAdmin").addEventListener("click", () => {
  document.getElementById("modeSelect").classList.add("hidden");
  document.getElementById("adminSection").classList.remove("hidden");
  document.getElementById("adminPassInput").value = "";
  document.getElementById("adminLoginError").classList.add("hidden");
});

document.getElementById("backFromAnon").addEventListener("click", () => {
  clearModalInputs();
  document.getElementById("anonSection").classList.add("hidden");
  document.getElementById("modeSelect").classList.remove("hidden");
});

document.getElementById("backFromAdmin").addEventListener("click", () => {
  clearModalInputs();
  document.getElementById("adminSection").classList.add("hidden");
  document.getElementById("modeSelect").classList.remove("hidden");
});

document.getElementById("doAdminLogin").addEventListener("click", async () => {
  const email = document.getElementById("adminEmailInput").value.trim();
  const pass  = document.getElementById("adminPassInput").value;
  const errEl = document.getElementById("adminLoginError");
  errEl.classList.add("hidden");
  try {
    await signInWithEmailAndPassword(window._fbAuth, email, pass);
    hideModal();
    window.location.href = "nadzor-ks2025.html";
  } catch(e) {
    errEl.textContent = "Pogrešan email ili lozinka.";
    errEl.classList.remove("hidden");
  }
});

document.getElementById("adminPassInput").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("doAdminLogin").click();
});
document.getElementById("adminEmailInput").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("adminPassInput").focus();
});

document.getElementById("toRegister").addEventListener("click", () => {
  loginForm.classList.add("hidden");
  regForm.classList.remove("hidden");
});
document.getElementById("toLogin").addEventListener("click", () => {
  regForm.classList.add("hidden");
  loginForm.classList.remove("hidden");
});

document.getElementById("doLogin").addEventListener("click", async () => {
  const name    = document.getElementById("loginName").value.trim();
  const surname = document.getElementById("loginSurname").value.trim();
  const pass    = document.getElementById("loginPass").value;
  const errEl   = document.getElementById("loginError");

  if (!name || !surname || !pass) {
    errEl.textContent = currentLang === "hr" ? "Popuni sva polja." : "Fill all fields.";
    errEl.classList.remove("hidden");
    return;
  }

  const result = await loginUser(name, surname, pass);
  if (result.ok) {
    errEl.classList.add("hidden");
    updateLoginUI();
    hideModal();
    location.reload();
  } else {
    errEl.textContent = result.msg;
    errEl.classList.remove("hidden");
  }
});

document.getElementById("doRegister").addEventListener("click", async () => {
  const name    = document.getElementById("regName").value.trim();
  const surname = document.getElementById("regSurname").value.trim();
  const pass    = document.getElementById("regPass").value;
  const errEl   = document.getElementById("regError");

  if (!name || !surname || !pass) {
    errEl.textContent = currentLang === "hr" ? "Popuni sva polja." : "Fill all fields.";
    errEl.classList.remove("hidden");
    return;
  }

  const result = await registerUser(name, surname, pass);
  if (result.ok) {
    errEl.classList.add("hidden");
    updateLoginUI();
    hideModal();
    location.reload();
  } else {
    errEl.textContent = result.msg;
    errEl.classList.remove("hidden");
  }
});

document.getElementById("doLogout").addEventListener("click", () => {
  currentUser = null;
  localStorage.removeItem("user");
  updateLoginUI();
  hideModal();
  location.reload();
});

// ─────────────────────────────────────────────────────────────
// SUBMIT SURVEYS
// ─────────────────────────────────────────────────────────────
async function submitSurvey(type, data, formEl, doneEl) {
  if (!currentUser) {
    showModal();
    return;
  }

  if (Object.keys(data).length === 0) {
    showToast(currentLang === "hr" ? "Odaberi barem jedan odgovor." : "Select at least one answer.");
    return;
  }

  try {
    if (firebaseReady) {
      await addDoc(collection(db, "surveys"), {
        type,
        userId: currentUser.id,
        data,
        timestamp: serverTimestamp()
      });

      // Inkrementiraj survey count
      const statsRef = doc(db, "meta", "stats");
      await updateDoc(statsRef, { surveys: increment(1) });
    }

    formEl.classList.add("hidden");
    doneEl.classList.remove("hidden");
  } catch (e) {
    console.error("Survey submit error:", e);
    showToast(currentLang === "hr" ? "Greška pri slanju. Pokušaj ponovo." : "Error submitting. Try again.");
  }
}

document.getElementById("submitPreSurvey").addEventListener("click", () => {
  submitSurvey(
    "pre",
    { ...surveyData.pre },
    document.getElementById("preSurveyForm"),
    document.getElementById("preSurveyDone")
  );
});

document.getElementById("submitPostSurvey").addEventListener("click", () => {
  const comment = document.getElementById("postComment").value.trim();
  const postData = { ...surveyData.post };
  if (comment) postData.comment = comment;
  submitSurvey(
    "post",
    postData,
    document.getElementById("postSurveyForm"),
    document.getElementById("postSurveyDone")
  );
});

// ─────────────────────────────────────────────────────────────
// DOWNLOAD TRACKING
// ─────────────────────────────────────────────────────────────
document.getElementById("downloadBtn").addEventListener("click", async () => {
  if (!firebaseReady) return;
  try {
    const statsRef = doc(db, "meta", "stats");
    await updateDoc(statsRef, { downloads: increment(1) });
  } catch (e) {
    console.warn("Download track error:", e);
  }
});


// ─────────────────────────────────────────────────────────────
// DEACTIVATE / DELETE ACCOUNT
// ─────────────────────────────────────────────────────────────
document.getElementById("doDelete").addEventListener("click", async () => {
  if (!currentUser || !firebaseReady) return;
  const msg = currentLang === "hr"
    ? "Trajno izbrisati račun i sve tvoje ankete? Ova radnja se ne može poništiti."
    : "Permanently delete account and all your surveys? This cannot be undone.";
  if (!confirm(msg)) return;
  try {
    // Samo briše korisnika — ankete ostaju na serveru kao statistika
    await deleteDoc(doc(db, "users", currentUser.id));
    currentUser = null;
    localStorage.removeItem("user");
    hideModal();
    showToast(currentLang === "hr" ? "Račun je trajno izbrisan." : "Account permanently deleted.");
    setTimeout(() => location.reload(), 1500);
  } catch(e) { showToast(currentLang === "hr" ? "Greška pri brisanju." : "Error deleting account."); }
});

// ─────────────────────────────────────────────────────────────
// CHECK COMPLETED SURVEYS ON LOAD
// ─────────────────────────────────────────────────────────────
async function checkCompletedSurveys() {
  if (!currentUser || !firebaseReady) return;
  try {
    const snap = await getDocs(query(collection(db, "surveys"), where("userId", "==", currentUser.id)));
    snap.forEach(d => {
      const type = d.data().type;
      if (type === "pre") {
        document.getElementById("preSurveyForm").classList.add("hidden");
        document.getElementById("preSurveyDone").classList.remove("hidden");
      }
      if (type === "post") {
        document.getElementById("postSurveyForm").classList.add("hidden");
        document.getElementById("postSurveyDone").classList.remove("hidden");
      }
    });
  } catch(e) { console.warn("checkCompletedSurveys error:", e); }
}

// ─────────────────────────────────────────────────────────────
// QUESTIONS WIDGET (Pitanja prije čitanja)
// ─────────────────────────────────────────────────────────────

function renderQuestionItem(data, docId) {
  const div = document.createElement("div");
  div.className = "qw-item";
  div.dataset.id = docId;

  const votes = data.votes || 0;
  const alreadyVoted = currentUser && (data.voters || []).includes(currentUser.id);

  const replyHtml = data.adminReply
    ? `<div class="qw-admin-reply">
        <span class="qw-admin-reply-label" data-hr="Odgovor" data-en="Reply" data-de="Antwort">Odgovor</span>
        <p class="qw-admin-reply-text">${escapeHtml(data.adminReply)}</p>
      </div>`
    : "";

  div.innerHTML = `
    <div class="qw-item-inner">
      <div class="qw-item-text">${escapeHtml(data.text)}</div>
      ${replyHtml}
    </div>
    <button class="qw-vote-btn ${alreadyVoted ? "voted" : ""}" data-id="${docId}" title="Glasaj">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
      <span class="qw-vote-count">${votes}</span>
    </button>
  `;

  div.querySelector(".qw-vote-btn").addEventListener("click", () => voteQuestion(docId, alreadyVoted));
  return div;
}

function escapeHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

async function loadTopQuestions() {
  const listEl = document.getElementById("qwTopList");
  if (!firebaseReady) {
    listEl.innerHTML = `<p class="qw-empty" data-hr="Firebase nije spojen." data-en="Firebase not connected." data-de="Firebase nicht verbunden.">Firebase nije spojen.</p>`;
    return;
  }
  try {
    const q = query(collection(db, "questions"), orderBy("votes", "desc"), limit(3));
    const snap = await getDocs(q);
    listEl.innerHTML = "";
    if (snap.empty) {
      const langMap = { hr: "Još nema pitanja. Budi prvi!", en: "No questions yet. Be the first!", de: "Noch keine Fragen. Sei der Erste!" };
      listEl.innerHTML = `<p class="qw-empty">${langMap[currentLang] || langMap.hr}</p>`;
      return;
    }
    snap.forEach(d => listEl.appendChild(renderQuestionItem(d.data(), d.id)));
  } catch(e) {
    console.warn("loadTopQuestions error:", e);
  }
}

async function voteQuestion(docId, alreadyVoted) {
  if (!currentUser) { showModal(); return; }
  if (!firebaseReady) return;
  if (alreadyVoted) return;
  try {
    const ref = doc(db, "questions", docId);
    await updateDoc(ref, {
      votes: increment(1),
      voters: [...((await getDoc(ref)).data().voters || []), currentUser.id]
    });
    // Refresh whichever list is visible
    const searchVal = document.getElementById("qwSearch").value.trim();
    if (searchVal) {
      await searchQuestions(searchVal);
    } else {
      await loadTopQuestions();
    }
  } catch(e) { showToast(currentLang === "hr" ? "Greška pri glasanju." : "Vote error."); }
}

async function searchQuestions(term) {
  const topSection = document.getElementById("qwTopSection");
  const searchList = document.getElementById("qwSearchList");

  if (!term) {
    topSection.classList.remove("hidden");
    searchList.classList.add("hidden");
    searchList.innerHTML = "";
    return;
  }

  topSection.classList.add("hidden");
  searchList.classList.remove("hidden");
  searchList.innerHTML = `<p class="qw-empty">...</p>`;

  if (!firebaseReady) return;

  try {
    // Firestore doesn't do full-text; fetch recent 100 and filter client-side
    const q = query(collection(db, "questions"), orderBy("votes", "desc"), limit(100));
    const snap = await getDocs(q);
    const results = [];
    snap.forEach(d => {
      if (d.data().text.toLowerCase().includes(term.toLowerCase())) results.push({ d, id: d.id });
    });

    searchList.innerHTML = "";
    if (results.length === 0) {
      const langMap = { hr: "Nema rezultata.", en: "No results.", de: "Keine Ergebnisse." };
      searchList.innerHTML = `<p class="qw-empty">${langMap[currentLang] || langMap.hr}</p>`;
      return;
    }
    results.slice(0, 3).forEach(({ d, id }) => searchList.appendChild(renderQuestionItem(d.data(), id)));
  } catch(e) { console.warn("searchQuestions error:", e); }
}

// Submit new question
document.getElementById("qwSubmit").addEventListener("click", async () => {
  if (!currentUser) { showModal(); return; }
  const input = document.getElementById("qwInput");
  const text = input.value.trim();
  if (!text) return;
  if (text.length < 5) {
    showToast(currentLang === "hr" ? "Pitanje je prekratko." : "Question too short.");
    return;
  }
  if (!firebaseReady) { showToast("Firebase nije spojen."); return; }

  const btn = document.getElementById("qwSubmit");
  btn.disabled = true;
  try {
    await addDoc(collection(db, "questions"), {
      text,
      userId: currentUser.id,
      votes: 0,
      voters: [],
      timestamp: serverTimestamp()
    });
    input.value = "";
    showToast(currentLang === "hr" ? "Pitanje je postavljeno!" : currentLang === "de" ? "Frage gestellt!" : "Question posted!");
    await loadTopQuestions();
  } catch(e) {
    showToast(currentLang === "hr" ? "Greška pri slanju." : "Submit error.");
  } finally {
    btn.disabled = false;
  }
});

// Search debounce
let qwSearchTimer;
document.getElementById("qwSearch").addEventListener("input", e => {
  clearTimeout(qwSearchTimer);
  const val = e.target.value.trim();
  qwSearchTimer = setTimeout(() => searchQuestions(val), 320);
});

// Placeholder i18n za widget
function applyQwPlaceholders() {
  const lang = currentLang;
  const ta = document.getElementById("qwInput");
  const si = document.getElementById("qwSearch");
  if (ta) ta.placeholder = ta.dataset[lang + "Placeholder"] || ta.dataset.hrPlaceholder;
  if (si) si.placeholder = si.dataset[lang + "Placeholder"] || si.dataset.hrPlaceholder;
}

// Hook into applyLang — call applyQwPlaceholders after lang change
const _origApplyLang = applyLang;
// (already called at end of settings init, no override needed — handled via data-hr-placeholder above)

// Load on scroll into view
const qwObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    loadTopQuestions();
    qwObserver.disconnect();
  }
}, { threshold: 0.1 });
const qwWidget = document.querySelector(".questions-widget");
if (qwWidget) qwObserver.observe(qwWidget);


loadStoredUser();
updateLoginUI();
checkCompletedSurveys();

// ─────────────────────────────────────────────────────────────
// LOADING SCREEN
// ─────────────────────────────────────────────────────────────
(function initLoadingScreen() {
  const screen = document.getElementById("loadingScreen");
  if (!screen) return;

  function dismissLoader() {
    screen.classList.add("ls-done");
    setTimeout(() => { screen.style.display = "none"; }, 750);
  }

  if (document.readyState === "complete") {
    setTimeout(dismissLoader, 800);
  } else {
    window.addEventListener("load", () => setTimeout(dismissLoader, 800));
  }
  // Sigurnosni fallback
  setTimeout(dismissLoader, 5000);
})();

// ─────────────────────────────────────────────────────────────
// SCROLL PROGRESS BAR
// ─────────────────────────────────────────────────────────────
(function initProgressBar() {
  const fill = document.getElementById("progressFill");
  if (!fill) return;

  function updateProgress() {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct       = docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0;
    fill.style.width = pct + "%";
  }

  window.addEventListener("scroll", updateProgress, { passive: true });
  updateProgress();
})();

// ─────────────────────────────────────────────────────────────
// SERVICE WORKER — nije aktivan (sw.js nije u projektu)
// Kad dodaš sw.js u root repozitorija, odkomentiraj ovaj blok:
// ─────────────────────────────────────────────────────────────
/*
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js", { scope: "/" })
      .then(reg => console.log("[SW] Registered:", reg.scope))
      .catch(err => console.warn("[SW] Failed:", err));
  });
}
*/