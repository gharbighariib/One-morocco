// static/js/map.js

// 1. Initialize Map (LOCKED: No zoom/pan)
const map = L.map('map', {
    center: [29.5, -7.5],
    zoom: 5,
    zoomControl: false,      // Remove +/- buttons
    dragging: false,         // Disable dragging
    scrollWheelZoom: false,  // Disable scroll zoom
    doubleClickZoom: false,  // Disable double click zoom
    touchZoom: false         // Disable touch zoom
});

// Background color (ocean effect)
document.getElementById('map').style.backgroundColor = '#E0F7FA';

// 2. ID TRANSLATOR
// This converts my GeoJSON IDs to the MA-01 format Python expects
// i should Find this function inside map.js and REPLACE it
function resolveId(rawId, rawName) {
    // 1. Check if it's already an MA-XX code
    if (rawId && rawId.startsWith("MA-")) return rawId;

    // 2. Map by Name (English/French/Arabic keywords found in logs)
    // We check if the name contains these keywords
    if (rawName) {
        if (rawName.includes("Tanger") || rawName.includes("طنجة")) return "MA-01";
        if (rawName.includes("Oriental") || rawName.includes("الشرق")) return "MA-02";
        if (rawName.includes("Fès-Meknès") || rawName.includes("فاس-مكناس")) return "MA-03";
        if (rawName.includes("Rabat-Salé") || rawName.includes("الرباط")) return "MA-04";
        if (rawName.includes("Béni Mellal") || rawName.includes("بني ملال")) return "MA-05";
        if (rawName.includes("Casablanca") || rawName.includes("الدار البيضاء")) return "MA-06";
        if (rawName.includes("Marrakech") || rawName.includes("مراكش")) return "MA-07";
        if (rawName.includes("Drâa-Tafilalet") || rawName.includes("درعة")) return "MA-08";
        if (rawName.includes("Souss-Massa") || rawName.includes("سوس")) return "MA-09";
        if (rawName.includes("Guelmim") || rawName.includes("كلميم")) return "MA-10";
        if (rawName.includes("Laâyoune") || rawName.includes("العيون")) return "MA-11";
        if (rawName.includes("Dakhla") || rawName.includes("الداخلة")) return "MA-12";
    }

    return null;
}

// 3. Region Names for Sidebar
const regionNames = {
    "MA-01": "طنجة تطوان الحسيمة", "MA-02": "الشرق", "MA-03": "فاس مكناس",
    "MA-04": "الرباط سلا القنيطرة", "MA-05": "بني ملال خنيفرة", "MA-06": "الدار البيضاء سطات",
    "MA-07": "مراكش آسفي", "MA-08": "درعة تافيلالت", "MA-09": "سوس ماسة",
    "MA-10": "كلميم واد نون", "MA-11": "العيون الساقية الحمراء", "MA-12": "الداخلة وادي الذهب"
};

// 4. Sidebar Initialization
function initSidebar() {
    const list = document.getElementById('itinerary-list');
    list.innerHTML = '';

    Object.keys(regionNames).forEach(id => {
        const item = document.createElement('div');
        item.id = `list-${id}`;
        item.className = 'region-item';
        item.innerHTML = `<span>${regionNames[id]}</span><span class="status-dot"></span>`;
        item.onclick = () => openQuizModal(id);
        list.appendChild(item);
    });
}
initSidebar();

// 5. Load GeoJSON
fetch('/data/regions.json')
    .then(res => res.json())
    .then(data => {
        let features = data.features || (Array.isArray(data) ? data : [data]);

        // Filter out Western Sahara
        features = features.filter(f => {
            const name = f.properties.name || f.properties.NAME || "";
            return !name.includes("Western Sahara") && !name.includes("الصحراء الغربية");
        });

        regionsLayer = L.geoJSON(features, {
            style: { fillColor: '#95a5a6', weight: 2, color: 'white', fillOpacity: 0.7 },
            onEachFeature: (feature, layer) => {
                // --- ID Detection ---
                const props = feature.properties;
                const rawId = props.id || props.ID || props.iso_3166_2_code || props.code;
                const rawName = props.name_ar || props.name || props.NAME;

                // Use our translator
                const correctId = resolveId(rawId, rawName);
                feature.properties.resolved_id = correctId; // Store it

                // Debug: See what ID was found
                console.log(`Map Region: ${rawName} | Raw ID: ${rawId} | Resolved To: ${correctId}`);

                // Bind Tooltip
                if (correctId && regionNames[correctId]) {
                    layer.bindTooltip(regionNames[correctId]);
                } else {
                    layer.bindTooltip(rawName);
                }

                // Click Event
                layer.on('click', () => {
                    if (correctId) {
                        openQuizModal(correctId);
                    } else {
                        alert("تعذر تحديد معرف المنطقة (ID غير معروف)");
                    }
                });
            }
        }).addTo(map);

        map.fitBounds(regionsLayer.getBounds());
        updateMapState();
    });

// 6. Update Colors
function updateMapState() {
    fetch('/api/progress')
        .then(res => res.json())
        .then(states => {
            regionsLayer.eachLayer(layer => {
                const id = layer.feature.properties.resolved_id; // Use our resolved ID
                const status = states[id];

                if (status) {
                    layer.setStyle({ fillColor: getColor(status) });
                }

                const listItem = document.getElementById(`list-${id}`);
                if (listItem && status) {
                   listItem.querySelector('.status-dot').style.background = getColor(status);
                }
            });
        });
}

function getColor(status) {
    return status === 'mastered' ? '#2ecc71' :
           status === 'unlocked' ? '#3498db' : '#95a5a6';
}
