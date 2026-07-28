// ==========================================
// PREDICTION SYSTEM — UI STATE & EVENT LOGIC
// ==========================================

let predictionSelection = {
    fighter1: null,
    fighter2: null
};

function initSlidersOnLoad() {
    // Replaced 'durability' with 'chin' and 'ko'
    const features = ["durability", "cardio", "athleticism"]; 
    features.forEach(feature => {
        const toggle = document.getElementById(`toggle_${feature}`);
        if (toggle && !toggle.checked) {
            window.toggleSliderInput(feature);
        }
    });
}

document.addEventListener("DOMContentLoaded", initSlidersOnLoad);

// ==========================================
// SEARCH & AUTOCOMPLETE FOR FIGHTERS
// ==========================================

function searchPrediction1() {
    const inputEl = document.getElementById("predictionSearch1");
    const query = inputEl.value.toLowerCase();
    const box = document.getElementById("predictionResults1");

    // 1. Detect if the manual input no longer matches the selected fighter name
    if (predictionSelection.fighter1 && inputEl.value !== predictionSelection.fighter1.name) {
        // Reset the labels if the user cleared the text or typed something else
        document.getElementById("styleName1").innerHTML = "Fighter 1";
        document.querySelectorAll(".fighter-name-label-1").forEach(el => el.innerHTML = "Fighter 1");
        
        // Clear internal selections
        clearPredictionSide(1, false);
    }

    if (!query) {
        box.innerHTML = "";
        return;
    }

    const results = (window.fighters || []).filter(f => f.name.toLowerCase().includes(query));

    box.innerHTML = results.map(f => `
        <div class="fighter-row" onclick="selectPredictionFighter(1, ${f.id}, '${f.name.replace(/'/g, "\\'")}')">
            ${f.name} (${f.weightClass || 'N/A'})
        </div>
    `).join("");
}

// Repeat the same logic for Side 2
function searchPrediction2() {
    const inputEl = document.getElementById("predictionSearch2");
    const query = inputEl.value.toLowerCase();
    const box = document.getElementById("predictionResults2");

    if (predictionSelection.fighter2 && inputEl.value !== predictionSelection.fighter2.name) {
        document.getElementById("styleName2").innerHTML = "Fighter 2";
        document.querySelectorAll(".fighter-name-label-2").forEach(el => el.innerHTML = "Fighter 2");
        
        clearPredictionSide(2, false);
    }

    if (!query) {
        box.innerHTML = "";
        return;
    }

    const results = (window.fighters || []).filter(f => f.name.toLowerCase().includes(query));

    box.innerHTML = results.map(f => `
        <div class="fighter-row" onclick="selectPredictionFighter(2, ${f.id}, '${f.name.replace(/'/g, "\\'")}')">
            ${f.name} (${f.weightClass || 'N/A'})
        </div>
    `).join("");
}

// ==========================================
// SELECTION MANAGEMENT WITH GLOBAL TEXT REPLACEMENT
// ==========================================

function selectPredictionFighter(side, id, name) {
    clearPredictionSide(side, true);

    const match = (window.fighters || []).find(f => f.id === id);
    if (match) {
        if (side === 1) window.currentFighter1 = match;
        else window.currentFighter2 = match;
    }

    if (side === 1) {
        predictionSelection.fighter1 = { id: id, name: name };
        document.getElementById("predictionSearch1").value = name;
        document.getElementById("styleName1").innerHTML = name;
        document.querySelectorAll(".fighter-name-label-1").forEach(el => el.innerHTML = name);
        document.getElementById("predictionResults1").innerHTML = "";
    } else {
        predictionSelection.fighter2 = { id: id, name: name };
        document.getElementById("predictionSearch2").value = name;
        document.getElementById("styleName2").innerHTML = name;
        document.querySelectorAll(".fighter-name-label-2").forEach(el => el.innerHTML = name);
        document.getElementById("predictionResults2").innerHTML = "";
    }

    updatePredictionButton();
}

function autoSetKnown(attribute) {
  let toggle = document.getElementById(`toggle_${attribute}`);
  if (toggle && !toggle.checked) {
    toggle.checked = true;
    toggleSliderInput(attribute); // Your existing function that activates the sliders
  }
}

