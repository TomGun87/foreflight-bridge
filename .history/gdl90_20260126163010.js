// const dgram = require("dgram");

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
    const PORT = 4000; // ForeFlight GDL-90 UDP port

    // --- CRC-16 CCITT ---
    function crc16(buf) {
        let crc = 0xFFFF;
        for (const b of buf) {
            crc ^= b << 8;
            for (let i = 0; i < 8; i++) {
                crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
                crc &= 0xFFFF;
            }
        }
        return crc;
    }

    // --- Byte-stuffing ---
    function escape(buf) {
        const out = [];
        for (const b of buf) {
            if (b === 0x7E) out.push(0x7D, 0x5E);
            else if (b === 0x7D) out.push(0x7D, 0x5D);
            else out.push(b);
        }
        return Buffer.from(out);
    }

    // --- Frame payload with 0x7E delimiters + CRC ---
    function frame(payload) {
        const crc = crc16(payload);
        const framed = Buffer.concat([payload, Buffer.from([crc >> 8, crc & 0xFF])]);
        return Buffer.concat([Buffer.from([0x7E]), escape(framed), Buffer.from([0x7E])]);
    }

    // --- Heartbeat (GPS valid + position valid) ---
    function heartbeat() {
        const buf = Buffer.alloc(7);
        buf[0] = 0x00;          // Heartbeat message
        buf[1] = 0b00000111;    // GPS available + GPS valid + position valid
        return frame(buf);
    }

    // --- Ownship over Belgium ---
    function ownship() {
        const buf = Buffer.alloc(28);
        buf.fill(0);
        buf[0] = 0x0A; // Message ID

        // Lat/Lon (degrees × 1e7)
        buf.writeInt32BE(Math.round(50.9010 * 1e7), 1); // lat
        buf.writeInt32BE(Math.round(4.4840 * 1e7), 5);  // lon

        // Altitude (ft / 25 + 1000 offset)
        buf.writeUInt16BE(Math.round((3000 + 1000) / 25), 9);

        // NIC / NACp / SIL
        buf[11] = 8;
        buf[12] = 8;
        buf[13] = 3;

        // Groundspeed
        buf.writeUInt16BE(120, 14);

        // Track (degrees)
        buf[16] = 90;

        // Vertical velocity
        buf.writeInt16BE(0, 17);

        // Emitter category (1 = light aircraft)
        buf[19] = 0x01;

        // Callsign (optional)
        Buffer.from("TEST123 ").copy(buf, 20);

        return frame(buf);
    }

    // --- AHRS (optional but needed for Synthetic Vision) ---
    function ahrs() {
        const buf = Buffer.alloc(7);
        buf[0] = 0x65;        // AHRS message
        buf.writeInt16BE(0, 1); // pitch x10
        buf.writeInt16BE(0, 3); // roll x10
        buf.writeInt16BE(90 * 10, 5); // heading x10
        return frame(buf);
    }

    // --- Send packets ---
    setInterval(() => socket.send(heartbeat(), PORT, ip), 1000); // 1 Hz
    setInterval(() => socket.send(ownship(), PORT, ip), 200);    // 5 Hz
    setInterval(() => socket.send(ahrs(), PORT, ip), 200);       // 5 Hz

    console.log("📡 Sending GDL-90 test stream to", ip, "port", PORT);
}


module.exports = { startGDL90Stream };
