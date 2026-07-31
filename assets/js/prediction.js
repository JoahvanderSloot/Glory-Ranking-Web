// ==========================================
// PREDICTION SYSTEM — UI STATE & EVENT LOGIC
// ==========================================

let predictionSelection = {
    fighter1: null,
    fighter2: null
};

let currentPredictionSnapshot = null;
let savedPredictions = [];
let isSavedPredictionsDrawerOpen = false;

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function loadSavedPredictions() {
    const sessionMarker = sessionStorage.getItem("glory_prediction_library_session");
    if (sessionMarker) {
        savedPredictions = [];
        sessionStorage.removeItem("glory_prediction_library");
    } else {
        try {
            const raw = sessionStorage.getItem("glory_prediction_library");
            savedPredictions = raw ? JSON.parse(raw) : [];
        } catch (error) {
            savedPredictions = [];
        }
    }

    sessionStorage.setItem("glory_prediction_library_session", "active");
    renderSavedPredictionsDrawer();
}

function persistSavedPredictions() {
    sessionStorage.setItem("glory_prediction_library", JSON.stringify(savedPredictions));
    renderSavedPredictionsDrawer();
}

function openPredictionInfoModal() {
    const modal = document.getElementById("predictionInfoModal");
    if (modal) {
        modal.style.display = "flex";
    }
}

function closePredictionInfoModal() {
    const modal = document.getElementById("predictionInfoModal");
    if (modal) {
        modal.style.display = "none";
    }
}

function toggleSavedPredictionsDrawer(forceOpen) {
    const drawer = document.getElementById("savedPredictionsDrawer");
    if (!drawer) return;

    const shouldOpen = typeof forceOpen === "boolean" ? forceOpen : !drawer.classList.contains("open");
    drawer.classList.toggle("open", shouldOpen);
    drawer.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
    isSavedPredictionsDrawerOpen = shouldOpen;
}

function updateSavedPredictionsStatus(message) {
    const status = document.getElementById("savedPredictionsStatus");
    if (status) {
        status.textContent = message;
    }
}

function renderSavedPredictionsDrawer() {
    const drawer = document.getElementById("savedPredictionsDrawer");
    const list = document.getElementById("savedPredictionsList");
    if (!list) return;

    if (!savedPredictions.length) {
        list.innerHTML = '<div class="saved-predictions-empty">No saved predictions yet.</div>';
        updateSavedPredictionsStatus("Your saved predictions will appear here.");
        return;
    }

    list.innerHTML = savedPredictions.map((prediction, index) => {
        const breakdownDetails = (prediction.result?.breakdowns || [])
            .filter(item => item?.val1 !== null && item?.val2 !== null && item?.val1 !== "" && item?.val2 !== "" && item?.val1 !== "Unknown" && item?.val2 !== "Unknown")
            .map(item => `
                <div>${escapeHtml(item.label)}: ${escapeHtml(item.val1)} vs ${escapeHtml(item.val2)}</div>
            `).join("");

        return `
            <div class="saved-prediction-card">
                <div class="saved-prediction-top">
                    <strong>${escapeHtml(prediction.fighter1Name || "Fighter 1")} vs ${escapeHtml(prediction.fighter2Name || "Fighter 2")}</strong>
                    <span class="saved-prediction-badge">${escapeHtml(prediction.result?.winnerName || "Draw")}</span>
                </div>
                <div class="saved-prediction-meta">${escapeHtml(prediction.result?.bannerWinPercent || "0")}% win chance • ${escapeHtml(prediction.result?.activePercent || "0")}% active data</div>
                <div class="saved-prediction-breakdown">${breakdownDetails}</div>
                <div class="saved-prediction-actions">
                    <button type="button" onclick="loadSavedPrediction(${index})">Load</button>
                    <button type="button" onclick="deleteSavedPrediction(${index})">Delete</button>
                </div>
            </div>
        `;
    }).join("");

    updateSavedPredictionsStatus(`${savedPredictions.length} saved prediction${savedPredictions.length === 1 ? "" : "s"}`);

    if (drawer) {
        drawer.classList.toggle("open", isSavedPredictionsDrawerOpen);
    }
}