function clearPredictionSide(side, clearInputText = true) {
    const prefix = side === 1 ? "1" : "2";

    if (side === 1) window.currentFighter1 = null;
    else window.currentFighter2 = null;

    document.querySelectorAll(`[id^="style${prefix}_"], [id^="extra${prefix}_"]`).forEach(el => {
        if (el.tagName === "SELECT") {
            el.selectedIndex = 0;
        } else if (el.type === "range") {
            el.value = 5;
            const displayId = el.id.replace(`extra${prefix}_`, "") + "Value" + prefix;
            const displayEl = document.getElementById(displayId);
            const toggleEl = document.getElementById(`toggle_${el.id.replace(`extra${prefix}_`, "")}`);
            if (displayEl) {
                displayEl.textContent = (toggleEl && toggleEl.checked) ? "5/10" : "Unknown";
            }
        } else if (el.type === "text" && el.id.endsWith("_text")) {
            el.value = "";
        } else {
            el.value = "";
        }
    });

    document.querySelectorAll(`[id^="multiselect_style${prefix}_"] input[type="checkbox"]`).forEach(cb => {
        cb.checked = false;
    });

    if (side === 1) {
        predictionSelection.fighter1 = null;
        if (clearInputText) document.getElementById("predictionSearch1").value = "";
        document.getElementById("styleName1").innerHTML = "Fighter 1";
        document.querySelectorAll(".fighter-name-label-1").forEach(el => el.innerHTML = "Fighter 1");
    } else {
        predictionSelection.fighter2 = null;
        if (clearInputText) document.getElementById("predictionSearch2").value = "";
        document.getElementById("styleName2").innerHTML = "Fighter 2";
        document.querySelectorAll(".fighter-name-label-2").forEach(el => el.innerHTML = "Fighter 2");
    }

    updatePredictionButton();

// Reset the toggles to unknown for BOTH fighters
  ['athleticism', 'cardio', 'chin', 'ko'].forEach(attr => {
    let toggle = document.getElementById(`toggle_${attr}`);
    if (toggle && toggle.checked) {
      toggle.checked = false;
      toggleSliderInput(attr); // Re-run to disable them
    }
  });
}

function updatePredictionButton() {
    const button = document.getElementById("calculatePrediction");
    if (button) {
        button.disabled = !(predictionSelection.fighter1 && predictionSelection.fighter2);
    }
}

function closePredictionDropdown(side) {
    setTimeout(() => {
        const el = document.getElementById(`predictionResults${side}`);
        if (el) el.innerHTML = "";
    }, 150);
}

// ==========================================
// CUSTOM INTERACTIVE DROPDOWNS (MULTI-SELECT)
// ==========================================

window.toggleDropdown = function(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const wrapper = container.querySelector('.checkboxes-wrapper');
    const isOpen = wrapper.style.display === 'block';
    
    document.querySelectorAll('.checkboxes-wrapper').forEach(el => el.style.display = 'none');
    
    if (!isOpen && wrapper) {
        wrapper.style.display = 'block';
    }
};

document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-multiselect')) {
        document.querySelectorAll('.checkboxes-wrapper').forEach(el => el.style.display = 'none');
    }
});

window.updateMultiselect = function(baseId) {
    const container = document.getElementById(`multiselect_${baseId}`);
    const textInput = document.getElementById(`${baseId}_text`);
    if (!container || !textInput) return;
    const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
    
    const values = Array.from(checkedBoxes).map(cb => cb.value);
    textInput.value = values.length > 0 ? values.join(', ') : '';
};

// ==========================================
// RANGE SLIDERS (KNOWN VS UNKNOWN STATES)
// ==========================================

window.toggleSliderInput = function(featureName) {
    const toggleEl = document.getElementById(`toggle_${featureName}`);
    if (!toggleEl) return;
    const isKnown = toggleEl.checked;
    const s1 = document.getElementById(`extra1_${featureName}`);
    const s2 = document.getElementById(`extra2_${featureName}`);
    const valDisplay1 = document.getElementById(`${featureName}Value1`);
    const valDisplay2 = document.getElementById(`${featureName}Value2`);

    if (isKnown) {
        if(s1?.parentElement) s1.parentElement.classList.remove('slider-disabled');
        if(s2?.parentElement) s2.parentElement.classList.remove('slider-disabled');
        if(valDisplay1 && s1) valDisplay1.textContent = s1.value + "/10";
        if(valDisplay2 && s2) valDisplay2.textContent = s2.value + "/10";
    } else {
        if(s1?.parentElement) s1.parentElement.classList.add('slider-disabled');
        if(s2?.parentElement) s2.parentElement.classList.add('slider-disabled');
        if(valDisplay1) valDisplay1.textContent = "Unknown";
        if(valDisplay2) valDisplay2.textContent = "Unknown";
    }
};

