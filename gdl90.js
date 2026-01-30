const dgram = require("dgram");

// CRC-16 CCITT lookup table (from gdl90 Python library)
const CRC16_TABLE = [
    0x0000, 0x1021, 0x2042, 0x3063, 0x4084, 0x50a5, 0x60c6, 0x70e7,
    0x8108, 0x9129, 0xa14a, 0xb16b, 0xc18c, 0xd1ad, 0xe1ce, 0xf1ef,
    0x1231, 0x0210, 0x3273, 0x2252, 0x52b5, 0x4294, 0x72f7, 0x62d6,
    0x9339, 0x8318, 0xb37b, 0xa35a, 0xd3bd, 0xc39c, 0xf3ff, 0xe3de,
    0x2462, 0x3443, 0x0420, 0x1401, 0x64e6, 0x74c7, 0x44a4, 0x5485,
    0xa56a, 0xb54b, 0x8528, 0x9509, 0xe5ee, 0xf5cf, 0xc5ac, 0xd58d,
    0x3653, 0x2672, 0x1611, 0x0630, 0x76d7, 0x66f6, 0x5695, 0x46b4,
    0xb75b, 0xa77a, 0x9719, 0x8738, 0xf7df, 0xe7fe, 0xd79d, 0xc7bc,
    0x48c4, 0x58e5, 0x6886, 0x78a7, 0x0840, 0x1861, 0x2802, 0x3823,
    0xc9cc, 0xd9ed, 0xe98e, 0xf9af, 0x8948, 0x9969, 0xa90a, 0xb92b,
    0x5af5, 0x4ad4, 0x7ab7, 0x6a96, 0x1a71, 0x0a50, 0x3a33, 0x2a12,
    0xdbfd, 0xcbdc, 0xfbbf, 0xeb9e, 0x9b79, 0x8b58, 0xbb3b, 0xab1a,
    0x6ca6, 0x7c87, 0x4ce4, 0x5cc5, 0x2c22, 0x3c03, 0x0c60, 0x1c41,
    0xedae, 0xfd8f, 0xcdec, 0xddcd, 0xad2a, 0xbd0b, 0x8d68, 0x9d49,
    0x7e97, 0x6eb6, 0x5ed5, 0x4ef4, 0x3e13, 0x2e32, 0x1e51, 0x0e70,
    0xff9f, 0xefbe, 0xdfdd, 0xcffc, 0xbf1b, 0xaf3a, 0x9f59, 0x8f78,
    0x9188, 0x81a9, 0xb1ca, 0xa1eb, 0xd10c, 0xc12d, 0xf14e, 0xe16f,
    0x1080, 0x00a1, 0x30c2, 0x20e3, 0x5004, 0x4025, 0x7046, 0x6067,
    0x83b9, 0x9398, 0xa3fb, 0xb3da, 0xc33d, 0xd31c, 0xe37f, 0xf35e,
    0x02b1, 0x1290, 0x22f3, 0x32d2, 0x4235, 0x5214, 0x6277, 0x7256,
    0xb5ea, 0xa5cb, 0x95a8, 0x8589, 0xf56e, 0xe54f, 0xd52c, 0xc50d,
    0x34e2, 0x24c3, 0x14a0, 0x0481, 0x7466, 0x6447, 0x5424, 0x4405,
    0xa7db, 0xb7fa, 0x8799, 0x97b8, 0xe75f, 0xf77e, 0xc71d, 0xd73c,
    0x26d3, 0x36f2, 0x0691, 0x16b0, 0x6657, 0x7676, 0x4615, 0x5634,
    0xd94c, 0xc96d, 0xf90e, 0xe92f, 0x99c8, 0x89e9, 0xb98a, 0xa9ab,
    0x5844, 0x4865, 0x7806, 0x6827, 0x18c0, 0x08e1, 0x3882, 0x28a3,
    0xcb7d, 0xdb5c, 0xeb3f, 0xfb1e, 0x8bf9, 0x9bd8, 0xabbb, 0xbb9a,
    0x4a75, 0x5a54, 0x6a37, 0x7a16, 0x0af1, 0x1ad0, 0x2ab3, 0x3a92,
    0xfd2e, 0xed0f, 0xdd6c, 0xcd4d, 0xbdaa, 0xad8b, 0x9de8, 0x8dc9,
    0x7c26, 0x6c07, 0x5c64, 0x4c45, 0x3ca2, 0x2c83, 0x1ce0, 0x0cc1,
    0xef1f, 0xff3e, 0xcf5d, 0xdf7c, 0xaf9b, 0xbfba, 0x8fd9, 0x9ff8,
    0x6e17, 0x7e36, 0x4e55, 0x5e74, 0x2e93, 0x3eb2, 0x0ed1, 0x1ef0,
];

