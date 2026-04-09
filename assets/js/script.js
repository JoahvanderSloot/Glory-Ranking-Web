// ========================
// GLOBAL DATA
// ========================
let fighters = [];
let weightClasses = ["Lightweight", "Welterweight", "Middleweight", "Heavyweight"];
let currentFighter = null;
let eloChart = null;
let showKOBonus = false;
let fightSelection = { f1: null, f2: null };
let editFighterId = null;

// ========================
// PAGE NAVIGATION
// ========================
function showPage(pageId) {
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    document.getElementById(pageId).classList.add("active");

    // Clear search inputs and results whenever page changes
    const searchInputs = ["searchInput", "leaderboardSearch", "editFighterSearch", "fightSearch1", "fightSearch2"];
    const resultBoxes = ["searchResults", "leaderboardResults", "editFighterResults", "fightResults1", "fightResults2"];

    searchInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    resultBoxes.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
    });

    // Also clear fight selection
    fightSelection = { f1: null, f2: null };
    const fightWinner = document.getElementById("fightWinner");
    if (fightWinner) fightWinner.innerHTML = '<option value="draw">Draw</option>';
}

// ========================
// ADMIN LOGIN
// ========================
const whitelist = ["Joah", "VDS"];
function Login() {
    const username = prompt("Enter username:");
    if (!username) return;
    if (whitelist.includes(username)) grantAccess(username);
    else alert("Access denied.");
}
function grantAccess(username) {
    document.getElementById("loginCard").style.display = "none";
    document.getElementById("adminContent").style.display = "block";
    sessionStorage.setItem("adminUser", username);
}

// ========================
// LOAD DATA
// ========================
async function loadData() {
    const local = localStorage.getItem("fightersData");

    if (local) {
        const data = JSON.parse(local);
        fighters = data.fighters || [];
        weightClasses = data.weightClasses || weightClasses;
    } else {
        try {
            const response = await fetch("assets/data/fighters.json");
            const data = await response.json();
            fighters = data.fighters || [];
            weightClasses = data.weightClasses || weightClasses;
        } catch (e) {
            console.warn("Failed to load JSON.");
        }
    }

    // Initialize KO fields if missing (for old data)
    fighters.forEach(f => {
        if (f.eloKO === undefined) f.eloKO = f.elo;
        if (f.peakEloKO === undefined) f.peakEloKO = f.peakElo;
        f.fights.forEach(ft => {
            if (ft.eloKO === undefined) ft.eloKO = ft.elo;
        });
    });

    // Load KO toggle from localStorage (optional)
    const savedKOBonus = localStorage.getItem("showKOBonus");
    if (savedKOBonus !== null) showKOBonus = savedKOBonus === "true";

    populateWeightClasses();
    renderLeaderboard();
    renderWeightClassList();
}
window.onload = () => {
    const user = sessionStorage.getItem("adminUser");
    if (user && whitelist.includes(user)) grantAccess(user);

    // Load KO bonus toggle state from localStorage
    const savedKOBonus = localStorage.getItem("showKOBonus");
    if (savedKOBonus !== null) {
        showKOBonus = savedKOBonus === "true";
        const toggleCheckbox = document.getElementById("koBonusToggle");
        if (toggleCheckbox) toggleCheckbox.checked = showKOBonus;
    }

    loadData();
}

function populateWeightClasses() {
    // Admin dropdowns
    ["newFighterWeight", "editFighterWeight"].forEach(id => {
        const sel = document.getElementById(id);
        if (sel) {
            sel.innerHTML = weightClasses.map(w => `<option value="${w}">${w}</option>`).join('');
        }
    });

    // ✅ Leaderboard dropdown
    const filter = document.getElementById("weightFilter");
    if (filter) {
        filter.innerHTML =
            `<option value="all">All</option>` +
            weightClasses.map(w => `<option value="${w}">${w}</option>`).join('');
    }
}

// ========================
// HELPER
// ========================
function getFighterById(id) { return fighters.find(f => f.id === id); }

