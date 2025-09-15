let sourceTimezone = 'America/New_York';
let destTimezone = 'Europe/London';
let updateInterval;
let use24Hour = true;

// Parse URL parameters
function getURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    return {
        source: urlParams.get('source'),
        dest: urlParams.get('dest')
    };
}

// Update URL with current timezone selections
function updateURL() {
    const url = new URL(window.location);
    url.searchParams.set('source', sourceTimezone);
    url.searchParams.set('dest', destTimezone);
    window.history.replaceState({}, '', url);
}

// Validate if a timezone is valid
function isValidTimezone(timezone) {
    try {
        new Date().toLocaleString('en-US', { timeZone: timezone });
        return true;
    } catch (e) {
        return false;
    }
}

function initializeDials() {
    // Check for URL parameters first
    const urlParams = getURLParameters();

    if (urlParams.source && isValidTimezone(urlParams.source)) {
        sourceTimezone = urlParams.source;
    }

    if (urlParams.dest && isValidTimezone(urlParams.dest)) {
        destTimezone = urlParams.dest;
    }

    generateHourMarkers('.inner-markers', '.inner-labels', true);
    generateHourMarkers('.outer-markers', '.outer-labels', false);

    updateTimezoneDisplay();
    updateDials();

    updateInterval = setInterval(() => {
        updateTimezoneDisplay();
    }, 1000);
}

