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
// Detect OS color scheme on first visit (no stored preference)
const _osPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
let currentTheme = localStorage.getItem("theme") || (_osPrefersDark ? "dark" : "light");
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

// ─────────────────────────────────────────────────────────────
// PASSWORD HASHING — SHA-256 + salt (SubtleCrypto, browser-native)
// Sigurnije od jednostavnog hasha, bez vanjskih ovisnosti.
// ─────────────────────────────────────────────────────────────
const PASS_SALT = "nzm_2026_s4lt_k5";

async function hashPass(pass) {
  const data = new TextEncoder().encode(PASS_SALT + pass);
  const buf  = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// Legacy hash provjera (za stare korisnike registrirane prije nadogradnje)
function hashPassLegacy(pass) {
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

// loginKey se hashira SHA-256 — plaintext godina više nije vidljiva u bazi
async function makeLoginKeyHash(name, surname, year) {
  const raw  = (name + "|" + surname + "|" + (year || "")).toLowerCase().trim();
  const data = new TextEncoder().encode(raw);
  const buf  = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

async function loginUser(name, surname, year, pass) {
  if (!firebaseReady) {
    currentUser = { id: generateUID(), name, surname };
    localStorage.setItem("user", JSON.stringify(currentUser));
    return { ok: true };
  }

  // Traži po imenu (ne treba godina za prijavu)
  const nameSnap = await getDocs(query(collection(db, "users"), where("name", "==", name)));
  const candidates = [];
  nameSnap.forEach(d => {
    if (d.data().surname === surname) candidates.push(d);
  });

  if (!candidates.length) {
    return { ok: false, msg: currentLang === "hr" ? "Korisnik ne postoji. Provjeri ime i prezime ili se registriraj." : currentLang === "de" ? "Benutzer nicht gefunden. Bitte registrieren." : "User not found. Check name and surname or register." };
  }

  const newHash    = await hashPass(pass);
  const legacyHash = hashPassLegacy(pass);

  // Provjeri lozinku za sve kandidate (može biti više s istim imenom/prezimenom)
  for (const userDoc of candidates) {
    const data = userDoc.data();
    if (data.passHash === newHash || data.passHash === legacyHash) {
      if (data.passHash === legacyHash && data.passHash !== newHash) {
        try { await updateDoc(doc(db, "users", userDoc.id), { passHash: newHash }); } catch(e) {}
      }
      currentUser = { id: userDoc.id, name: data.name, surname: data.surname, birthYear: data.birthYear };
      localStorage.setItem("user", JSON.stringify(currentUser));
      return { ok: true };
    }
  }

  return { ok: false, msg: currentLang === "hr" ? "Pogrešna šifra." : currentLang === "de" ? "Falsches Passwort." : "Wrong password." };
}

async function registerUser(name, surname, year, pass) {
  const hasLetter = /[a-zA-ZÀ-ž]/.test(pass);
  const hasDigit  = /[0-9]/.test(pass);
  if (pass.length < 8 || !hasLetter || !hasDigit) {
    return { ok: false, msg:
      currentLang === "hr" ? "Šifra mora imati min. 8 znakova, barem jedno slovo i jedan broj." :
      currentLang === "de" ? "Passwort mind. 8 Zeichen, min. 1 Buchstabe und 1 Zahl." :
      "Password must be at least 8 chars with one letter and one number."
    };
  }
  const yearNum = parseInt(year);
  if (!yearNum || yearNum < 1900 || yearNum > 2015) {
    return { ok: false, msg: currentLang === "hr" ? "Unesi valjanu godinu rođenja (1900–2015)." : currentLang === "de" ? "Gib ein gültiges Geburtsjahr ein (1900–2015)." : "Enter a valid birth year (1900–2015)." };
  }

  if (!firebaseReady) {
    const uid = generateUID();
    currentUser = { id: uid, name, surname, birthYear: yearNum };
    localStorage.setItem("user", JSON.stringify(currentUser));
    return { ok: true };
  }

  const loginKey = await makeLoginKeyHash(name, surname, year);

  const existing = await getDocs(query(collection(db, "users"), where("loginKey", "==", loginKey)));
  if (!existing.empty) {
    return { ok: false, msg: currentLang === "hr" ? "Korisnik s tim podacima već postoji. Prijavi se." : currentLang === "de" ? "Benutzer existiert bereits. Bitte anmelden." : "User already exists. Please log in." };
  }

  const uid = generateUID();
  const passHash = await hashPass(pass);
  await setDoc(doc(db, "users", uid), {
    name,
    surname,
    birthYear: yearNum,
    loginKey,   // SHA-256 hash — godina nije čitljiva
    passHash,
    createdAt: serverTimestamp()
  });

  currentUser = { id: uid, name, surname, birthYear: yearNum };
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
  const btn  = document.getElementById("openLogin");
  if (currentUser) {
    btn.dataset.hr = currentUser.name;
    btn.dataset.en = currentUser.name;
    btn.dataset.de = currentUser.name;
    btn.textContent = currentUser.name;
  } else {
    btn.dataset.hr = "Prijava";
    btn.dataset.en = "Login";
    btn.dataset.de = "Anmeldung";
    btn.textContent = currentLang === "de" ? "Anmeldung" : currentLang === "en" ? "Login" : "Prijava";
  }
  // Refresh badge whenever auth state changes
  setTimeout(() => window._refreshInboxBadge?.(), 200);
}

// ─────────────────────────────────────────────────────────────
// MODAL LOGIC
// ─────────────────────────────────────────────────────────────
const overlay   = document.getElementById("loginOverlay");
const loginForm = document.getElementById("loginForm");
const regForm   = document.getElementById("registerForm");
const loggedView= document.getElementById("loggedInView");

function clearModalInputs() {
  ["loginName","loginSurname","loginYear","loginPass",
   "regName","regSurname","regYear","regPass",
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

    // Show birth year + fetch registration date
    const metaEl = document.getElementById("loggedMeta");
    if (metaEl) {
      let metaText = "";
      if (currentUser.birthYear) metaText += (currentLang === "de" ? "Geb. " : currentLang === "en" ? "Born " : "Roj. ") + currentUser.birthYear;
      metaEl.textContent = metaText || "";
      metaEl.classList.toggle("hidden", !metaText);

      // Fetch registration date from Firestore async
      if (firebaseReady && currentUser.id) {
        getDoc(doc(db, "users", currentUser.id)).then(snap => {
          if (!snap.exists()) return;
          const d = snap.data();
          const reg = d.createdAt?.toDate?.();
          if (reg) {
            const regStr = reg.toLocaleDateString(currentLang === "de" ? "de-DE" : currentLang === "en" ? "en-GB" : "hr-HR");
            const byLabel = currentLang === "de" ? "Reg. " : currentLang === "en" ? "Joined " : "Registriran ";
            metaEl.textContent = (metaText ? metaText + " · " : "") + byLabel + regStr;
            metaEl.classList.remove("hidden");
          }
        }).catch(() => {});
      }
    }

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

// ── TOTP za admin modal (isti ključ kao nadzor-ks2025.html i totp.html) ──
const ADMIN_TOTP_SECRET = "KVKFKRCPNZQXI3DJNZSXG43JMFSG65TF";

function adminBase32Decode(s) {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  s = s.replace(/=+$/, "").toUpperCase();
  let bits = 0, val = 0, idx = 0;
  const out = new Uint8Array(Math.floor(s.length * 5 / 8));
  for (const ch of s) {
    const i = alpha.indexOf(ch);
    if (i < 0) continue;
    val = (val << 5) | i; bits += 5;
    if (bits >= 8) { out[idx++] = (val >>> (bits - 8)) & 0xff; bits -= 8; }
  }
  return out;
}

async function adminComputeTotp(secret, step) {
  const key = adminBase32Decode(secret);
  const msg = new ArrayBuffer(8);
  new DataView(msg).setUint32(4, step, false);
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]
  );
  const sig  = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, msg));
  const off  = sig[19] & 0x0f;
  const code = (((sig[off] & 0x7f) << 24) | ((sig[off+1] & 0xff) << 16) |
                ((sig[off+2] & 0xff) << 8) | (sig[off+3] & 0xff)) % 1000000;
  return String(code).padStart(6, "0");
}

async function adminVerifyTotp(input) {
  const step = Math.floor(Date.now() / 1000 / 30);
  for (const offset of [0, -1, 1]) {
    const expected = await adminComputeTotp(ADMIN_TOTP_SECRET, step + offset);
    if (input === expected) return true;
  }
  return false;
}

// TOTP digit UX — auto-advance, paste, backspace
(function initAdminTotpDigits() {
  const digits = Array.from({length:6}, (_, i) => document.getElementById("atd" + i));
  if (!digits[0]) return;

  digits.forEach((inp, idx) => {
    inp.addEventListener("input", () => {
      if (inp.value.length > 1) inp.value = inp.value.slice(-1);
      if (inp.value && idx < 5) digits[idx + 1].focus();
    });
    inp.addEventListener("keydown", e => {
      if (e.key === "Backspace" && !inp.value && idx > 0) digits[idx - 1].focus();
      if (e.key === "Enter") document.getElementById("doAdminLogin").click();
    });
    inp.addEventListener("paste", e => {
      e.preventDefault();
      const pasted = (e.clipboardData || window.clipboardData)
        .getData("text").replace(/\D/g, "").slice(0, 6);
      pasted.split("").forEach((ch, i) => { if (digits[i]) digits[i].value = ch; });
      const next = Math.min(pasted.length, 5);
      digits[next].focus();
    });
  });
})();

function getAdminTotpValue() {
  return Array.from({length:6}, (_, i) => {
    const el = document.getElementById("atd" + i);
    return el ? el.value : "";
  }).join("");
}

function flashAdminTotpError() {
  const digits = Array.from({length:6}, (_, i) => document.getElementById("atd" + i));
  digits.forEach(d => {
    if (d) { d.classList.add("atd-error"); d.value = ""; }
  });
  setTimeout(() => {
    digits.forEach(d => { if (d) d.classList.remove("atd-error"); });
    if (digits[0]) digits[0].focus();
  }, 600);
}

document.getElementById("doAdminLogin").addEventListener("click", async () => {
  const email  = document.getElementById("adminEmailInput").value.trim();
  const pass   = document.getElementById("adminPassInput").value;
  const totp   = getAdminTotpValue();
  const errEl  = document.getElementById("adminLoginError");
  errEl.classList.add("hidden");

  if (!email || !pass) {
    errEl.textContent = currentLang === "hr" ? "Upiši email i lozinku." : "Enter email and password.";
    errEl.classList.remove("hidden");
    return;
  }
  if (totp.length < 6) {
    errEl.textContent = currentLang === "hr" ? "Upiši 6-znamenkasti verifikacijski kod." : "Enter the 6-digit verification code.";
    errEl.classList.remove("hidden");
    flashAdminTotpError();
    return;
  }

  // Provjeri TOTP PRIJE Firebase poziva — ne otkrivaj je li lozinka ispravna bez koda
  const totpOk = await adminVerifyTotp(totp);
  if (!totpOk) {
    errEl.textContent = currentLang === "hr" ? "Pogrešan verifikacijski kod." : "Wrong verification code.";
    errEl.classList.remove("hidden");
    flashAdminTotpError();
    return;
  }

  try {
    await signInWithEmailAndPassword(window._fbAuth, email, pass);
    hideModal();
    window.location.href = "nadzor-ks2025.html";
  } catch(e) {
    errEl.textContent = currentLang === "hr" ? "Pogrešan email ili lozinka." : "Wrong email or password.";
    errEl.classList.remove("hidden");
  }
});

document.getElementById("adminPassInput").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("atd0").focus();
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
    errEl.textContent = currentLang === "hr" ? "Popuni sva polja." : currentLang === "de" ? "Fülle alle Felder aus." : "Fill all fields.";
    errEl.classList.remove("hidden");
    return;
  }

  const result = await loginUser(name, surname, null, pass);
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
  const year    = document.getElementById("regYear").value.trim();
  const pass    = document.getElementById("regPass").value;
  const errEl   = document.getElementById("regError");
  const gdprOk  = document.getElementById("gdprCheck")?.checked;

  if (!gdprOk) {
    errEl.textContent = currentLang === "de" ? "Bitte akzeptiere die Datenschutzerklärung." : currentLang === "en" ? "Please accept the privacy consent." : "Moraš prihvatiti privolu za obradu podataka.";
    errEl.classList.remove("hidden");
    return;
  }
  if (!name || !surname || !year || !pass) {
    errEl.textContent = currentLang === "hr" ? "Popuni sva polja." : currentLang === "de" ? "Fülle alle Felder aus." : "Fill all fields.";
    errEl.classList.remove("hidden");
    return;
  }

  const result = await registerUser(name, surname, year, pass);
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

  const voteTitle = alreadyVoted
    ? (currentLang === "de" ? "Bereits abgestimmt" : currentLang === "en" ? "Already voted" : "Već si glasao/la")
    : (currentLang === "de" ? "Abstimmen" : currentLang === "en" ? "Vote" : "Glasaj");

  div.innerHTML = `
    <div class="qw-item-inner">
      <div class="qw-item-text">${escapeHtml(data.text)}</div>
      ${replyHtml}
    </div>
    <button class="qw-vote-btn ${alreadyVoted ? "voted" : ""}" data-id="${docId}" title="${voteTitle}" aria-label="${voteTitle}">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>
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

  // Rate limit — max 10 glasova u 24h po browseru
  const VOTE_RL_KEY = "_voteRL";
  function getVoteRL() { try { return JSON.parse(localStorage.getItem(VOTE_RL_KEY) || "{}"); } catch { return {}; } }
  const vrl = getVoteRL();
  const now  = Date.now();
  if (vrl.reset && now < vrl.reset && (vrl.count || 0) >= 10) {
    const minLeft = Math.ceil((vrl.reset - now) / 60000);
    showToast(currentLang === "hr"
      ? `Dostignut dnevni limit glasanja. Pokušaj za ${minLeft} min.`
      : `Daily vote limit reached. Try in ${minLeft} min.`);
    return;
  }
  if (!vrl.reset || now >= vrl.reset) { vrl.count = 0; vrl.reset = now + 24*60*60*1000; }

  try {
    const ref = doc(db, "questions", docId);
    await updateDoc(ref, {
      votes: increment(1),
      voters: [...((await getDoc(ref)).data().voters || []), currentUser.id]
    });
    vrl.count = (vrl.count || 0) + 1;
    localStorage.setItem(VOTE_RL_KEY, JSON.stringify(vrl));
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
const QW_RATE_LIMIT = 3;        // max pitanja po satu
const QW_RATE_WINDOW = 60 * 60 * 1000; // 1 sat u ms

function getQwRateData() {
  try { return JSON.parse(localStorage.getItem("qwRate") || '{"count":0,"since":0}'); }
  catch { return { count: 0, since: 0 }; }
}
function setQwRateData(d) { localStorage.setItem("qwRate", JSON.stringify(d)); }

document.getElementById("qwSubmit").addEventListener("click", async () => {
  if (!currentUser) { showModal(); return; }
  const input = document.getElementById("qwInput");
  const text = input.value.trim();
  if (!text) return;
  if (text.length < 5) {
    showToast(currentLang === "hr" ? "Pitanje je prekratko." : "Question too short.");
    return;
  }
  if (text.length > 200) {
    showToast(currentLang === "hr" ? "Pitanje ne smije biti dulje od 200 znakova." : "Question must be under 200 characters.");
    return;
  }
  if (!firebaseReady) { showToast("Firebase nije spojen."); return; }

  // ── Rate limit: max 3 pitanja / sat ──
  const now = Date.now();
  const rd  = getQwRateData();
  if (now - rd.since > QW_RATE_WINDOW) {
    rd.count = 0; rd.since = now;
  }
  if (rd.count >= QW_RATE_LIMIT) {
    const minLeft = Math.ceil((QW_RATE_WINDOW - (now - rd.since)) / 60000);
    const msgs = {
      hr: `Dostignut limit. Pokušaj ponovo za ${minLeft} min.`,
      en: `Rate limit reached. Try again in ${minLeft} min.`,
      de: `Limit erreicht. Versuche es in ${minLeft} Min. erneut.`
    };
    showToast(msgs[currentLang] || msgs.hr);
    return;
  }

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
    rd.count++;
    setQwRateData(rd);
    input.value = "";
    // Reset char counter
    const counterEl = document.getElementById("qwCharCounter");
    if (counterEl) counterEl.textContent = "0 / 200";
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


// ─────────────────────────────────────────────────────────────
// HAMBURGER MENU
// ─────────────────────────────────────────────────────────────
(function initHamburger() {
  const btn      = document.getElementById("hamburgerBtn");
  const menu     = document.getElementById("mobileMenu");
  const backdrop = document.getElementById("mobileMenuBackdrop");
  const closeBtn = document.getElementById("mobileMenuClose");
  if (!btn || !menu) return;

  function openMenu() {
    menu.classList.add("open");
    menu.setAttribute("aria-hidden", "false");
    btn.classList.add("open");
    btn.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
  }
  function closeMenu() {
    menu.classList.remove("open");
    menu.setAttribute("aria-hidden", "true");
    btn.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
  }

  btn.addEventListener("click", () => menu.classList.contains("open") ? closeMenu() : openMenu());
  backdrop?.addEventListener("click", closeMenu);
  closeBtn?.addEventListener("click", closeMenu);
  // Close on link click
  menu.querySelectorAll("a").forEach(a => a.addEventListener("click", closeMenu));
  // Close on Escape
  document.addEventListener("keydown", e => { if (e.key === "Escape" && menu.classList.contains("open")) closeMenu(); });
})();

// ─────────────────────────────────────────────────────────────
// GDPR CHECKBOX — aktivan samo pri registraciji
// ─────────────────────────────────────────────────────────────
(function initGdprCheck() {
  const check  = document.getElementById("gdprCheck");
  const regBtn = document.getElementById("doRegister");
  if (!check || !regBtn) return;

  // Sync checkbox → button disabled state
  check.addEventListener("change", () => {
    regBtn.disabled = !check.checked;
  });

  // Reset checkbox & button whenever register form becomes visible
  const toRegisterBtn = document.getElementById("toRegister");
  toRegisterBtn?.addEventListener("click", () => {
    check.checked  = false;
    regBtn.disabled = true;
  });
})();


// ─────────────────────────────────────────────────────────────
// WEB SHARE
// ─────────────────────────────────────────────────────────────
(function initWebShare() {
  const btn = document.getElementById("shareBtn");
  if (!btn) return;

  // Hide if share API not supported (show nothing, not an error)
  if (!navigator.share) {
    btn.style.display = "none";
    return;
  }

  btn.addEventListener("click", async () => {
    const titles = { hr: "Neutralizam — Iskren Svijet", en: "Neutralism — An Honest World", de: "Neutralismus — Eine Ehrliche Welt" };
    const texts  = {
      hr: "Nova ideologija utemeljena na iskrenosti. Pročitaj besplatnu knjigu.",
      en: "A new ideology built on honesty. Read the free book.",
      de: "Eine neue Ideologie, gegründet auf Ehrlichkeit. Lies das kostenlose Buch."
    };
    try {
      await navigator.share({
        title: titles[currentLang] || titles.hr,
        text:  texts[currentLang]  || texts.hr,
        url:   window.location.href
      });
    } catch (e) {
      if (e.name !== "AbortError") showToast("Dijeljenje nije uspjelo.");
    }
  });
})();

// ─────────────────────────────────────────────────────────────
// NOTIFICATION INBOX — dva taba: Updateovi (svima) + Poruke (prijavljeni)
// ─────────────────────────────────────────────────────────────
(function initInbox() {
  const bellBtn  = document.getElementById("notifBtn");
  const badge    = document.getElementById("notifBadge");
  const panel    = document.getElementById("inboxPanel");
  const backdrop = document.getElementById("inboxBackdrop");
  const closeBtn = document.getElementById("inboxClose");
  const body     = document.getElementById("inboxBody");
  const tabUpd   = document.getElementById("inboxTabUpdates");
  const tabMsg   = document.getElementById("inboxTabMessages");
  if (!bellBtn || !panel) return;

  let activeTab = "updates"; // "updates" | "messages"

  // ── Open / Close ──────────────────────────────────────────
  function openInbox() {
    panel.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    renderTab(activeTab);
  }
  function closeInbox() {
    panel.classList.add("hidden");
    document.body.style.overflow = "";
  }

  bellBtn.addEventListener("click", openInbox);
  backdrop?.addEventListener("click", closeInbox);
  closeBtn?.addEventListener("click", closeInbox);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeInbox(); });

  // ── Tab switching ─────────────────────────────────────────
  tabUpd?.addEventListener("click", () => switchTab("updates"));
  tabMsg?.addEventListener("click", () => switchTab("messages"));

  function switchTab(tab) {
    activeTab = tab;
    tabUpd?.classList.toggle("active", tab === "updates");
    tabMsg?.classList.toggle("active", tab === "messages");
    renderTab(tab);
  }

  // ── Seen tracking ─────────────────────────────────────────
  const SEEN_KEY_UPD = "notifSeenUpd";
  function getSeenUpd()  { try { return JSON.parse(localStorage.getItem(SEEN_KEY_UPD) || "[]"); } catch { return []; } }
  function markSeenUpd(ids) {
    const existing = getSeenUpd();
    localStorage.setItem(SEEN_KEY_UPD, JSON.stringify([...new Set([...existing, ...ids])]));
  }

  function getMsgSeenKey() { return currentUser ? `notifSeenMsg_${currentUser.id}` : null; }
  function getSeenMsg() {
    const k = getMsgSeenKey(); if (!k) return [];
    try { return JSON.parse(localStorage.getItem(k) || "[]"); } catch { return []; }
  }
  function markSeenMsg(ids) {
    const k = getMsgSeenKey(); if (!k) return;
    const existing = getSeenMsg();
    localStorage.setItem(k, JSON.stringify([...new Set([...existing, ...ids])]));
  }

  // ── Badge ─────────────────────────────────────────────────
  function updateBadge(count) {
    if (!badge) return;
    if (count > 0) { badge.textContent = count > 9 ? "9+" : count; badge.classList.remove("hidden"); }
    else            { badge.classList.add("hidden"); }
  }

  window._refreshInboxBadge = async function() {
    if (!firebaseReady) return;
    let unread = 0;
    const seenUpd = getSeenUpd();
    const seenMsg = getSeenMsg();

    try {
      // Updates — visible to all
      const aSnap = await getDocs(query(collection(db, "announcements"), orderBy("timestamp", "desc"), limit(30)));
      aSnap.forEach(d => { if (!seenUpd.includes(d.id)) unread++; });

      // Messages — only if logged in
      if (currentUser) {
        const qSnap = await getDocs(query(collection(db, "questions"), where("userId", "==", currentUser.id)));
        qSnap.forEach(d => { if (d.data().adminReply && !seenMsg.includes(d.id)) unread++; });
      }
    } catch(e) { /* silent */ }

    updateBadge(unread);
  };

  // ── Render tab ────────────────────────────────────────────
  async function renderTab(tab) {
    body.innerHTML = `<div class="inbox-loading"><div class="inbox-spinner"></div></div>`;

    if (tab === "updates") await renderUpdates();
    else                   await renderMessages();
  }

  // ── UPDATEOVI (svi korisnici) ─────────────────────────────
  async function renderUpdates() {
    if (!firebaseReady) {
      body.innerHTML = `<p class="inbox-empty">Firebase nije spojen.</p>`; return;
    }
    const seenUpd = getSeenUpd();
    const newSeen = [];

    try {
      const snap = await getDocs(query(collection(db, "announcements"), orderBy("timestamp", "desc"), limit(30)));
      if (snap.empty) {
        body.innerHTML = `<p class="inbox-empty">${{ hr:"Nema updateova.", en:"No updates.", de:"Keine Updates." }[currentLang]||"Nema updateova."}</p>`;
        return;
      }

      body.innerHTML = "";
      snap.forEach(d => {
        const data   = d.data();
        const isNew  = !seenUpd.includes(d.id);
        if (isNew) newSeen.push(d.id);
        const dateStr = data.timestamp?.toDate ? data.timestamp.toDate().toLocaleDateString("hr-HR") : "";

        const el = document.createElement("div");
        el.className = `inbox-item${isNew ? " unread" : ""}`;
        el.innerHTML = `
          <div class="inbox-item-type">${{ hr:"Update", en:"Update", de:"Update" }[currentLang]||"Update"}</div>
          <div class="inbox-item-title">${escapeHtml(data.title || "")}</div>
          <div class="inbox-item-body">${escapeHtml(data.body || data.text || "")}</div>
          ${dateStr ? `<div class="inbox-item-date">${dateStr}</div>` : ""}`;
        body.appendChild(el);
      });

      markSeenUpd(newSeen);
      // Refresh badge after reading updates
      if (newSeen.length) window._refreshInboxBadge?.();
    } catch(e) {
      body.innerHTML = `<p class="inbox-empty">Greška pri učitavanju.</p>`;
    }
  }

  // ── PORUKE (samo prijavljeni) ─────────────────────────────
  async function renderMessages() {
    if (!currentUser) {
      // Not logged in — show login prompt
      const labels = {
        hr: { info: "Za pregled poruka potrebna je prijava.", btn: "Prijavi se" },
        en: { info: "Login required to view messages.", btn: "Log in" },
        de: { info: "Anmeldung erforderlich, um Nachrichten zu sehen.", btn: "Einloggen" }
      };
      const l = labels[currentLang] || labels.hr;
      body.innerHTML = `
        <div class="inbox-login-prompt">
          <p class="inbox-empty" style="padding-bottom:1rem">${l.info}</p>
          <button class="inbox-login-btn" id="inboxGoLogin">${l.btn}</button>
        </div>`;
      document.getElementById("inboxGoLogin")?.addEventListener("click", () => {
        closeInbox();
        document.getElementById("openLogin")?.click();
      });
      return;
    }

    if (!firebaseReady) {
      body.innerHTML = `<p class="inbox-empty">Firebase nije spojen.</p>`; return;
    }

    const seenMsg = getSeenMsg();
    const newSeen = [];

    try {
      const snap = await getDocs(query(collection(db, "questions"), where("userId", "==", currentUser.id)));
      const items = [];
      snap.forEach(d => {
        if (!d.data().adminReply) return;
        const isNew = !seenMsg.includes(d.id);
        if (isNew) newSeen.push(d.id);
        items.push({ id: d.id, data: d.data(), isNew });
      });

      if (!items.length) {
        body.innerHTML = `<p class="inbox-empty">${{ hr:"Nema odgovora na tvoja pitanja.", en:"No replies to your questions.", de:"Keine Antworten auf deine Fragen." }[currentLang]||"Nema odgovora."}</p>`;
        return;
      }

      // Sort: unread first
      items.sort((a, b) => (b.isNew - a.isNew));

      body.innerHTML = "";
      items.forEach(({ id, data, isNew }) => {
        const dateStr = data.timestamp?.toDate ? data.timestamp.toDate().toLocaleDateString("hr-HR") : "";
        const el = document.createElement("div");
        el.className = `inbox-item${isNew ? " unread" : ""}`;
        el.innerHTML = `
          <div class="inbox-item-type">${{ hr:"Odgovor na tvoje pitanje", en:"Reply to your question", de:"Antwort auf deine Frage" }[currentLang]||"Odgovor"}</div>
          <div class="inbox-item-title">${escapeHtml(data.text || "")}</div>
          <div class="inbox-item-body">${escapeHtml(data.adminReply || "")}</div>
          ${dateStr ? `<div class="inbox-item-date">${dateStr}</div>` : ""}`;
        body.appendChild(el);
      });

      markSeenMsg(newSeen);
      if (newSeen.length) window._refreshInboxBadge?.();
    } catch(e) {
      body.innerHTML = `<p class="inbox-empty">Greška pri učitavanju.</p>`;
    }
  }

  // Init badge after page load (user loaded by then)
  setTimeout(() => window._refreshInboxBadge?.(), 500);
})();




// ─────────────────────────────────────────────────────────────
// BACK TO TOP
// ─────────────────────────────────────────────────────────────
(function initBackToTop() {
  const btn = document.getElementById("backToTop");
  if (!btn) return;
  window.addEventListener("scroll", () => {
    btn.hidden = window.scrollY < 300;
  }, { passive: true });
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
})();

// ─────────────────────────────────────────────────────────────
// QUESTION CHAR COUNTER
// ─────────────────────────────────────────────────────────────
(function initQwCounter() {
  const ta  = document.getElementById("qwInput");
  const el  = document.getElementById("qwCharCounter");
  if (!ta || !el) return;
  const MAX = 200;
  ta.addEventListener("input", () => {
    const len = ta.value.length;
    el.textContent = `${len} / ${MAX}`;
    el.classList.toggle("qw-counter-over", len >= MAX);
  });
})();

// ─────────────────────────────────────────────────────────────
// SURVEY SUBMIT CONFIRMATION
// ─────────────────────────────────────────────────────────────
(function initSurveyConfirm() {
  const msgs = {
    hr: "Anketa se može predati samo jednom i ne može se poništiti.\nJesi li siguran/na?",
    en: "The survey can only be submitted once and cannot be undone.\nAre you sure?",
    de: "Die Umfrage kann nur einmal eingereicht werden und ist unwiderruflich.\nBist du sicher?"
  };
  ["submitPreSurvey", "submitPostSurvey"].forEach(id => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener("click", e => {
      if (!confirm(msgs[currentLang] || msgs.hr)) e.stopImmediatePropagation();
    }, true); // capture — runs before the existing listener
  });
})();

// ─────────────────────────────────────────────────────────────
// VOTE TOOLTIP (already-voted feedback)
// ─────────────────────────────────────────────────────────────
// Injected via renderQuestionItem — tooltip set as title on voted buttons.
// Also catch click attempts on voted buttons with a toast.
document.addEventListener("click", e => {
  const voteBtn = e.target.closest(".qw-vote-btn");
  if (!voteBtn) return;
  if (voteBtn.classList.contains("voted")) {
    e.stopImmediatePropagation();
    const msgs = { hr: "Već si glasao/la za ovo pitanje.", en: "You already voted for this question.", de: "Du hast bereits für diese Frage gestimmt." };
    showToast(msgs[currentLang] || msgs.hr);
  }
}, true);

// ─────────────────────────────────────────────────────────────
// SEARCH SKELETON LOADERS
// ─────────────────────────────────────────────────────────────
// Show skeletons in search list while awaiting results
const _origSearchQuestions = searchQuestions;
window._searchQuestionsPatched = true;
// Patch: show skeletons before async search runs
const qwSearchInput = document.getElementById("qwSearch");
if (qwSearchInput) {
  qwSearchInput.addEventListener("input", () => {
    const val = qwSearchInput.value.trim();
    if (!val) return;
    const searchList = document.getElementById("qwSearchList");
    const topSection = document.getElementById("qwTopSection");
    if (!searchList || !topSection) return;
    topSection.classList.add("hidden");
    searchList.classList.remove("hidden");
    // Show 2 skeleton rows immediately
    if (searchList.innerHTML === "" || searchList.querySelector(".qw-empty")) {
      searchList.innerHTML = `<div class="qw-skeleton"></div><div class="qw-skeleton"></div>`;
    }
  }, { capture: true }); // runs before the debounced searchQuestions
}

// ─────────────────────────────────────────────────────────────
// FIREBASE ERROR BOUNDARY
// ─────────────────────────────────────────────────────────────
(function initFirebaseErrorBoundary() {
  if (firebaseReady) return;
  // Firebase failed to init — show a subtle persistent banner
  const banner = document.createElement("div");
  banner.id = "firebaseErrBanner";
  banner.style.cssText = [
    "position:fixed","bottom:0","left:0","right:0","z-index:8500",
    "background:#1A1E2E","border-top:1px solid #e07070",
    "color:#e07070","font-size:0.78rem","text-align:center",
    "padding:0.5rem 1rem","pointer-events:none","font-family:system-ui"
  ].join(";");
  const msgs = {
    hr: "⚠ Baza podataka trenutno nije dostupna. Neke značajke ne rade.",
    en: "⚠ Database currently unavailable. Some features may not work.",
    de: "⚠ Datenbank derzeit nicht verfügbar. Einige Funktionen sind deaktiviert."
  };
  banner.textContent = msgs[currentLang] || msgs.hr;
  document.body.appendChild(banner);
})();

// ─────────────────────────────────────────────────────────────
// DYNAMIC HTML LANG ATTRIBUTE
// ─────────────────────────────────────────────────────────────
(function patchApplyLangForHtmlAttr() {
  const _orig = applyLang;
  applyLang = function(lang) {
    _orig(lang);
    document.documentElement.lang = lang === "de" ? "de" : lang === "en" ? "en" : "hr";
  };
  // Apply immediately for current lang
  document.documentElement.lang = currentLang === "de" ? "de" : currentLang === "en" ? "en" : "hr";
})();

// ─────────────────────────────────────────────────────────────
// SMOOTH SCROLL FOR MOBILE MENU LINKS
// ─────────────────────────────────────────────────────────────
(function initSmoothScrollMobile() {
  const mobileMenu = document.getElementById("mobileMenu");
  if (!mobileMenu) return;
  mobileMenu.querySelectorAll("a[href^='#']").forEach(a => {
    a.addEventListener("click", e => {
      const target = document.querySelector(a.getAttribute("href"));
      if (!target) return;
      e.preventDefault();
      // Close menu first, then scroll
      setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 320);
    });
  });
})();

// ─────────────────────────────────────────────────────────────
// CHECKBOX ANIMATION (already handled by CSS transition,
// but add tactile class for extra visual feedback)
// ─────────────────────────────────────────────────────────────
(function initCheckboxAnim() {
  const check = document.getElementById("gdprCheck");
  const box   = document.querySelector(".gdpr-check-box");
  if (!check || !box) return;
  check.addEventListener("change", () => {
    box.classList.add("gdpr-check-pop");
    setTimeout(() => box.classList.remove("gdpr-check-pop"), 300);
  });
})();


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