window.updateSlider = function(slider, displayId) {
    const display = document.getElementById(displayId);
    if (display) display.textContent = slider.value + "/10";
};

// Global window mappings
window.clearPredictionSide = clearPredictionSide;
window.searchPrediction1 = searchPrediction1;
window.searchPrediction2 = searchPrediction2;
window.selectPredictionFighter = selectPredictionFighter;
window.closePredictionDropdown = closePredictionDropdown;
window.calculatePrediction = calculatePrediction;

export const PREDICTION_CONFIG = {
    weights: {
        elo: 60,
        winLossRatio: 40,
        koPercentage: 25, // This is your active KO% category
        chin: 25,         // This is your new Chin% category
        experience: 25,
        momentum: 30,
        pastMatchup: 20, 
        style: 20,
        age: 15,
        heightReach: 20,
        weight: 15,
        athleticism: 15,
        cardio: 20,
        durability: 20
    }
};

/**
 * Main Calculation and Orchestration Routine
 */
let isShowingResults = false;

export function calculatePrediction() {
    const name1 = document.getElementById("predictionSearch1")?.value.trim() || "Fighter 1";
    const name2 = document.getElementById("predictionSearch2")?.value.trim() || "Fighter 2";
    const btn = document.getElementById('calculatePrediction');
  const cards = document.querySelectorAll('.card'); // Grabs the Style and Physical cards
  const searchInputs = document.querySelectorAll('.search-container input');
  const resultsDiv = document.getElementById('predictionResults');

    let dbF1 = window.currentFighter1 || findFighterInApplication(name1);
    let dbF2 = window.currentFighter2 || findFighterInApplication(name2);

    // Fallbacks if not found
    if (!dbF1) dbF1 = createFallbackProfile(name1, 1134, 10, 1, 0, 26, 74, 75, 170); 
    if (!dbF2) dbF2 = createFallbackProfile(name2, 1109, 11, 4, 0, 32, 75, 76, 172);

    const uiInputs = getPredictionFormInputs();
    
    // Dynamic max weight, so we can deduct categories (like past matchups) if they legitimately don't exist
    let dynamicMaxEngineWeight = Object.values(PREDICTION_CONFIG.weights).reduce((a, b) => a + b, 0);
    let voidedWeightPool = 0; 
    const categoryBreakdowns = [];

    function evalCategory(key, label, val1, val2, display1, display2, evaluationFn) {
        const categoryWeight = PREDICTION_CONFIG.weights[key] || 0;
        
        const isF1Known = val1 !== null && val1 !== undefined && val1 !== "" && val1 !== "unknown" && val1 !== "Unknown";
        const isF2Known = val2 !== null && val2 !== undefined && val2 !== "" && val2 !== "unknown" && val2 !== "Unknown";

        // If data is missing (e.g. checkbox off or field empty), exit and mark it as voided.
        if (!isF1Known || !isF2Known) {
            voidedWeightPool += categoryWeight;
            return;
        }

        const result = evaluationFn(val1, val2, categoryWeight);
        
        if (key === "age" && result.isOmittedDraw) {
            return; // Age was valid, just equal, doesn't skew result but doesn't count as voided
        }

        categoryBreakdowns.push({
            label,
            val1: display1,
            val2: display2,
            f1Gain: result.f1Share * categoryWeight,
            f2Gain: result.f2Share * categoryWeight,
            status: result.f1Share > result.f2Share ? "f1_win" : (result.f2Share > result.f1Share ? "f2_win" : "draw")
        });
    }

    // ==========================================
    // 1. SYSTEM CALCULATED RECORDS & HISTORY
    // ==========================================
    
    evalCategory("elo", "Elo", dbF1.elo, dbF2.elo, dbF1.elo, dbF2.elo, (v1, v2) => {
        const expectedF1 = 1 / (1 + Math.pow(10, (v2 - v1) / 400));
        return { f1Share: expectedF1, f2Share: 1 - expectedF1 };
    });

    const stats1 = parseHistoryStats(dbF1.history, dbF1);
    const stats2 = parseHistoryStats(dbF2.history, dbF2);

    const wlDisplay1 = `${Math.round(stats1.winRatio * 100)}% (${stats1.recordStr})`;
    const wlDisplay2 = `${Math.round(stats2.winRatio * 100)}% (${stats2.recordStr})`;
    evalCategory("winLossRatio", "Win/Loss ratio", stats1.winRatio, stats2.winRatio, wlDisplay1, wlDisplay2, (v1, v2) => {
        return { f1Share: v1 / ((v1 + v2) || 1), f2Share: v2 / ((v1 + v2) || 1) };
    });

   evalCategory(
    "koPercentage",
    "KO %tage",
    stats1.koRatio,
    stats2.koRatio,
    stats1.koRatio == null ? "Unknown" : `${Math.round(stats1.koRatio * 100)}%`,
    stats2.koRatio == null ? "Unknown" : `${Math.round(stats2.koRatio * 100)}%`,
    (v1, v2) => {

        if (v1 === 0 && v2 === 0) {
            return {
                f1Share: 0.5,
                f2Share: 0.5
            };
        }

        return {
            f1Share: v1 / (v1 + v2),
            f2Share: v2 / (v1 + v2)
        };
    }
);
evalCategory(
    "chin",
    "Chin %tage",
    stats1.koLossRatio,
    stats2.koLossRatio,
    stats1.koLossRatio == null ? "Unknown" : `${Math.round(stats1.koLossRatio * 100)}%`,
    stats2.koLossRatio == null ? "Unknown" : `${Math.round(stats2.koLossRatio * 100)}%`,
    (v1, v2) => {

        // Lower KO-loss percentage is better
        const safe1 = 1 - v1;
        const safe2 = 1 - v2;

        return {
            f1Share: safe1 / (safe1 + safe2),
            f2Share: safe2 / (safe1 + safe2)
        };
    }
);

    evalCategory("experience", "Experience", stats1.totalFights, stats2.totalFights, `${stats1.totalFights} fights`, `${stats2.totalFights} fights`, (v1, v2) => {
        return { f1Share: v1 / ((v1 + v2) || 1), f2Share: v2 / ((v1 + v2) || 1) };
    });

    const mom1 = calculateMomentumScore(dbF1.history, dbF1);
    const mom2 = calculateMomentumScore(dbF2.history, dbF2);
    evalCategory("momentum", "Momentum", mom1, mom2, `${mom1} pts`, `${mom2} pts`, (v1, v2) => {
        return { f1Share: v1 / ((v1 + v2) || 1), f2Share: v2 / ((v1 + v2) || 1) };
    });

    const shareMetric = evaluateSharedHistory(dbF1, dbF2);
    if (shareMetric.hasData) {
        const safeF1 = shareMetric.f1Score === 0 && shareMetric.f2Score === 0 ? 1 : shareMetric.f1Score;
        const safeF2 = shareMetric.f1Score === 0 && shareMetric.f2Score === 0 ? 1 : shareMetric.f2Score;

        evalCategory("pastMatchup", "Shared History", safeF1, safeF2, `+${shareMetric.f1Score}`, `+${shareMetric.f2Score}`, (v1, v2) => {
            return { f1Share: v1 / ((v1 + v2) || 1), f2Share: v2 / ((v1 + v2) || 1) };
        });
    } else {
        // If no shared history, we don't punish the confidence rating. 
        // We simply remove its weight from the total possible score.
        dynamicMaxEngineWeight -= PREDICTION_CONFIG.weights["pastMatchup"];
    }

    // ==========================================
    // 2. ADVANCED COMBAT AGE & MILEAGE LOGIC
    // ==========================================
    const age1 = uiInputs.f1.age || dbF1.age;
    const age2 = uiInputs.f2.age || dbF2.age;

    evalCategory("age", "Fight Age/Mileage", age1, age2, `${age1} yrs`, `${age2} yrs`, (a1, a2) => {
        const getAgeScore = (age, fights) => {
            let score = 100;
            if (age < 24) score -= (24 - age) * 4; 
            else if (age > 33) score -= (age - 33) * 6; 

            if (age < 25 && fights > 25) score += 10; 
            if (age > 34 && fights < 15) score -= 15; 

            if (fights > 40) score -= (fights - 40) * 0.75; 

            return Math.max(10, Math.min(100, score));
        };

        const f1Score = getAgeScore(a1, stats1.totalFights);
        const f2Score = getAgeScore(a2, stats2.totalFights);

        const absoluteDiff = Math.abs(f1Score - f2Score);
        if (absoluteDiff < 5) {
            return { f1Share: 0.5, f2Share: 0.5, isOmittedDraw: true };
        }

        return { 
            f1Share: f1Score / (f1Score + f2Score), 
            f2Share: f2Score / (f1Score + f2Score),
            isOmittedDraw: false 
        };
    });

    // ==========================================
    // 3. PHYSICAL BIOMETRICS & SLIDERS
    // ==========================================

    const styleValid1 = uiInputs.f1.stance && uiInputs.f1.stance !== "unknown" && uiInputs.f1.stance !== "Unknown";
    const styleValid2 = uiInputs.f2.stance && uiInputs.f2.stance !== "unknown" && uiInputs.f2.stance !== "Unknown";
    const styleScore1 = (styleValid1 && styleValid2) ? (uiInputs.f1.movement.length * 2) + 5 : null;
    const styleScore2 = (styleValid1 && styleValid2) ? (uiInputs.f2.movement.length * 2) + 5 : null;
    
    evalCategory("style", "Style", styleScore1, styleScore2, "Strategic Setup", "Strategic Setup", (v1, v2) => ({ f1Share: 0.5, f2Share: 0.5 }));

    const h1 = uiInputs.f1.height || dbF1.height;
    const h2 = uiInputs.f2.height || dbF2.height;
    const r1 = uiInputs.f1.reach || dbF1.reach;
    const r2 = uiInputs.f2.reach || dbF2.reach;
    const totalBio1 = (h1 && r1) ? (h1 + r1) : null;
    const totalBio2 = (h2 && r2) ? (h2 + r2) : null;
    
    evalCategory("heightReach", "Height & Reach", totalBio1, totalBio2, `${h1}" / ${r1}"`, `${h2}" / ${r2}"`, (v1, v2) => {
        return { f1Share: v1 / ((v1 + v2) || 1), f2Share: v2 / ((v1 + v2) || 1) };
    });

    const w1 = uiInputs.f1.weight || dbF1.weight;
    const w2 = uiInputs.f2.weight || dbF2.weight;
    
    evalCategory("weight", "Effective Mass", w1, w2, `${w1} kg`, `${w2} kg`, (v1, v2) => {
        let share1 = v1 / (v1 + v2);
        let share2 = v2 / (v1 + v2);

        const checkBadWeight = (fighterWeight, oppWeight, cardio, ath) => {
            if (fighterWeight > oppWeight * 1.05) { 
                if (cardio !== null && ath !== null) {
                    const fitness = (cardio + ath) / 2;
                    if (fitness < 5) return true; // Too heavy, lacking fitness
                }
            }
            return false;
        };

        const f1BadWeight = checkBadWeight(v1, v2, uiInputs.f1.cardio, uiInputs.f1.athleticism);
        const f2BadWeight = checkBadWeight(v2, v1, uiInputs.f2.cardio, uiInputs.f2.athleticism);

        if (f1BadWeight && !f2BadWeight) {
            share1 = 0.40; share2 = 0.60; 
        } else if (f2BadWeight && !f1BadWeight) {
            share1 = 0.60; share2 = 0.40;
        } else {
            if (v1 > v2) { share1 += 0.05; share2 -= 0.05; }
            else if (v2 > v1) { share2 += 0.05; share1 -= 0.05; }
        }

        return { 
            f1Share: Math.max(0, Math.min(1, share1)), 
            f2Share: Math.max(0, Math.min(1, share2)) 
        };
    });

// PHYSICAL ATTRIBUTE SLIDERS
    ["athleticism", "cardio", "ko"].forEach(key => {
        let numericV1 = uiInputs.f1[key]; // Returns NULL if checkbox is OFF
        let numericV2 = uiInputs.f2[key]; // Returns NULL if checkbox is OFF

        evalCategory(key, key.charAt(0).toUpperCase() + key.slice(1), numericV1, numericV2, `${numericV1}/10`, `${numericV2}/10`, (a, b) => {
            return { f1Share: a / ((a + b) || 1), f2Share: b / ((a + b) || 1) };
        });
    });

    // ==========================================
    // 4. MATHEMATICAL AGGREGATION & WINNER OUTCOME
    // ==========================================
    
    const voidedPercentage = Math.round((voidedWeightPool / dynamicMaxEngineWeight) * 100);
    const computerCertaintyPercentage = Math.max(0, 100 - voidedPercentage);

    let aggregateF1Gained = categoryBreakdowns.reduce((sum, item) => sum + item.f1Gain, 0);
    let aggregateF2Gained = categoryBreakdowns.reduce((sum, item) => sum + item.f2Gain, 0);

    let finalF1Percentage = 50;
    let finalF2Percentage = 50;

    if ((aggregateF1Gained + aggregateF2Gained) > 0) {
        finalF1Percentage = Math.round((aggregateF1Gained / (aggregateF1Gained + aggregateF2Gained)) * 100);
        finalF2Percentage = 100 - finalF1Percentage;
    }

    let winnerName = finalF1Percentage >= finalF2Percentage ? name1 : name2;
    let winningPercentage = finalF1Percentage >= finalF2Percentage ? finalF1Percentage : finalF2Percentage;
    
    // Adjusted confidence rating based on data retention
    let confidenceRating = "Low (Missing Critical Data)";
    let confidenceColor = "#ef4444"; // red
    if (computerCertaintyPercentage > 85) {
        confidenceRating = "High Data Core Reliability";
        confidenceColor = "#22c55e"; // green
    } else if (computerCertaintyPercentage > 60) {
        confidenceRating = "Moderate Baseline Weight";
        confidenceColor = "#eab308"; // yellow
    }

    document.querySelectorAll('.card').forEach(el => {
        if (!el.contains(document.getElementById("predictionResults"))) el.style.display = 'none';
    });

    renderTrueMatchupView(name1, name2, finalF1Percentage, finalF2Percentage, computerCertaintyPercentage, voidedPercentage, winnerName, winningPercentage, confidenceRating, confidenceColor, categoryBreakdowns);
}

