let selectedCities = [];
let updateInterval;
let use24Hour = true;
let selectedTime = null; // in minutes from midnight
let isDragging = false;

// localStorage keys
const STORAGE_KEYS = {
    CITIES: 'spindlo_cities',
    FORMAT: 'spindlo_time_format'
};

// Save preferences to localStorage
function savePreferences() {
    try {
        localStorage.setItem(STORAGE_KEYS.CITIES, JSON.stringify(selectedCities));
        localStorage.setItem(STORAGE_KEYS.FORMAT, use24Hour ? '24hr' : '12hr');
    } catch (e) {
        console.warn('Could not save preferences:', e);
    }
}

// Load preferences from localStorage
function loadPreferences() {
    try {
        const savedCities = localStorage.getItem(STORAGE_KEYS.CITIES);
        const savedFormat = localStorage.getItem(STORAGE_KEYS.FORMAT);

        return {
            cities: savedCities ? JSON.parse(savedCities) : null,
            format: savedFormat
        };
    } catch (e) {
        console.warn('Could not load preferences:', e);
        return { cities: null, format: null };
    }
}

function initializeApp() {
    const savedPrefs = loadPreferences();

    // Load saved cities or use defaults
    if (savedPrefs.cities && savedPrefs.cities.length > 0) {
        selectedCities = savedPrefs.cities;
    } else {
        selectedCities = ['America/New_York', 'Europe/London'];
    }

    // Load time format preference
    if (savedPrefs.format === '12hr') {
        use24Hour = false;
    } else if (savedPrefs.format === '24hr') {
        use24Hour = true;
    }

    // Set toggle state
    const timeFormatToggle = document.getElementById('time-format');
    const toggleLabel = document.querySelector('.toggle-label');
    timeFormatToggle.checked = use24Hour;
    toggleLabel.textContent = use24Hour ? '24hr' : '12hr';

    renderCitySelectors();
    renderDials();
    setupTimeIndicator();
    updateCurrentTime();

    updateInterval = setInterval(() => {
        updateCurrentTime();
    }, 1000);

    // Time format toggle
    timeFormatToggle.addEventListener('change', function() {
        use24Hour = this.checked;
        toggleLabel.textContent = use24Hour ? '24hr' : '12hr';
        renderDials();
        savePreferences();
    });
}

function renderCitySelectors() {
    const container = document.getElementById('city-selectors');
    container.innerHTML = '';

    // Render existing city selectors
    selectedCities.forEach((timezone, index) => {
        const selector = createCitySelector(index, timezone);
        container.appendChild(selector);
    });

    // Always add one empty selector at the end
    const emptySelector = createCitySelector(selectedCities.length, null);
    container.appendChild(emptySelector);
}

function createCitySelector(index, selectedTimezone) {
    const div = document.createElement('div');
    div.className = 'city-selector';
    div.dataset.index = index;

    const label = document.createElement('label');
    label.textContent = `City ${index + 1}`;
    div.appendChild(label);

    const select = document.createElement('select');

    // Add "Select City" option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select City';
    select.appendChild(defaultOption);

    // Group cities by region for better UX
    const regions = {};
    timezoneData.forEach(tz => {
        const region = tz.timezone.split('/')[0];
        if (!regions[region]) {
            regions[region] = [];
        }
        regions[region].push(tz);
    });

    // Add cities grouped by region
    Object.keys(regions).sort().forEach(region => {
        const optgroup = document.createElement('optgroup');
        optgroup.label = region.replace(/_/g, ' ');

        regions[region].sort((a, b) => a.city.localeCompare(b.city)).forEach(tz => {
            const option = document.createElement('option');
            option.value = tz.timezone;
            option.textContent = `${tz.city}, ${tz.country}`;
            if (tz.timezone === selectedTimezone) {
                option.selected = true;
            }
            optgroup.appendChild(option);
        });

        select.appendChild(optgroup);
    });

    select.addEventListener('change', (e) => {
        handleCitySelection(index, e.target.value);
    });

    div.appendChild(select);
    return div;
}

function handleCitySelection(index, timezone) {
    if (timezone === '') {
        // User selected "Select City" - remove this city if it exists
        if (index < selectedCities.length) {
            selectedCities.splice(index, 1);
        }
    } else {
        // User selected a city
        if (index < selectedCities.length) {
            // Update existing city
            selectedCities[index] = timezone;
        } else {
            // Add new city
            selectedCities.push(timezone);
        }
    }

    savePreferences();
    renderCitySelectors();
    renderDials();
}

