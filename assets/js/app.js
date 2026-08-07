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
let selectedFighter1 = null;
let selectedFighter2 = null;

// ========================
// PAGE NAVIGATION
// ========================
function showPage(pageId) {
    // 1. Check if we are currently looking at a result (The "Prediction" view)
    const resultsContainer = document.getElementById("predictionResults");
    const isShowingResult = resultsContainer && resultsContainer.innerHTML.trim() !== "";

    // 2. If a result is active, force the restoration of inputs first
    if (isShowingResult) {
        window.restorePredictionInputs();
        
        // Wait a split second so the user actually sees the input fields reappear
        setTimeout(() => {
            performPageSwitch(pageId);
            syncAdminPanelVisibility(); // Sync here as well for delayed switches
        }, 100);
    } else {
        // No result active, proceed normally
        performPageSwitch(pageId);
        syncAdminPanelVisibility(); // Sync immediately for normal switches
    }
}

// 3. Move your existing logic into this helper function
function performPageSwitch(pageId) {
    const targetPage = document.getElementById(pageId);
    if (!targetPage) return;

    // Standard Page Toggle
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    targetPage.classList.add("active");

    // --- YOUR EXISTING CLEANUP ---
    const searchInputs = ["searchInput", "leaderboardSearch", "editFighterSearch", "predictionSearch1", "predictionSearch2"];
    const resultBoxes = ["searchResults", "leaderboardResults", "editFighterResults", "predictionResults1", "predictionResults2"];

    searchInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    
    resultBoxes.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = "";
    });

    // --- ADD THIS: FORCE RESET PREDICTION LABELS ---
    // This resets the text, clears the selection object, and disables the calculate button
    if (typeof window.clearPredictionSide === 'function') {
        window.clearPredictionSide(1, true);
        window.clearPredictionSide(2, true);
    }

    if (typeof window.resetPredictionEngine === 'function') {
        window.resetPredictionEngine();
    }
    
    // Clear other global selection objects
    fightSelection = { f1: null, f2: null };
    const fightWinner = document.getElementById("fightWinner");
    if (fightWinner) fightWinner.innerHTML = '<option value="draw">Draw</option>';

    if (typeof clearEditFighterFields === 'function') {
        clearEditFighterFields();
    }

    // Final Reset for Prediction Engine internal logic
    if (typeof window.resetPredictionEngine === 'function') {
        window.resetPredictionEngine();
    }
}

// ========================
// ADMIN LOGIN
// ========================
import { db, auth, githubProvider } from "./firebase.js";
import { getDoc, setDoc, doc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ========================
// ADMIN LOGIN (GitHub OAuth)
// ========================
// Whitelisted GitHub handles (stored in lowercase for exact matching)
const whitelist = ["joahvandersloot"]; 

let currentUser = null;

// Automatically sync UI whenever auth state changes
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    syncAdminPanelVisibility();
});

function syncAdminPanelVisibility() {
    const loginCard = document.getElementById("loginCard");
    const adminContent = document.getElementById("adminContent");
    const userInfo = document.getElementById("userInfo"); // Get the header element

    if (!loginCard || !adminContent) return;

    // Get the GitHub handle (original casing for display, lowercase for checking whitelist)
    const githubHandle = currentUser?.reloadUserInfo?.screenName || "";
    const isLoggedInAndWhitelisted = Boolean(currentUser && whitelist.includes(githubHandle.toLowerCase()));

    if (isLoggedInAndWhitelisted) {
        loginCard.style.display = "none";
        adminContent.style.display = "block";
        
        // Update the header text dynamically
        if (userInfo) {
            userInfo.textContent = `Logged in as @${githubHandle}`;
        }
    } else {
        loginCard.style.display = "block";
        adminContent.style.display = "none";
    }
}

async function Login() {
    try {
        const result = await signInWithPopup(auth, githubProvider);
        const githubHandle = result.user?.reloadUserInfo?.screenName?.toLowerCase() || "";

        if (!whitelist.includes(githubHandle)) {
            alert(`Access denied: @${githubHandle} is not on the admin whitelist.`);
            await signOut(auth);
        } else {
            alert(`Logged in successfully as @${githubHandle}!`);
        }
    } catch (error) {
        console.error("GitHub Login failed:", error);
        alert("Login failed: " + error.message);
    }
}

async function Logout() {
    await signOut(auth);
    syncAdminPanelVisibility();
}

window.syncAdminPanelVisibility = syncAdminPanelVisibility;
window.Login = Login;
window.Logout = Logout;

// ========================
// LOAD DATA
// ========================

