// --- State ---
let map, geojsonLayer;
let appMode = "home";
let currentRegionId = null;
let questions = [],
  currentQuestionIndex = 0,
  score = 0;
let lang = "ar"; // Default

// --- Translations ---
const TRANSLATIONS = {
  ar: {
    subtitle: "اكتشف المغرب العميق",
    btn_quiz: "🚀 ابدأ الاختبار",
    btn_explore: "🗺️ استكشف الخريطة",
    btn_tutorial: "❔ كيفية الاستخدام",
    btn_history: "📜 التاريخ",
    explore_title: "وضع الاستكشاف",
    sidebar_title: "الجهات الصحراوية",
    tutorial_title: "كيفية الاستخدام",
    tutorial_body:
      "<p>1. اختر منطقة من القائمة.</p><p>2. أجب على الأسئلة لفتح المناطق التالية.</p>",
    back_btn: "← العودة",
    home_btn: "🏠 الرئيسية",
    lang_btn: "EN",
    region_names: {
      "MA-10": "كلميم واد نون",
      "MA-11": "العيون الساقية الحمراء",
      "MA-12": "الداخلة وادي الذهب",
    },
  },
  en: {
    subtitle: "Discover Deep Morocco",
    btn_quiz: "🚀 Start Quiz",
    btn_explore: "🗺️ Explore Map",
    btn_tutorial: "❔ How to Use",
    btn_history: "📜 History",
    explore_title: "Explore Mode",
    sidebar_title: "Saharan Provinces",
    tutorial_title: "How to Use",
    tutorial_body:
      "<p>1. Select a region from the list.</p><p>2. Answer questions to unlock the next ones.</p>",
    back_btn: "← Back",
    home_btn: "🏠 Home",
    lang_btn: "عربي",
    region_names: {
      "MA-10": "Guelmim-Oued Noun",
      "MA-11": "Laayoune-Sakia El Hamra",
      "MA-12": "Dakhla-Oued Ed-Dahab",
    },
  },
};

const SAHARA_IDS = ["MA-10", "MA-11", "MA-12"];

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadMapData();
  applyTranslations(); // Apply initial language
});

function initMap() {
  map = L.map("map", {
    center: [29.5, -7.5],
    zoom: 5,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
  });
  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  ).addTo(map);
}

async function loadMapData() {
  try {
    const res = await fetch("/data/regions.json");
    const data = await res.json();
    const features = data.features || (Array.isArray(data) ? data : [data]);

    const filtered = features.filter(
      (f) => !(f.properties.name || "").includes("Western Sahara"),
    );

    geojsonLayer = L.geoJSON(filtered, {
      style: (f) => {
        const id = resolveID(f);
        return {
          fillColor: SAHARA_IDS.includes(id) ? "#4ECDC4" : "#ccc",
          weight: 1,
          color: "white",
          fillOpacity: 0.7,
        };
      },
      onEachFeature: (f, layer) => {
        const id = resolveID(f);
        f.properties.rid = id;
        layer.on("click", () => handleMapClick(id));
      },
    }).addTo(map);
  } catch (e) {
    console.error("Map Load Error", e);
  }
}

function resolveID(f) {
  let id = f.properties.id || f.properties.ID;
  const n = (f.properties.name || "").toLowerCase();
  if (n.includes("كلميم") || n.includes("guelmim")) id = "MA-10";
  else if (n.includes("عيون") || n.includes("laayoune")) id = "MA-11";
  else if (n.includes("داخلة") || n.includes("dakhla")) id = "MA-12";
  return id;
}

// --- Language Logic ---
function toggleLang() {
  lang = lang === "ar" ? "en" : "ar";
  applyTranslations();

  // Re-render dynamic parts
  if (appMode === "quiz") populateSidebar();
  if (questions.length > 0 && currentQuestionIndex < questions.length)
    renderQuestion();
}

