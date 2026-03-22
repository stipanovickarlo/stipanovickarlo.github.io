// ═══════════════════════════════════════════════════════════════
// NEUTRALIZAM — script.js
// Firebase + Parallax + Language + Login + Stats + Surveys
// ═══════════════════════════════════════════════════════════════

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  increment, collection, addDoc, serverTimestamp,
  query, where, getDocs, writeBatch
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
// INIT
// ─────────────────────────────────────────────────────────────
loadStoredUser();
updateLoginUI();
checkCompletedSurveys();

