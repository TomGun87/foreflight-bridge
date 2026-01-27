const dgram = require("dgram");

const DISCOVERY_PORT = 63093;
const DISCOVERY_MESSAGE = Buffer.from("ForeFlight");

function discoverForeFlight(timeoutMs = 15000) {
    return new Promise((resolve) => {
        const socket = dgram.createSocket("udp4");

        socket.bind(() => {
            socket.setBroadcast(true);
            socket.send(
                DISCOVERY_MESSAGE,
                0,
                DISCOVERY_MESSAGE.length,
                DISCOVERY_PORT,
                "255.255.255.255"
            );
        });

        socket.on("message", (_, rinfo) => {
            socket.close();
            resolve(rinfo.address);
        });

        setTimeout(() => {
            socket.close();
            resolve(null);
        }, timeoutMs);
    });
}

module.exports = { discoverForeFlight };