// ========================
// LEADERBOARD
// ========================
function renderLeaderboard() {
    const container = document.getElementById("leaderboardList");
    if (!container) return;

    const selectedWeight = document.getElementById("weightFilter")?.value || "all";
    const showRetired = document.getElementById("showRetiredToggle")?.checked;

    let filtered = [...fighters];

    // 🔹 Filter by weightclass
    if (selectedWeight !== "all") {
        filtered = filtered.filter(f => f.weightClass === selectedWeight);
    }

    // 🔹 Filter retired fighters
    if (!showRetired) {
        filtered = filtered.filter(f => !f.retired);
    }

    // 🔹 Sort
    filtered.sort((a, b) =>
        (showKOBonus ? b.eloKO : b.elo) - (showKOBonus ? a.eloKO : a.elo)
    );

    // 🔹 Render
    container.innerHTML = filtered.map((f, index) => {
        const elo = Math.round(showKOBonus ? f.eloKO : f.elo);

        // ✅ Show weight ONLY in "all" mode
        const nameDisplay = selectedWeight === "all"
            ? `${f.name} - ${f.weightClass}`
            : f.name;

        // ✅ Retired indicator
        const retiredTag = f.retired
            ? `<span class="retired-badge">RET</span>`
            : "";

        return `
        <div class="fighter-row ${f.retired ? 'retired' : ''}" onclick="openFighter(${f.id})">
            <span class="rank">#${index + 1}</span>
            <span class="name">
                ${nameDisplay} ${retiredTag}
            </span>
            <span class="elo">${elo}</span>
        </div>
        `;
    }).join("");
}
function searchLeaderboard() {
    const query = document.getElementById("leaderboardSearch").value.toLowerCase();
    const results = fighters.filter(f => f.name.toLowerCase().includes(query));
    const box = document.getElementById("leaderboardResults");
    box.innerHTML = results.map(f => `<div class="fighter-row" onclick="openFighter(${f.id})">${f.name}</div>`).join("");
}
// ========================
// FIGHTER SEARCH
// ========================
function searchFighter() {
    const query = document.getElementById("searchInput").value.toLowerCase();
    const box = document.getElementById("searchResults");
    if (!query) { box.innerHTML = ""; renderLeaderboard(); return; }
    const results = fighters.filter(f => f.name.toLowerCase().includes(query));
    box.innerHTML = results.map(f => `<div class="fighter-row" onclick="openFighter(${f.id})">${f.name} (${f.weightClass})</div>`).join("");
}

// ========================
// FIGHTER PROFILE
// ========================
function openFighter(id) {
    const f = getFighterById(id);
    if (!f) return;
    currentFighter = f;
    renderFighterProfile(f);
    showPage("fighterProfile");
}
function renderFighterProfile(f) {
    document.getElementById("fighterName").innerText = f.name;
    document.getElementById("fighterStats").innerHTML = `
  ${f.image ? `<img src="${f.image}" class="fighter-img">` : ""}

<div class="stats-grid">
    <div><strong>Weight:</strong> ${f.weightClass}</div>
    <div><strong>Record:</strong> ${f.wins}-${f.losses}</div>
    <div><strong>Elo:</strong> ${showKOBonus ? f.eloKO : f.elo}</div>
    <div><strong>Peak Elo:</strong> ${showKOBonus ? f.peakEloKO : f.peakElo}</div>
    <div><strong>Biggest Gain:</strong> +${f.biggestGain}</div>
    <div><strong>Biggest Loss:</strong> ${f.biggestLoss}</div>
    <div><strong>Status:</strong> ${f.retired ? "Retired" : "Active"}</div>
</div>
  `;
    renderFightHistory(f.fights);
    renderEloChart(f.fights);
}
function renderFightHistory(fights) {
    const isMobile = window.innerWidth <= 768; // mobile breakpoint
    document.getElementById("fightHistory").innerHTML = fights.slice().reverse().map(fight => {
        const opp = getFighterById(fight.opponentId);
        const eloChange = showKOBonus ? fight.eloChangeKO : fight.eloChange;

        // Determine W/L/D
        let wlSymbol = "";
        if (fight.result === "win") wlSymbol = "W";
        else if (fight.result === "loss") wlSymbol = "L";
        else wlSymbol = "D";

        const wlColor = fight.result === "win" ? "#4caf50" :
            fight.result === "loss" ? "#ff4d4d" : "#aaa";

        if (isMobile) {
            return `<div class="fight-row">
        <span>${fight.date}</span>
        <span class="clickable" onclick="openFighter(${fight.opponentId})">
            <span style="color:${wlColor}; font-weight:bold; margin-right:15px;">${wlSymbol}</span>${opp ? opp.name : "Unknown"}
        </span>
    </div>`;
        }

        return `<div class="fight-row">
            <span>${fight.date}</span>
            <span class="clickable" onclick="openFighter(${fight.opponentId})">
                ${opp ? opp.name : "Unknown"}
            </span>
            <span class="${fight.result}">${fight.result.toUpperCase()}</span>
            <span>${fight.method}</span>
            <span>${eloChange > 0 ? "+" : ""}${eloChange}</span>
        </div>`;
    }).join("");
}
function renderEloChart(fights) {
    const ctx = document.getElementById("eloChart").getContext("2d");

    // Start labels with "Start" or initial date if you want
    const labels = ["Start", ...fights.map(f => f.date)];

    // Start Elo at 1000
    const data = [1000, ...fights.map(f => showKOBonus ? f.eloKO : f.elo)];

    if (eloChart) eloChart.destroy();

    eloChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Elo',
                data,
                borderColor: 'gold',
                backgroundColor: 'rgba(255, 215, 0, 0.15)',
                tension: 0.3,
                pointRadius: 4,
                pointHoverRadius: 6,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: { color: 'gold' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#aaa' },
                    grid: { color: '#222' }
                },
                y: {
                    ticks: { color: '#aaa' },
                    grid: { color: '#222' },
                    beginAtZero: false,
                    suggestedMin: 900,  // optional: makes chart start near 1000
                }
            }
        }
    });
}
function toggleKOBonus(val) {
    showKOBonus = val;
    localStorage.setItem("showKOBonus", val);
    renderLeaderboard();
    if (currentFighter) renderFighterProfile(currentFighter);
}

