// static/js/map.js

// ==========================================
// 1. LANGUAGE SYSTEM & CONFIG
// ==========================================

let currentLang = "ar";

const translations = {
  ar: {
    title: "الجهات الصحراوية",
    learn_history: "📖 تعرف على التاريخ والخلفية",
    lang_btn: "EN",
  },
  en: {
    title: "Saharan Provinces",
    learn_history: "📖 Learn History & Background",
    lang_btn: "عربي",
  },
};

function T(key) {
  return translations[currentLang][key];
}

function toggleLanguage() {
  currentLang = currentLang === "ar" ? "en" : "ar";

  // Toggle Body Class for RTL/LTR
  if (currentLang === "en") {
    document.body.classList.add("ltr");
  } else {
    document.body.classList.remove("ltr");
  }

  applyTranslations();
}

function applyTranslations() {
  const t = translations[currentLang];

  // Update Title
  document.getElementById("sidebar-title").innerText = t.title;

  // Update Language Button
  document.getElementById("lang-btn").innerText = t.lang_btn;

  // Re-render Sidebar
  initSidebar();

  // --- CRITICAL: Reload questions for the new language ---
  loadQuestions();
}

// ==========================================
// 2. DATA & STATE
// ==========================================

const REGION_IDS = [
  "MA-01",
  "MA-02",
  "MA-03",
  "MA-04",
  "MA-05",
  "MA-06",
  "MA-07",
  "MA-08",
  "MA-09",
  "MA-10",
  "MA-11",
  "MA-12",
];

const REGION_NAMES_AR = {
  "MA-01": "طنجة تطوان الحسيمة",
  "MA-02": "الشرق",
  "MA-03": "فاس مكناس",
  "MA-04": "الرباط سلا القنيطرة",
  "MA-05": "بني ملال خنيفرة",
  "MA-06": "الدار البيضاء سطات",
  "MA-07": "مراكش آسفي",
  "MA-08": "درعة تافيلالت",
  "MA-09": "سوس ماسة",
  "MA-10": "كلميم واد نون",
  "MA-11": "العيون الساقية الحمراء",
  "MA-12": "الداخلة وادي الذهب",
};

const REGION_NAMES_EN = {
  "MA-01": "Tanger-Tetouan-Al Hoceima",
  "MA-02": "Oriental",
  "MA-03": "Fès-Meknès",
  "MA-04": "Rabat-Salé-Kénitra",
  "MA-05": "Béni Mellal-Khénifra",
  "MA-06": "Casablanca-Settat",
  "MA-07": "Marrakech-Safi",
  "MA-08": "Drâa-Tafilalet",
  "MA-09": "Souss-Massa",
  "MA-10": "Guelmim-Oued Noun",
  "MA-11": "Laâyoune-Sakia El Hamra",
  "MA-12": "Dakhla-Oued Ed-Dahab",
};

const SAHARA_REGIONS = ["MA-10", "MA-11", "MA-12"];

let globalQuestions = [];
let userProgress = {};
let regionsLayer;

// ==========================================
// 3. SIDEBAR RENDERING
// ==========================================

function initSidebar() {
  const list = document.getElementById("itinerary-list");
  list.innerHTML = "";

  // --- History Button ---
  const infoItem = document.createElement("div");
  infoItem.className = "region-item info-button";
  infoItem.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; width:100%; padding: 5px 0;">
            <span style="font-weight: 700; font-size: 1.1rem;">${T("learn_history")}</span>
        </div>
    `;
  infoItem.onclick = () => {
    document.getElementById("gamma-modal").style.display = "flex";
  };
  list.appendChild(infoItem);

  // --- Region List ---
  SAHARA_REGIONS.forEach((id) => {
    const item = document.createElement("div");
    item.id = `list-${id}`;
    item.className = "region-item";

    const displayName =
      currentLang === "en" ? REGION_NAMES_EN[id] : REGION_NAMES_AR[id];

    item.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%;">
                <span>${displayName}</span>
                <span class="status-dot" style="width:10px; height:10px; border-radius:50%;"></span>
            </div>
            <div class="progress-container" style="width:100%; height:4px; background:#eee; margin-top:5px; border-radius:2px;">
                <div class="progress-fill" style="height:100%; width:0%; border-radius:2px; transition: width 0.5s;"></div>
            </div>
        `;

    item.onclick = () => openQuizModal(id);
    list.appendChild(item);
  });
}

// RUN IMMEDIATELY
initSidebar();

// ==========================================
// 4. LOCAL STORAGE
// ==========================================

function saveProgress() {
  localStorage.setItem("morocco_sahara_progress", JSON.stringify(userProgress));
}

function loadProgress() {
  const saved = localStorage.getItem("morocco_sahara_progress");
  if (saved) {
    userProgress = JSON.parse(saved);
  } else {
    userProgress = {};
    REGION_IDS.forEach((id) => {
      userProgress[id] = { mastered: 0, total: 0 };
    });
  }
}

// ==========================================
// 5. QUESTION LOADING (DYNAMIC)
// ==========================================