// ==========================================
// 5. CLEAN MATRIX RENDER VIEW
// ==========================================
function renderTrueMatchupView(name1, name2, f1Chance, f2Chance, certainty, voidedPercent, winner, winPercent, confidence, confColor, breakdowns) {

    const resultsContainer = document.getElementById("predictionResults");
    if (!resultsContainer) return;

    const btn = document.getElementById("calculatePrediction");
    const cards = document.querySelectorAll(".card");
    const searchInputs = document.querySelectorAll(".search-container input");
    const resultsDiv = document.getElementById("predictionResults");

    // ADD THESE:
    const f1Width = f1Chance;
    const f2Width = f2Chance;
    const voidWidth = voidedPercent;


    let rowsHtml = breakdowns
.filter(row =>
    row.val1 !== null &&
    row.val2 !== null &&
    row.val1 !== "" &&
    row.val2 !== "" &&
    row.val1 !== "Unknown" &&
    row.val2 !== "Unknown"
)
.map(row => {
        let f1Col = row.status === "f1_win" ? "#22c55e" : (row.status === "f2_win" ? "#ef4444" : "#9ca3af");
        let f2Col = row.status === "f2_win" ? "#22c55e" : (row.status === "f1_win" ? "#ef4444" : "#9ca3af");
        let arrow1 = row.status === "f1_win" ? "▲" : (row.status === "f2_win" ? "▼" : "-");
        let arrow2 = row.status === "f2_win" ? "▲" : (row.status === "f1_win" ? "▼" : "-");

        return `
            <div style="display: grid; grid-template-columns: 1.2fr 40px 1.5fr 40px 1.2fr; align-items: center; padding: 14px 0; border-bottom: 1px solid #2d2d2d; text-align: center; font-size: 15px;">
                <div style="text-align: right; font-weight: bold; color: ${f1Col}; padding-right: 15px;">${row.val1}</div>
                <div style="font-size: 16px; text-align: right; color: ${f1Col};">${arrow1}</div>
                <div style="font-weight: bold; color: #9ca3af; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px;">${row.label}</div>
                <div style="font-size: 16px; text-align: left; color: ${f2Col};">${arrow2}</div>
                <div style="text-align: left; font-weight: bold; color: ${f2Col}; padding-left: 15px;">${row.val2}</div>
            </div>
        `;
    }).join('');

    resultsContainer.innerHTML = `
        <div class="card" style="margin-top:20px; background: #121212; border: 1px solid #d4af37; border-radius: 8px; padding: 25px; color: #fff;">
            
            <div style="background: linear-gradient(135deg, #1e1b4b, #311042); border-left: 5px solid #d4af37; padding: 20px; border-radius: 6px; margin-bottom: 25px; text-align: center;">
                <h2 style="margin: 0 0 5px 0; color: #fff; font-size: 24px;">🥊 Winner: <span style="color: #d4af37;">${winner}</span></h2>
                <h4 style="margin: 0 0 15px 0; color: #e2e8f0;">Win Probability: <strong>${winPercent}%</strong></h4>
                
                <div style="background: #000; display: inline-block; padding: 8px 15px; border-radius: 5px; border: 1px solid #333; font-size: 13px;">
                    <span style="color: #9ca3af;">Certainty: <strong style="color:${confColor};">${certainty}%</strong> (${confidence})</span>
                    <span style="color: #9ca3af; margin-left: 15px;">Void: <strong style="color:#ef4444;">${voidedPercent}%</strong></span>
                </div>
            </div>

            <div style="display:flex; height:40px; border-radius:6px; overflow:hidden; background:#222; margin-bottom:25px; border: 1px solid #333;">
                ${f1Width > 0 ? `<div style="width: ${f1Width}%; background: #2563eb; display: flex; align-items: center; justify-content: center; font-weight: bold;">${f1Chance}%</div>` : ''}
                ${voidWidth > 0 ? `<div style="width: ${voidWidth}%; background: #4b5563; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">VOID ${voidWidth}%</div>` : ''}
                ${f2Width > 0 ? `<div style="width: ${f2Width}%; background: #dc2626; display: flex; align-items: center; justify-content: center; font-weight: bold;">${f2Chance}%</div>` : ''}
            </div>

            <div style="margin-top: 5px;">${rowsHtml}</div>
        </div>
    `;

    if (!isShowingResults) {
    // --- PUT YOUR EXISTING CALCULATION MATH HERE ---

    // 1. Hide the input cards and show the results
    cards.forEach(card => card.style.display = 'none');
    resultsDiv.style.display = 'block';
    
    // 2. Disable search bars so they are forced to go back
    searchInputs.forEach(input => input.disabled = true);
    
    // 3. Change button text
    btn.innerText = "Go Back";
    isShowingResults = true;

  } else {
    // --- "GO BACK" LOGIC ---
    
    // 1. Bring the input cards back and hide results
    cards.forEach(card => card.style.display = 'block');
    resultsDiv.style.display = 'none';
    
    // 2. Re-enable search bars
    searchInputs.forEach(input => input.disabled = false);
    
    // 3. Revert button text
    btn.innerText = "Calculate Prediction";
    isShowingResults = false;
  }
}

