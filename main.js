const { app } = require("electron");
const { discoverForeFlight } = require("./discovery");
const { startGDL90Stream } = require("./gdl90");

app.whenReady().then(async () => {
    console.log("🚀 ForeFlight Bridge starting...");

    const result = await discoverForeFlight();
    // const result = { ip: "10.42.0.14", port: 4000 };
    
    if (!result) {
        console.error("❌ ForeFlight not found on network");
        return;
    }

    console.log(`✅ Starting GDL-90 stream to ${result.ip}:${result.port}`);
    startGDL90Stream(result.ip, result.port);
});