// ========================
// ADMIN: ADD FIGHTER
// ========================
async function addFighterAdmin() {
    const name = document.getElementById("newFighterName").value.trim();
    const weight = document.getElementById("newFighterWeight").value;
    const retired = document.getElementById("newFighterRetired").checked;
    const imageFile = document.getElementById("newFighterImage").files[0];

    if (!name || !weight) {
        alert("Please fill in all fields");
        return;
    }

    let image = null;
    if (imageFile) {
        image = await uploadImageToServer(imageFile);
    }

    const id = fighters.length ? Math.max(...fighters.map(f => f.id)) + 1 : 1;

    fighters.push({
        id,
        name,
        weightClass: weight,
        retired,
        image, // ✅ NEW
        elo: 1000,
        peakElo: 1000,
        eloKO: 1000,
        peakEloKO: 1000,
        biggestGain: 0,
        biggestLoss: 0,
        wins: 0,
        losses: 0,
        fights: []
    });

    saveData();
    renderLeaderboard();

    clearAddFighterFields();
    alert("Fighter added!");
}

function clearAddFighterFields() {
    document.getElementById("newFighterName").value = "";
    document.getElementById("newFighterWeight").selectedIndex = 0;
    document.getElementById("newFighterRetired").checked = false;
}

// ========================
// ADMIN: EDIT FIGHTER
// ========================
function populateEditFighter() {
    // select is removed, we use search input
    // automatically populate edit fields if fighter already selected
}
document.getElementById("editFighterSearch").addEventListener("input", () => {
    const query = document.getElementById("editFighterSearch").value.toLowerCase();
    const results = fighters.filter(f => f.name.toLowerCase().includes(query));
    document.getElementById("editFighterResults").innerHTML = results.map(f =>
        `<div class="fighter-row" onclick="selectFighterToEdit(${f.id})">${f.name} (${f.weightClass})</div>`).join('');
});
function selectFighterToEdit(id) {
    const f = getFighterById(id);
    editFighterId = id;
    document.getElementById("editFighterName").value = f.name;
    document.getElementById("editFighterWeight").value = f.weightClass;
    document.getElementById("editFighterRetired").checked = f.retired;
    document.getElementById("editFighterResults").innerHTML = "";
    document.getElementById("editFighterSearch").value = f.name;
}
async function saveEditFighter() {
    const f = getFighterById(editFighterId);
    if (!f) return alert("No fighter selected");

    const imageFile = document.getElementById("editFighterImage").files[0];

    f.name = document.getElementById("editFighterName").value;
    f.weightClass = document.getElementById("editFighterWeight").value;
    f.retired = document.getElementById("editFighterRetired").checked;

    let image = null;
    if (imageFile) {
        image = await uploadImageToServer(imageFile);
    }

    renderLeaderboard();
    saveData();
    alert("Fighter updated!");

    clearEditFighterFields();
}

function clearEditFighterFields() {
    editFighterId = null;

    document.getElementById("editFighterName").value = "";
    document.getElementById("editFighterWeight").selectedIndex = 0;
    document.getElementById("editFighterRetired").checked = false;
    document.getElementById("editFighterSearch").value = "";
}