// ==========================================
// DETAILED PARSERS & ENGINE HELPERS
// ==========================================
function parseHistoryStats(historyArray, fighterObj) {

    let wins = fighterObj?.wins || 0;
    let losses = fighterObj?.losses || 0;
    let kos = fighterObj?.kos || 0;
    let koLosses = fighterObj?.koLosses || 0;

    if (historyArray && historyArray.length) {

        wins = 0;
        losses = 0;
        kos = 0;
        koLosses = 0;

        historyArray.forEach(fight => {

            const outcome = (fight.outcome || fight.result || "").toLowerCase();
            const method = (fight.method || "").toLowerCase();

            if (outcome === "win") {

                wins++;

                if (method.includes("ko") || method.includes("tko"))
                    kos++;

            }

            else if (outcome === "loss") {

                losses++;

                if (method.includes("ko") || method.includes("tko"))
                    koLosses++;

            }

        });

    }

    const total = wins + losses;

    return {

        totalFights: total,

        winRatio: total ? wins / total : null,

        koRatio: wins ? kos / wins : null,

        koLossRatio: losses ? koLosses / losses : null,

        recordStr: `${wins}-${losses}`

    };

}

function calculateMomentumScore(historyArray, fighterObj) {
    const wins = fighterObj?.wins || 0;
    const losses = fighterObj?.losses || 0;
    const totalFights = wins + losses || 1;
    
    let momentum = 50; 
    
    if (historyArray && historyArray.length > 0) {
        const recentFights = historyArray.slice(-5);
        recentFights.forEach((fight, index) => {
            const recencyWeight = (index + 1); 
            const outcome = (fight.outcome || fight.result || "").toLowerCase();
            const method = (fight.method || "").toLowerCase();
            
            if (outcome === 'win') {
                momentum += recencyWeight * 4;
                if (method.includes('ko') || method.includes('tko')) momentum += 3;
            } else if (outcome === 'loss') {
                momentum -= recencyWeight * 3;
            }
        });
    } else {
        const winRatio = wins / totalFights;
        const deterministicMod = ((wins * 3) + (losses * 2)) % 9;
        momentum = Math.round(45 + (winRatio * 40) + deterministicMod); 
    }
    
    return Math.max(35, Math.min(95, momentum));
}