function generateHourMarkers(markerSelector, labelSelector, isInner) {
    const markerContainer = document.querySelector(markerSelector);
    const labelContainer = document.querySelector(labelSelector);
    const radius = isInner ? 35 : 45;

    markerContainer.innerHTML = '';
    labelContainer.innerHTML = '';

    for (let hour = 0; hour < 24; hour++) {
        const angle = (hour * 15) - 90;
        const radian = angle * Math.PI / 180;

        const marker = document.createElement('div');
        marker.className = hour % 3 === 0 ? 'hour-marker major' : 'hour-marker minor';

        const markerRadius = isInner ? 45 : 48;
        const x = 50 + markerRadius * Math.cos(radian);
        const y = 50 + markerRadius * Math.sin(radian);

        marker.style.left = `${x}%`;
        marker.style.top = `${y}%`;
        marker.style.transform = `translate(-50%, -50%) rotate(${angle + 90}deg)`;

        markerContainer.appendChild(marker);

        if (hour % 3 === 0) {
            const label = document.createElement('div');
            label.className = 'hour-label';
            label.textContent = formatHourLabel(hour);
            if (!isInner) {
                label.setAttribute('data-hour', hour);
            }

            const labelRadius = isInner ? 36 : 40;
            const labelX = 50 + labelRadius * Math.cos(radian);
            const labelY = 50 + labelRadius * Math.sin(radian);

            label.style.left = `${labelX}%`;
            label.style.top = `${labelY}%`;

            labelContainer.appendChild(label);
        }
    }
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

function updateAllLabels() {
    generateHourMarkers('.inner-markers', '.inner-labels', true);
    generateHourMarkers('.outer-markers', '.outer-labels', false);
    updateDials();
}

function getTimezoneOffset(timezone) {
    const now = new Date();

    // Get UTC time
    const utcDate = new Date(now.toLocaleString("en-US", {timeZone: 'UTC'}));

    // Get time in the specified timezone
    const tzDate = new Date(now.toLocaleString("en-US", {timeZone: timezone}));

    // Calculate offset in hours
    const offset = Math.round((tzDate - utcDate) / 3600000);
    return offset;
}

function getGMTOffset(timezone) {
    const now = new Date();
    const tzDate = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
    const utcDate = new Date(now.toLocaleString("en-US", {timeZone: 'UTC'}));
    const offset = Math.round((tzDate - utcDate) / 3600000);
    return offset >= 0 ? `+${offset}` : `${offset}`;
}

function updateDials() {
    if (!sourceTimezone || !destTimezone) return;

    const sourceOffset = getTimezoneOffset(sourceTimezone);
    const destOffset = getTimezoneOffset(destTimezone);
    const offsetDiff = destOffset - sourceOffset;

    const rotationAngle = -offsetDiff * 15;

    const outerDial = document.getElementById('outer-dial');
    outerDial.style.transform = `rotate(${rotationAngle}deg)`;

    // Counter-rotate the outer dial labels to keep them upright
    const outerLabels = document.querySelectorAll('.outer-labels .hour-label');
    outerLabels.forEach(label => {
        label.style.transform = `translate(-50%, -50%) rotate(${-rotationAngle}deg)`;
    });
}

function updateTimezoneDisplay() {
    if (sourceTimezone) {
        const sourceTime = new Date().toLocaleTimeString('en-US', {
            timeZone: sourceTimezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        document.getElementById('source-time').textContent = sourceTime;

        // Update inner dial label
        const sourceCity = getCurrentCityName(sourceTimezone);
        document.getElementById('inner-dial-label').textContent = sourceCity;
    }

    if (destTimezone) {
        const destTime = new Date().toLocaleTimeString('en-US', {
            timeZone: destTimezone,
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
        document.getElementById('dest-time').textContent = destTime;

        // Update outer dial label
        const destCity = getCurrentCityName(destTimezone);
        document.getElementById('outer-dial-label').textContent = destCity;
    }
}

function getCurrentCityName(timezone) {
    const tzData = timezoneData.find(tz => tz.timezone === timezone);
    return tzData ? `${tzData.city}, ${tzData.country}` : timezone;
}

function setupAutocomplete(inputId, dropdownId, onSelect) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    let selectedIndex = -1;

    input.addEventListener('input', function() {
        const query = this.value.toLowerCase();

        if (query.length < 2) {
            dropdown.classList.remove('active');
            return;
        }

        const matches = timezoneData.filter(tz =>
            tz.city.toLowerCase().includes(query) ||
            tz.country.toLowerCase().includes(query) ||
            tz.timezone.toLowerCase().includes(query) ||
            tz.abbr.toLowerCase().includes(query)
        ).slice(0, 10);

        if (matches.length > 0) {
            dropdown.innerHTML = matches.map((tz, index) => {
                const gmtOffset = getGMTOffset(tz.timezone);
                return `
                    <div class="dropdown-item" data-index="${index}" data-timezone="${tz.timezone}">
                        <div class="city-name">${tz.city}, ${tz.country}</div>
                        <div class="timezone-info">${tz.abbr} GMT${gmtOffset}</div>
                    </div>
                `;
            }).join('');

            dropdown.classList.add('active');
            selectedIndex = -1;

            dropdown.querySelectorAll('.dropdown-item').forEach(item => {
                item.addEventListener('click', function() {
                    const timezone = this.dataset.timezone;
                    const cityInfo = this.querySelector('.city-name').textContent;
                    input.value = cityInfo;
                    dropdown.classList.remove('active');
                    onSelect(timezone);
                });
            });
        } else {
            dropdown.classList.remove('active');
        }
    });

    input.addEventListener('keydown', function(e) {
        const items = dropdown.querySelectorAll('.dropdown-item');

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
            updateSelection(items, selectedIndex);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            selectedIndex = Math.max(selectedIndex - 1, -1);
            updateSelection(items, selectedIndex);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (selectedIndex >= 0 && items[selectedIndex]) {
                items[selectedIndex].click();
            }
        } else if (e.key === 'Escape') {
            dropdown.classList.remove('active');
            selectedIndex = -1;
        }
    });

    function updateSelection(items, index) {
        items.forEach((item, i) => {
            if (i === index) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    document.addEventListener('click', function(e) {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

document.addEventListener('DOMContentLoaded', function() {
    initializeDials();

    setupAutocomplete('source-timezone', 'source-dropdown', function(timezone) {
        sourceTimezone = timezone;
        updateTimezoneDisplay();
        updateDials();
        updateURL();
    });

    setupAutocomplete('dest-timezone', 'dest-dropdown', function(timezone) {
        destTimezone = timezone;
        updateTimezoneDisplay();
        updateDials();
        updateURL();
    });

    const sourceInput = document.getElementById('source-timezone');
    const destInput = document.getElementById('dest-timezone');

    // Set input values based on current timezones (which may come from URL)
    const sourceData = timezoneData.find(tz => tz.timezone === sourceTimezone);
    const destData = timezoneData.find(tz => tz.timezone === destTimezone);

    sourceInput.value = sourceData ? `${sourceData.city}, ${sourceData.country}` : 'New York City, USA';
    destInput.value = destData ? `${destData.city}, ${destData.country}` : 'London, UK';

    // Time format toggle
    const timeFormatToggle = document.getElementById('time-format');
    const toggleLabel = document.querySelector('.toggle-label');

    timeFormatToggle.addEventListener('change', function() {
        use24Hour = this.checked;
        toggleLabel.textContent = use24Hour ? '24hr' : '12hr';
        updateAllLabels();
    });
});