// ========================
// ADMIN: ADD FIGHT
// ========================
function setupFightSearch(inputId, resultId) {
    document.getElementById(inputId).addEventListener("input", () => {
        const query = document.getElementById(inputId).value.toLowerCase();
        const results = fighters.filter(f => f.name.toLowerCase().includes(query));
        document.getElementById(resultId).innerHTML = results.map(f => `
    <div class="fighter-row" onclick="selectFightFighter('${inputId}', ${f.id}, decodeURIComponent('${encodeURIComponent(f.name)}'))">
        ${f.name} (${f.weightClass})
    </div>
`).join('');
    });
}
setupFightSearch("fightSearch1", "fightResults1");
setupFightSearch("fightSearch2", "fightResults2");

function selectFightFighter(inputId, id, name) {
    name = decodeURIComponent(name);
    if (inputId === "fightSearch1") {
        fightSelection.f1 = id;
        document.getElementById("fightSearch1").value = name;
        document.getElementById("fightResults1").innerHTML = "";
    } else {
        fightSelection.f2 = id;
        document.getElementById("fightSearch2").value = name;
        document.getElementById("fightResults2").innerHTML = "";
    }
    document.getElementById("fightSearch1").addEventListener("input", () => {
        if (!document.getElementById("fightSearch1").value) fightSelection.f1 = null;
    });
    document.getElementById("fightSearch2").addEventListener("input", () => {
        if (!document.getElementById("fightSearch2").value) fightSelection.f2 = null;
    });
    updateFightWinnerOptions();
}
function updateFightWinnerOptions() {
    const sel = document.getElementById("fightWinner");
    sel.innerHTML = '<option value="draw">Draw</option>';
    if (fightSelection.f1) sel.innerHTML += `<option value="${fightSelection.f1}">Winner: ${getFighterById(fightSelection.f1).name}</option>`;
    if (fightSelection.f2) sel.innerHTML += `<option value="${fightSelection.f2}">Winner: ${getFighterById(fightSelection.f2).name}</option>`;
}
function addFightAdmin() {
    const f1 = fightSelection.f1;
    const f2 = fightSelection.f2;
    const winner = document.getElementById("fightWinner").value;
    const method = document.getElementById("fightMethod").value;
    const date = document.getElementById("fightDate").value;

    if (!f1 || !f2 || !date || !method || !winner) {
        alert("Please fill in all fields");
        return;
    }

    if (f1 === f2) {
        alert("Fighters must be different");
        return;
    }

    const winnerId = winner === "draw" ? null : parseInt(winner);

    addFight(f1, f2, winnerId, method, date);

    clearAddFightFields(); // ✅ NEW
    alert("Fight added!");
}

function clearAddFightFields() {
    fightSelection = { f1: null, f2: null };

    document.getElementById("fightSearch1").value = "";
    document.getElementById("fightSearch2").value = "";

    document.getElementById("fightResults1").innerHTML = "";
    document.getElementById("fightResults2").innerHTML = "";

    document.getElementById("fightWinner").innerHTML = '<option value="draw">Draw</option>';
    document.getElementById("fightMethod").selectedIndex = 0;
    document.getElementById("fightDate").value = "";
}

// ========================
// ADMIN: WEIGHT CLASSES
// ========================
function addWeightClass() {
    const wInput = document.getElementById("newWeightClass");
    const w = wInput.value.trim();
    if (!w) return;

    weightClasses.push(w);
    saveData();
    populateWeightClasses();
    renderWeightClassList();

    // Clear the input
    wInput.value = "";
}
function removeWeightClass(i) {
    weightClasses.splice(i, 1);
    saveData();
    populateWeightClasses();
    renderWeightClassList();
}
function renderWeightClassList() {
    document.getElementById("weightClassList").innerHTML = weightClasses.map((w, i) => `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
      <span>${w}</span>
      <button class="remove-btn" onclick="removeWeightClass(${i})">✕</button>
    </div>
  `).join('');
}