function evaluateSharedHistory(f1, f2) {
    const hist1 = f1?.history || [];
    const hist2 = f2?.history || [];
    let f1Score = 0;
    let f2Score = 0;
    let hasData = false;

    // 1. Direct Matchups
    hist1.forEach(fight => {
        if (fight.opponentName?.toLowerCase() === f2.name?.toLowerCase() || fight.opponentId === f2.id) {
            hasData = true;
            if ((fight.outcome || "").toLowerCase() === "win") f1Score += 5;
            else if ((fight.outcome || "").toLowerCase() === "loss") f2Score += 5;
        }
    });

    // 2. Shared Opponents
    const f1Opponents = hist1.map(f => f.opponentName?.toLowerCase()).filter(n => n);
    const shared = hist2.map(f => f.opponentName?.toLowerCase()).filter(n => n && f1Opponents.includes(n));
    const uniqueShared = [...new Set(shared)];

    uniqueShared.forEach(oppName => {
        hasData = true;
        const f1VsOpp = hist1.filter(f => f.opponentName?.toLowerCase() === oppName);
        const f2VsOpp = hist2.filter(f => f.opponentName?.toLowerCase() === oppName);

        const f1Wins = f1VsOpp.filter(f => (f.outcome || "").toLowerCase() === "win").length;
        const f2Wins = f2VsOpp.filter(f => (f.outcome || "").toLowerCase() === "win").length;

        if (f1Wins > f2Wins) f1Score += 3;
        else if (f2Wins > f1Wins) f2Score += 3;
        else {
            f1Score += 1;
            f2Score += 1;
        }
    });

    return { hasData, f1Score, f2Score };
}