// CRC computation using lookup table (matches Python implementation)
function crcCompute(data) {
    const mask16bit = 0xFFFF;
    let crc = 0;
    
    for (const byte of data) {
        const m = (crc << 8) & mask16bit;
        crc = CRC16_TABLE[crc >> 8] ^ m ^ byte;
    }
    
    return [(crc & 0x00FF), (crc & 0xFF00) >> 8];
}

// Escape special bytes (0x7E and 0x7D) for GDL-90 framing
function escape(data) {
    const escaped = [];
    for (const byte of data) {
        if (byte === 0x7E || byte === 0x7D) {
            escaped.push(0x7D);
            escaped.push(byte ^ 0x20);
        } else {
            escaped.push(byte);
        }
    }
    return Buffer.from(escaped);
}

// Frame a message with CRC and escape characters
function frame(payload) {
    const msg = Buffer.from(payload);
    const crc = crcCompute(msg);
    const msgWithCrc = Buffer.concat([msg, Buffer.from(crc)]);
    const escaped = escape(msgWithCrc);
    return Buffer.concat([Buffer.from([0x7E]), escaped, Buffer.from([0x7E])]);
}


// Heartbeat message (matches Python msgHeartbeat)
function heartbeat() {
    return frame([
        0x00, // Message ID
        0x81, // Status Byte 1: GPS valid (bit 7) + UAT initialized (bit 0)
        0x01, // Status Byte 2: UTC OK (bit 0)
        0x00, // Time Stamp MSB
        0x00, // Time Stamp LSB
        0x00, // Message Counts
        0x00  // Message Counts
    ]);
}


// Simulation state
let simState = {
    lat: 50.9010,  // Near Brussels
    lon: 4.4840,
    alt: 3000,     // feet MSL
    gs: 120,       // knots
    track: 90,     // degrees true (eastbound)
    vvel: 0,       // feet per minute
    pitch: 2,      // degrees
    roll: 0,       // degrees
    heading: 90    // degrees true
};

