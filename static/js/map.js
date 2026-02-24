// static/js/map.js

// --- 1. CONFIG ---
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
const REGION_NAMES = {
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

const SAHARA_REGIONS = ["MA-10", "MA-11", "MA-12"];
let globalQuestions = [];
let userProgress = {};
let regionsLayer;

// --- 2. SIDEBAR (ONLY SAHARA) ---
// --- 2. SIDEBAR (ONLY SAHARA + INFO BUTTON) ---
function initSidebar() {
  const list = document.getElementById("itinerary-list");
  list.innerHTML = "";

  // --- NEW: Educational Button ---
  const infoItem = document.createElement("div");
  infoItem.className = "region-item info-button"; // Special class
  infoItem.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; width:100%; padding: 5px 0;">
            <span style="font-weight: 700; font-size: 1.1rem;">📖 تعرف على التاريخ والخلفية</span>
        </div>
    `;
  // Open Gamma Modal on click
  infoItem.onclick = () => {
    document.getElementById("gamma-modal").style.display = "flex";
  };
  list.appendChild(infoItem);

  // --- Existing Regions Loop ---
  SAHARA_REGIONS.forEach((id) => {
    const item = document.createElement("div");
    item.id = `list-${id}`;
    item.className = "region-item";
    item.innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%;">
                <span>${REGION_NAMES[id]}</span>
                <span class="status-dot" style="width:10px; height:10px; border-radius:50%;"></span>
            </div>
            <div class="progress-container" style="width:100%; height:4px; background:#eee; margin-top:5px; border-radius:2px;">
                <div class="progress-fill" style="height:100%; width:0%; border-radius:2px; transition: width 0.5s;"></div>
            </div>
        `;

    if (SAHARA_REGIONS.includes(id)) {
      item.onclick = () => openQuizModal(id);
    } else {
      item.style.cursor = "not-allowed";
      item.style.opacity = "0.5";
    }

    list.appendChild(item);
  });
}
initSidebar();

// --- 3. LOCAL STORAGE ---
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

// --- 4. DEVELOPER MODE ---
let isDevMode = false;
document.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "D") {
    e.preventDefault();
    isDevMode = !isDevMode;
    alert(isDevMode ? "🔓 DEV MODE" : "🔒 NORMAL MODE");
    updateUI();
  }
});

// --- 5. MAP INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  if (typeof L === "undefined") return;

  // CHANGE: Reverted to show whole Morocco
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

          layer.bindTooltip(REGION_NAMES[id] || feature.properties.name);

          // Click logic: Only Sahara regions trigger the quiz
          if (SAHARA_REGIONS.includes(id)) {
            layer.on("click", () => openQuizModal(id));
          }
        },
      }).addTo(map);

      fetch("/api/questions")
        .then((res) => res.json())
        .then((qs) => {
          globalQuestions = qs;
          loadProgress();
          calculateTotals();
          updateUI();
        });
    });
});

// --- LOGIC ---
function calculateTotals() {
  REGION_IDS.forEach((rId) => {
    const count = globalQuestions.filter((q) => q.region_id === rId).length;
    userProgress[rId].total = count;
  });
  saveProgress();
}

function checkUnlock(id) {
  if (isDevMode) return true;

  // Northern regions are never unlocked for playing
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

    // NEW LOGIC: Distinguish between Sahara and North
    if (SAHARA_REGIONS.includes(id)) {
      if (isUnlocked) status = percent >= 75 ? "mastered" : "unlocked";
      if (isDevMode) status = "unlocked";
    } else {
      status = "disabled"; // Northern regions are disabled
    }

    layer.setStyle({ fillColor: getColor(status) });

    // Update Sidebar (only updates items that exist in sidebar, i.e., Sahara)
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
  if (status === "disabled") return "#455a64"; // Dark Grey for North
  return status === "mastered"
    ? "#FFCA28"
    : status === "unlocked"
      ? "#26C6DA"
      : "#90a4ae";
}
// Add to bottom of map.js

function closeGammaModal() {
  document.getElementById("gamma-modal").style.display = "none";
}