function applyTranslations() {
  const t = TRANSLATIONS[lang];

  // Home Screen
  document.getElementById("home-subtitle").innerText = t.subtitle;
  document.getElementById("btn-quiz").innerText = t.btn_quiz;
  document.getElementById("btn-explore").innerText = t.btn_explore;
  document.getElementById("btn-tutorial").innerText = t.btn_tutorial;
  document.getElementById("btn-history").innerText = t.btn_history;
  document.getElementById("home-lang-btn").innerText = t.lang_btn;

  // Sidebar
  document.getElementById("sidebar-title").innerText = t.sidebar_title;
  document.querySelector(".sidebar .btn-back").innerText = t.back_btn;

  // Explore Nav
  document.getElementById("explore-title").innerText = t.explore_title;
  document.querySelector("#explore-nav .btn").innerText = t.home_btn;

  // Tutorial
  document.getElementById("tutorial-title").innerText = t.tutorial_title;
  document.getElementById("tutorial-body").innerHTML = t.tutorial_body;
}

// --- Navigation ---
function goHome() {
  appMode = "home";
  document.getElementById("home-screen").classList.add("active");
  document.getElementById("quiz-sidebar").classList.remove("active");
  document.getElementById("explore-nav").classList.remove("active");
  map.setView([29.5, -7.5], 5);
  map.dragging.disable();
}

function startQuizMode() {
  appMode = "quiz";
  document.getElementById("home-screen").classList.remove("active");
  document.getElementById("explore-nav").classList.remove("active");
  document.getElementById("quiz-sidebar").classList.add("active");
  populateSidebar();
}

function startExploreMode() {
  appMode = "explore";
  document.getElementById("home-screen").classList.remove("active");
  document.getElementById("quiz-sidebar").classList.remove("active");
  document.getElementById("explore-nav").classList.add("active");
  map.dragging.enable();
  map.scrollWheelZoom.enable();
}

// --- Sidebar ---
function populateSidebar() {
  const list = document.getElementById("region-list");
  list.innerHTML = "";
  const names = TRANSLATIONS[lang].region_names;
  Object.keys(names).forEach((id) => {
    const div = document.createElement("div");
    div.className = "region-item";
    div.innerText = names[id];
    div.onclick = () => startQuiz(id);
    list.appendChild(div);
  });
}

// --- Quiz Logic ---
async function startQuiz(id) {
  currentRegionId = id;

  // 1. Choose file
  let file = "/data/questions.json";
  if (lang === "en") {
    try {
      const check = await fetch("/data/questions_en.json");
      if (check.ok) file = "/data/questions_en.json";
    } catch (e) {
      file = "/data/questions.json";
    }
  }

  try {
    const res = await fetch(file);
    const data = await res.json();

    if (Array.isArray(data)) questions = data.filter((q) => q.region_id === id);
    else questions = data[id] || [];

    questions.sort(() => Math.random() - 0.5);
    questions = questions.slice(0, 5);

    if (questions.length === 0) {
      alert(lang === "ar" ? "لا توجد أسئلة" : "No questions");
      return;
    }

    currentQuestionIndex = 0;
    score = 0;

    document.getElementById("quiz-title").innerText =
      TRANSLATIONS[lang].region_names[id];
    document.getElementById("quiz-footer").style.display = "none";
    updateProgress(0);
    renderQuestion();
    openModal("quiz");

    if (geojsonLayer)
      geojsonLayer.eachLayer((l) => {
        if (l.feature.properties.rid === id) map.fitBounds(l.getBounds());
      });
  } catch (e) {
    console.error(e);
    alert("Error loading questions.");
  }
}

function renderQuestion() {
  const q = questions[currentQuestionIndex];
  if (!q) return;

  const txt = lang === "en" && q.question_en ? q.question_en : q.question;
  let opts = lang === "en" && q.options_en ? q.options_en : q.options;
  if (!opts) opts = [];

  opts.sort(() => Math.random() - 0.5);

  document.getElementById("quiz-body").innerHTML = `
        <div class="question-card"><h3>${txt}</h3>
        <div class="options">
            ${opts.map((o) => `<button class="option-btn" onclick="checkAnswer(this, '${o}', '${q.answer}', '${q.answer_en || q.answer}')">${o}</button>`).join("")}
        </div></div>
    `;

  document
    .querySelector("#quiz-modal .modal-content")
    .classList.remove("wrong", "correct");
}

