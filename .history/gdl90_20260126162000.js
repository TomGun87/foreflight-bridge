const dgram = require("dgram");

const PORT = 4000;

function checksum(buf) {
    let crc = 0;
    for (const b of buf) crc ^= b;
    return crc;
}

function frame(payload) {
    const crc = checksum(payload);
    return Buffer.from([0x7e, ...payload, crc, 0x7e]);
}

function heartbeat() {
    return frame(Buffer.from([
        0x00, 0x00, 0x00, 0x00
    ]));
}


function ownship() {
    const latDeg = 50.9010;
    const lonDeg = 4.4840;
    const altFt = 3000;
    const gsKt = 120;
    const trackDeg = 90;

    const lat = Math.round(latDeg * 1e7);
    const lon = Math.round(lonDeg * 1e7);
    const alt = Math.round((altFt + 1000) / 25); // GDL-90 offset!

    const buf = Buffer.alloc(28);
    buf.fill(0);

    buf[0] = 0x0A; // Message ID

    // Latitude / Longitude
    buf.writeInt32BE(lat, 1);
    buf.writeInt32BE(lon, 5);

    // Altitude (25 ft resolution, +1000 ft offset)
    buf.writeUInt16BE(alt, 9);

    // NIC / NACp / SIL (set to reasonable non-zero)
    buf[11] = 0x08; // NIC
    buf[12] = 0x08; // NACp
    buf[13] = 0x03; // SIL

    // Groundspeed (kt)
    buf.writeUInt16BE(gsKt, 14);

    // Track (degrees true)
    buf.writeUInt8(trackDeg, 16);

    // Vertical velocity (ft/min / 64)
    buf.writeInt16BE(0, 17);

    // Emitter category (light aircraft = 1)
    buf[19] = 0x01;

    // Callsign (optional but helps validation)
    Buffer.from("TEST123 ").copy(buf, 20);

    return frame(buf);
}


function ahrs() {
    const buf = Buffer.alloc(7);
    buf[0] = 0x65;
    buf.writeInt16BE(5 * 10, 1);   // pitch
    buf.writeInt16BE(15 * 10, 3); // roll
    buf.writeInt16BE(90 * 10, 5); // heading

    return frame(buf);
}

function startGDL90Stream(ip) {
    const dgram = require("dgram");
    const socket = dgram.createSocket("udp4");

    const IP = "172.20.10.1"; // iPad hotspot IP
    const PORT = 49002;      // X-Plane GPS port ForeFlight listens to

    function sendXPlaneGPS() {
        const buf = Buffer.alloc(41);

        buf.write("DATA\0", 0);      // Header
        buf.writeInt32LE(3, 5);      // Data group: position

        buf.writeFloatLE(50.9010, 9);  // Latitude
        buf.writeFloatLE(4.4840, 13);  // Longitude
        buf.writeFloatLE(3000, 17);    // Altitude ft
        buf.writeFloatLE(120, 21);     // Groundspeed kt
        buf.writeFloatLE(90, 25);      // Track
        buf.writeFloatLE(0, 29);       // Pitch
        buf.writeFloatLE(0, 33);       // Roll
        buf.writeFloatLE(90, 37);      // Heading

        socket.send(buf, PORT, IP);
    }

    setInterval(sendXPlaneGPS, 200);
    console.log("📡 Sending X-Plane GPS test");

}

module.exports = { startGDL90Stream };