function renderDials() {
    const container = document.getElementById('dial-container');

    // Remove all existing dials
    const existingDials = container.querySelectorAll('.city-dial');
    existingDials.forEach(dial => dial.remove());

    if (selectedCities.length === 0) {
        return;
    }

    const numCities = selectedCities.length;
    const baseSize = 600; // Base diameter in pixels

    // Render dials from outermost to innermost
    selectedCities.forEach((timezone, index) => {
        // Outermost city is at index 0, gets full size
        // Inner cities get progressively smaller
        const dialIndex = index;
        const size = baseSize - (dialIndex * (baseSize / (numCities + 1)));

        const dial = createDial(timezone, size, dialIndex, numCities);
        container.insertBefore(dial, container.firstChild);
    });
}

function createDial(timezone, size, dialIndex, totalDials) {
    const dial = document.createElement('div');
    dial.className = 'city-dial';
    dial.style.width = `${size}px`;
    dial.style.height = `${size}px`;

    // Calculate rotation based on timezone offset
    const offset = getTimezoneOffset(timezone);
    const rotationAngle = -offset * 15; // 15 degrees per hour
    dial.style.transform = `translate(-50%, -50%) rotate(${rotationAngle}deg)`;

    // Background
    const background = document.createElement('div');
    background.className = 'dial-background';
    background.style.width = '100%';
    background.style.height = '100%';
    background.style.borderRadius = '50%';
    background.style.overflow = 'hidden';
    background.style.background = `conic-gradient(
        from 0deg at 50% 50%,
        #1a2238 0deg,
        #0a0e27 15deg,
        #0a0e27 30deg,
        #0a0e27 45deg,
        #1a2238 60deg,
        #3a4458 75deg,
        #5a6478 90deg,
        #7a8498 105deg,
        #9aa4b8 120deg,
        #e8c862 135deg,
        #f0d87c 150deg,
        #f5e196 165deg,
        #faeab0 180deg,
        #fef3ca 195deg,
        #f5e196 210deg,
        #f0d87c 225deg,
        #e8c862 240deg,
        #cdb05f 255deg,
        #9aa4b8 270deg,
        #7a8498 285deg,
        #5a6478 300deg,
        #4a5468 315deg,
        #3a4458 330deg,
        #2a3448 345deg,
        #1a2238 360deg
    )`;
    dial.appendChild(background);

    // Hour markers container
    const markersContainer = document.createElement('div');
    markersContainer.className = 'hour-markers';
    markersContainer.style.position = 'absolute';
    markersContainer.style.width = '100%';
    markersContainer.style.height = '100%';
    markersContainer.style.pointerEvents = 'none';

    // Add border
    const border = document.createElement('div');
    border.style.position = 'absolute';
    border.style.width = '100%';
    border.style.height = '100%';
    border.style.borderRadius = '50%';
    border.style.border = '3px solid rgba(255, 255, 255, 0.2)';
    markersContainer.appendChild(border);

    // Generate hour markers
    for (let hour = 0; hour < 24; hour++) {
        const angle = (hour * 15) - 90;
        const radian = angle * Math.PI / 180;

        const marker = document.createElement('div');
        marker.className = hour % 3 === 0 ? 'hour-marker major' : 'hour-marker minor';
        marker.style.position = 'absolute';

        const markerRadius = 48;
        const x = 50 + markerRadius * Math.cos(radian);
        const y = 50 + markerRadius * Math.sin(radian);

        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        marker.style.transform = `translate(-50%, -50%) rotate(${angle + 90}deg)`;

        if (hour % 3 === 0) {
            marker.style.width = '3px';
            marker.style.height = '15px';
            marker.style.background = 'rgba(0, 0, 0, 0.8)';
        } else {
            marker.style.width = '1px';
            marker.style.height = '8px';
            marker.style.background = 'rgba(0, 0, 0, 0.4)';
        }

        markersContainer.appendChild(marker);
    }

    dial.appendChild(markersContainer);

    // Hour labels container
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'hour-labels';
    labelsContainer.style.position = 'absolute';
    labelsContainer.style.width = '100%';
    labelsContainer.style.height = '100%';
    labelsContainer.style.pointerEvents = 'none';

    for (let hour = 0; hour < 24; hour += 3) {
        const angle = (hour * 15) - 90;
        const radian = angle * Math.PI / 180;

        const label = document.createElement('div');
        label.className = 'hour-label';
        label.textContent = formatHourLabel(hour);
        label.style.position = 'absolute';
        label.style.fontWeight = '600';
        label.style.fontSize = dialIndex === 0 ? '16px' : '14px';
        label.style.color = 'white';
        label.style.textShadow = '1px 1px 2px rgba(0,0,0,0.5)';

        const labelRadius = 40;
        const labelX = 50 + labelRadius * Math.cos(radian);
        const labelY = 50 + labelRadius * Math.sin(radian);

        label.style.left = `${labelX}%`;
        label.style.top = `${labelY}%`;
        label.style.transform = `translate(-50%, -50%) rotate(${-rotationAngle}deg)`;

        labelsContainer.appendChild(label);
    }

    dial.appendChild(labelsContainer);

    // City label
    const cityLabel = document.createElement('div');
    cityLabel.className = 'dial-label';
    cityLabel.textContent = getCurrentCityName(timezone);
    cityLabel.style.transform = `translateX(-50%) rotate(${-rotationAngle}deg)`;
    dial.appendChild(cityLabel);

    return dial;
}

