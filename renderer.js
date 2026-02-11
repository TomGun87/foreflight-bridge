// UI Elements
const initLat = document.getElementById('init-lat');
const initLon = document.getElementById('init-lon');
const setPositionBtn = document.getElementById('set-position');

const hdgSlider = document.getElementById('hdg-slider');
const altSlider = document.getElementById('alt-slider');
const spdSlider = document.getElementById('spd-slider');

const hdgCurrent = document.getElementById('hdg-current');
const altCurrent = document.getElementById('alt-current');
const spdCurrent = document.getElementById('spd-current');

const hdgTargetDisplay = document.getElementById('hdg-target-display');
const altTargetDisplay = document.getElementById('alt-target-display');
const spdTargetDisplay = document.getElementById('spd-target-display');

const statePosition = document.getElementById('state-position');
const stateTrack = document.getElementById('state-track');
const stateVspeed = document.getElementById('state-vspeed');

const connectionStatus = document.getElementById('connection-status');
const statusText = document.getElementById('status-text');

// Format helpers
function formatHeading(hdg) {
    return String(Math.round(hdg)).padStart(3, '0') + '°';
}

function formatAltitude(alt) {
    return Math.round(alt) + ' ft';
}

function formatSpeed(spd) {
    return Math.round(spd) + ' kt';
}

function formatPosition(lat, lon) {
    const latDir = lat >= 0 ? 'N' : 'S';
    const lonDir = lon >= 0 ? 'E' : 'W';
    return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lon).toFixed(4)}°${lonDir}`;
}

function formatVspeed(vvel) {
    const sign = vvel > 0 ? '+' : '';
    return sign + Math.round(vvel) + ' fpm';
}

// Set initial position
setPositionBtn.addEventListener('click', () => {
    const lat = parseFloat(initLat.value);
    const lon = parseFloat(initLon.value);
    
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        alert('Please enter valid coordinates');
        return;
    }
    
    window.bridge.setPosition(lat, lon);
});

// Heading controls
hdgSlider.addEventListener('input', () => {
    const hdg = parseInt(hdgSlider.value);
    hdgTargetDisplay.textContent = formatHeading(hdg);
    window.bridge.setTargetHeading(hdg);
});

document.querySelectorAll('[data-hdg]').forEach(btn => {
    btn.addEventListener('click', () => {
        const hdg = parseInt(btn.dataset.hdg);
        hdgSlider.value = hdg;
        hdgTargetDisplay.textContent = formatHeading(hdg);
        window.bridge.setTargetHeading(hdg);
    });
});

// Altitude controls
altSlider.addEventListener('input', () => {
    const alt = parseInt(altSlider.value);
    altTargetDisplay.textContent = formatAltitude(alt);
    window.bridge.setTargetAltitude(alt);
});

document.querySelectorAll('[data-alt]').forEach(btn => {
    btn.addEventListener('click', () => {
        const alt = parseInt(btn.dataset.alt);
        altSlider.value = alt;
        altTargetDisplay.textContent = formatAltitude(alt);
        window.bridge.setTargetAltitude(alt);
    });
});

// Speed controls
spdSlider.addEventListener('input', () => {
    const spd = parseInt(spdSlider.value);
    spdTargetDisplay.textContent = formatSpeed(spd);
    window.bridge.setTargetSpeed(spd);
});

document.querySelectorAll('[data-spd]').forEach(btn => {
    btn.addEventListener('click', () => {
        const spd = parseInt(btn.dataset.spd);
        spdSlider.value = spd;
        spdTargetDisplay.textContent = formatSpeed(spd);
        window.bridge.setTargetSpeed(spd);
    });
});

// Receive state updates from main process
window.bridge.onStateUpdate((state) => {
    // Update current values
    hdgCurrent.textContent = formatHeading(state.heading);
    altCurrent.textContent = formatAltitude(state.alt);
    spdCurrent.textContent = formatSpeed(state.gs);
    
    // Update status panel
    statePosition.textContent = formatPosition(state.lat, state.lon);
    stateTrack.textContent = formatHeading(state.track);
    stateVspeed.textContent = formatVspeed(state.vvel);
});

// Receive connection status
window.bridge.onConnectionStatus((status) => {
    if (status.connected) {
        connectionStatus.className = 'status connected';
        statusText.textContent = `Connected to ForeFlight (${status.ip}:${status.port})`;
    } else {
        connectionStatus.className = 'status disconnected';
        statusText.textContent = status.message || 'Searching for ForeFlight...';
    }
});
