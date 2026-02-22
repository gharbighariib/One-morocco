// static/js/map.js

// 1. Initialize Map (LOCKED)
const map = L.map('map', {
    center: [29.5, -7.5],
    zoom: 5,
    zoomControl: false,
    dragging: false,
    scrollWheelZoom: false,
    doubleClickZoom: false,
    touchZoom: false
});
document.getElementById('map').style.backgroundColor = '#E0F7FA';

// 2. Region Names & Global Vars
const regionNames = {
    "MA-01": "طنجة تطوان الحسيمة", "MA-02": "الشرق", "MA-03": "فاس مكناس",
    "MA-04": "الرباط سلا القنيطرة", "MA-05": "بني ملال خنيفرة", "MA-06": "الدار البيضاء سطات",
    "MA-07": "مراكش آسفي", "MA-08": "درعة تافيلالت", "MA-09": "سوس ماسة",
    "MA-10": "كلميم واد نون", "MA-11": "العيون الساقية الحمراء", "MA-12": "الداخلة وادي الذهب"
};

let regionsLayer; // To store map layers
let isDevModeActive = false;

// 3. Sidebar Initialization
function initSidebar() {
    const list = document.getElementById('itinerary-list');
    list.innerHTML = '';

    Object.keys(regionNames).forEach(id => {
        const item = document.createElement('div');
        item.id = `list-${id}`;
        item.className = 'region-item';

        item.innerHTML = `
            <div class="region-info" style="display:flex; justify-content:space-between; width:100%;">
                <span>${regionNames[id]}</span>
                <span class="status-dot" style="width:10px; height:10px; border-radius:50%;"></span>
            </div>
            <div class="progress-container" style="width:100%; height:4px; background:#eee; margin-top:5px; border-radius:2px;">
                <div class="progress-fill" style="height:100%; width:0%; background:#3498db; border-radius:2px; transition: width 0.5s;"></div>
            </div>
        `;

        item.onclick = () => openQuizModal(id);
        list.appendChild(item);
    });
}
initSidebar();

// 4. Developer Mode (Ctrl + Shift + D)
document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();

        if (isDevModeActive) {
            if (confirm("🔒 Exit Developer Mode?\n\nReset to normal progress?")) {
                fetch('/api/dev/reset', { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                        alert(data.message);
                        isDevModeActive = false;
                        updateMapState();
                    });
            }
        } else {
            if (confirm("🔓 Enter Developer Mode?\n\nUnlock ALL regions?")) {
                fetch('/api/dev/unlock', { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                        alert(data.message);
                        isDevModeActive = true;
                        updateMapState();
                    });
            }
        }
    }
});

// 5. Load GeoJSON & Smart ID Resolution
fetch('/data/regions.json')
    .then(res => res.json())
    .then(data => {
        let features = data.features || (Array.isArray(data) ? data : [data]);

        // Filter out Western Sahara
        features = features.filter(f => {
            const name = (f.properties.name || f.properties.NAME || "").toLowerCase();
            return !name.includes("western sahara") && !name.includes("الصحراء الغربية");
        });

        regionsLayer = L.geoJSON(features, {
            style: { fillColor: '#95a5a6', weight: 2, color: 'white', fillOpacity: 0.7 },
            onEachFeature: (feature, layer) => {
                // --- SMART ID RESOLUTION ---
                let id = feature.properties.id || feature.properties.ID || feature.properties.iso_3166_2_code;

                // If ID is missing, find it by name
                if (!id) {
                    const name = (feature.properties.name || feature.properties.name_ar || "").toLowerCase();

                    if (name.includes("طنجة") || name.includes("tanger")) id = "MA-01";
                    else if (name.includes("شرق") || name.includes("oriental")) id = "MA-02";
                    else if (name.includes("فاس") || name.includes("fès")) id = "MA-03";
                    else if (name.includes("رباط") || name.includes("rabat")) id = "MA-04";
                    else if (name.includes("بني ملال") || name.includes("mellal")) id = "MA-05";
                    else if (name.includes("بيضاء") || name.includes("casablanca")) id = "MA-06";
                    else if (name.includes("مراكش") || name.includes("marrakech")) id = "MA-07";
                    else if (name.includes("درعة") || name.includes("drâa")) id = "MA-08";
                    else if (name.includes("سوس") || name.includes("souss")) id = "MA-09";
                    else if (name.includes("كلميم") || name.includes("guelmim")) id = "MA-10";
                    else if (name.includes("عيون") || name.includes("laâyoune")) id = "MA-11";
                    else if (name.includes("داخلة") || name.includes("dakhla")) id = "MA-12";
                }

                // Save ID back to feature for later use
                feature.properties.resolved_id = id;

                // Tooltip
                layer.bindTooltip(regionNames[id] || feature.properties.name_ar);

                // Click
                layer.on('click', () => {
                    if (id) openQuizModal(id);
                    else console.warn("Unknown region clicked");
                });
            }
        }).addTo(map);

        map.fitBounds(regionsLayer.getBounds());
        updateMapState(); // Initial load
    });

// 6. Update Colors & Progress Bar
function updateMapState() {
    fetch('/api/progress')
        .then(res => res.json())
        .then(states => {
            regionsLayer.eachLayer(layer => {
                const id = layer.feature.properties.resolved_id;
                const data = states[id];

                if (data) {
                    const status = data.status;
                    const percent = data.percent;

                    // Update Map Color
                    layer.setStyle({ fillColor: getColor(status) });

                    // Update Sidebar
                    const listItem = document.getElementById(`list-${id}`);
                    if (listItem) {
                        // Update Class (for colors)
                        listItem.className = `region-item ${status}`;

                        // Update Progress Bar Width
                        const progressBar = listItem.querySelector('.progress-fill');
                        if (progressBar) {
                            progressBar.style.width = `${percent}%`;
                            // Update bar color based on status
                            progressBar.style.backgroundColor = getColor(status);
                        }
                    }
                }
            });
        });
}

function getColor(status) {
    return status === 'mastered' ? '#2ecc71' :
           status === 'unlocked' ? '#3498db' : '#95a5a6';
}