// Convert latitude to GDL-90 format (24-bit signed 2's complement)
function makeLatitude(lat) {
    let val = Math.round(lat * (0x800000 / 180.0));
    if (val < 0) val = (0x1000000 + val) & 0xFFFFFF;
    return [(val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF];
}

// Convert longitude to GDL-90 format (24-bit signed 2's complement)
function makeLongitude(lon) {
    let val = Math.round(lon * (0x800000 / 180.0));
    if (val < 0) val = (0x1000000 + val) & 0xFFFFFF;
    return [(val >> 16) & 0xFF, (val >> 8) & 0xFF, val & 0xFF];
}

// Ownship Report message (matches Python msgOwnshipReport)
function ownship() {
    const lat = makeLatitude(simState.lat);
    const lon = makeLongitude(simState.lon);
    
    // Altitude: pressure altitude in feet, offset by +1000, resolution 25ft
    const alt = Math.round((simState.alt + 1000) / 25);
    
    // Misc byte: bits 3-2 = 01 (true track), bit 1 = 0 (updated), bit 0 = 1 (airborne)
    const misc = 0x09; // binary 1001 = airborne + valid track
    
    // Velocities
    const hVel = Math.round(simState.gs); // knots
    const vVel = Math.round(simState.vvel / 64); // units of 64 fpm
    
    // Track (degrees * 256/360)
    const track = Math.round(simState.track * 256 / 360) & 0xFF;
    
    const msg = [
        0x0A, // Message ID
        0x00, // Status (no alert) + Address Type (0 = ADS-B with ICAO)
        0xAB, 0xCD, 0xEF, // 24-bit address
        ...lat, // Latitude bytes
        ...lon, // Longitude bytes
        (alt >> 4) & 0xFF, // Altitude MSB
        ((alt & 0x0F) << 4) | (misc & 0x0F), // Altitude LSB + Misc
        0xBB, // NIC=11, NACp=11 (excellent GPS)
        (hVel >> 4) & 0xFF, // Horizontal velocity MSB
        ((hVel & 0x0F) << 4) | ((vVel >> 8) & 0x0F), // H-vel LSB + V-vel MSB
        vVel & 0xFF, // Vertical velocity LSB
        track, // Track/Heading
        0x01, // Emitter category: light aircraft
    ];
    
    // Call sign (8 bytes, space-padded)
    const callsign = "N825V";
    for (let i = 0; i < 8; i++) {
        msg.push(i < callsign.length ? callsign.charCodeAt(i) : 0x20);
    }
    
    msg.push(0x00); // Emergency code: none
    
    return frame(msg);
}



// ForeFlight AHRS message (extension format)
function ahrs() {
    const roll = Math.round(simState.roll * 10); // 0.1 degree resolution
    const pitch = Math.round(simState.pitch * 10);
    const heading = Math.round(simState.heading * 10) & 0x7FFF; // True heading
    const ias = Math.round(simState.gs);
    const tas = Math.round(simState.gs);
    
    const msg = [
        0x65, // Message ID
        0x01, // Sub-ID
        (roll >> 8) & 0xFF, roll & 0xFF, // Roll (big-endian)
        (pitch >> 8) & 0xFF, pitch & 0xFF, // Pitch
        (heading >> 8) & 0xFF, heading & 0xFF, // Heading
        (ias >> 8) & 0xFF, ias & 0xFF, // IAS
        (tas >> 8) & 0xFF, tas & 0xFF, // TAS
    ];
    
    return frame(msg);
}

function startGDL90Stream(ip, port = 4000) {
    const socket = dgram.createSocket("udp4");

    // Update simulation state every second
    setInterval(() => {
        // Simulate eastbound flight with slight movement
        const timeStep = 1.0; // seconds
        const speedMs = simState.gs * 0.514444; // knots to m/s
        const deltaLon = (speedMs * timeStep) / (111320 * Math.cos(simState.lat * Math.PI / 180));
        
        simState.lon += deltaLon;
        
        // Add some gentle pitch/roll variation for realism
        simState.pitch = 2 + Math.sin(Date.now() / 5000) * 1;
        simState.roll = Math.sin(Date.now() / 3000) * 3;
    }, 1000);

    // Send heartbeat every 1 second per spec
    setInterval(() => socket.send(heartbeat(), port, ip), 1000);
    
    // Send ownship and AHRS at 5Hz (200ms) per spec
    setInterval(() => socket.send(ownship(), port, ip), 200);
    setInterval(() => socket.send(ahrs(), port, ip), 200);

    console.log("📡 Sending GDL-90 stream to ForeFlight...");
    console.log(`   Position: ${simState.lat.toFixed(4)}°N, ${simState.lon.toFixed(4)}°E`);
    console.log(`   Altitude: ${simState.alt} ft, Speed: ${simState.gs} kt, Track: ${simState.track}°`);
}

module.exports = { startGDL90Stream };