function loadQuestions() {
  // Determine which file to load
  const url =
    currentLang === "en" ? "/data/questions_en.json" : "/api/questions";

  console.log("Switching language to: " + currentLang);
  console.log("Fetching questions from: " + url);

  fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.json();
    })
    .then((data) => {
      // Handle both List [...] and Dictionary { "MA-01": [...] } formats
      if (Array.isArray(data)) {
        globalQuestions = data;
      } else {
        // Flatten dictionary
        globalQuestions = [];
        Object.keys(data).forEach((key) => {
          if (Array.isArray(data[key])) {
            globalQuestions.push(...data[key]);
          }
        });
      }

      console.log("Loaded " + globalQuestions.length + " questions.");

      calculateTotals();
      updateUI();
    })
    .catch((err) => {
      console.error("Failed to load questions:", err);
      alert("Error loading questions for language: " + currentLang);
    });
}

// ==========================================
// 6. DEVELOPER MODE
// ==========================================

let isDevMode = false;
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
    e.preventDefault();
    isDevMode = !isDevMode;
    alert(isDevMode ? "🔓 DEV MODE" : "🔒 NORMAL MODE");
    updateUI();
  }
});

// ==========================================
// 7. MAP INITIALIZATION
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
  if (typeof L === "undefined") {
    console.error("Leaflet not found");
    return;
  }

  const map = L.map("map", {
    center: [29.5, -7.5],
    zoom: 5,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false,
  });
  document.getElementById("map").style.backgroundColor = "#f4f4f4";

  fetch("/data/regions.json")
    .then((res) => res.json())
    .then((data) => {
      let features = data.features || (Array.isArray(data) ? data : [data]);
      features = features.filter(
        (f) => !(f.properties.name || "").includes("Western Sahara"),
      );

      regionsLayer = L.geoJSON(features, {
        style: {
          fillColor: "#95a5a6",
          weight: 2,
          color: "white",
          fillOpacity: 0.7,
        },
        onEachFeature: (feature, layer) => {
          let id = feature.properties.id || feature.properties.ID;
          if (!id) {
            const name = (feature.properties.name || "").toLowerCase();
            if (name.includes("طنجة") || name.includes("tanger")) id = "MA-01";
            else if (name.includes("شرق") || name.includes("oriental"))
              id = "MA-02";
            else if (name.includes("فاس") || name.includes("fès")) id = "MA-03";
            else if (name.includes("رباط") || name.includes("rabat"))
              id = "MA-04";
            else if (name.includes("بني ملال") || name.includes("mellal"))
              id = "MA-05";
            else if (name.includes("بيضاء") || name.includes("casablanca"))
              id = "MA-06";
            else if (name.includes("مراكش") || name.includes("marrakech"))
              id = "MA-07";
            else if (name.includes("درعة") || name.includes("drâa"))
              id = "MA-08";
            else if (name.includes("سوس") || name.includes("souss"))
              id = "MA-09";
            else if (name.includes("كلميم") || name.includes("guelmim"))
              id = "MA-10";
            else if (name.includes("عيون") || name.includes("laâyoune"))
              id = "MA-11";
            else if (name.includes("داخلة") || name.includes("dakhla"))
              id = "MA-12";
          }
          feature.properties.resolved_id = id;

          layer.bindTooltip(REGION_NAMES_AR[id] || feature.properties.name);

          if (SAHARA_REGIONS.includes(id)) {
            layer.on("click", () => openQuizModal(id));
          }
        },
      }).addTo(map);

      // --- Initial Load ---
      loadProgress();
      loadQuestions(); // Loads Arabic by default
    });
});

// ==========================================
// 8. LOGIC
// ==========================================

function calculateTotals() {
  REGION_IDS.forEach((rId) => {
    const count = globalQuestions.filter((q) => q.region_id === rId).length;
    userProgress[rId].total = count;
  });
  saveProgress();
}

function checkUnlock(id) {
  if (isDevMode) return true;
  if (!SAHARA_REGIONS.includes(id)) return false;

  const idx = SAHARA_REGIONS.indexOf(id);
  if (idx === 0) return true;

  const prevId = SAHARA_REGIONS[idx - 1];
  const prevData = userProgress[prevId];

  if (
    prevData &&
    prevData.total > 0 &&
    prevData.mastered / prevData.total >= 0.75
  ) {
    return true;
  }
  return false;
}

function updateUI() {
  if (!regionsLayer) return;

  regionsLayer.eachLayer((layer) => {
    const id = layer.feature.properties.resolved_id;
    if (!id || !userProgress[id]) return;

    const data = userProgress[id];
    const isUnlocked = checkUnlock(id);
    const percent =
      data.total > 0 ? Math.min(100, (data.mastered / data.total) * 100) : 0;

    let status = "locked";

    if (SAHARA_REGIONS.includes(id)) {
      if (isUnlocked) status = percent >= 75 ? "mastered" : "unlocked";
      if (isDevMode) status = "unlocked";
    } else {
      status = "disabled";
    }

    layer.setStyle({ fillColor: getColor(status) });

    const listItem = document.getElementById(`list-${id}`);
    if (listItem) {
      listItem.className = `region-item ${status}`;
      const bar = listItem.querySelector(".progress-fill");
      if (bar) {
        bar.style.width = `${percent}%`;
        bar.style.backgroundColor = getColor(status);
      }
    }
  });
}

function getColor(status) {
  if (status === "disabled") return "#455a64";
  return status === "mastered"
    ? "#FFCA28"
    : status === "unlocked"
      ? "#26C6DA"
      : "#90a4ae";
}
