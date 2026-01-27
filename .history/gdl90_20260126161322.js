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
    const alt = Math.round(altFt / 25);

    const buf = Buffer.alloc(14);
    buf[0] = 0x0A;

    buf.writeInt32BE(lat, 1);
    buf.writeInt32BE(lon, 5);
    buf.writeUInt16BE(alt, 9);
    buf.writeUInt16BE(gsKt, 11);
    buf.writeUInt8(trackDeg, 13);

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
    setInterval(() => socket.send(ownship(), PORT, ip), 200);
    setInterval(() => socket.send(ahrs(), PORT, ip), 200);

    console.log("📡 Sending GDL-90 test stream...");
}

module.exports = { startGDL90Stream };