function buildCurrentPredictionSnapshot() {
    const button = document.getElementById("calculatePrediction");
    const currentResult = currentPredictionSnapshot?.result || {};

    return {
        fighter1Name: document.getElementById("predictionSearch1")?.value.trim() || "Fighter 1",
        fighter2Name: document.getElementById("predictionSearch2")?.value.trim() || "Fighter 2",
        fighter1Id: predictionSelection.fighter1?.id || null,
        fighter2Id: predictionSelection.fighter2?.id || null,
        formInputs: getPredictionFormInputs(),
        result: {
            f1OverallPercent: currentResult.f1OverallPercent,
            f2OverallPercent: currentResult.f2OverallPercent,
            activePercent: currentResult.activePercent,
            voidedPercent: currentResult.voidedPercent,
            winnerName: currentResult.winnerName,
            bannerWinPercent: currentResult.bannerWinPercent,
            confidence: currentResult.confidence,
            confColor: currentResult.confColor,
            breakdowns: currentResult.breakdowns || []
        },
        savedAt: new Date().toLocaleString(),
        buttonLabel: button?.innerText || "Go Back"
    };
}

function saveCurrentPrediction() {
    if (!currentPredictionSnapshot) {
        alert("Generate a prediction first before saving it.");
        return;
    }

    const snapshot = buildCurrentPredictionSnapshot();
    savedPredictions.unshift(snapshot);
    persistSavedPredictions();
    toggleSavedPredictionsDrawer(true);
    updateSavedPredictionsStatus("Saved to library and opened");
}

function applyPredictionSnapshot(snapshot) {
    if (!snapshot) return;

    document.getElementById("predictionSearch1").value = snapshot.fighter1Name || "";
    document.getElementById("predictionSearch2").value = snapshot.fighter2Name || "";

    predictionSelection.fighter1 = snapshot.fighter1Id ? { id: snapshot.fighter1Id, name: snapshot.fighter1Name || "Fighter 1" } : null;
    predictionSelection.fighter2 = snapshot.fighter2Id ? { id: snapshot.fighter2Id, name: snapshot.fighter2Name || "Fighter 2" } : null;

    window.currentFighter1 = snapshot.fighter1Id ? (window.fighters || []).find(f => f.id === snapshot.fighter1Id) || null : null;
    window.currentFighter2 = snapshot.fighter2Id ? (window.fighters || []).find(f => f.id === snapshot.fighter2Id) || null : null;

    document.getElementById("styleName1").innerHTML = snapshot.fighter1Name || "Fighter 1";
    document.getElementById("styleName2").innerHTML = snapshot.fighter2Name || "Fighter 2";
    document.querySelectorAll(".fighter-name-label-1").forEach(el => el.innerHTML = snapshot.fighter1Name || "Fighter 1");
    document.querySelectorAll(".fighter-name-label-2").forEach(el => el.innerHTML = snapshot.fighter2Name || "Fighter 2");

    const inputs = snapshot.formInputs || {};
    const applySide = (prefix, extraPrefix, sideInputs) => {
        const sideId = prefix === "style1" ? 1 : 2;
        Object.entries(sideInputs || {}).forEach(([key, value]) => {
            if (key === "movement" || key === "strikingIdentity" || key === "favoriteStrike" || key === "defense") {
                const checkboxBase = `${prefix}_${key}`;
                const container = document.getElementById(`multiselect_${checkboxBase}`);
                const textInput = document.getElementById(`${checkboxBase}_text`);
                if (container && textInput) {
                    const values = Array.isArray(value) ? value : [];
                    container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
                        cb.checked = values.includes(cb.value);
                    });
                    textInput.value = values.join(", ");
                }
                return;
            }

            if (key === "athleticism" || key === "cardio" || key === "durability") {
                const toggle = document.getElementById(`toggle_${key}`);
                const slider = document.getElementById(`${extraPrefix}_${key}`);
                const sliderValue = document.getElementById(`${key}Value${sideId}`);
                const numericValue = value != null ? value : 5;
                if (toggle) toggle.checked = value != null;
                if (slider) slider.value = numericValue;
                if (sliderValue) sliderValue.textContent = value != null ? `${numericValue}/10` : "Unknown";
                window.toggleSliderInput(key);
                return;
            }

            const el = document.getElementById(`${prefix}_${key}`) || document.getElementById(`${extraPrefix}_${key}`);
            if (!el) return;

            if (el.tagName === "SELECT") {
                const desired = String(value || "");
                for (let i = 0; i < el.options.length; i++) {
                    if (el.options[i].value === desired) {
                        el.selectedIndex = i;
                        break;
                    }
                }
            } else if (el.type === "number") {
                el.value = value != null ? value : "";
            } else if (el.type === "range") {
                el.value = value != null ? value : 5;
            }
        });
    };

    applySide("style1", "extra1", inputs.f1);
    applySide("style2", "extra2", inputs.f2);
    updatePredictionButton();
}