function formatHourLabel(hour) {
    if (use24Hour) {
        return hour === 0 ? '24:00' : `${hour}:00`;
    } else {
        if (hour === 0) return '12am';
        if (hour === 12) return '12pm';
        if (hour < 12) return `${hour}am`;
        return `${hour - 12}pm`;
    }
}

function getTimezoneOffset(timezone) {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString("en-US", {timeZone: 'UTC'}));
    const tzDate = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
    const offset = Math.round((tzDate - utcDate) / 3600000);
    return offset;
}

function getCurrentCityName(timezone) {
    const tzData = timezoneData.find(tz => tz.timezone === timezone);
    return tzData ? `${tzData.city}, ${tzData.country}` : timezone;
}

function updateCurrentTime() {
    if (!selectedTime && selectedCities.length > 0) {
        // Update time indicator to current time if not manually set
        const firstCity = selectedCities[0];
        const now = new Date();
        const timeStr = now.toLocaleTimeString('en-US', {
            timeZone: firstCity,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });

        const [hours, minutes, seconds] = timeStr.split(':').map(Number);
        const totalMinutes = hours * 60 + minutes + (seconds / 60);
        updateTimeIndicator(totalMinutes);
    }
}

function updateTimeIndicator(minutes) {
    const indicator = document.getElementById('time-indicator');
    if (!indicator) return;

    const angle = (minutes / 1440) * 360 - 90; // 1440 minutes in a day, -90 to start from top
    indicator.style.transform = `translate(-50%, 0) rotate(${angle}deg)`;

    // Update selected time display
    updateSelectedTimeDisplay(minutes);
}

function updateSelectedTimeDisplay(minutes) {
    const displayElement = document.getElementById('selected-time-value');
    if (!displayElement) return;

    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);

    if (use24Hour) {
        displayElement.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
    } else {
        const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
        const ampm = hours < 12 ? 'AM' : 'PM';
        displayElement.textContent = `${displayHours}:${String(mins).padStart(2, '0')} ${ampm}`;
    }
}

function setupTimeIndicator() {
    const indicator = document.getElementById('time-indicator');
    const dialContainer = document.getElementById('dial-container');

    function getAngleFromEvent(e) {
        const rect = dialContainer.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
        const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;

        const dx = clientX - centerX;
        const dy = clientY - centerY;

        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        angle = (angle + 90 + 360) % 360; // Adjust so 0° is at top

        return angle;
    }

    function handleDragStart(e) {
        isDragging = true;
        indicator.style.cursor = 'grabbing';
        selectedTime = 0; // Mark as manually set
        e.preventDefault();
    }

    function handleDragMove(e) {
        if (!isDragging) return;

        const angle = getAngleFromEvent(e);
        const minutes = (angle / 360) * 1440; // Convert angle to minutes

        selectedTime = minutes;
        updateTimeIndicator(minutes);
        e.preventDefault();
    }

    function handleDragEnd(e) {
        if (isDragging) {
            isDragging = false;
            indicator.style.cursor = 'grab';
        }
    }

    // Mouse events
    indicator.addEventListener('mousedown', handleDragStart);
    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);

    // Touch events
    indicator.addEventListener('touchstart', handleDragStart);
    document.addEventListener('touchmove', handleDragMove, { passive: false });
    document.addEventListener('touchend', handleDragEnd);

    // Allow clicking anywhere on dial to set time
    dialContainer.addEventListener('click', (e) => {
        if (e.target === dialContainer || e.target.closest('.city-dial')) {
            const angle = getAngleFromEvent(e);
            const minutes = (angle / 360) * 1440;
            selectedTime = minutes;
            updateTimeIndicator(minutes);
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});
