// ==========================================
// PREDICTION SYSTEM — UI STATE & EVENT LOGIC
// ==========================================

let predictionSelection = {
    fighter1: null,
    fighter2: null
};

function initSlidersOnLoad() {
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

    if (predictionSelection.fighter1 && inputEl.value !== predictionSelection.fighter1.name) {
        document.getElementById("styleName1").innerHTML = "Fighter 1";
        document.querySelectorAll(".fighter-name-label-1").forEach(el => el.innerHTML = "Fighter 1");
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
// SELECTION MANAGEMENT
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

    ['athleticism', 'cardio', 'durability'].forEach(attr => {
        let toggle = document.getElementById(`toggle_${attr}`);
        if (toggle && toggle.checked) {
            toggle.checked = false;
            toggleSliderInput(attr);
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
// CUSTOM INTERACTIVE DROPDOWNS
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
// RANGE SLIDERS
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

// Mappings
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
        koPercentage: 25,
        chin: 25,
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
 * Main Calculation Engine
 */
let isShowingResults = false;

export function calculatePrediction() {
    const btn = document.getElementById('calculatePrediction');
    const cards = document.querySelectorAll('.card');
    const searchInputs = document.querySelectorAll('.search-container input');
    const resultsDiv = document.getElementById('predictionResults');

    if (isShowingResults) {
        cards.forEach(card => card.style.display = 'block');
        if (resultsDiv) resultsDiv.style.display = 'none';
        searchInputs.forEach(input => input.disabled = false);
        btn.innerText = "Calculate Prediction";
        isShowingResults = false;
        return;
    }

    const name1 = document.getElementById("predictionSearch1")?.value.trim() || "Fighter 1";
    const name2 = document.getElementById("predictionSearch2")?.value.trim() || "Fighter 2";

    let dbF1 = window.currentFighter1 || findFighterInApplication(name1);
    let dbF2 = window.currentFighter2 || findFighterInApplication(name2);

    if (!dbF1) dbF1 = createFallbackProfile(name1, 1134, 10, 1, 4, 26, 174, 175, 70); 
    if (!dbF2) dbF2 = createFallbackProfile(name2, 1109, 11, 4, 5, 32, 175, 176, 72);

    const uiInputs = getPredictionFormInputs();
    
    let dynamicMaxEngineWeight = Object.values(PREDICTION_CONFIG.weights).reduce((a, b) => a + b, 0);
    let voidedWeightPool = 0; 
    const categoryBreakdowns = [];

    // Category Evaluator
    function evalCategory(key, label, val1, val2, display1, display2, evaluationFn) {
        const categoryWeight = PREDICTION_CONFIG.weights[key] || 0;
        
        const isF1Known = val1 !== null && val1 !== undefined && val1 !== "" && val1 !== "unknown" && val1 !== "Unknown" && !Number.isNaN(val1);
        const isF2Known = val2 !== null && val2 !== undefined && val2 !== "" && val2 !== "unknown" && val2 !== "Unknown" && !Number.isNaN(val2);

        if (!isF1Known || !isF2Known) {
            voidedWeightPool += categoryWeight;
            return;
        }

        const result = evaluationFn(val1, val2, categoryWeight);
        
        if (key === "age" && result.isOmittedDraw) {
            return;
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

    // 1. ELO
    evalCategory("elo", "Elo Rating", dbF1.elo, dbF2.elo, dbF1.elo, dbF2.elo, (v1, v2) => {
        const expectedF1 = 1 / (1 + Math.pow(10, (v2 - v1) / 400));
        return { f1Share: expectedF1, f2Share: 1 - expectedF1 };
    });

    // 2. PARSE STATS
    const stats1 = parseHistoryStats(dbF1.history, dbF1);
    const stats2 = parseHistoryStats(dbF2.history, dbF2);

    // 3. WIN / LOSS RATIO
    const wlDisplay1 = `${Math.round(stats1.winRatio * 100)}% (${stats1.recordStr})`;
    const wlDisplay2 = `${Math.round(stats2.winRatio * 100)}% (${stats2.recordStr})`;
    evalCategory("winLossRatio", "Win/Loss Ratio", stats1.winRatio, stats2.winRatio, wlDisplay1, wlDisplay2, (v1, v2) => {
        const total = v1 + v2;
        if (total === 0) return { f1Share: 0.5, f2Share: 0.5 };
        return { f1Share: v1 / total, f2Share: v2 / total };
    });

    // 4. KO % (ALWAYS DISPLAYED & CALCULATED)
    evalCategory(
        "koPercentage",
        "KO %tage (from Wins)",
        stats1.koRatio,
        stats2.koRatio,
        `${Math.round(stats1.koRatio * 100)}%`,
        `${Math.round(stats2.koRatio * 100)}%`,
        (v1, v2) => {
            const total = v1 + v2;
            if (total === 0) return { f1Share: 0.5, f2Share: 0.5 };
            return { f1Share: v1 / total, f2Share: v2 / total };
        }
    );

    // 5. CHIN % (ALWAYS DISPLAYED & CALCULATED)
    evalCategory(
        "chin",
        "Chin Resilience (from Losses)",
        stats1.chinRatio,
        stats2.chinRatio,
        `${Math.round(stats1.chinRatio * 100)}%`,
        `${Math.round(stats2.chinRatio * 100)}%`,
        (v1, v2) => {
            const total = v1 + v2;
            if (total === 0) return { f1Share: 0.5, f2Share: 0.5 };
            return { f1Share: v1 / total, f2Share: v2 / total };
        }
    );

    // 6. EXPERIENCE
    evalCategory("experience", "Experience", stats1.totalFights, stats2.totalFights, `${stats1.totalFights} fights`, `${stats2.totalFights} fights`, (v1, v2) => {
        const total = v1 + v2;
        if (total === 0) return { f1Share: 0.5, f2Share: 0.5 };
        return { f1Share: v1 / total, f2Share: v2 / total };
    });

    // 7. MOMENTUM
    const mom1 = calculateMomentumScore(dbF1.history, dbF1);
    const mom2 = calculateMomentumScore(dbF2.history, dbF2);
    evalCategory("momentum", "Momentum", mom1, mom2, mom1 !== null ? `${mom1} pts` : "Unknown", mom2 !== null ? `${mom2} pts` : "Unknown", (v1, v2) => {
        const total = v1 + v2;
        if (total === 0) return { f1Share: 0.5, f2Share: 0.5 };
        return { f1Share: v1 / total, f2Share: v2 / total };
    });

    // 8. SHARED HISTORY & PREVIOUS BOUTS (ALWAYS DISPLAYED & CALCULATED)
    const shareMetric = evaluateSharedHistory(dbF1, dbF2);
    evalCategory(
        "pastMatchup",
        "Shared History & Prev Bouts",
        shareMetric.f1Score,
        shareMetric.f2Score,
        shareMetric.f1Display,
        shareMetric.f2Display,
        (v1, v2) => {
            if (!shareMetric.hasData) return { f1Share: 0.5, f2Share: 0.5 };
            const total = v1 + v2;
            if (total === 0) return { f1Share: 0.5, f2Share: 0.5 };
            return { f1Share: v1 / total, f2Share: v2 / total };
        }
    );

    // 9. AGE
    const age1 = uiInputs.f1.age || dbF1.age;
    const age2 = uiInputs.f2.age || dbF2.age;
    evalCategory("age", "Fight Age / Mileage", age1, age2, age1 ? `${age1} yrs` : "Unknown", age2 ? `${age2} yrs` : "Unknown", (a1, a2) => {
        const getAgeScore = (age, fights) => {
            let score = 100;
            if (age < 24) score -= (24 - age) * 4; 
            else if (age > 33) score -= (age - 33) * 6; 

            const totalF = fights || 0;
            if (age < 25 && totalF > 25) score += 10; 
            if (age > 34 && totalF < 15) score -= 15; 
            if (totalF > 40) score -= (totalF - 40) * 0.75; 

            return Math.max(10, Math.min(100, score));
        };

        const f1Score = getAgeScore(a1, stats1.totalFights);
        const f2Score = getAgeScore(a2, stats2.totalFights);

        if (Math.abs(f1Score - f2Score) < 5) {
            return { f1Share: 0.5, f2Share: 0.5, isOmittedDraw: true };
        }

        return { 
            f1Share: f1Score / (f1Score + f2Score), 
            f2Share: f2Score / (f1Score + f2Score),
            isOmittedDraw: false 
        };
    });

    // 10. STYLE
    const styleValid1 = uiInputs.f1.stance && uiInputs.f1.stance !== "unknown" && uiInputs.f1.stance !== "Unknown";
    const styleValid2 = uiInputs.f2.stance && uiInputs.f2.stance !== "unknown" && uiInputs.f2.stance !== "Unknown";
    const styleVal1 = styleValid1 ? 1 : null;
    const styleVal2 = styleValid2 ? 1 : null;
    evalCategory("style", "Style & Stance", styleVal1, styleVal2, uiInputs.f1.stance, uiInputs.f2.stance, () => ({ f1Share: 0.5, f2Share: 0.5 }));

    // 11. HEIGHT & REACH
    const h1 = uiInputs.f1.height || dbF1.height;
    const h2 = uiInputs.f2.height || dbF2.height;
    const r1 = uiInputs.f1.reach || dbF1.reach;
    const r2 = uiInputs.f2.reach || dbF2.reach;
    const totalBio1 = (h1 && r1) ? (h1 + r1) : null;
    const totalBio2 = (h2 && r2) ? (h2 + r2) : null;
    evalCategory("heightReach", "Height & Reach", totalBio1, totalBio2, `${h1 || '?'}cm / ${r1 || '?'}cm`, `${h2 || '?'}cm / ${r2 || '?'}cm`, (v1, v2) => {
        return { f1Share: v1 / (v1 + v2), f2Share: v2 / (v1 + v2) };
    });

    // 12. WEIGHT
    const w1 = uiInputs.f1.weight || dbF1.weight;
    const w2 = uiInputs.f2.weight || dbF2.weight;
    evalCategory("weight", "Effective Mass", w1, w2, w1 ? `${w1} kg` : "Unknown", w2 ? `${w2} kg` : "Unknown", (v1, v2) => {
        let share1 = v1 / (v1 + v2);
        let share2 = v2 / (v1 + v2);

        if (v1 > v2 * 1.05 && uiInputs.f1.cardio !== null && uiInputs.f1.cardio < 5) {
            share1 = 0.40; share2 = 0.60;
        } else if (v2 > v1 * 1.05 && uiInputs.f2.cardio !== null && uiInputs.f2.cardio < 5) {
            share1 = 0.60; share2 = 0.40;
        }

        return { f1Share: share1, f2Share: share2 };
    });

    // 13. PHYSICAL SLIDERS
    ["athleticism", "cardio", "durability"].forEach(key => {
        let numericV1 = uiInputs.f1[key]; 
        let numericV2 = uiInputs.f2[key]; 

        evalCategory(key, key.charAt(0).toUpperCase() + key.slice(1), numericV1, numericV2, `${numericV1}/10`, `${numericV2}/10`, (a, b) => {
            const total = a + b;
            if (total === 0) return { f1Share: 0.5, f2Share: 0.5 };
            return { f1Share: a / total, f2Share: b / total };
        });
    });

    // ==========================================
    // AGGREGATION & WINNER NORMALIZATION
    // ==========================================
    const voidedPercentage = Math.min(100, Math.max(0, Math.round((voidedWeightPool / dynamicMaxEngineWeight) * 100)));
    const activePercentage = 100 - voidedPercentage;

    let aggregateF1Gained = categoryBreakdowns.reduce((sum, item) => sum + item.f1Gain, 0);
    let aggregateF2Gained = categoryBreakdowns.reduce((sum, item) => sum + item.f2Gain, 0);
    const activeTotalGained = aggregateF1Gained + aggregateF2Gained;

    // Split including void for visual bar (adds up to 100%)
    let finalF1Percentage = 0;
    let finalF2Percentage = 0;

    if (activeTotalGained > 0 && activePercentage > 0) {
        const f1ShareOfActive = aggregateF1Gained / activeTotalGained;
        finalF1Percentage = Math.round(f1ShareOfActive * activePercentage);
        finalF2Percentage = activePercentage - finalF1Percentage; 
    } else if (activePercentage > 0) {
        finalF1Percentage = Math.round(activePercentage / 2);
        finalF2Percentage = activePercentage - finalF1Percentage;
    }

    // Normalized win probability EXCLUDING VOID (for the Banner display)
    let activeF1WinProb = 50;
    let activeF2WinProb = 50;

    if (activeTotalGained > 0) {
        activeF1WinProb = Math.round((aggregateF1Gained / activeTotalGained) * 100);
        activeF2WinProb = 100 - activeF1WinProb;
    }

    let winnerName = "Draw / Even";
    let bannerWinPercent = activeF1WinProb;

    if (aggregateF1Gained > aggregateF2Gained) {
        winnerName = name1;
        bannerWinPercent = activeF1WinProb;
    } else if (aggregateF2Gained > aggregateF1Gained) {
        winnerName = name2;
        bannerWinPercent = activeF2WinProb;
    }

    let confidenceRating = "Low Data Reliability";
    let confidenceColor = "#ef4444";
    if (activePercentage > 85) {
        confidenceRating = "High Data Reliability";
        confidenceColor = "#22c55e";
    } else if (activePercentage > 60) {
        confidenceRating = "Moderate Data Reliability";
        confidenceColor = "#eab308";
    }

    cards.forEach(el => el.style.display = 'none');
    searchInputs.forEach(input => input.disabled = true);
    if (resultsDiv) resultsDiv.style.display = 'block';

    btn.innerText = "Go Back";
    isShowingResults = true;

    renderMatchupResultsView(name1, name2, finalF1Percentage, finalF2Percentage, activePercentage, voidedPercentage, winnerName, bannerWinPercent, confidenceRating, confidenceColor, categoryBreakdowns);
}

// ==========================================
// RESULTS VIEW RENDER
// ==========================================
function renderMatchupResultsView(name1, name2, f1OverallPercent, f2OverallPercent, activePercent, voidedPercent, winnerName, bannerWinPercent, confidence, confColor, breakdowns) {
    const resultsContainer = document.getElementById("predictionResults");
    if (!resultsContainer) return;

    let rowsHtml = breakdowns
        .filter(row => row.val1 !== null && row.val2 !== null && row.val1 !== "" && row.val2 !== "" && row.val1 !== "Unknown" && row.val2 !== "Unknown")
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
            
            <!-- BANNER HEADER -->
            <div style="background: linear-gradient(135deg, #1e1b4b, #311042); border-left: 5px solid #d4af37; padding: 20px; border-radius: 6px; margin-bottom: 25px; text-align: center;">
                <h2 style="margin: 0 0 5px 0; color: #fff; font-size: 24px;">Predicted Winner — <span style="color: #d4af37;">${winnerName}</span></h2>
                <h4 style="margin: 0 0 15px 0; color: #e2e8f0;">Win Probability: <strong>${bannerWinPercent}%</strong></h4>
                
                <div style="background: #000; display: inline-block; padding: 8px 15px; border-radius: 5px; border: 1px solid #333; font-size: 13px;">
                    <span style="color: #9ca3af;">Data Active: <strong style="color:${confColor};">${activePercent}%</strong> (${confidence})</span>
                    <span style="color: #9ca3af; margin-left: 15px;">Voided: <strong style="color:#ef4444;">${voidedPercent}%</strong></span>
                </div>
            </div>

            <!-- VISUAL TOTAL SPLIT BAR (INCLUDES VOID) -->
            <div style="display:flex; height:40px; border-radius:6px; overflow:hidden; background:#222; margin-bottom:25px; border: 1px solid #333;">
                ${f1OverallPercent > 0 ? `<div style="width: ${f1OverallPercent}%; background: #2563eb; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; font-size: 13px;">${name1}: ${f1OverallPercent}%</div>` : ''}
                ${voidedPercent > 0 ? `<div style="width: ${voidedPercent}%; background: #4b5563; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: bold;">VOID ${voidedPercent}%</div>` : ''}
                ${f2OverallPercent > 0 ? `<div style="width: ${f2OverallPercent}%; background: #dc2626; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #fff; font-size: 13px;">${name2}: ${f2OverallPercent}%</div>` : ''}
            </div>

            <div style="margin-top: 5px;">${rowsHtml}</div>
        </div>
    `;
}

// ==========================================
// PARSERS & HELPERS
// ==========================================
function parseHistoryStats(historyArray, fighterObj) {
    let wins = fighterObj?.wins ?? fighterObj?.win ?? null;
    let losses = fighterObj?.losses ?? fighterObj?.loss ?? null;
    let kos = fighterObj?.kos ?? fighterObj?.koWins ?? fighterObj?.ko_wins ?? fighterObj?.ko ?? null;
    let koLosses = fighterObj?.koLosses ?? fighterObj?.ko_losses ?? null;

    let derivedWins = 0;
    let derivedLosses = 0;
    let derivedKos = 0;
    let derivedKoLosses = 0;
    const hasHistory = Array.isArray(historyArray) && historyArray.length > 0;

    if (hasHistory) {
        historyArray.forEach(fight => {
            const outcome = String(fight.outcome || fight.result || fight.status || (fight.win ? "win" : (fight.loss ? "loss" : ""))).toLowerCase();
            const method = String(fight.method || fight.winMethod || fight.win_method || fight.finish || fight.ending || fight.via || fight.type || "").toLowerCase();

            const isKO = /(ko|tko|knockout|stoppage|punches|strikes|head kick)/i.test(method);

            if (outcome.includes("win") || fight.winner === fighterObj?.name || fight.win === true) {
                derivedWins++;
                if (isKO) derivedKos++;
            } else if (outcome.includes("loss") || outcome.includes("lost") || fight.loss === true) {
                derivedLosses++;
                if (isKO) derivedKoLosses++;
            }
        });

        if (derivedWins > 0 || derivedLosses > 0) {
            wins = derivedWins;
            losses = derivedLosses;
            kos = derivedKos;
            koLosses = derivedKoLosses;
        }
    }

    wins = Number(wins) || 0;
    losses = Number(losses) || 0;

    if (kos === null || kos === undefined) {
        if (fighterObj?.koPercentage || fighterObj?.ko_pct) {
            const pct = parseFloat(fighterObj.koPercentage || fighterObj.ko_pct);
            kos = Math.round((pct > 1 ? pct / 100 : pct) * wins);
        } else {
            kos = Math.round(wins * 0.4); // Default 40% KO rate estimate
        }
    } else {
        kos = Number(kos) || 0;
    }

    if (koLosses === null || koLosses === undefined) {
        if (fighterObj?.chinPercentage || fighterObj?.chin_pct) {
            const chinPct = parseFloat(fighterObj.chinPercentage || fighterObj.chin_pct);
            const koLossRatio = 1 - (chinPct > 1 ? chinPct / 100 : chinPct);
            koLosses = Math.round(koLossRatio * losses);
        } else {
            koLosses = losses > 0 ? Math.round(losses * 0.3) : 0; // Default 30% KO loss rate estimate
        }
    } else {
        koLosses = Number(koLosses) || 0;
    }

    const total = wins + losses;
    const winRatio = total > 0 ? (wins / total) : 0.5;
    
    // KO% calculated from Wins
    const koRatio = wins > 0 ? Math.min(1.0, kos / wins) : (total > 0 ? Math.min(1.0, kos / total) : 0.4);

    // Chin Resilience calculated from Losses
    const chinRatio = losses > 0 ? Math.max(0, 1 - (koLosses / losses)) : 0.85;

    return {
        wins,
        losses,
        kos,
        koLosses,
        totalFights: total,
        winRatio,
        koRatio,
        chinRatio,
        recordStr: `${wins}-${losses}`
    };
}

function calculateMomentumScore(historyArray, fighterObj) {
    if (!historyArray || historyArray.length === 0) {
        if (fighterObj && fighterObj.wins !== undefined && fighterObj.losses !== undefined) {
            const wins = fighterObj.wins || 0;
            const losses = fighterObj.losses || 0;
            const total = wins + losses;
            return total > 0 ? Math.round(50 + ((wins / total) * 30)) : null;
        }
        return null;
    }

    let momentum = 50;
    const recentFights = historyArray.slice(-5);
    recentFights.forEach((fight, index) => {
        const weight = (index + 1);
        const outcome = String(fight.outcome || fight.result || "").toLowerCase();
        const method = String(fight.method || "").toLowerCase();
        const isKO = /(ko|tko|knockout|stoppage)/i.test(method);

        if (outcome.includes("win") || fight.win === true) {
            momentum += weight * 4;
            if (isKO) momentum += 2;
        } else if (outcome.includes("loss") || fight.loss === true) {
            momentum -= weight * 3;
        }
    });

    return Math.max(10, Math.min(100, momentum));
}

function normalizeName(str) {
    if (!str) return "";
    return String(str)
        .toLowerCase()
        .replace(/\(.*?\)|'.*?'|".*?"/g, "")
        .replace(/[^a-z0-9\s]/g, "")
        .trim()
        .replace(/\s+/g, " ");
}

function isNameMatch(nameA, nameB) {
    const a = normalizeName(nameA);
    const b = normalizeName(nameB);
    if (!a || !b) return false;
    return a === b || a.includes(b) || b.includes(a);
}

function evaluateSharedHistory(f1, f2) {
    const hist1 = Array.isArray(f1?.history) ? f1.history : [];
    const hist2 = Array.isArray(f2?.history) ? f2.history : [];
    let f1Score = 0;
    let f2Score = 0;
    let hasData = false;
    const directBouts = [];
    const sharedOpps = [];

    const id1 = f1?.id;
    const id2 = f2?.id;
    const name1 = f1?.name || "";
    const name2 = f2?.name || "";

    // 1. Enhanced opponent parser to handle nested objects
    const getOpponent = (fight) => {
        if (!fight) return { name: "", id: null };
        let oppName = fight.opponentName || fight.opponent_name || fight.oppName || fight.vs || fight.against || fight.fighter2 || "";
        let oppId = fight.opponentId || fight.opponent_id || fight.opp_id || null;

        if (fight.opponent) {
            if (typeof fight.opponent === 'string') {
                oppName = oppName || fight.opponent;
            } else if (typeof fight.opponent === 'object') {
                oppName = oppName || fight.opponent.name || fight.opponent.fighterName || fight.opponent.last_name || "";
                oppId = oppId || fight.opponent.id || fight.opponent.fighterId || fight.opponent._id || null;
            }
        }
        return { name: String(oppName).trim(), id: oppId };
    };

    // 2. Aggressive outcome checker to catch "W", "L", and object-based winners
    const getOutcomeFlags = (fight, baseName, oppName) => {
        const outcomeStr = String(fight.outcome || fight.result || fight.status || fight.decision || "").toLowerCase().trim();
        let baseWon = outcomeStr === "w" || outcomeStr.includes("win") || outcomeStr.includes("victory") || fight.win === true;
        let baseLost = outcomeStr === "l" || outcomeStr.includes("loss") || outcomeStr.includes("defeat") || fight.loss === true;
        
        if (fight.winner) {
            const winnerName = typeof fight.winner === 'object' ? (fight.winner.name || "") : String(fight.winner);
            if (isNameMatch(winnerName, baseName)) { baseWon = true; baseLost = false; }
            else if (isNameMatch(winnerName, oppName)) { baseLost = true; baseWon = false; }
        }
        
        return { baseWon, baseLost };
    };

    let directBoutsFound = false;

    // 3. Direct Head-to-Head (Check Fighter 1's History)
    hist1.forEach(fight => {
        const opp = getOpponent(fight);
        const isMatch = (id2 && opp.id && String(id2) === String(opp.id)) || (name2 && isNameMatch(opp.name, name2));

        if (isMatch) {
            hasData = true;
            directBoutsFound = true;
            const method = String(fight.method || fight.winMethod || fight.finish || fight.type || "").toLowerCase();
            const isKO = /(ko|tko|knockout|stoppage)/i.test(method);
            const { baseWon, baseLost } = getOutcomeFlags(fight, name1, name2);

            if (baseWon) {
                f1Score += isKO ? 15 : 10;
                directBouts.push(`${f1.name} W`);
            } else if (baseLost) {
                f2Score += isKO ? 15 : 10;
                directBouts.push(`${f2.name} W`);
            } else {
                f1Score += 5; f2Score += 5;
                directBouts.push("Draw");
            }
        }
    });

    // 4. Fallback: If not found in F1's history, check F2's history
    if (!directBoutsFound) {
        hist2.forEach(fight => {
            const opp = getOpponent(fight);
            const isMatch = (id1 && opp.id && String(id1) === String(opp.id)) || (name1 && isNameMatch(opp.name, name1));

            if (isMatch) {
                hasData = true;
                const method = String(fight.method || fight.winMethod || fight.finish || fight.type || "").toLowerCase();
                const isKO = /(ko|tko|knockout|stoppage)/i.test(method);
                const { baseWon, baseLost } = getOutcomeFlags(fight, name2, name1); // Base is F2 here

                if (baseWon) { // F2 Won
                    f2Score += isKO ? 15 : 10;
                    directBouts.push(`${f2.name} W`);
                } else if (baseLost) { // F1 Won
                    f1Score += isKO ? 15 : 10;
                    directBouts.push(`${f1.name} W`);
                } else {
                    f1Score += 5; f2Score += 5;
                    directBouts.push("Draw");
                }
            }
        });
    }

    // 5. Shared Common Opponents
    const f1OppMap = new Map();
    hist1.forEach(fight => {
        const opp = getOpponent(fight);
        if (opp.id || opp.name) {
            if ((id2 && opp.id && String(id2) === String(opp.id)) || (name2 && isNameMatch(opp.name, name2))) return;
            const key = opp.id ? `id_${opp.id}` : `name_${normalizeName(opp.name)}`;
            if (key && key !== "name_") {
                if (!f1OppMap.has(key)) f1OppMap.set(key, { name: opp.name, fights: [] });
                f1OppMap.get(key).fights.push(fight);
            }
        }
    });

    const f2OppMap = new Map();
    hist2.forEach(fight => {
        const opp = getOpponent(fight);
        if (opp.id || opp.name) {
            if ((id1 && opp.id && String(id1) === String(opp.id)) || (name1 && isNameMatch(opp.name, name1))) return;
            const key = opp.id ? `id_${opp.id}` : `name_${normalizeName(opp.name)}`;
            if (key && key !== "name_") {
                if (!f2OppMap.has(key)) f2OppMap.set(key, { name: opp.name, fights: [] });
                f2OppMap.get(key).fights.push(fight);
            }
        }
    });

    f1OppMap.forEach((f1Data, key) => {
        let f2Data = f2OppMap.get(key);
        if (!f2Data && key.startsWith("name_")) {
            for (let [k, v] of f2OppMap.entries()) {
                if (isNameMatch(v.name, f1Data.name)) {
                    f2Data = v;
                    break;
                }
            }
        }

        if (f2Data) {
            hasData = true;
            const oppDisplayName = f1Data.name || f2Data.name;

            let f1Pts = 0;
            f1Data.fights.forEach(f => {
                const method = String(f.method || f.winMethod || f.finish || f.type || "").toLowerCase();
                const isKO = /(ko|tko|knockout|stoppage)/i.test(method);
                const { baseWon, baseLost } = getOutcomeFlags(f, name1, oppDisplayName);
                if (baseWon) f1Pts += isKO ? 5 : 3;
                else if (!baseLost) f1Pts += 1;
            });

            let f2Pts = 0;
            f2Data.fights.forEach(f => {
                const method = String(f.method || f.winMethod || f.finish || f.type || "").toLowerCase();
                const isKO = /(ko|tko|knockout|stoppage)/i.test(method);
                const { baseWon, baseLost } = getOutcomeFlags(f, name2, oppDisplayName);
                if (baseWon) f2Pts += isKO ? 5 : 3;
                else if (!baseLost) f2Pts += 1;
            });

            const f1Avg = f1Pts / f1Data.fights.length;
            const f2Avg = f2Pts / f2Data.fights.length;

            if (f1Avg > f2Avg) f1Score += 5;
            else if (f2Avg > f1Avg) f2Score += 5;
            else { f1Score += 2; f2Score += 2; }

            sharedOpps.push(oppDisplayName);
        }
    });

    let f1Display = "None Shared";
    let f2Display = "None Shared";

    if (hasData) {
        f1Display = `+${f1Score} pts`;
        f2Display = `+${f2Score} pts`;
        if (directBouts.length > 0) {
            f1Display += ` (${directBouts.length} direct bout${directBouts.length > 1 ? 's' : ''})`;
            f2Display += ` (${directBouts.length} direct bout${directBouts.length > 1 ? 's' : ''})`;
        } else if (sharedOpps.length > 0) {
            f1Display += ` (${sharedOpps.length} shared opp${sharedOpps.length > 1 ? 's' : ''})`;
            f2Display += ` (${sharedOpps.length} shared opp${sharedOpps.length > 1 ? 's' : ''})`;
        }
    }

    return { hasData, f1Score, f2Score, f1Display, f2Display };
}

function createFallbackProfile(name, elo, w, l, kos, age, h, r, kg) {
    return { name, elo, wins: w, losses: l, kos: kos, koLosses: Math.round(l * 0.3), age, height: h, reach: r, weight: kg, history: [] };
}

function parsePositiveNum(id) {
    const el = document.getElementById(id);
    if (!el || el.value === "" || el.value === null) return null;
    const num = parseFloat(el.value);
    return isNaN(num) || num < 0 ? null : num;
}

function getPredictionFormInputs() {
    const processSide = (prefix, extraPrefix) => {
        const athKnown = document.getElementById("toggle_athleticism")?.checked || false;
        const carKnown = document.getElementById("toggle_cardio")?.checked || false;
        const durKnown = document.getElementById("toggle_durability")?.checked || false;

        return {
            stance: document.getElementById(`${prefix}_stance`)?.value || "",
            range: document.getElementById(`${prefix}_range`)?.value || "",
            age: parsePositiveNum(`${extraPrefix}_age`),
            height: parsePositiveNum(`${extraPrefix}_height`),
            reach: parsePositiveNum(`${extraPrefix}_reach`),
            weight: parsePositiveNum(`${extraPrefix}_weight`),
            athleticism: athKnown ? parseInt(document.getElementById(`${extraPrefix}_athleticism`).value) : null,
            cardio: carKnown ? parseInt(document.getElementById(`${extraPrefix}_cardio`).value) : null,
            durability: durKnown ? parseInt(document.getElementById(`${extraPrefix}_durability`).value) : null
        };
    };

    return {
        f1: processSide('style1', 'extra1'),
        f2: processSide('style2', 'extra2')
    };
}

function findFighterInApplication(name) {
    if (window.fighters && Array.isArray(window.fighters)) {
        return window.fighters.find(f => f.name?.toLowerCase() === name.toLowerCase());
    }
    return null;
}

window.restorePredictionInputs = function() {
    document.querySelectorAll('.card').forEach(el => el.style.display = 'block');
    const container = document.getElementById("predictionResults");
    if (container) container.innerHTML = "";
};