function showPredictionResultsFromSnapshot(snapshot) {
    const cards = document.querySelectorAll(".card");
    const searchInputs = document.querySelectorAll(".search-container input");
    const resultsDiv = document.getElementById("predictionResults");
    const button = document.getElementById("calculatePrediction");

    cards.forEach(card => card.style.display = "none");
    searchInputs.forEach(input => input.disabled = true);
    if (resultsDiv) resultsDiv.style.display = "block";
    if (button) button.innerText = "Go Back";
    isShowingResults = true;

    currentPredictionSnapshot = snapshot;
    renderMatchupResultsView(
        snapshot.fighter1Name || "Fighter 1",
        snapshot.fighter2Name || "Fighter 2",
        snapshot.result?.f1OverallPercent ?? 50,
        snapshot.result?.f2OverallPercent ?? 50,
        snapshot.result?.activePercent ?? 100,
        snapshot.result?.voidedPercent ?? 0,
        snapshot.result?.winnerName || "Draw / Even",
        snapshot.result?.bannerWinPercent ?? 50,
        snapshot.result?.confidence || "Low Data Reliability",
        snapshot.result?.confColor || "#ef4444",
        snapshot.result?.breakdowns || []
    );
}

function loadSavedPrediction(index) {
    const snapshot = savedPredictions[index];
    if (!snapshot) return;

    applyPredictionSnapshot(snapshot);
    showPredictionResultsFromSnapshot(snapshot);
    toggleSavedPredictionsDrawer(false);
}

function deleteSavedPrediction(index) {
    savedPredictions.splice(index, 1);
    persistSavedPredictions();
}