function checkAnswer(btn, sel, cor, corEn) {
  const btns = document.querySelectorAll(".option-btn");
  btns.forEach((b) => (b.disabled = true));

  const correctAns = lang === "en" ? corEn : cor;
  const isCorrect = sel === correctAns;

  const modalContent = document.querySelector("#quiz-modal .modal-content");

  if (isCorrect) {
    btn.classList.add("correct");
    score++;
    modalContent.classList.add("correct");
  } else {
    btn.classList.add("wrong");
    modalContent.classList.add("wrong");
    btns.forEach((b) => {
      if (b.innerText === correctAns) b.classList.add("correct");
    });
  }

  updateProgress(((currentQuestionIndex + 1) / questions.length) * 100);

  setTimeout(() => {
    currentQuestionIndex++;
    if (currentQuestionIndex >= questions.length) {
      const msg = lang === "ar" ? "انتهى الاختبار!" : "Finished!";
      document.getElementById("quiz-body").innerHTML =
        `<div style="text-align:center"><h3>${msg}</h3><p>Score: ${score}/${questions.length}</p></div>`;
      document.getElementById("quiz-footer").style.display = "block";
    } else {
      renderQuestion();
    }
  }, 1200);
}

function updateProgress(p) {
  const bar = document.querySelector(".progress-bar-fill");
  if (bar) bar.style.width = p + "%";
}

// --- Explore ---
// --- Explore ---
async function handleMapClick(id) {
  if (appMode === "explore") {
    try {
      const res = await fetch("/data/region_info.json");
      const info = await res.json();
      const d = info[id] || {
        name: TRANSLATIONS[lang].region_names[id],
        bullets: [],
      };

      // Select language specific fields
      const name = lang === "en" ? d.name_en : d.name_ar;
      const capital = lang === "en" ? d.capital_en : d.capital_ar;
      const bullets = lang === "en" ? d.bullets_en : d.bullets_ar;
      const keywords = lang === "en" ? d.keywords_en : d.keywords_ar;
      const capitalLabel = lang === "en" ? "Capital" : "العاصمة";
      const popLabel = lang === "en" ? "Population" : "عدد السكان";

      // Generate Bullet List HTML
      let bulletsHtml = bullets
        .map(
          (b) => `<li style="margin-bottom: 8px; line-height: 1.5;">${b}</li>`,
        )
        .join("");

      // Generate Keywords HTML
      let keywordsHtml = keywords
        .map(
          (k) =>
            `<span style="background:#eee; padding:2px 8px; border-radius:4px; margin-left:5px;">${k}</span>`,
        )
        .join("");

      document.getElementById("info-title").innerText = name;
      document.getElementById("info-body").innerHTML = `
        <div style="margin-bottom: 15px; display: flex; gap: 20px; border-bottom:1px solid #eee; padding-bottom:10px;">
            <span><strong>${capitalLabel}:</strong> ${capital}</span>
            <span><strong>${popLabel}:</strong> ${d.population}</span>
        </div>
        <ul style="list-style: disc; padding-right: 20px; margin-bottom: 20px;">
            ${bulletsHtml}
        </ul>
        <div><strong>🏷️ ${lang === "en" ? "Keywords" : "الكلمات المفتاحية"}:</strong> ${keywordsHtml}</div>
      `;
      openModal("info");
    } catch (e) {
      console.error(e);
    }
  } else if (appMode === "quiz") {
    startQuiz(id);
  }
}

// --- Modal Helpers ---
function openModal(n) {
  const m = document.getElementById(n + "-modal");
  if (m) m.classList.add("active");
}
function closeModal(n) {
  const m = document.getElementById(n + "-modal");
  if (m) m.classList.remove("active");
}
