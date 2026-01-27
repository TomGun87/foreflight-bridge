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
    // Example position: Brussels area
    const latitudeDeg = 50.9010;
    const longitudeDeg = 4.4840;
    const altitudeFt = 3000;
    const groundSpeedKt = 120;
    const trackDeg = 90;

    const lat = Math.round(latitudeDeg * 1e7);
    const lon = Math.round(longitudeDeg * 1e7);
    const alt = Math.round(altitudeFt / 25);
    const track = Math.round((trackDeg / 360) * 256);

    const buf = Buffer.alloc(14);
    buf[0] = 0x0A;                     // Ownship report
    buf.writeInt32BE(lat, 1);          // Latitude
    buf.writeInt32BE(lon, 5);          // Longitude
    buf.writeUInt16BE(alt, 9);         // Altitude (25 ft units)
    buf.writeUInt8(groundSpeedKt, 11); // Groundspeed (kt)
    buf.writeUInt8(track, 12);         // Track
    buf.writeUInt8(0x00, 13);          // Misc / reserved

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
    const socket = dgram.createSocket("udp4");

    setInterval(() => socket.send(heartbeat(), PORT, ip), 1000);
    setInterval(() => socket.send(ownship(), 4000, ip), 200);

    setInterval(() => socket.send(ahrs(), PORT, ip), 200);

    console.log("📡 Sending GDL-90 test stream...");
}

module.exports = { startGDL90Stream };