async function downloadSavedPredictionsPdf() {
    if (!savedPredictions.length) {
        alert("There are no saved predictions to download.");
        return;
    }

    const getExportLines = (prediction) => {
        return (prediction.result?.breakdowns || [])
            .filter(item => item?.val1 !== null && item?.val2 !== null && item?.val1 !== "" && item?.val2 !== "" && item?.val1 !== "Unknown" && item?.val2 !== "Unknown")
            .map(item => `${item.label}: ${item.val1} vs ${item.val2}`);
    };

    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 36;
        const cardWidth = pageWidth - margin * 2;

        const drawCard = (prediction, x, y, width) => {
            pdf.setFillColor(250, 247, 214);
            pdf.setTextColor(17, 24, 39);
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(14);
            const title = `${prediction.fighter1Name || "Fighter 1"} vs ${prediction.fighter2Name || "Fighter 2"}`;
            const titleLines = pdf.splitTextToSize(title, width - 32);

            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9.5);
            pdf.setTextColor(55, 65, 81);
            const lines = [
                `Winner: ${prediction.result?.winnerName || "Draw"}`,
                `Win chance: ${prediction.result?.bannerWinPercent || "0"}%`,
                `Active data: ${prediction.result?.activePercent || "0"}%`
            ];
            const exportLines = getExportLines(prediction);
            const allLines = [...lines, "", ...exportLines];
            const textLines = pdf.splitTextToSize(allLines.join("\n"), width - 32);
            const contentHeight = 24 + titleLines.length * 14 + textLines.length * 10;
            const height = Math.min(Math.max(180, contentHeight + 22), pageHeight - margin * 2);

            pdf.roundedRect(x, y, width, height, 10, 10, "FD");
            pdf.text(titleLines, x + 16, y + 24);
            pdf.text(textLines, x + 16, y + 44);
        };

        savedPredictions.forEach((prediction, index) => {
            if (index > 0) {
                pdf.addPage();
            }
            drawCard(prediction, margin, margin, cardWidth);
        });

        const pdfBlob = pdf.output("blob");

        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: "saved-predictions.pdf",
                    types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }]
                });
                const writable = await handle.createWritable();
                await writable.write(pdfBlob);
                await writable.close();
                return;
            } catch (pickerError) {
                console.warn("File picker cancelled or unavailable.", pickerError);
            }
        }

        pdf.save("saved-predictions.pdf");
        return;
    } catch (error) {
        console.warn("PDF export unavailable, falling back to print preview.", error);
    }

    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) {
        alert("Please allow popups to export the saved predictions as a printable document.");
        return;
    }

    const rows = savedPredictions.map(prediction => `
        <section style="border:1px solid #d4af37;border-radius:10px;padding:14px 16px;background:#fff7d6;margin-bottom:12px;">
            <h3 style="margin:0 0 8px 0;font-size:16px;">${escapeHtml(prediction.fighter1Name || "Fighter 1")} vs ${escapeHtml(prediction.fighter2Name || "Fighter 2")}</h3>
            <div style="font-size:12px;color:#374151;line-height:1.6;">
                <div><strong>Winner:</strong> ${escapeHtml(prediction.result?.winnerName || "Draw")}</div>
                <div><strong>Win chance:</strong> ${escapeHtml(prediction.result?.bannerWinPercent || "0")}%</div>
                <div><strong>Active data:</strong> ${escapeHtml(prediction.result?.activePercent || "0")}%</div>
                ${((prediction.result?.breakdowns || [])
                    .filter(item => item?.val1 !== null && item?.val2 !== null && item?.val1 !== "" && item?.val2 !== "" && item?.val1 !== "Unknown" && item?.val2 !== "Unknown")
                    .map(item => `<div><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(item.val1)} vs ${escapeHtml(item.val2)}</div>`)).join("")}
            </div>
        </section>
    `).join("");

    printWindow.document.write(`<!doctype html><html><head><title>Saved Predictions</title><style>body{font-family:Arial,sans-serif;padding:24px;background:#f5f5f5;color:#111}h2{margin-top:0}section{page-break-inside:avoid}</style></head><body><h2>Saved predictions</h2>${rows}</body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
}

function initSlidersOnLoad() {
    const features = ["durability", "cardio", "athleticism"]; 
    features.forEach(feature => {
        const toggle = document.getElementById(`toggle_${feature}`);
        if (toggle && !toggle.checked) {
            window.toggleSliderInput(feature);
        }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initSlidersOnLoad();
    loadSavedPredictions();
});

window.addEventListener("beforeunload", (event) => {
    if (savedPredictions.length) {
        event.preventDefault();
        event.returnValue = "";
    }
});

window.addEventListener("click", (event) => {
    if (!isSavedPredictionsDrawerOpen) return;
    const drawer = document.getElementById("savedPredictionsDrawer");
    const toggle = document.getElementById("savedPredictionsToggle");
    if (drawer && !event.target.closest(".saved-predictions-drawer") && !event.target.closest("#savedPredictionsToggle")) {
        toggleSavedPredictionsDrawer(false);
    }
});

window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closePredictionInfoModal();
        toggleSavedPredictionsDrawer(false);
    }
});

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
window.openPredictionInfoModal = openPredictionInfoModal;
window.closePredictionInfoModal = closePredictionInfoModal;
window.toggleSavedPredictionsDrawer = toggleSavedPredictionsDrawer;
window.saveCurrentPrediction = saveCurrentPrediction;
window.loadSavedPrediction = loadSavedPrediction;
window.deleteSavedPrediction = deleteSavedPrediction;
window.downloadSavedPredictionsPdf = downloadSavedPredictionsPdf;

export const PREDICTION_CONFIG = {
    weights: {
        elo: 18,
        style: 16,
        winLossRatio: 10,
        experience: 9,
        momentum: 9,
        chin: 8,
        koPercentage: 5,
        cardio: 6,
        heightReach: 5,
        athleticism: 4,
        weight: 3,
        durability: 3,
        pastMatchup: 4
    },
    styleWeights: {
        stance: 4,
        movement: 18,
        range: 15,
        strikingIdentity: 14,
        defense: 13,
        fightIQ: 10,
        tempo: 9,
        primaryWeapon: 8,
        target: 6,
        favoriteStrike: 3
    }
};

function getPrimaryChoice(value) {
    if (Array.isArray(value)) {
        return value.find(item => item && item !== "Unknown" && item !== "") || value[0] || "";
    }

    return value || "";
}

function normalizeStyleValue(value) {
    return String(value || "").trim().toLowerCase();
}

function evaluateStyleMatchup(f1Inputs, f2Inputs) {
    const styleWeights = PREDICTION_CONFIG.styleWeights;
    const categories = [
        {
            key: "stance",
            weight: styleWeights.stance,
            evaluate: (a, b, weight) => {
                const v1 = normalizeStyleValue(a);
                const v2 = normalizeStyleValue(b);
                if (!v1 || !v2) return { f1: weight * 0.5, f2: weight * 0.5 };
                if (v1 === v2) return { f1: weight * 0.5, f2: weight * 0.5 };

                if ((v1 === "southpaw" && v2 === "orthodox") || (v1 === "switch" && (v2 === "orthodox" || v2 === "southpaw"))) {
                    return { f1: weight, f2: 0 };
                }
                if ((v2 === "southpaw" && v1 === "orthodox") || (v2 === "switch" && (v1 === "orthodox" || v1 === "southpaw"))) {
                    return { f1: 0, f2: weight };
                }

                return { f1: weight * 0.5, f2: weight * 0.5 };
            }
        },
        {
            key: "movement",
            weight: styleWeights.movement,
            evaluate: (a, b, weight) => {
                const v1 = normalizeStyleValue(a);
                const v2 = normalizeStyleValue(b);
                if (!v1 || !v2 || v1 === v2) return { f1: weight * 0.5, f2: weight * 0.5 };

                const rules = {
                    pressure: { beats: ["mobile", "back foot", "counter"], losesTo: ["ring cutter", "lateral"] },
                    mobile: { beats: ["planted", "blitz"], losesTo: ["ring cutter", "pressure"] },
                    counter: { beats: ["blitz", "pressure"], losesTo: ["back foot"] },
                    backfoot: { beats: ["blitz"], losesTo: ["pressure", "ring cutter"] },
                    lateral: { beats: ["pressure", "planted"], losesTo: ["ring cutter"] },
                    planted: { beats: ["pocket"], losesTo: ["mobile", "lateral"] },
                    blitz: { beats: ["mobile", "slow build"], losesTo: ["counter"] },
                    ringcutter: { beats: ["mobile", "lateral", "back foot"], losesTo: ["pressure"] }
                };

                const left = rules[v1] || {};
                const right = rules[v2] || {};
                if (left.beats?.includes(v2)) return { f1: weight, f2: 0 };
                if (right.beats?.includes(v1)) return { f1: 0, f2: weight };
                return { f1: weight * 0.5, f2: weight * 0.5 };
            }
        },
        {
            key: "range",
            weight: styleWeights.range,
            evaluate: (a, b, weight) => {
                const v1 = normalizeStyleValue(a);
                const v2 = normalizeStyleValue(b);
                if (!v1 || !v2 || v1 === v2) return { f1: weight * 0.5, f2: weight * 0.5 };

                const matchups = {
                    long: { beats: ["pocket", "clinch"], losesTo: ["mid"] },
                    mid: { beats: ["long"], losesTo: ["pocket"] },
                    pocket: { beats: ["mid"], losesTo: ["long", "clinch"] },
                    clinch: { beats: ["pocket"], losesTo: ["long"] }
                };

                const left = matchups[v1] || {};
                const right = matchups[v2] || {};
                if (left.beats?.includes(v2)) return { f1: weight, f2: 0 };
                if (right.beats?.includes(v1)) return { f1: 0, f2: weight };
                return { f1: weight * 0.5, f2: weight * 0.5 };
            }
        },
        {
            key: "strikingIdentity",
            weight: styleWeights.strikingIdentity,
            evaluate: (a, b, weight) => {
                const v1 = normalizeStyleValue(a);
                const v2 = normalizeStyleValue(b);
                if (!v1 || !v2 || v1 === v2) return { f1: weight * 0.5, f2: weight * 0.5 };

                const matchups = {
                    power: { beats: ["volume"], losesTo: ["precision", "technical"] },
                    volume: { beats: ["precision"], losesTo: ["power", "technical"] },
                    precision: { beats: ["power"], losesTo: ["volume", "technical"] },
                    technical: { beats: [], losesTo: [] }
                };

                const left = matchups[v1] || {};
                const right = matchups[v2] || {};
                if (left.beats?.includes(v2)) return { f1: weight, f2: 0 };
                if (right.beats?.includes(v1)) return { f1: 0, f2: weight };
                if (v1 === "technical" && v2 !== "technical") return { f1: weight * 0.7, f2: 0 };
                if (v2 === "technical" && v1 !== "technical") return { f1: 0, f2: weight * 0.7 };
                if (v1 === "unorthodox" && v2 === "technical") return { f1: weight * 0.8, f2: 0 };
                if (v1 === "unorthodox" && v2 === "precision") return { f1: weight * 0.8, f2: 0 };
                return { f1: weight * 0.5, f2: weight * 0.5 };
            }
        },
        {
            key: "target",
            weight: styleWeights.target,
            evaluate: (a, b, weight) => {
                const v1 = normalizeStyleValue(a);
                const v2 = normalizeStyleValue(b);
                if (!v1 || !v2 || v1 === v2) return { f1: weight * 0.5, f2: weight * 0.5 };

                if ((v1 === "head" && v2 === "body") || (v1 === "body" && v2 === "balanced")) return { f1: weight, f2: 0 };
                if ((v2 === "head" && v1 === "body") || (v2 === "body" && v1 === "balanced")) return { f1: 0, f2: weight };
                if (v1 === "legs" && v2 === "balanced") return { f1: weight, f2: 0 };
                if (v2 === "legs" && v1 === "balanced") return { f1: 0, f2: weight };
                return { f1: weight * 0.5, f2: weight * 0.5 };
            }
        },
        {
            key: "primaryWeapon",
            weight: styleWeights.primaryWeapon,
            evaluate: (a, b, weight) => {
                const v1 = normalizeStyleValue(a);
                const v2 = normalizeStyleValue(b);
                if (!v1 || !v2 || v1 === v2) return { f1: weight * 0.5, f2: weight * 0.5 };

                if ((v1 === "punches" && v2 === "kicks") || (v1 === "clinch" && v2 === "punches")) return { f1: weight, f2: 0 };
                if ((v2 === "punches" && v1 === "kicks") || (v2 === "clinch" && v1 === "punches")) return { f1: 0, f2: weight };
                if (v1 === "knees" && v2 === "clinch") return { f1: weight, f2: 0 };
                if (v2 === "knees" && v1 === "clinch") return { f1: 0, f2: weight };
                return { f1: weight * 0.5, f2: weight * 0.5 };
            }
        },
        {
            key: "favoriteStrike",
            weight: styleWeights.favoriteStrike,
            evaluate: (a, b, weight) => {
                const v1 = normalizeStyleValue(a);
                const v2 = normalizeStyleValue(b);
                if (!v1 || !v2 || v1 === v2) return { f1: weight * 0.5, f2: weight * 0.5 };

                if ((v1 === "jab" && v2 === "pressure") || (v1 === "low kick" && v2 === "planted") || (v1 === "body kick" && v2 === "guard") || (v1 === "uppercut" && v2 === "pressure") || (v1 === "cross" && v2 === "southpaw")) return { f1: weight, f2: 0 };
                if ((v2 === "jab" && v1 === "pressure") || (v2 === "low kick" && v1 === "planted") || (v2 === "body kick" && v1 === "guard") || (v2 === "uppercut" && v1 === "pressure") || (v2 === "cross" && v1 === "southpaw")) return { f1: 0, f2: weight };
                return { f1: weight * 0.5, f2: weight * 0.5 };
            }
        },
        {
            key: "defense",
            weight: styleWeights.defense,
            evaluate: (a, b, weight) => {
                const v1 = normalizeStyleValue(a);
                const v2 = normalizeStyleValue(b);
                if (!v1 || !v2 || v1 === v2) return { f1: weight * 0.5, f2: weight * 0.5 };

                if ((v1 === "guard" && v2 === "punches") || (v1 === "footwork" && v2 === "power") || (v1 === "head movement" && v2 === "punches") || (v1 === "evasion" && v2 === "volume")) return { f1: weight, f2: 0 };
                if ((v2 === "guard" && v1 === "punches") || (v2 === "footwork" && v1 === "power") || (v2 === "head movement" && v1 === "punches") || (v2 === "evasion" && v1 === "volume")) return { f1: 0, f2: weight };
                return { f1: weight * 0.5, f2: weight * 0.5 };
            }
        },
        {
            key: "tempo",
            weight: styleWeights.tempo,
            evaluate: (a, b, weight) => {
                const v1 = normalizeStyleValue(a);
                const v2 = normalizeStyleValue(b);
                if (!v1 || !v2 || v1 === v2) return { f1: weight * 0.5, f2: weight * 0.5 };

                const rules = {
                    constant: { beats: ["slow build"], losesTo: ["counter rhythm"] },
                    burst: { beats: ["counter"], losesTo: ["constant"] },
                    slowbuild: { beats: ["counter rhythm"], losesTo: ["burst"] },
                    counterrhythm: { beats: ["constant"], losesTo: ["slow build"] }
                };

                const left = rules[v1] || {};
                const right = rules[v2] || {};
                if (left.beats?.includes(v2)) return { f1: weight, f2: 0 };
                if (right.beats?.includes(v1)) return { f1: 0, f2: weight };
                return { f1: weight * 0.5, f2: weight * 0.5 };
            }
        },
        {
            key: "fightIQ",
            weight: styleWeights.fightIQ,
            evaluate: (a, b, weight) => {
                const v1 = normalizeStyleValue(a);
                const v2 = normalizeStyleValue(b);
                if (!v1 || !v2 || v1 === v2) return { f1: weight * 0.5, f2: weight * 0.5 };

                if ((v1 === "aggressive" && v2 === "defensive") || (v1 === "calculated" && v2 === "aggressive")) return { f1: weight, f2: 0 };
                if ((v2 === "aggressive" && v1 === "defensive") || (v2 === "calculated" && v1 === "aggressive")) return { f1: 0, f2: weight };
                if (v1 === "adaptive" && v2 !== "adaptive") return { f1: weight * 0.7, f2: 0 };
                if (v2 === "adaptive" && v1 !== "adaptive") return { f1: 0, f2: weight * 0.7 };
                return { f1: weight * 0.5, f2: weight * 0.5 };
            }
        }
    ];

    let f1Score = 0;
    let f2Score = 0;

    categories.forEach(category => {
        const value1 = getPrimaryChoice(f1Inputs[category.key]);
        const value2 = getPrimaryChoice(f2Inputs[category.key]);
        const result = category.evaluate(value1, value2, category.weight);
        f1Score += result.f1;
        f2Score += result.f2;
    });

    return {
        f1Score,
        f2Score,
        f1Display: `${Math.round(f1Score)} pts`,
        f2Display: `${Math.round(f2Score)} pts`
    };
}

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
    const stats1 = parseHistoryStats(getFightHistory(dbF1), dbF1);
    const stats2 = parseHistoryStats(getFightHistory(dbF2), dbF2);

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
        "KO %tage",
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
        "Chin Resilience",
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
    const mom1 = calculateMomentumScore(getFightHistory(dbF1), dbF1);
    const mom2 = calculateMomentumScore(getFightHistory(dbF2), dbF2);
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
    const styleMatchup = evaluateStyleMatchup(uiInputs.f1, uiInputs.f2);
    evalCategory("style", "Style & Stance", styleMatchup.f1Score, styleMatchup.f2Score, styleMatchup.f1Display, styleMatchup.f2Display, (v1, v2) => {
        const total = v1 + v2;
        if (total <= 0) return { f1Share: 0.5, f2Share: 0.5 };
        return { f1Share: v1 / total, f2Share: v2 / total };
    });

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

    currentPredictionSnapshot = {
        fighter1Name: name1,
        fighter2Name: name2,
        fighter1Id: predictionSelection.fighter1?.id || null,
        fighter2Id: predictionSelection.fighter2?.id || null,
        formInputs: getPredictionFormInputs(),
        result: {
            f1OverallPercent: finalF1Percentage,
            f2OverallPercent: finalF2Percentage,
            activePercent: activePercentage,
            voidedPercent: voidedPercentage,
            winnerName,
            bannerWinPercent,
            confidence: confidenceRating,
            confColor: confidenceColor,
            breakdowns: categoryBreakdowns
        },
        savedAt: new Date().toLocaleString()
    };

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
            <div style="display:flex; justify-content:space-between; align-items:center; gap:12px; margin-bottom:16px; flex-wrap:wrap;">
                <div style="font-size:13px; color:#aaa;">Prediction snapshot</div>
                <button type="button" onclick="event.stopPropagation(); saveCurrentPrediction()" style="padding:8px 12px; border-radius:8px; border:1px solid gold; background:#1a1a1a; color:white; cursor:pointer;">Save</button>
            </div>
            
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
function getFightHistory(fighterObj) {
    if (!fighterObj) return [];
    if (Array.isArray(fighterObj.history)) return fighterObj.history;
    if (Array.isArray(fighterObj.fights)) return fighterObj.fights;
    if (Array.isArray(fighterObj.matches)) return fighterObj.matches;
    return [];
}

function getFighterNameById(id) {
    if (id === null || id === undefined || id === "") return "";
    const match = (window.fighters || []).find(f => String(f.id) === String(id));
    return match?.name || "";
}

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
    const hist1 = getFightHistory(f1);
    const hist2 = getFightHistory(f2);
    let f1Score = 0;
    let f2Score = 0;
    let hasData = false;
    const directBouts = [];
    const sharedOpps = [];

    const id1 = f1?.id;
    const id2 = f2?.id;
    const name1 = f1?.name || "";
    const name2 = f2?.name || "";

    // 1. Enhanced opponent parser to handle nested objects and the app's fighter data shape
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

        if (!oppName && oppId) {
            oppName = getFighterNameById(oppId);
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

        const multiSelectValues = (baseName) => {
            const container = document.getElementById(`multiselect_${prefix}_${baseName}`);
            if (!container) return [];
            return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        };

        return {
            stance: document.getElementById(`${prefix}_stance`)?.value || "",
            movement: multiSelectValues("movement"),
            range: document.getElementById(`${prefix}_range`)?.value || "",
            strikingIdentity: multiSelectValues("identity"),
            target: document.getElementById(`${prefix}_target`)?.value || "",
            primaryWeapon: document.getElementById(`${prefix}_weapon`)?.value || "",
            favoriteStrike: multiSelectValues("strike"),
            defense: multiSelectValues("defense"),
            tempo: document.getElementById(`${prefix}_tempo`)?.value || "",
            fightIQ: document.getElementById(`${prefix}_iq`)?.value || "",
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
    if (!name) return null;
    const query = normalizeName(name);

    if (window.fighters && Array.isArray(window.fighters)) {
        const exact = window.fighters.find(f => normalizeName(f.name) === query);
        if (exact) return exact;

        return window.fighters.find(f => {
            const fighterName = normalizeName(f.name);
            return fighterName.includes(query) || query.includes(fighterName);
        });
    }
    return null;
}

function resetPredictionEngine() {
    const button = document.getElementById('calculatePrediction');
    const resultsContainer = document.getElementById('predictionResults');
    const searchInputs = document.querySelectorAll('.search-container input');

    document.querySelectorAll('.card').forEach(el => el.style.display = 'block');

    if (resultsContainer) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
    }

    searchInputs.forEach(input => {
        input.disabled = false;
    });

    if (button) {
        button.innerText = 'Calculate Prediction';
    }

    isShowingResults = false;
}

window.resetPredictionEngine = resetPredictionEngine;
window.restorePredictionInputs = function() {
    resetPredictionEngine();
};