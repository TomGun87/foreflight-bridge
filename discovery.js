const dgram = require("dgram");

const DISCOVERY_PORT = 63093;

function discoverForeFlight(timeoutMs = 10000) {
    return new Promise((resolve) => {
        const socket = dgram.createSocket("udp4");
        let resolved = false;

        socket.bind(DISCOVERY_PORT, () => {
            console.log(`🔍 Listening for ForeFlight broadcast on port ${DISCOVERY_PORT}...`);
        });

        socket.on("message", (msg, rinfo) => {
            if (resolved) return;

            try {
                const data = JSON.parse(msg.toString());
                if (data.App === "ForeFlight" && data.GDL90) {
                    const port = data.GDL90.port || 4000;
                    console.log(`📍 ForeFlight discovered at ${rinfo.address}:${port}`);
                    resolved = true;
                    socket.close();
                    resolve({ ip: rinfo.address, port });
                }
            } catch (err) {
                // Ignore non-JSON messages
            }
        });

        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                socket.close();
                resolve(null);
            }
        }, timeoutMs);
    });
}

module.exports = { discoverForeFlight };