function createFallbackProfile(name, elo, w, l, kos, age, h, r, kg) {
    return { name, elo, wins: w, losses: l, kos: kos, age, height: h, reach: r, weight: kg, history: [] };
}

window.restorePredictionInputs = function() {
    document.querySelectorAll('.card').forEach(el => el.style.display = 'block');
    const container = document.getElementById("predictionResults");
    if (container) container.innerHTML = "";
};

function getPredictionFormInputs() {
    const processSide = (prefix, extraPrefix) => {
        const athKnown = document.getElementById("toggle_athleticism")?.checked || false;
        const carKnown = document.getElementById("toggle_cardio")?.checked || false;
        const chinKnown = document.getElementById("toggle_chin")?.checked || false;
        const koKnown = document.getElementById("toggle_ko")?.checked || false;

        return {
            stance: document.getElementById(`${prefix}_stance`)?.value || "",
            movement: typeof getSelectedCheckboxes === 'function' ? getSelectedCheckboxes(`multiselect_${prefix}_movement`) : [],
            range: document.getElementById(`${prefix}_range`)?.value || "",
            
            age: document.getElementById(`${extraPrefix}_age`)?.value ? Math.max(16, Math.abs(parseInt(document.getElementById(`${extraPrefix}_age`).value))) : null,
            height: document.getElementById(`${extraPrefix}_height`)?.value ? Math.max(1, Math.abs(parseFloat(document.getElementById(`${extraPrefix}_height`).value))) : null,
            reach: document.getElementById(`${extraPrefix}_reach`)?.value ? Math.max(1, Math.abs(parseFloat(document.getElementById(`${extraPrefix}_reach`).value))) : null,
            weight: document.getElementById(`${extraPrefix}_weight`)?.value ? Math.max(1, Math.abs(parseFloat(document.getElementById(`${extraPrefix}_weight`).value))) : null,
            
            // Here is the missing part that gets the values from the sliders!
            athleticism: athKnown ? parseInt(document.getElementById(`${extraPrefix}_athleticism`).value) : null,
            cardio: carKnown ? parseInt(document.getElementById(`${extraPrefix}_cardio`).value) : null,
            chin: chinKnown ? parseInt(document.getElementById(`${extraPrefix}_chin`).value) : null,
            ko: koKnown ? parseInt(document.getElementById(`${extraPrefix}_ko`).value) : null
        };
    };

    return {
        f1: processSide('style1', 'extra1'),
        f2: processSide('style2', 'extra2')
    };
}

function getSelectedCheckboxes(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll("input[type='checkbox']:checked")).map(cb => cb.value);
}

function findFighterInApplication(name) {
    if (window.fighters && Array.isArray(window.fighters)) {
        return window.fighters.find(f => f.name?.toLowerCase() === name.toLowerCase());
    }
    return null;
}