// ========================
// ADMIN: UPLOAD/DOWNLOAD JSON
// ========================
function downloadJSON() {
    const blob = new Blob([JSON.stringify({ fighters, weightClasses }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "fighters.json"; a.click();
}
function uploadJSON() {
    const file = document.getElementById("uploadFile").files[0];
    if (!file) return alert("Select a file");
    const reader = new FileReader();
    reader.onload = e => {
        try {
            const data = JSON.parse(e.target.result);
            fighters = data.fighters || []; weightClasses = data.weightClasses || weightClasses;
            populateWeightClasses(); renderWeightClassList(); renderLeaderboard();
            alert("JSON loaded successfully!");
        } catch (err) { alert("Invalid JSON"); }
    };
    reader.readAsText(file);
}

function addFight(f1Id, f2Id, winnerId, method, date) {
    const f1 = getFighterById(f1Id);
    const f2 = getFighterById(f2Id);
    if (!f1 || !f2) return;

    const k = 32; // Elo factor
    const expectedF1 = 1 / (1 + Math.pow(10, (f2.elo - f1.elo) / 400));
    const expectedF2 = 1 / (1 + Math.pow(10, (f1.elo - f2.elo) / 400));

    // =======================
    // NORMAL ELO (no KO bonus)
    // =======================
    let scoreF1 = 0.5, scoreF2 = 0.5; // default draw
    if (winnerId === f1Id) scoreF1 = 1, scoreF2 = 0;
    else if (winnerId === f2Id) scoreF1 = 0, scoreF2 = 1;

    // If draw, halve the Elo change
    const isDraw = winnerId === null;
    const drawMultiplier = isDraw ? 0.5 : 1;

    const eloChangeNormalF1 = Math.round(k * drawMultiplier * (scoreF1 - expectedF1));
    const eloChangeNormalF2 = Math.round(k * drawMultiplier * (scoreF2 - expectedF2));

    f1.elo += eloChangeNormalF1;
    f2.elo += eloChangeNormalF2;
    if (f1.elo > f1.peakElo) f1.peakElo = f1.elo;
    if (f2.elo > f2.peakElo) f2.peakElo = f2.elo;

    // =======================
    // KO ELO (winner gains more, loser loses more if KO)
    // =======================
    let koMultiplier = (method === "KO") ? 1.5 : 1; // 50% more Elo change for KOs
    const eloChangeKOF1 = Math.round(eloChangeNormalF1 * koMultiplier);
    const eloChangeKOF2 = Math.round(eloChangeNormalF2 * koMultiplier);

    f1.eloKO += eloChangeKOF1;
    f2.eloKO += eloChangeKOF2;

    if (f1.eloKO > f1.peakEloKO) f1.peakEloKO = f1.eloKO;
    if (f2.eloKO > f2.peakEloKO) f2.peakEloKO = f2.eloKO;

    // =======================
    // Wins / Losses
    // =======================
    if (winnerId === f1Id) f1.wins++, f2.losses++;
    else if (winnerId === f2Id) f2.wins++, f1.losses++;

    // =======================
    // Biggest gain/loss (KO version)
    // =======================
    if (eloChangeKOF1 > f1.biggestGain) f1.biggestGain = eloChangeKOF1;
    if (eloChangeKOF2 > f2.biggestGain) f2.biggestGain = eloChangeKOF2;
    if (eloChangeKOF1 < f1.biggestLoss) f1.biggestLoss = eloChangeKOF1;
    if (eloChangeKOF2 < f2.biggestLoss) f2.biggestLoss = eloChangeKOF2;

    // Inside addFight, after calculating both Elo versions:

    // === FIGHT HISTORY ===
    f1.fights.push({
        opponentId: f2Id,
        date,
        result: scoreF1 > scoreF2 ? "win" : scoreF1 < scoreF2 ? "loss" : "draw",
        method,
        eloChange: eloChangeNormalF1,   // normal Elo change
        eloChangeKO: eloChangeKOF1,     // KO-adjusted Elo change
        elo: f1.elo,
        eloKO: f1.eloKO
    });

    f2.fights.push({
        opponentId: f1Id,
        date,
        result: scoreF2 > scoreF1 ? "win" : scoreF2 < scoreF1 ? "loss" : "draw",
        method,
        eloChange: eloChangeNormalF2,
        eloChangeKO: eloChangeKOF2,
        elo: f2.elo,
        eloKO: f2.eloKO
    });

    // =======================
    // Refresh views
    // =======================
    renderLeaderboard();
    if (currentFighter) renderFighterProfile(currentFighter);
    saveData();
}
function saveData() {
    localStorage.setItem("fightersData", JSON.stringify({
        fighters,
        weightClasses
    }));
}
async function uploadImageToServer(file) {
    // Detect if we are on a static localhost server (Live Server, file://, etc)
    const isLocalhost = location.hostname === "127.0.0.1" || location.hostname === "localhost";

    if (isLocalhost) {
        alert("⚠️ You are on localhost/static server: the image cannot be uploaded. It will not be saved.");
        return null; // fallback: no image
    }

    // Normal upload for a real PHP/XAMPP server
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("server.php", {
        method: "POST",
        body: formData
    });
    if (!res.ok) throw new Error("Upload failed");

    const data = await res.json();
    return data.url; // saved image path
}