async function loadData() {
    try {
        const docRef = doc(db, "data", "fighters");
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
            const data = snapshot.data();
            fighters = data.fighters || [];
            window.fighters = fighters;
            weightClasses = data.weightClasses || weightClasses;
        } else {
            console.warn("No Firebase data found, using defaults");
        }
    } catch (e) {
        console.error("Error loading:", e);
    }

    fighters.forEach(f => {
        if (f.draws === undefined) f.draws = 0;
    });

    fighters.forEach(f => {
        if (f.eloKO === undefined) f.eloKO = f.elo;
        if (f.peakEloKO === undefined) f.peakEloKO = f.peakElo;

        // ✅ ADD THIS LINE
        f.draws = f.draws || 0;

        f.fights.forEach(ft => {
            if (ft.eloKO === undefined) ft.eloKO = ft.elo;
        });
    });

    populateWeightClasses();
    renderLeaderboard();
    renderWeightClassList();
}
window.onload = () => {
    syncAdminPanelVisibility();

    // Load KO bonus toggle state from localStorage
    const savedKOBonus = localStorage.getItem("showKOBonus");
    if (savedKOBonus !== null) {
        showKOBonus = savedKOBonus === "true";
        const toggleCheckbox = document.getElementById("koBonusToggle");
        if (toggleCheckbox) toggleCheckbox.checked = showKOBonus;
    }

    loadData();
}

// ========================
// HELPER
// ========================
function getFighterById(id) { return fighters.find(f => f.id === id); }

