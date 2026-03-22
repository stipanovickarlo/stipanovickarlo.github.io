// ═══════════════════════════════════════════════════════════════
// NEUTRALIZAM — script.js
// Firebase + Parallax + Language + Login + Stats + Surveys
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc,
  increment, collection, addDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ─────────────────────────────────────────────────────────────
// !! ZAMIJENI OVO SA SVOJIM FIREBASE KONFIGOM !!
// 1. Idi na https://console.firebase.google.com
// 2. Stvori novi projekt "neutralizam"
// 3. Dodaj web app → kopiraj firebaseConfig
// ─────────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "TVOJ_API_KEY",
  authDomain:        "TVOJ_PROJECT.firebaseapp.com",
  projectId:         "TVOJ_PROJECT_ID",
  storageBucket:     "TVOJ_PROJECT.appspot.com",
  messagingSenderId: "TVOJ_SENDER_ID",
  appId:             "TVOJ_APP_ID"
};

let db;
let firebaseReady = false;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  firebaseReady = true;
} catch (e) {
  console.warn("Firebase nije konfiguriran. Radi u demo modu.", e);
}

// ─────────────────────────────────────────────────────────────
// LANGUAGE SWITCHER
// ─────────────────────────────────────────────────────────────
let currentLang = localStorage.getItem("lang") || "hr";

function applyLang(lang) {
  document.documentElement.setAttribute("data-lang", lang);
  document.querySelectorAll("[data-hr]").forEach(el => {
    el.textContent = lang === "hr" ? el.dataset.hr : (el.dataset.en || el.dataset.hr);
  });
  document.querySelectorAll("[data-hr-placeholder]").forEach(el => {
    el.placeholder = lang === "hr" ? el.dataset.hrPlaceholder : (el.dataset.enPlaceholder || el.dataset.hrPlaceholder);
  });
  document.getElementById("langToggle").textContent = lang === "hr" ? "EN" : "HR";
  localStorage.setItem("lang", lang);
  currentLang = lang;
}

document.getElementById("langToggle").addEventListener("click", () => {
  applyLang(currentLang === "hr" ? "en" : "hr");
});

applyLang(currentLang);

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
  navbar.style.background = window.scrollY > 50
    ? "rgba(11,13,18,0.97)"
    : "rgba(11,13,18,0.85)";
}, { passive: true });

// ─────────────────────────────────────────────────────────────
// REVEAL ON SCROLL
// ─────────────────────────────────────────────────────────────
const reveals = document.querySelectorAll(".reveal, .reveal-item");

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      const delay = entry.target.classList.contains("reveal-item") ? i * 120 : 0;
      setTimeout(() => entry.target.classList.add("visible"), delay);
    }
  });
}, { threshold: 0.15 });

reveals.forEach(el => revealObserver.observe(el));

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

function makeUserId(name, surname) {
  return (name + "_" + surname).toLowerCase().replace(/\s+/g, "").replace(/[^a-z_\u00C0-\u017E]/g, "");
}

async function loginUser(name, surname, pass) {
  if (!firebaseReady) {
    // Demo login bez Firebase
    currentUser = { id: makeUserId(name, surname), name, surname };
    localStorage.setItem("user", JSON.stringify(currentUser));
    return { ok: true };
  }

  const uid = makeUserId(name, surname);
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    return { ok: false, msg: currentLang === "hr" ? "Korisnik ne postoji. Registriraj se." : "User not found. Please register." };
  }

  const data = snap.data();
  if (data.passHash !== hashPass(pass)) {
    return { ok: false, msg: currentLang === "hr" ? "Pogrešna šifra." : "Wrong password." };
  }

  currentUser = { id: uid, name: data.name, surname: data.surname };
  localStorage.setItem("user", JSON.stringify(currentUser));
  return { ok: true };
}

async function registerUser(name, surname, pass) {
  if (pass.length < 6) {
    return { ok: false, msg: currentLang === "hr" ? "Šifra mora imati min. 6 znakova." : "Password must be at least 6 chars." };
  }

  if (!firebaseReady) {
    currentUser = { id: makeUserId(name, surname), name, surname };
    localStorage.setItem("user", JSON.stringify(currentUser));
    return { ok: true };
  }

  const uid = makeUserId(name, surname);
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    return { ok: false, msg: currentLang === "hr" ? "Ime već postoji. Prijavi se." : "Username exists. Log in instead." };
  }

  await setDoc(userRef, {
    name,
    surname,
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

function showModal() {
  overlay.classList.remove("hidden");
  if (currentUser) {
    loginForm.classList.add("hidden");
    regForm.classList.add("hidden");
    loggedView.classList.remove("hidden");
    document.getElementById("loggedAvatar").textContent = currentUser.name[0].toUpperCase();
    document.getElementById("loggedName").textContent = currentUser.name + " " + currentUser.surname;
  } else {
    loginForm.classList.remove("hidden");
    regForm.classList.add("hidden");
    loggedView.classList.add("hidden");
  }
}

function hideModal() { overlay.classList.add("hidden"); }

document.getElementById("openLogin").addEventListener("click", showModal);
document.getElementById("closeLogin").addEventListener("click", hideModal);
overlay.addEventListener("click", e => { if (e.target === overlay) hideModal(); });

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
});

// ─────────────────────────────────────────────────────────────
// SUBMIT SURVEYS
// ─────────────────────────────────────────────────────────────
async function submitSurvey(type, data, formEl, doneEl) {
  if (!currentUser) {
    alert(currentLang === "hr"
      ? "Moraš se prijaviti za slanje ankete."
      : "You need to log in to submit a survey.");
    showModal();
    return;
  }

  if (Object.keys(data).length === 0) {
    alert(currentLang === "hr" ? "Odaberi barem jedan odgovor." : "Select at least one answer.");
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
    alert(currentLang === "hr" ? "Greška pri slanju. Pokušaj ponovo." : "Error submitting. Try again.");
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
// INIT
// ─────────────────────────────────────────────────────────────
loadStoredUser();
updateLoginUI();
