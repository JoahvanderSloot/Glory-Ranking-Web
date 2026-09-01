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
function openFighter(id) {
    const f = getFighterById(id);
    if (!f) return;
    currentFighter = f;
    renderFighterProfile(f);
    showPage("fighterProfile");
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
    const normalizedTitleType = normalizeTitleType(titleType);
    if (normalizedTitleType !== "none") {
        const resolvedType = normalizedTitleType;
        fightForF1.type = resolvedType;
        fightForF2.type = resolvedType;
        fightForF1.isTitle = true;
        fightForF2.isTitle = true;
        fightForF1.isInterim = resolvedType.includes("interim");
        fightForF2.isInterim = resolvedType.includes("interim");
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

function normalizeTitleType(rawType) {
    const value = String(rawType || "").toLowerCase().trim();
    if (!value || value === "none") return "none";

    if (value.includes("interim")) return "interim";
    if (value.includes("vacant")) return "vacant";
    if (value.includes("defense")) return "defense";
    return "undisputed";
}

function updateTitleDataOnFight(f1, f2, winnerId, loserId, date, titleType) {
    // Determine target weight class object
    const targetWcName = f1.weightClass || f2.weightClass;
    const wcObj = weightClasses.find(w => typeof w === "object" && w.name === targetWcName);

    if (!wcObj) return;

    wcObj.titleBouts = wcObj.titleBouts || wcObj.titleFights || [];
    wcObj.reigns = wcObj.reigns || [];

    const normalizedType = normalizeTitleType(titleType);
    const beltType = normalizedType.includes("interim") ? "interim" : "undisputed";

    const bout = {
        date: date,
        type: normalizedType === "none" ? "undisputed" : normalizedType,
        challengerId: loserId,
        winnerId: winnerId,
        championId: beltType === "interim"
            ? (wcObj.currentInterimChampId ?? null)
            : (wcObj.currentChampId ?? null)
    };

    // A. Log Title Bout
    wcObj.titleBouts.push(bout);

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
        const isDisabled = Boolean(w && w.disabled);
        const isEditing = activeEditingIndex === i;

        if (isEditing) {
            return `
            <div class="weight-class-edit-box" style="background: rgba(255,255,255,0.05); padding: 14px; border-radius: 8px; margin-bottom: 10px; border: 1px solid #333;">
                <div style="display: flex; gap: 8px; margin-bottom: 14px;">
                    <input type="text" id="editWcName_${i}" value="${name}" style="flex: 1; margin-bottom: 0; padding: 10px; background: #0d0d0d; border: 1px solid #444; color: #fff; border-radius: 6px;">
                    <button onclick="saveWeightClassEdit(${i})" style="padding: 10px 16px; background: #2ecc71; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">Save</button>
                    <button onclick="cancelWeightClassEdit()" style="padding: 10px 16px; background: #555; color: #fff; border: none; border-radius: 6px; cursor: pointer;">Cancel</button>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <label style="display: inline-flex; align-items: center; gap: 10px; cursor: pointer; margin: 0; color: #fff; font-size: 14px; user-select: none;">
                        <input 
                            type="checkbox" 
                            ${isDisabled ? "checked" : ""} 
                            onchange="toggleWeightClassDisabled(${i}, this.checked)" 
                            style="width: 18px; height: 18px; margin: 0; accent-color: gold; cursor: pointer; vertical-align: middle; flex-shrink: 0;"
                        >
                        <span style="line-height: 1.2;">Disable (Hide from website for session)</span>
                    </label>
                    
                    <button 
                        onclick="removeWeightClass(${i})" 
                        ${!isDisabled ? "disabled" : ""}
                        style="padding: 8px 14px; background: ${isDisabled ? '#e74c3c' : '#222'}; color: ${isDisabled ? '#fff' : '#666'}; border: 1px solid ${isDisabled ? '#c0392b' : '#333'}; border-radius: 6px; cursor: ${isDisabled ? 'pointer' : 'not-allowed'}; font-weight: bold; transition: 0.2s;"
                        title="${isDisabled ? 'Delete Weight Class' : 'Must be disabled first to delete'}"
                    >
                        Delete
                    </button>
                </div>
            </div>`;
        }

        return `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; padding: 10px 14px; background: #161616; border: 1px solid #2d2d2d; border-radius: 8px;">
            <div>
    <span style="${isDisabled ? 'text-decoration: line-through; opacity: 0.5;' : 'color: #fff; font-weight: 500;'}">${name}</span>
    ${isDisabled ? '<span style="color: #aaa; font-size: 12px; margin-left: 6px;">(Disabled)</span>' : ''}
</div>
            <button class="edit-btn" onclick="editWeightClass(${i})" style="background: none; border: none; cursor: pointer; font-size: 1.2em; padding: 4px;" title="Edit Weight Class">✏️</button>
        </div>`;
    }).join('');
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
window.addEventListener('click', function (e) {
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
    window.selectFighter = function (...args) {
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

// Expose functions globally
window.isTitleFightForFighter = isTitleFightForFighter;
window.getFighterBeltBadgesHtml = getFighterBeltBadgesHtml;
window.getFightTitleIconHtml = getFightTitleIconHtml;
window.getTitleHistorySummary = getTitleHistorySummary;

// In renderLeaderboard(), update the beltBadges call to pass selectedWeight:
// const beltBadges = getFighterBeltBadgesHtml(f.id, weightClasses, selectedWeight);

function getFighterBeltBadgesHtml(fighterId, weightClassesData = [], selectedWeight = "all") {
    if (!fighterId) return "";
    const icons = [];
    const fid = String(fighterId);

    weightClassesData.forEach((wc) => {
        if (typeof wc === "string") return;

        // 1. Filter out belts from other divisions if a specific weight is selected
        if (selectedWeight !== "all" && wc.name !== selectedWeight) return;

        let hasActiveUndisputed = false;
        let hasActiveInterim = false;

        // 2. Active Undisputed Champion
        if (wc.currentChampId && String(wc.currentChampId) === fid) {
            hasActiveUndisputed = true;
            icons.push(
                `<img src="${BELT_ICONS.undisputed}" class="belt-icon" title="${wc.name} Champion" alt="Gold Belt">`
            );
        }

        // 3. Active Interim Champion
        if (wc.currentInterimChampId && String(wc.currentInterimChampId) === fid) {
            hasActiveInterim = true;
            if (!hasActiveUndisputed) {
                icons.push(
                    `<img src="${BELT_ICONS.interim}" class="belt-icon" title="Interim ${wc.name} Champion" alt="Silver Belt">`
                );
            }
        }

        // 4. Historical Reigns (De-duplicated: only one translucent belt per type)
        const formerReigns = (wc.reigns || []).filter(
            (r) => String(r.fighterId) === fid && r.endDate !== null
        );

        const hasFormerUndisputed = formerReigns.some(r => r.type === "undisputed");
        const hasFormerInterim = formerReigns.some(r => r.type === "interim");
        const hasAnyUndisputedInDivision = hasActiveUndisputed || hasFormerUndisputed;

        if (hasFormerUndisputed && !hasActiveUndisputed) {
            icons.push(
                `<img src="${BELT_ICONS.previousUndisputed}" class="belt-icon translucent" title="Former ${wc.name} Champion" alt="Translucent Gold Belt">`
            );
        }

        if (hasFormerInterim && !hasActiveInterim && !hasAnyUndisputedInDivision) {
            icons.push(
                `<img src="${BELT_ICONS.previousInterim}" class="belt-icon translucent" title="Former Interim ${wc.name} Champion" alt="Translucent Silver Belt">`
            );
        }
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

// Helper to strip time signatures and match dates cleanly
function normalizeDateStr(d) {
    if (!d) return "";
    const s = String(d).trim();
    const match = s.match(/\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
    try {
        const parsed = new Date(s);
        if (!isNaN(parsed.getTime())) {
            return parsed.toISOString().slice(0, 10);
        }
    } catch (e) { }
    return s;
}

function renderFighterProfile(f) {
    const beltBadges = getFighterBeltBadgesHtml(f.id, weightClasses);
    const titleSummaryArray = getTitleHistorySummary(f, weightClasses);

    const nameElem = document.getElementById("fighterName");
    if (nameElem) {
        nameElem.innerHTML = `${f.name} ${beltBadges}`;
    }

    // Dropdown formatting for Title History
    // ==========================================================
    // TITLE HISTORY DISPLAY
    // ==========================================================

    let titleHistoryHtml = "";

    const hasTitleHistory =
        titleSummaryArray.length > 0 &&
        titleSummaryArray[0] !== "None";

    if (!hasTitleHistory) {
        titleHistoryHtml = `
        <span style="color: #aaa;">None</span>
    `;
    } else {
        const highestRank = titleSummaryArray[0];
        const additionalItems = titleSummaryArray.slice(1);

        if (additionalItems.length === 0) {
            titleHistoryHtml = `
            <span style="color: #ffeb3b;">
                ${highestRank}
            </span>
        `;
        } else {
            const restList = additionalItems
                .map(item => `
                <li style="
                    margin-bottom: 4px;
                    color: #f3eca8;
                ">
                    ${item}
                </li>
            `)
                .join("");

            titleHistoryHtml = `
    <details
        class="title-history-details"
        style="
            cursor: pointer;
            font-weight: 500;
            color: #ffeb3b;
        "
    >
        <summary
            style="
                cursor: pointer;
                color: #ffeb3b;
                list-style: none;
            "
        >
            <span style="color: #ffeb3b;">
                ${highestRank}
            </span>
            <span
                class="title-history-toggle"
                style="
                    font-size: 0.8em;
                    color: #aaa;
                "
            >
                (▼ Click to show more)
            </span>
        </summary>

        <ul
            style="
                margin: 8px 0 0 16px;
                padding: 0;
                font-size: 0.95em;
            "
        >
            ${restList}
        </ul>
    </details>
`;
        }
    }

    document.addEventListener("toggle", function (event) {
        const details = event.target;

        if (!details.matches(".title-history-details")) {
            return;
        }

        const toggle = details.querySelector(".title-history-toggle");

        if (!toggle) return;

        toggle.textContent = details.open
            ? "(▲ Click to show less)"
            : "(▼ Click to show more)";
    }, true);

    const statsElem = document.getElementById("fighterStats");
    if (statsElem) {
        statsElem.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
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
            
            <div style="width: 100%; display: flex; align-items: flex-start; gap: 8px;">
                <strong>Title History:</strong> 
                <div style="flex: 1;">${titleHistoryHtml}</div>
            </div>
        </div>
        `;
    }

    renderFightHistory(f.fights);
    renderEloChart(f.fights);
}

function getFightTitleIconHtml(fight, fighterId = null, weightClassesData = [], allFights = []) {
    if (!fight) return "";

    // Fix: Actually fetch the fighter object so we can pass it down
    const fighter = fighterId ? getFighterById(fighterId) : null;

    // Fix: Pass 'fighter' as the 4th argument
    const { isTitle, type } = isTitleFightForFighter(fight, fighterId, weightClassesData, fighter);

    if (!isTitle) return "";

    const isInterim =
        type === "interim" ||
        fight.type === "interim" ||
        fight.isInterim === true ||
        fight.titleType === "interim";
    const isVacant =
        type === "vacant" ||
        fight.type === "vacant" ||
        fight.isVacant === true ||
        fight.titleType === "vacant";
    const iconSrc = isInterim ? BELT_ICONS.interimBout : BELT_ICONS.undisputedBout;
    const titleText = isVacant ? "Vacant Title Fight" : (isInterim ? "Interim Title Fight" : "Title Fight");

    return `<img src="${iconSrc}" class="bout-title-icon" title="${titleText}" alt="Title Bout">`;
}

// ==========================================
// TITLE BOUT MATCHING
// ==========================================

function getBoutOpponentIds(b, fighterId) {
    const fid = String(fighterId);

    return [
        b.championId,
        b.challengerId,
        b.winnerId,
        b.loserId,
        b.fighter1Id,
        b.fighter2Id,
        b.fighterAId,
        b.fighterBId,
        b.redCornerId,
        b.blueCornerId
    ]
        .filter(id => id !== undefined && id !== null)
        .map(String)
        .filter(id => id !== fid);
}

function isSameFight(f, fighter, b) {
    if (!f || !b || !fighter) return false;

    const fDate = normalizeDateStr(f.date);
    const bDate = normalizeDateStr(b.date);

    if (!fDate || !bDate || fDate !== bDate) {
        return false;
    }

    const fighterId = String(fighter.id);
    const opponentId = f.opponentId !== undefined && f.opponentId !== null
        ? String(f.opponentId)
        : null;

    const boutIds = [
        b.championId,
        b.challengerId,
        b.winnerId,
        b.loserId,
        b.fighter1Id,
        b.fighter2Id,
        b.fighterAId,
        b.fighterBId,
        b.redCornerId,
        b.blueCornerId
    ]
        .filter(id => id !== undefined && id !== null)
        .map(String);

    // The fighter must actually be one of the participants.
    if (!boutIds.includes(fighterId)) {
        return false;
    }

    // If the fighter record has an opponent, the opponent must also
    // be one of the participants in this title bout.
    if (opponentId) {
        const opponentIds = getBoutOpponentIds(b, fighterId);

        if (!opponentIds.includes(opponentId)) {
            return false;
        }
    }

    return true;
}

function isTitleFightForFighter(
    f,
    fighterId,
    weightClassesData = [],
    fighter = null
) {
    if (!f) {
        return {
            isTitle: false,
            wasDefendingChamp: false,
            weightClass: null,
            type: null,
            titleBout: null
        };
    }

    fighter = fighter || getFighterById(fighterId);

    // First use explicit title information stored on the fight itself.
    const explicitType = normalizeTitleType(f.type || f.titleType || (f.isInterim ? "interim" : ""));
    if (
        f.isTitle === true ||
        f.isTitleFight === true ||
        f.isTitleBout === true ||
        explicitType !== "none"
    ) {
        return {
            isTitle: true,
            wasDefendingChamp:
                f.wasDefendingChamp === true ||
                f.isDefense === true ||
                f.isTitleDefense === true,

            weightClass:
                f.weightClass ||
                (fighter ? fighter.weightClass : null),

            type: explicitType !== "none" ? explicitType : (
                f.type ||
                f.titleType ||
                (f.isInterim ? "interim" : "undisputed")
            ),

            titleBout: null
        };
    }

    const fid = String(
        fighterId || (fighter ? fighter.id : "")
    );

    if (!fid || !fighter) {
        return {
            isTitle: false,
            wasDefendingChamp: false,
            weightClass: null,
            type: null,
            titleBout: null
        };
    }

    for (const wc of weightClassesData) {
        if (typeof wc === "string") continue;

        const titleBouts =
            wc.titleBouts ||
            wc.titleFights ||
            [];

        for (const b of titleBouts) {
            if (!isSameFight(f, fighter, b)) {
                continue;
            }

            const type = b.type || "undisputed";

            /*
             * A "defense" bout explicitly means the champion was
             * defending. This is much safer than trying to infer
             * champion status from who won the fight.
             *
             * championId is also supported for newer data.
             */
            const wasDefendingChamp =
                type === "defense" ||
                (
                    b.championId !== undefined &&
                    b.championId !== null &&
                    String(b.championId) === fid
                ) ||
                (
                    b.championName &&
                    fighter.name &&
                    b.championName.toLowerCase().trim() ===
                    fighter.name.toLowerCase().trim()
                );

            return {
                isTitle: true,
                wasDefendingChamp,
                weightClass: wc.name,
                type,
                titleBout: b
            };
        }
    }

    return {
        isTitle: false,
        wasDefendingChamp: false,
        weightClass: null,
        type: null,
        titleBout: null
    };
}

// 3. Updated Summary Generator
// ==========================================================
// TITLE HISTORY SUMMARY
// ==========================================================
function getTitleHistorySummary(fighter, weightClassesData = []) {
    if (!fighter || !fighter.fights) return ["None"];

    const fid = String(fighter.id);

    // Robust date parser supporting YYYY, YYYY-MM, YYYY-MM-DD
    const parseDate = (dateStr) => {
        if (!dateStr) return null;
        const norm = typeof normalizeDateStr === "function" ? normalizeDateStr(dateStr) : String(dateStr).trim();
        if (/^\d{4}$/.test(norm)) return new Date(`${norm}-01-01T00:00:00`).getTime();
        if (/^\d{4}-\d{2}$/.test(norm)) return new Date(`${norm}-01T00:00:00`).getTime();
        const match = norm.match(/\d{4}-\d{2}-\d{2}/);
        if (match) {
            const d = new Date(`${match[0]}T00:00:00`).getTime();
            return Number.isNaN(d) ? null : d;
        }
        const d = new Date(norm).getTime();
        return Number.isNaN(d) ? null : d;
    };

    // 1. COLLECT CHAMPIONSHIP REIGNS & DEFENSES
    const championshipRecords = [];
    const allUndisputedReigns = [];

    (weightClassesData || []).forEach(wc => {
        if (!wc) return;
        const wcName = typeof wc === "string" ? wc : wc.name;
        const isCurrentChamp = typeof wc === "object" && String(wc.currentChampId) === fid;
        const isCurrentInterimChamp = typeof wc === "object" && String(wc.currentInterimChampId) === fid;

        const reigns = (typeof wc === "object" && wc.reigns)
            ? wc.reigns.filter(r => String(r.fighterId) === fid)
            : [];

        reigns.forEach(reign => {
            const type = reign.type === "interim" ? "interim" : "undisputed";
            let startDate = parseDate(reign.startDate);
            let endDate = parseDate(reign.endDate);

            // Resilient check for current champion status
            const isCurrent = reign.isCurrent === true ||
                isCurrentChamp ||
                (!reign.endDate && (type === "undisputed" ? isCurrentChamp : isCurrentInterimChamp));

            // Infer start date from fight history if missing in reign object
            if (startDate === null && fighter.fights) {
                const titleFight = fighter.fights.find(f => {
                    const meta = isTitleFightForFighter(f, fid, weightClassesData, fighter);
                    return f.result === "win" && (meta.weightClass === wcName || f.weightClass === wcName);
                });
                if (titleFight) startDate = parseDate(titleFight.date);
            }

            // Force end date to Infinity if currently holding the title
            if (isCurrent) {
                endDate = Infinity;
            } else if ((endDate === null || endDate === undefined) && fighter.fights) {
                // Only infer end date from a fight IF it was explicitly a TITLE loss in this division
                const lossFight = fighter.fights.find(f => {
                    if (f.result !== "loss") return false;
                    const meta = isTitleFightForFighter(f, fid, weightClassesData, fighter);
                    const fWc = meta.weightClass || f.weightClass;
                    const fDate = parseDate(f.date);
                    const isTitleLoss = f.isTitle || f.isTitleFight || meta.isTitle;
                    return isTitleLoss && fWc === wcName && (startDate !== null ? (fDate && fDate >= startDate) : true);
                });

                if (lossFight) {
                    endDate = parseDate(lossFight.date);
                } else if (typeof wc === "object" && wc.reigns) {
                    const nextReign = wc.reigns
                        .map(r => parseDate(r.startDate))
                        .filter(d => d !== null && startDate !== null && d > startDate)
                        .sort((a, b) => a - b)[0];
                    if (nextReign) endDate = nextReign;
                }
            }

            if (type === "undisputed" && startDate !== null) {
                allUndisputedReigns.push({
                    weightClass: wcName,
                    startDate,
                    endDate: isCurrent ? Infinity : (endDate !== null ? endDate : Infinity),
                    isCurrent
                });
            }

            // Defenses calculation
            let storedDefenses = typeof reign.defenses === "number" ? reign.defenses : 0;
            const titleBouts = (typeof wc === "object" && (wc.titleBouts || wc.titleFights)) || [];
            const boutDefenses = titleBouts.filter(b => {
                const boutDate = parseDate(b.date);
                const isAfterStart = startDate !== null ? (boutDate && boutDate >= startDate) : true;
                const isBeforeEnd = endDate !== null && endDate !== Infinity ? (boutDate && boutDate <= endDate) : true;
                const isWinner = String(b.winnerId) === fid;
                const isChampionAtBout = String(b.championId) === fid;
                const isDefenseExplicit = normalizeTitleType(b.type || b.titleType || "") === "defense"
                    || b.isDefense === true
                    || b.isTitleDefense === true
                    || b.wasDefendingChamp === true;

                return isWinner && (isDefenseExplicit || isChampionAtBout) && isAfterStart && isBeforeEnd;
            }).length;

            const fightDefenses = (fighter.fights || []).filter(f => {
                if (f.result !== "win") return false;
                const fDate = parseDate(f.date);
                const isAfterStart = startDate !== null ? (fDate && fDate >= startDate) : true;
                const isBeforeEnd = endDate !== null && endDate !== Infinity ? (fDate && fDate <= endDate) : true;

                const isTitle = f.isTitle || f.type === type || f.titleType === type || f.isTitleFight || f.isTitleBout;
                const isDefenseExplicit = normalizeTitleType(f.type || f.titleType || "") === "defense"
                    || f.isDefense === true
                    || f.isTitleDefense === true
                    || f.wasDefendingChamp === true
                    || String(f.championId || "") === fid;

                return isTitle && isDefenseExplicit && isAfterStart && isBeforeEnd;
            }).length;

            const totalDefenses = Math.max(storedDefenses, boutDefenses, fightDefenses);

            championshipRecords.push({
                weightClass: wcName,
                type,
                isCurrent,
                defenses: totalDefenses
            });
        });
    });

    // Fallback: If wc.reigns is empty, rebuild reign windows directly from fighter fights
    if (allUndisputedReigns.length === 0 && fighter.fights) {
        const divisionWins = new Map();
        fighter.fights.forEach(f => {
            if (f.result !== "win") return;
            const meta = isTitleFightForFighter(f, fid, weightClassesData, fighter);
            if (meta.isTitle && meta.type !== "interim") {
                const wcName = meta.weightClass || f.weightClass || fighter.weightClass;
                const fDate = parseDate(f.date);
                if (wcName && fDate !== null) {
                    if (!divisionWins.has(wcName) || fDate < divisionWins.get(wcName)) {
                        divisionWins.set(wcName, fDate);
                    }
                }
            }
        });

        divisionWins.forEach((startDate, wcName) => {
            const isCurrent = weightClassesData.some(wc =>
                (typeof wc === "object" ? wc.name === wcName : wc === wcName) && String(wc.currentChampId) === fid
            );

            let endDate = Infinity;
            if (!isCurrent) {
                const lossFight = fighter.fights.find(f => {
                    if (f.result !== "loss") return false;
                    const meta = isTitleFightForFighter(f, fid, weightClassesData, fighter);
                    const isTitleLoss = f.isTitle || f.isTitleFight || meta.isTitle;
                    const fWc = meta.weightClass || f.weightClass;
                    const fDate = parseDate(f.date);
                    return isTitleLoss && fWc === wcName && fDate !== null && fDate >= startDate;
                });
                if (lossFight) endDate = parseDate(lossFight.date);
            }

            allUndisputedReigns.push({
                weightClass: wcName,
                startDate,
                endDate: isCurrent ? Infinity : endDate,
                isCurrent
            });

            championshipRecords.push({
                weightClass: wcName,
                type: "undisputed",
                isCurrent,
                defenses: 0
            });
        });
    }

    // CHECK FOR SIMULTANEOUS OVERLAP
    let wasSimultaneousDoubleChamp = false;
    for (let i = 0; i < allUndisputedReigns.length; i++) {
        for (let j = i + 1; j < allUndisputedReigns.length; j++) {
            const r1 = allUndisputedReigns[i];
            const r2 = allUndisputedReigns[j];

            if (r1.weightClass !== r2.weightClass) {
                const s1 = r1.startDate;
                const e1 = r1.endDate;
                const s2 = r2.startDate;
                const e2 = r2.endDate;

                if (s1 !== null && s2 !== null) {
                    if (s1 <= e2 && s2 <= e1) {
                        wasSimultaneousDoubleChamp = true;
                        break;
                    }
                }
            }
        }
        if (wasSimultaneousDoubleChamp) break;
    }

    // Group championship records by division
    const divisionData = new Map();
    championshipRecords.forEach(rec => {
        if (!divisionData.has(rec.weightClass)) {
            divisionData.set(rec.weightClass, { weightClass: rec.weightClass, undisputed: [], interim: [] });
        }
        divisionData.get(rec.weightClass)[rec.type].push(rec);
    });

    const divisions = [];
    divisionData.forEach(data => {
        divisions.push({
            weightClass: data.weightClass,
            undisputed: data.undisputed,
            interim: data.interim,
            currentUndisputed: data.undisputed.find(r => r.isCurrent) || null,
            hasUndisputed: data.undisputed.length > 0,
            hasInterim: data.interim.length > 0,
            totalUndisputedDefenses: data.undisputed.reduce((sum, r) => sum + r.defenses, 0),
            totalInterimDefenses: data.interim.reduce((sum, r) => sum + r.defenses, 0)
        });
    });

    const undisputedDivisions = divisions.filter(d => d.hasUndisputed);
    const doubleChampionCount = undisputedDivisions.length;
    const hasMultipleDivisions = doubleChampionCount >= 2;

    const activeUndisputedDivisions = undisputedDivisions.filter(d => d.currentUndisputed !== null);
    const formerUndisputedDivisions = undisputedDivisions.filter(d => d.currentUndisputed === null);

    const heldUndisputedInWC = (wcName) => divisions.find(d => d.weightClass === wcName)?.hasUndisputed || false;

    // Helper for generating standard division title tags
    const getDivisionTag = (div, forceFormer = false) => {
        const isCurrent = !forceFormer && div.currentUndisputed !== null;
        let label = isCurrent ? `${div.weightClass} World Champion` : `Former ${div.weightClass} World Champion`;
        if (div.undisputed.length > 1) label = `${div.undisputed.length}x ${label}`;

        const defenseCount = div.totalUndisputedDefenses;
        if (defenseCount > 0) {
            label += ` (${defenseCount} ${defenseCount === 1 ? 'defense' : 'defenses'})`;
        }
        return label;
    };

    // 2. CONTENDERS
    const seenEventTags = new Set();
    const tagCounts = new Map();
    const addTag = (wcName, tagLabel, dateKey = "unknown") => {
        const eventKey = `${dateKey}|${wcName}|${tagLabel}`;
        if (seenEventTags.has(eventKey)) return;
        seenEventTags.add(eventKey);

        const labelKey = `${wcName}|${tagLabel}`;
        tagCounts.set(labelKey, (tagCounts.get(labelKey) || 0) + 1);
    };

    const fightsByDate = {};
    (fighter.fights || []).forEach(f => {
        if (f.date) {
            if (!fightsByDate[f.date]) fightsByDate[f.date] = [];
            fightsByDate[f.date].push(f);
        }
    });

    Object.entries(fightsByDate).forEach(([date, dayFights]) => {
        dayFights.forEach(f => {
            if (f.result !== "loss") return;

            const explicitType = normalizeTitleType(f.type || f.titleType || (f.isInterim ? "interim" : ""));
            const titleMeta = isTitleFightForFighter(f, fid, weightClassesData, fighter);
            const isTitleBout =
                f.isTitle === true ||
                f.isTitleFight === true ||
                f.isTitleBout === true ||
                explicitType !== "none" ||
                titleMeta.isTitle === true ||
                String(f.type || "").toLowerCase() === "undisputed" ||
                String(f.type || "").toLowerCase() === "interim" ||
                String(f.type || "").toLowerCase() === "vacant";

            if (!isTitleBout) return;

            const fightWc = titleMeta.weightClass || f.weightClass || fighter.weightClass || "Heavyweight";
            const isInterim =
                explicitType === "interim" ||
                titleMeta.type === "interim" ||
                f.isInterim === true ||
                f.type === "interim";
            const isDefending = String(f.championId) === fid || f.wasDefendingChamp || f.isDefense || f.isTitleDefense;

            if (!isDefending && !heldUndisputedInWC(fightWc)) {
                addTag(fightWc, isInterim ? "Interim title contender" : "Title contender", f.date || date);
            }
        });
    });

    // 3. BUILD OUTPUT
    const details = [];

    if (hasMultipleDivisions) {
        if (wasSimultaneousDoubleChamp) {
            if (activeUndisputedDivisions.length >= 2) {
                const label = doubleChampionCount === 2 ? "Double champion" : `${doubleChampionCount} Division Champion`;
                details.push(label);

                undisputedDivisions.forEach(div => {
                    details.push(getDivisionTag(div));
                });
            } else if (activeUndisputedDivisions.length === 1) {
                const activeDiv = activeUndisputedDivisions[0];
                details.push(getDivisionTag(activeDiv));
                details.push("Former double champion");

                formerUndisputedDivisions.forEach(div => {
                    details.push(getDivisionTag(div, true));
                });
            } else {
                details.push("Former Double Champion");

                undisputedDivisions.forEach(div => {
                    details.push(getDivisionTag(div, true));
                });
            }
        } else {
            // Non-simultaneous multi-division champion
            if (activeUndisputedDivisions.length >= 1) {
                const label = doubleChampionCount === 2 ? "2 division champion" : `${doubleChampionCount} division champion`;
                details.push(label);

                activeUndisputedDivisions.forEach(div => {
                    details.push(getDivisionTag(div));
                });
                formerUndisputedDivisions.forEach(div => {
                    details.push(getDivisionTag(div, true));
                });
            } else {
                const label = doubleChampionCount === 2 ? "Former 2 division champion" : `Former ${doubleChampionCount} division champion`;
                details.push(label);

                undisputedDivisions.forEach(div => {
                    details.push(getDivisionTag(div, true));
                });
            }
        }
    } else {
        divisions.forEach(div => {
            if (div.hasUndisputed) {
                details.push(getDivisionTag(div));
            }
        });
    }

    // Add interim title tags for divisions without undisputed belts
    divisions.forEach(div => {
        if (div.hasInterim && !div.hasUndisputed) {
            let label = div.interim.find(r => r.isCurrent) ? `${div.weightClass} Interim World Champion` : `Former ${div.weightClass} Interim World Champion`;
            if (div.interim.length > 1) label = `${div.interim.length}x ${label}`;

            const defenseCount = div.totalInterimDefenses;
            if (defenseCount > 0) {
                label += ` (${defenseCount} ${defenseCount === 1 ? 'defense' : 'defenses'})`;
            }
            details.push(label);
        }
    });

    // Add contender tags
    const orderedTagEntries = [];
    tagCounts.forEach((count, key) => {
        const [wc, ...labelParts] = key.split('|');
        const label = labelParts.join('|');

        const priority = label.includes("Title contender") ? 400
            : label.includes("Interim title contender") ? 410
            : 500;

        orderedTagEntries.push({
            wc,
            label,
            count,
            priority
        });
    });

    orderedTagEntries.sort((a, b) => a.priority - b.priority || a.wc.localeCompare(b.wc));
    orderedTagEntries.forEach(entry => {
        const text = `${entry.count > 1 ? `${entry.count}x ` : ''}${entry.wc} ${entry.label}`;
        details.push(text);
    });

    return details.length > 0 ? details : ["None"];
}