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
