// ==========================================
// PREDICTION SYSTEM — UI STATE & EVENT LOGIC
// ==========================================

let predictionSelection = {
    fighter1: null,
    fighter2: null
};

// Run this immediately on script load to turn all sliders "Off" visually at start
function initSlidersOnLoad() {
    // List all your slider feature names here
    const features = ["durability", "cardio", "athleticism"]; 
    
    features.forEach(feature => {
        const toggle = document.getElementById(`toggle_${feature}`);
        // If it exists and is unchecked, force the visual disabled state on load
        if (toggle && !toggle.checked) {
            window.toggleSliderInput(feature);
        }
    });
}

// Fire it as soon as the DOM is ready
document.addEventListener("DOMContentLoaded", initSlidersOnLoad);

// ==========================================
// SEARCH & AUTOCOMPLETE FOR FIGHTERS
// ==========================================

function searchPrediction1() {
    const query = document.getElementById("predictionSearch1").value.toLowerCase();
    const box = document.getElementById("predictionResults1");

    if (!query) {
        box.innerHTML = "";
        return;
    }

    // Filters from global fighters array (assumed managed in app.js/firebase.js)
    const results = fighters.filter(f => f.name.toLowerCase().includes(query));

    box.innerHTML = results.map(f => `
        <div class="fighter-row" onclick="selectPredictionFighter(1, ${f.id}, '${f.name.replace(/'/g, "\\'")}')">
            ${f.name} (${f.weightClass})
        </div>
    `).join("");
}

function searchPrediction2() {
    const query = document.getElementById("predictionSearch2").value.toLowerCase();
    const box = document.getElementById("predictionResults2");

    if (!query) {
        box.innerHTML = "";
        return;
    }

    const results = fighters.filter(f => f.name.toLowerCase().includes(query));

    box.innerHTML = results.map(f => `
        <div class="fighter-row" onclick="selectPredictionFighter(2, ${f.id}, '${f.name.replace(/'/g, "\\'")}')">
            ${f.name} (${f.weightClass})
        </div>
    `).join("");
}

// ==========================================
// SELECTION MANAGEMENT
// ==========================================

function selectPredictionFighter(side, id, name) {
    // Clear previous settings for this side first
    clearPredictionSide(side);

    if (side === 1) {
        predictionSelection.fighter1 = { id: id, name: name };
        document.getElementById("predictionSearch1").value = name;
        document.getElementById("styleName1").innerHTML = name;
        document.getElementById("predictionResults1").innerHTML = "";
    } else {
        predictionSelection.fighter2 = { id: id, name: name };
        document.getElementById("predictionSearch2").value = name;
        document.getElementById("styleName2").innerHTML = name;
        document.getElementById("predictionResults2").innerHTML = "";
    }

    updatePredictionButton();
}

function clearPredictionSide(side) {
    const prefix = side === 1 ? "1" : "2";

    // Clear native elements and custom inputs
    document.querySelectorAll(`[id^="style${prefix}_"], [id^="extra${prefix}_"]`).forEach(el => {
        if (el.tagName === "SELECT") {
            el.selectedIndex = 0;
        } else if (el.type === "range") {
            el.value = 5;
        } else if (el.type === "text" && el.id.endsWith("_text")) {
            el.value = ""; // Clear custom text preview boxes
        } else {
            el.value = "";
        }
    });

    // Uncheck custom checkbox containers
    document.querySelectorAll(`[id^="multiselect_style${prefix}_"] input[type="checkbox"]`).forEach(cb => {
        cb.checked = false;
    });

    // Reset visual header states and state records
    if (side === 1) {
        predictionSelection.fighter1 = null;
        document.getElementById("predictionSearch1").value = "";
        document.getElementById("styleName1").innerHTML = "Fighter 1";
    } else {
        predictionSelection.fighter2 = null;
        document.getElementById("predictionSearch2").value = "";
        document.getElementById("styleName2").innerHTML = "Fighter 2";
    }

    updatePredictionButton();
}

function updatePredictionButton() {
    const button = document.getElementById("calculatePrediction");
    if (predictionSelection.fighter1 && predictionSelection.fighter2) {
        button.disabled = false;
    } else {
        button.disabled = true;
    }
}

function closePredictionDropdown(side) {
    setTimeout(() => {
        document.getElementById(`predictionResults${side}`).innerHTML = "";
    }, 150);
}

// ==========================================
// CUSTOM INTERACTIVE DROPDOWNS (MULTI-SELECT)
// ==========================================

window.toggleDropdown = function(containerId) {
    const container = document.getElementById(containerId);
    const wrapper = container.querySelector('.checkboxes-wrapper');
    const isOpen = wrapper.style.display === 'block';
    
    // Close any other open dropdown components first
    document.querySelectorAll('.checkboxes-wrapper').forEach(el => el.style.display = 'none');
    
    if (!isOpen) {
        wrapper.style.display = 'block';
    }
};

// Close multiselects automatically when clicking outside of them
document.addEventListener('click', function(e) {
    if (!e.target.closest('.custom-multiselect')) {
        document.querySelectorAll('.checkboxes-wrapper').forEach(el => el.style.display = 'none');
    }
});

window.updateMultiselect = function(baseId) {
    const container = document.getElementById(`multiselect_${baseId}`);
    const textInput = document.getElementById(`${baseId}_text`);
    const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
    
    const values = Array.from(checkedBoxes).map(cb => cb.value);
    textInput.value = values.length > 0 ? values.join(', ') : '';
};

// ==========================================
// RANGE SLIDERS (KNOWN VS UNKNOWN STATES)
// ==========================================

window.toggleSliderInput = function(featureName) {
    const isKnown = document.getElementById(`toggle_${featureName}`).checked;
    const s1 = document.getElementById(`extra1_${featureName}`);
    const s2 = document.getElementById(`extra2_${featureName}`);
    const valDisplay1 = document.getElementById(`${featureName}Value1`);
    const valDisplay2 = document.getElementById(`${featureName}Value2`);

    if (isKnown) {
        s1.parentElement.classList.remove('slider-disabled');
        s2.parentElement.classList.remove('slider-disabled');
        valDisplay1.textContent = s1.value + "/10";
        valDisplay2.textContent = s2.value + "/10";
    } else {
        s1.parentElement.classList.add('slider-disabled');
        s2.parentElement.classList.add('slider-disabled');
        valDisplay1.textContent = "Unknown";
        valDisplay2.textContent = "Unknown";
    }
};

window.updateSlider = function(slider, displayId) {
    const display = document.getElementById(displayId);
    display.textContent = slider.value + "/10";
};

// ==========================================
// PLACEHOLDER EXECUTION FOR UI TESTING
// ==========================================

function calculatePrediction() {
    const f1 = predictionSelection.fighter1;
    const f2 = predictionSelection.fighter2;

    if (!f1 || !f2) return;

    // Direct text rendering placeholder target to verify layout responses
    document.getElementById("predictionResults").innerHTML = `
        <div class="card">
            <h2>Prediction System Ready</h2>
            <p>UI Data mapping is verified for <strong>${f1.name}</strong> vs <strong>${f2.name}</strong>.</p>
            <p>Ready for core calculation algorithms.</p>
        </div>
    `;
}

// Global window mappings to bridge modular execution
window.clearPredictionSide = clearPredictionSide;
window.searchPrediction1 = searchPrediction1;
window.searchPrediction2 = searchPrediction2;
window.selectPredictionFighter = selectPredictionFighter;
window.closePredictionDropdown = closePredictionDropdown;
window.calculatePrediction = calculatePrediction;
window.updateSlider = updateSlider;