// ========================
// LEADERBOARD
// ========================
// ========================
// LEADERBOARD
// ========================
function renderLeaderboard() {
    const container = document.getElementById("leaderboardList");
    if (!container) return;

    const selectedWeight = document.getElementById("weightFilter")?.value || "all";
    const showRetired = document.getElementById("showRetiredToggle")?.checked;
    const selectedGender = document.getElementById("genderFilter")?.value || "all";

    let filtered = [...fighters];

    // 🔹 Filter by weightclass
    if (selectedWeight !== "all") {
        filtered = filtered.filter(f => f.weightClass === selectedWeight);
    }

    // 🔹 Filter retired fighters
    if (!showRetired) {
        filtered = filtered.filter(f => !f.retired);
    }

    // 🔹 Filter gender
    if (selectedGender !== "all") {
        filtered = filtered.filter(f => f.gender === selectedGender);
    }

    // 🔹 Sort
    filtered.sort((a, b) =>
        (showKOBonus ? b.eloKO : b.elo) - (showKOBonus ? a.eloKO : a.elo)
    );

    // 🔹 Render
    container.innerHTML = filtered.map((f, index) => {
        const elo = Math.round(showKOBonus ? f.eloKO : f.elo);

        const nameDisplay = selectedWeight === "all"
            ? `${f.name} - ${f.weightClass}`
            : `${f.name}`;

        const retiredTag = f.retired
            ? `<span class="retired-badge">RET</span>`
            : "";

        let genderIcon = "";

        if (selectedGender === "all") {
            genderIcon = f.gender === "female"
                ? `<span class="gender-badge female">♀</span>`
                : `<span class="gender-badge male">♂</span>`;
        }

        // Get belt icons for leaderboard row
        const beltBadges = getFighterBeltBadgesHtml(f.id, weightClasses);

        return `
        <div class="fighter-row ${f.retired ? 'retired' : ''}" onclick="openFighter(${f.id})">
            <span class="rank">#${index + 1}</span>
            <span class="name">
                ${genderIcon} ${nameDisplay} ${beltBadges} ${retiredTag}
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
    // Inside your loop rendering leaderboard rows:
const beltBadges = getFighterBeltBadgesHtml(fighter.id, data.weightClasses);

row.innerHTML = `
  <td>${rank}</td>
  <td>
    <strong>${fighter.name}</strong> ${beltBadges}
  </td>
  <td>${fighter.elo}</td>
`;
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

function searchPrediction1() {
    const query = document.getElementById("predictionSearch1").value.toLowerCase();
    const box = document.getElementById("predictionResults1");

    const results = fighters.filter(f => 
        f.name.toLowerCase().includes(query)
    );

   box.innerHTML = results.map(f =>
    `<div class="fighter-row" onclick="selectPredictionFighter(1, ${f.id})">
        ${f.name} (${f.weightClass})
    </div>`
).join("");
}


function searchPrediction2() {
    const query = document.getElementById("predictionSearch2").value.toLowerCase();
    const box = document.getElementById("predictionResults2");

    const results = fighters.filter(f => 
        f.name.toLowerCase().includes(query)
    );

box.innerHTML = results.map(f =>
    `<div class="fighter-row" onclick="selectPredictionFighter(2, ${f.id})">
        ${f.name} (${f.weightClass})
    </div>`
).join("");
}

function selectPredictionFighter(number, id) {
    const fighter = fighters.find(f => f.id === id);

    if (!fighter) return;

    document.getElementById(`predictionSearch${number}`).value = fighter.name;
    document.getElementById(`predictionResults${number}`).innerHTML = "";
}

function closePredictionDropdown(number) {
    setTimeout(() => {
        document.getElementById(`predictionResults${number}`).innerHTML = "";
    }, 150);
}

window.closePredictionDropdown = closePredictionDropdown;
window.selectPredictionFighter = selectPredictionFighter;

// ========================
// FIGHTER PROFILE
// ========================
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
    const beltBadges = getFighterBeltBadgesHtml(f.id, weightClasses);
    const titleSummary = getTitleHistorySummary(f, weightClasses);

    const nameElem = document.getElementById("fighterName");
    if (nameElem) {
        nameElem.innerHTML = `${f.name} ${beltBadges}`;
    }

    const statsElem = document.getElementById("fighterStats");
    if (statsElem) {
        statsElem.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
            <!-- Top stats spread across 1 line, but wrap cleanly if screen becomes too narrow -->
            <div style="display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; width: 100%; gap: 8px 16px;">
                <div><strong>Weight:</strong> ${f.weightClass}</div>
                <div><strong>Gender:</strong> ${f.gender === "female" ? "Female" : "Male"}</div>
                <div><strong>Record:</strong> ${f.draws > 0
                        ? `${f.wins}-${f.losses}-${f.draws}`
                        : `${f.wins}-${f.losses}`
                    }</div>
                <div><strong>Elo:</strong> ${showKOBonus ? f.eloKO : f.elo}</div>
                <div><strong>Peak Elo:</strong> ${showKOBonus ? f.peakEloKO : f.peakElo}</div>
                <div><strong>Status:</strong> ${f.retired ? "Retired" : "Active"}</div>
            </div>
            
            <!-- Title History always stays below all main stats -->
            <div style="width: 100%;">
                <strong>Title History:</strong> ${titleSummary}
            </div>
        </div>
        `;
    }

    renderFightHistory(f.fights);
    renderEloChart(f.fights);
}

function renderFightHistory(fights) {
    const historyContainer = document.getElementById("fightHistory");
    if (!historyContainer) return;

    const fighterId = currentFighter ? currentFighter.id : null;

    historyContainer.innerHTML = fights.slice().reverse().map(fight => {
        const opp = getFighterById(fight.opponentId);
        const eloChange = showKOBonus ? fight.eloChangeKO : fight.eloChange;

        let wlSymbol = "";
        if (fight.result === "win") wlSymbol = "W";
        else if (fight.result === "loss") wlSymbol = "L";
        else wlSymbol = "D";

        const wlColor = fight.result === "win" ? "#4caf50" :
            fight.result === "loss" ? "#ff4d4d" : "#aaa";

        // PASS `fights` HERE as the 4th parameter
        const titleBoutIcon = getFightTitleIconHtml(fight, fighterId, weightClasses, fights);

        return `<div class="fight-row">
            <span>${fight.date}</span>
            <span class="clickable" onclick="openFighter(${fight.opponentId})">
                ${opp ? opp.name : "Unknown"}
            </span>
            <span class="${fight.result}">
                ${titleBoutIcon}${fight.result.toUpperCase()}
            </span>
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
    const gender = document.getElementById("newFighterGender").value || "male";

    const exists = fighters.some(
        f => f.name.toLowerCase() === name.toLowerCase()
    );

    if (exists) {
        alert("Fighter already exists!");
        return;
    }
    const id = fighters.length ? Math.max(...fighters.map(f => f.id)) + 1 : 1;

    fighters.push({
        id,
        name,
        gender,
        weightClass: weight,
        retired,
        elo: 1000,
        peakElo: 1000,
        eloKO: 1000,
        peakEloKO: 1000,
        biggestGain: 0,
        biggestLoss: 0,
        wins: 0,
        losses: 0,
        draws: 0,
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

window.addEventListener("DOMContentLoaded", () => {
    const editInput = document.getElementById("editFighterSearch");
    if (editInput) {
        editInput.addEventListener("input", () => {
            const query = editInput.value.toLowerCase();
            const results = fighters.filter(f => f.name.toLowerCase().includes(query));
            document.getElementById("editFighterResults").innerHTML = results.map(f =>
                `<div class="fighter-row" onclick="selectFighterToEdit(${f.id})">${f.name} (${f.weightClass})</div>`).join('');
        });
    }
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


    f.name = document.getElementById("editFighterName").value;
    f.weightClass = document.getElementById("editFighterWeight").value;
    f.retired = document.getElementById("editFighterRetired").checked;

    saveData();
    renderLeaderboard();
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

function updateFightWinnerOptions() {
    const sel = document.getElementById("fightWinner");
    sel.innerHTML = '<option value="draw">Draw</option>';
    if (fightSelection.f1) sel.innerHTML += `<option value="${fightSelection.f1}">Winner: ${getFighterById(fightSelection.f1).name}</option>`;
    if (fightSelection.f2) sel.innerHTML += `<option value="${fightSelection.f2}">Winner: ${getFighterById(fightSelection.f2).name}</option>`;
}
function addFightAdmin() {
    const date = document.getElementById("fightDate").value;
    const winnerValue = document.getElementById("fightWinner").value;
    const method = document.getElementById("fightMethod").value;
    const titleType = document.getElementById("fightTitleType")?.value || "none";

    if (!selectedFighter1 || !selectedFighter2) {
        alert("Please select both fighters.");
        return;
    }

    if (!date) {
        alert("Please select a date.");
        return;
    }

    const f1 = selectedFighter1;
    const f2 = selectedFighter2;

    let result1 = "draw";
    let result2 = "draw";
    let winnerId = null;
    let loserId = null;

    if (winnerValue === "f1") {
        result1 = "win";
        result2 = "loss";
        winnerId = f1.id;
        loserId = f2.id;
    } else if (winnerValue === "f2") {
        result1 = "loss";
        result2 = "win";
        winnerId = f2.id;
        loserId = f1.id;
    }

    // 1. Calculate Elo Updates
    const eloChange = calculateEloChange(f1.elo, f2.elo, result1, method);
    const eloKOChange = calculateEloChange(f1.eloKO, f2.eloKO, result1, method, true);

    f1.elo += eloChange;
    f2.elo -= eloChange;
    f1.eloKO += eloKOChange;
    f2.eloKO -= eloKOChange;

    if (f1.elo > f1.peakElo) f1.peakElo = f1.elo;
    if (f2.elo > f2.peakElo) f2.peakElo = f2.elo;
    if (f1.eloKO > f1.peakEloKO) f1.peakEloKO = f1.eloKO;
    if (f2.eloKO > f2.peakEloKO) f2.peakEloKO = f2.eloKO;

    // 2. Build fight object for fighters
    const fightForF1 = {
        date: date,
        opponentId: f2.id,
        result: result1,
        method: method,
        eloChange: eloChange,
        eloChangeKO: eloKOChange
    };

    const fightForF2 = {
        date: date,
        opponentId: f1.id,
        result: result2,
        method: method,
        eloChange: -eloChange,
        eloChangeKO: -eloKOChange
    };

    // Attach title type if not 'none'
    if (titleType !== "none") {
        const resolvedType = titleType === "interim" ? "interim" : "undisputed";
        fightForF1.type = resolvedType;
        fightForF2.type = resolvedType;
        fightForF1.isTitle = true;
        fightForF2.isTitle = true;
    }

    // Update fighter records
    f1.fights.push(fightForF1);
    f2.fights.push(fightForF2);

    if (result1 === "win") { f1.wins++; f2.losses++; }
    else if (result1 === "loss") { f1.losses++; f2.wins++; }
    else { f1.draws++; f2.draws++; }

    // 3. Update Weight Classes Championship Data
    if (titleType !== "none") {
        updateTitleDataOnFight(f1, f2, winnerId, loserId, date, titleType);
    }

    alert("Fight added successfully!");
    
    // Reset selection & forms
    selectedFighter1 = null;
    selectedFighter2 = null;
    document.getElementById("fightSearch1").value = "";
    document.getElementById("fightSearch2").value = "";
    document.getElementById("fightTitleType").value = "none";
    renderLeaderboard();
}

function updateTitleDataOnFight(f1, f2, winnerId, loserId, date, titleType) {
    // Determine target weight class object
    const targetWcName = f1.weightClass || f2.weightClass;
    const wcObj = weightClasses.find(w => typeof w === "object" && w.name === targetWcName);

    if (!wcObj) return;

    wcObj.titleBouts = wcObj.titleBouts || wcObj.titleFights || [];
    wcObj.reigns = wcObj.reigns || [];

    const beltType = titleType === "interim" ? "interim" : "undisputed";

    // A. Log Title Bout
    wcObj.titleBouts.push({
        date: date,
        type: beltType,
        challengerId: loserId,
        winnerId: winnerId,
        championId: wcObj.currentChampId || null
    });

    if (!winnerId) return; // Draw - no belt change

    // B. Handle Belt Handover & Reign Logic
    if (beltType === "undisputed") {
        // Successful defense by current champ
        if (wcObj.currentChampId === winnerId) {
            const currentReign = wcObj.reigns.find(r => r.fighterId === winnerId && r.endDate === null && r.type === "undisputed");
            if (currentReign) {
                currentReign.defenses = (currentReign.defenses || 0) + 1;
            }
        } else {
            // End old champion reign if dethroned or filled vacant title
            if (wcObj.currentChampId) {
                const oldReign = wcObj.reigns.find(r => r.fighterId === wcObj.currentChampId && r.endDate === null && r.type === "undisputed");
                if (oldReign) oldReign.endDate = date;
            }

            // Set new champion
            wcObj.currentChampId = winnerId;
            wcObj.reigns.push({
                fighterId: winnerId,
                type: "undisputed",
                startDate: date,
                endDate: null,
                defenses: 0
            });
        }
    } else if (beltType === "interim") {
        // Successful defense of interim title
        if (wcObj.currentInterimChampId === winnerId) {
            const currentReign = wcObj.reigns.find(r => r.fighterId === winnerId && r.endDate === null && r.type === "interim");
            if (currentReign) {
                currentReign.defenses = (currentReign.defenses || 0) + 1;
            }
        } else {
            // New Interim Champ
            if (wcObj.currentInterimChampId) {
                const oldReign = wcObj.reigns.find(r => r.fighterId === wcObj.currentInterimChampId && r.endDate === null && r.type === "interim");
                if (oldReign) oldReign.endDate = date;
            }

            wcObj.currentInterimChampId = winnerId;
            wcObj.reigns.push({
                fighterId: winnerId,
                type: "interim",
                startDate: date,
                endDate: null,
                defenses: 0
            });
        }
    }
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
// ========================
// ADMIN: WEIGHT CLASSES
// ========================
let activeEditingIndex = null;

function renderWeightClassList() {
    const container = document.getElementById("weightClassList");
    if (!container) return;

    container.innerHTML = weightClasses.map((w, i) => {
        const name = typeof w === "string" ? w : w.name;
        const isDisabled = Boolean(w.disabled);
        const isEditing = activeEditingIndex === i;

        if (isEditing) {
            return `
            <div class="weight-class-edit-box" style="background: rgba(255,255,255,0.05); padding: 10px; border-radius: 6px; margin-bottom: 8px;">
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                    <input type="text" id="editWcName_${i}" value="${name}" style="flex: 1; padding: 6px;">
                    <button onclick="saveWeightClassEdit(${i})" style="padding: 6px 12px; background: #2ecc71; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Save</button>
                    <button onclick="cancelWeightClassEdit()" style="padding: 6px 12px; background: #7f8c8d; color: #fff; border: none; border-radius: 4px; cursor: pointer;">Cancel</button>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.9em;">
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                        <input type="checkbox" ${isDisabled ? "checked" : ""} onchange="toggleWeightClassDisabled(${i}, this.checked)">
                        Disable (Hide from website for session)
                    </label>
                    <button 
                        onclick="removeWeightClass(${i})" 
                        disabled="${!isDisabled}"
                        style="padding: 4px 8px; background: ${isDisabled ? '#e74c3c' : '#555'}; color: #fff; border: none; border-radius: 4px; cursor: ${isDisabled ? 'pointer' : 'not-allowed'}; opacity: ${isDisabled ? '1' : '0.5'};"
                        title="${isDisabled ? 'Delete Weight Class' : 'Must be disabled first to delete'}"
                    >
                        Delete
                    </button>
                </div>
            </div>`;
        }

        return `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; padding: 6px 8px; background: rgba(0,0,0,0.2); border-radius: 4px;">
            <span style="${isDisabled ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${name} ${isDisabled ? '(Disabled)' : ''}</span>
            <button class="edit-btn" onclick="editWeightClass(${i})" style="background: none; border: none; cursor: pointer; font-size: 1.1em;" title="Edit Weight Class">✏️</button>
        </div>`;
    }).join('');
}

function editWeightClass(index) {
    activeEditingIndex = index;
    renderWeightClassList();
}

function cancelWeightClassEdit() {
    activeEditingIndex = null;
    renderWeightClassList();
}

function saveWeightClassEdit(index) {
    const input = document.getElementById(`editWcName_${index}`);
    if (!input) return;

    const newName = input.value.trim();
    if (!newName) return alert("Weight class name cannot be empty.");

    const oldName = typeof weightClasses[index] === "string" ? weightClasses[index] : weightClasses[index].name;

    // Update weightClass entry while preserving object structure if present
    if (typeof weightClasses[index] === "string") {
        weightClasses[index] = newName;
    } else {
        weightClasses[index].name = newName;
    }

    // Optionally update fighters assigned to this weight class
    if (oldName !== newName) {
        fighters.forEach(f => {
            if (f.weightClass === oldName) f.weightClass = newName;
        });
    }

    activeEditingIndex = null;
    saveData();
    populateWeightClasses();
    renderWeightClassList();
}

function toggleWeightClassDisabled(index, disabled) {
    if (typeof weightClasses[index] === "string") {
        weightClasses[index] = { name: weightClasses[index], disabled: disabled };
    } else {
        weightClasses[index].disabled = disabled;
    }
    
    // Refresh website dropdowns so disabled items hide during this session
    populateWeightClasses();
    renderWeightClassList();
}

function removeWeightClass(i) {
    const wc = weightClasses[i];
    const isDisabled = Boolean(wc && wc.disabled);

    if (!isDisabled) {
        alert("You must disable this weight class before you can delete it.");
        return;
    }

    const confirmed = confirm("Are you sure you want to delete this? Cause it will delete all weightclass title history aswell.");
    if (!confirmed) return;

    weightClasses.splice(i, 1);
    activeEditingIndex = null;
    saveData();
    populateWeightClasses();
    renderWeightClassList();
}

// Updated to filter out disabled weight classes from session dropdowns
function populateWeightClasses() {
    const activeWeightClasses = weightClasses.filter(w => !w.disabled);

    ["newFighterWeight", "editFighterWeight"].forEach(id => {
        const sel = document.getElementById(id);
        if (sel) {
            sel.innerHTML = activeWeightClasses.map(w => {
                const name = typeof w === "string" ? w : w.name;
                return `<option value="${name}">${name}</option>`;
            }).join('');
        }
    });

    const filter = document.getElementById("weightFilter");
    if (filter) {
        filter.innerHTML =
            `<option value="all">All</option>` +
            activeWeightClasses.map(w => {
                const name = typeof w === "string" ? w : w.name;
                return `<option value="${name}">${name}</option>`;
            }).join('');
    }
}

// Ensure new functions are exposed globally
window.editWeightClass = editWeightClass;
window.cancelWeightClassEdit = cancelWeightClassEdit;
window.saveWeightClassEdit = saveWeightClassEdit;
window.toggleWeightClassDisabled = toggleWeightClassDisabled;

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
            fighters.forEach(f => {
                f.draws = f.draws || 0;
            });
            populateWeightClasses(); renderWeightClassList(); renderLeaderboard(); saveData();
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
    if (winnerId === f1Id) {
        f1.wins++;
        f2.losses++;
    }
    else if (winnerId === f2Id) {
        f2.wins++;
        f1.losses++;
    }
    else {
        f1.draws = (f1.draws || 0) + 1;
        f2.draws = (f2.draws || 0) + 1;
    }

    // If draw, halve the Elo change
    const isDraw = winnerId === null;
    const drawMultiplier = isDraw ? 0.5 : 1;

    let scoreF1, scoreF2;

    if (winnerId === f1Id) {
        scoreF1 = 1;
        scoreF2 = 0;
    } else if (winnerId === f2Id) {
        scoreF1 = 0;
        scoreF2 = 1;
    } else {
        // draw
        scoreF1 = 0.5;
        scoreF2 = 0.5;
    }

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
async function saveData() {
    try {
        await setDoc(doc(db, "data", "fighters"), {
            fighters,
            weightClasses
        });
        console.log("Data saved to Firebase");
    } catch (e) {
        console.error("Error saving:", e);
    }
}

window.showPage = showPage;
window.searchFighter = searchFighter;
window.addEventListener("pageshow", () => {
    syncAdminPanelVisibility();
});

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
        syncAdminPanelVisibility();
    }
});
window.openFighter = openFighter;
window.addFighterAdmin = addFighterAdmin;
window.addFightAdmin = addFightAdmin;
window.saveEditFighter = saveEditFighter;
window.Login = Login;
window.removeWeightClass = removeWeightClass;
window.addWeightClass = addWeightClass;
window.renderLeaderboard = renderLeaderboard;
window.toggleKOBonus = toggleKOBonus;
window.downloadJSON = downloadJSON;
window.uploadJSON = uploadJSON;
window.selectFightFighter = selectFightFighter;
window.selectFighterToEdit = selectFighterToEdit;
window.searchPrediction1 = searchPrediction1;
window.searchPrediction2 = searchPrediction2;
window.fighters = fighters;

// ==========================================================
// AUTO-CLOSE SEARCH DROPDOWNS
// ==========================================================

// 1. Close dropdowns when clicking anywhere outside of them
window.addEventListener('click', function(e) {
    // List of all your search input IDs
    const searchInputs = ['fightSearch1', 'fightSearch2', 'editFighterSearch', 'searchInput', 'leaderboardSearch'];
    
    // If the user did not click on a search input field, clear out all result boxes
    if (!searchInputs.some(id => e.target.id === id)) {
        document.querySelectorAll('.search-results').forEach(box => {
            box.innerHTML = '';
        });
    }
});

// 2. Clear dropdown when a fighter is selected
// Wrap your existing selectFighter function (or whichever function handles the click event on a result row) 
// to ensure it clears out the HTML of the results panel immediately upon selection.
const originalSelectFighter = window.selectFighter;
if (typeof originalSelectFighter === 'function') {
    window.selectFighter = function(...args) {
        // Execute your original logic to set the fighter data
        originalSelectFighter(...args);
        
        // Immediately clear out all dropdown containers so they vanish
        document.querySelectorAll('.search-results').forEach(box => {
            box.innerHTML = '';
        });
    };
}

function getFighterBeltIcons(fighterId, weightClassesData) {
  const badges = [];

  weightClassesData.forEach(wc => {
    // 1. Check active undisputed title
    if (wc.currentChampId === fighterId) {
      badges.push({ type: 'gold', label: `${wc.name} Champion` });
    }
    // 2. Check active interim title
    if (wc.currentInterimChampId === fighterId) {
      badges.push({ type: 'silver', label: `Interim ${wc.name} Champion` });
    }

    // 3. Check historical reigns (former champs)
    const formerReigns = wc.reigns.filter(r => r.fighterId === fighterId && r.endDate !== null);
    
    formerReigns.forEach(reign => {
      // If they currently hold this exact active belt, don't duplicate as "former"
      const isActiveNow = (reign.type === 'undisputed' && wc.currentChampId === fighterId) ||
                          (reign.type === 'interim' && wc.currentInterimChampId === fighterId);
                          
      if (!isActiveNow) {
        if (reign.type === 'undisputed') {
          badges.push({ type: 'translucent-gold', label: `Former ${wc.name} Champion` });
        } else {
          badges.push({ type: 'translucent-silver', label: `Former Interim ${wc.name} Champion` });
        }
      }
    });
  });

  return badges; // Array of icon types to render (e.g. ['gold', 'translucent-gold'])
}

// ==========================================
// CHAMPIONSHIP BELT ICONS CONFIGURATION
// ==========================================
// ==========================================
// CHAMPIONSHIP BELT ICONS CONFIGURATION
// ==========================================
const BELT_ICONS = {
  undisputed: "assets/images/UndisputerFichterIcon.png",
  previousUndisputed: "assets/images/PreviousUndisputerFichterIcon.png",
  interim: "assets/images/InterimFighterIcon.png",
  previousInterim: "assets/images/PreviousInterimFighterIcon.png",
  undisputedBout: "assets/images/UndisputedBout.png",
  interimBout: "assets/images/InterimBout.png"
};

/**
 * Checks if a fight is a title bout.
 * Checks direct properties (isTitleFight, isTitle, isTitleBout) 
 * OR cross-references weightClasses.titleBouts by date & fighter ID.
 */
function getFightTitleIconHtml(fight, fighterId = null, weightClassesData = [], allFights = []) {
  if (!fight) return "";

  // 1. TOURNAMENT FILTER: If multiple fights occurred on the same date,
  // only show the title icon for the last fight of that date (the tournament final).
  if (allFights && allFights.length > 0) {
    const sameDayFights = allFights.filter(
      (f) => String(f.date).trim() === String(fight.date).trim()
    );

    if (sameDayFights.length > 1) {
      // The last fight of the date in chronological order is the tournament final
      const finalFightOfDay = sameDayFights[sameDayFights.length - 1];

      const isFinalFight = (fight === finalFightOfDay) || 
                           (String(fight.opponentId) === String(finalFightOfDay.opponentId));

      // Suppress title icon for earlier tournament rounds
      if (!isFinalFight) {
        return "";
      }
    }
  }

  // 2. Direct check on fight object
  let isTitle = Boolean(
    fight.isTitleFight || 
    fight.isTitle || 
    fight.isTitleBout || 
    fight.titleFight?.isTitle
  );
  let type = fight.type || fight.titleType || fight.titleFight?.type || "";

  // 3. Cross-reference with weightClasses titleBouts
  if (!isTitle && weightClassesData.length > 0) {
    const fId = fighterId ? String(fighterId) : null;
    const oppId = fight.opponentId ? String(fight.opponentId) : null;
    const fightDate = String(fight.date).trim();

    for (const wc of weightClassesData) {
      if (typeof wc === "string") continue;
      const bouts = wc.titleBouts || wc.titleFights || [];

      const match = bouts.find((b) => {
        if (String(b.date).trim() !== fightDate) return false;

        const participants = [b.championId, b.challengerId, b.winnerId]
          .filter((id) => id !== null && id !== undefined)
          .map(String);

        const matchesFighter = fId && participants.includes(fId);
        const matchesOpponent = oppId && participants.includes(oppId);

        return matchesFighter || matchesOpponent;
      });

      if (match) {
        isTitle = true;
        type = match.type || "undisputed";
        break;
      }
    }
  }

  if (!isTitle) return "";

  const isInterim = type === "interim";
  const iconSrc = isInterim ? BELT_ICONS.interimBout : BELT_ICONS.undisputedBout;
  const titleText = isInterim ? "Interim Title Fight" : "Undisputed Title Fight";

  return `<img src="${iconSrc}" class="bout-title-icon" title="${titleText}" alt="Title Bout">`;
}

/**
 * Renders title summary profile statistics from weightClasses reigns and bouts.
 */
function getTitleHistorySummary(fighter, weightClassesData = []) {
  if (!fighter) return "None";

  const fid = String(fighter.id);
  let summaryParts = [];

  // 1. Summarize Reigns & Defenses from weightClasses data
  weightClassesData.forEach((wc) => {
    if (typeof wc === "string") return;

    const fighterReigns = (wc.reigns || []).filter((r) => String(r.fighterId) === fid);

    ["undisputed", "interim"].forEach((type) => {
      const typeReigns = fighterReigns.filter((r) => r.type === type);
      if (typeReigns.length === 0) return;

      const reignCount = typeReigns.length;
      const totalDefenses = typeReigns.reduce((sum, r) => sum + (r.defenses || 0), 0);

      const isCurrentChamp =
        (type === "undisputed" && String(wc.currentChampId) === fid) ||
        (type === "interim" && String(wc.currentInterimChampId) === fid);

      const baseTitleName = type === "interim" ? `Interim ${wc.name}` : wc.name;

      let champTitle = "";
      if (isCurrentChamp) {
        champTitle = reignCount > 1 
          ? `${reignCount}-time ${baseTitleName} Champion` 
          : `${baseTitleName} Champion`;
      } else {
        champTitle = reignCount > 1 
          ? `Former ${reignCount}-time ${baseTitleName} Champion` 
          : `Former ${baseTitleName} Champion`;
      }

      const defensesText = totalDefenses > 0 
        ? ` (${totalDefenses} ${totalDefenses === 1 ? "defense" : "defenses"})` 
        : "";

      summaryParts.push(`${champTitle}${defensesText}`);
    });
  });

  // 2. Count Title Contender losses
  let contenderLosses = 0;

  (fighter.fights || []).forEach((f) => {
    let isTitle = Boolean(f.isTitleFight || f.isTitle || f.isTitleBout);
    let wasDefendingChamp = false;

    weightClassesData.forEach((wc) => {
      if (typeof wc === "string") return;
      const bouts = wc.titleBouts || wc.titleFights || [];

      const match = bouts.find((b) => {
        if (String(b.date).trim() !== String(f.date).trim()) return false;
        const participants = [b.championId, b.challengerId, b.winnerId]
          .filter((id) => id !== null && id !== undefined)
          .map(String);

        return participants.includes(fid);
      });

      if (match) {
        isTitle = true;
        if (match.championId && String(match.championId) === fid) {
          wasDefendingChamp = true;
        }
      }
    });

    if (isTitle && f.result === "loss" && !wasDefendingChamp) {
      contenderLosses++;
    }
  });

  if (contenderLosses > 0) {
    summaryParts.push(`${contenderLosses}x Title Contender`);
  }

  return summaryParts.length > 0 ? summaryParts.join(", ") : "None";
}

function getFighterBeltBadgesHtml(fighterId, weightClassesData = []) {
  if (!fighterId) return "";
  const icons = [];
  const fid = String(fighterId);

  weightClassesData.forEach((wc) => {
    if (typeof wc === "string") return;

    // 1. Active Undisputed Champion
    if (wc.currentChampId && String(wc.currentChampId) === fid) {
      icons.push(
        `<img src="${BELT_ICONS.undisputed}" class="belt-icon" title="${wc.name} Champion" alt="Gold Belt">`
      );
    }

    // 2. Active Interim Champion
    if (wc.currentInterimChampId && String(wc.currentInterimChampId) === fid) {
      icons.push(
        `<img src="${BELT_ICONS.interim}" class="belt-icon" title="Interim ${wc.name} Champion" alt="Silver Belt">`
      );
    }

    // 3. Historical Reigns (Former Champs)
    const formerReigns = (wc.reigns || []).filter(
      (r) => String(r.fighterId) === fid && r.endDate !== null
    );

    formerReigns.forEach((reign) => {
      const isActiveNow =
        (reign.type === "undisputed" && String(wc.currentChampId) === fid) ||
        (reign.type === "interim" && String(wc.currentInterimChampId) === fid);

      if (!isActiveNow) {
        if (reign.type === "undisputed") {
          icons.push(
            `<img src="${BELT_ICONS.previousUndisputed}" class="belt-icon translucent" title="Former ${wc.name} Champion" alt="Translucent Gold Belt">`
          );
        } else {
          icons.push(
            `<img src="${BELT_ICONS.previousInterim}" class="belt-icon translucent" title="Former Interim ${wc.name} Champion" alt="Translucent Silver Belt">`
          );
        }
      }
    });
  });

  if (icons.length === 0) return "";
  return `<span class="fighter-belts">${icons.join("")}</span>`;
}

// Global exposure for inline HTML event handlers
window.getFighterBeltBadgesHtml = getFighterBeltBadgesHtml;
window.getFightTitleIconHtml = getFightTitleIconHtml;
window.getTitleHistorySummary = getTitleHistorySummary;

// ========================
// ADMIN FIGHT SELECTION
// ========================
function searchFightFighter(num) {
    const query = document.getElementById(`fightSearch${num}`)?.value.toLowerCase() || "";
    const resultsBox = document.getElementById(`fightResults${num}`);
    if (!resultsBox) return;

    if (!query) {
        resultsBox.innerHTML = "";
        return;
    }

    const matches = fighters.filter(f => f.name.toLowerCase().includes(query));

    resultsBox.innerHTML = matches.map(f => `
        <div class="search-result-item" onclick="selectFightFighter(${num}, ${f.id})" style="padding: 6px; cursor: pointer;">
            ${f.name} (${f.weightClass})
        </div>
    `).join("");
}

function selectFightFighter(target, id) {
    const fighter = getFighterById(id);
    if (!fighter) return;

    // Check if target is 1, "1", or the input element ID "fightSearch1"
    const isFighter1 = target === 1 || target === "1" || target === "fightSearch1";

    if (isFighter1) {
        selectedFighter1 = fighter;
        const input = document.getElementById("fightSearch1");
        if (input) input.value = fighter.name;
        const box = document.getElementById("fightResults1");
        if (box) box.innerHTML = "";
    } else {
        selectedFighter2 = fighter;
        const input = document.getElementById("fightSearch2");
        if (input) input.value = fighter.name;
        const box = document.getElementById("fightResults2");
        if (box) box.innerHTML = "";
    }

    updateWinnerDropdown();
}

function updateWinnerDropdown() {
    const winnerSelect = document.getElementById("fightWinner");
    if (!winnerSelect) return;

    const name1 = selectedFighter1 ? selectedFighter1.name : "Fighter 1";
    const name2 = selectedFighter2 ? selectedFighter2.name : "Fighter 2";

    winnerSelect.innerHTML = `
        <option value="f1">${name1}</option>
        <option value="f2">${name2}</option>
        <option value="draw">Draw</option>
    `;
}

// Expose functions globally for inline HTML event listeners
window.searchFightFighter = searchFightFighter;

function calculateEloChange(elo1, elo2, result, method, isKOToggle = false) {
    const k = 32;
    
    // 1. Calculate expected score for Fighter 1
    const expectedF1 = 1 / (1 + Math.pow(10, (elo2 - elo1) / 400));

    // 2. Determine actual score
    let scoreF1 = 0.5; // Default for draw
    if (result === "win") scoreF1 = 1;
    if (result === "loss") scoreF1 = 0;

    // 3. Halve the calculation multiplier if it's a draw
    const drawMultiplier = (result === "draw") ? 0.5 : 1;

    // 4. Calculate and round normal Elo change
    const eloChangeNormalF1 = Math.round(k * drawMultiplier * (scoreF1 - expectedF1));

    // 5. If calculating KO Elo, apply the 1.5x multiplier to the rounded normal change
    if (isKOToggle) {
        const koMultiplier = (method === "KO") ? 1.5 : 1;
        return Math.round(eloChangeNormalF1 * koMultiplier);
    }

    return eloChangeNormalF1;
}