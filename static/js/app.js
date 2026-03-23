// --- State ---
let map, geojsonLayer;
let appMode = "home";
let currentRegionId = null;
let questions = [],
  currentQuestionIndex = 0,
  score = 0;
let lang = "ar";

const REGION_NAMES = {
  "MA-10": "كلميم واد نون",
  "MA-11": "العيون الساقية الحمراء",
  "MA-12": "الداخلة وادي الذهب",
};
const SAHARA_IDS = ["MA-10", "MA-11", "MA-12"];

// --- Init ---
document.addEventListener("DOMContentLoaded", () => {
  initMap();
  loadMapData();
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
        if (id) layer.bindTooltip(REGION_NAMES[id] || f.properties.name);
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
  Object.keys(REGION_NAMES).forEach((id) => {
    const div = document.createElement("div");
    div.className = "region-item";
    div.innerText = REGION_NAMES[id];
    div.onclick = () => startQuiz(id);
    list.appendChild(div);
  });
}

// --- Quiz Logic ---
async function startQuiz(id) {
  currentRegionId = id;

  // 1. Choose file based on language
  let file = "/data/questions.json";
  if (lang === "en") {
    // Try english file, fallback to arabic if it fails
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

    // Handle both Object and Array formats
    if (Array.isArray(data)) {
      questions = data.filter((q) => q.region_id === id);
    } else {
      questions = data[id] || [];
    }

    // Shuffle
    questions.sort(() => Math.random() - 0.5);
    questions = questions.slice(0, 5);

    if (questions.length === 0) {
      alert("لا توجد أسئلة لهذه الجهة");
      return;
    }

    currentQuestionIndex = 0;
    score = 0;

    document.getElementById("quiz-title").innerText = REGION_NAMES[id];
    document.getElementById("quiz-footer").style.display = "none";
    updateProgress(0);
    renderQuestion();
    openModal("quiz");

    // Zoom Map
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

  // Text fallback: Use English if avail, else Arabic
  const txt = lang === "en" && q.question_en ? q.question_en : q.question;
  let opts = lang === "en" && q.options_en ? q.options_en : q.options;

  // Safety: if opts missing, use empty
  if (!opts) opts = [];

  // Shuffle Options
  opts.sort(() => Math.random() - 0.5);

  document.getElementById("quiz-body").innerHTML = `
        <div class="question-card"><h3>${txt}</h3>
        <div class="options">
            ${opts.map((o) => `<button class="option-btn" onclick="checkAnswer(this, '${o}', '${q.answer}', '${q.answer_en || q.answer}')">${o}</button>`).join("")}
        </div></div>
    `;

  // Reset visual classes on modal
  const modalContent = document.querySelector("#quiz-modal .modal-content");
  modalContent.classList.remove("wrong", "correct");
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
    // Highlight correct
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

// FIXED: Removed syntax error here
function updateProgress(p) {
  const bar = document.querySelector(".progress-bar-fill");
  if (bar) bar.style.width = p + "%";
}

// --- Explore ---
async function handleMapClick(id) {
  if (appMode === "explore") {
    try {
      const res = await fetch("/data/region_info.json");
      const info = await res.json();
      const d = info[id] || { name: REGION_NAMES[id], description: "Info" };
      document.getElementById("info-title").innerText = d.name;
      document.getElementById("info-body").innerHTML =
        `<p>${d.description}</p>`;
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

function toggleLang() {
  lang = lang === "ar" ? "en" : "ar";
  document.getElementById("lang-toggle").innerText = lang === "ar" ? "EN" : "ع";
  // Re-render current question if active
  if (questions.length > 0 && currentQuestionIndex < questions.length)
    renderQuestion();
}
