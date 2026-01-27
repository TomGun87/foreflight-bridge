const { app } = require("electron");
const { discoverForeFlight } = require("./discovery");
const { startGDL90Stream } = require("./gdl90");

app.whenReady().then(async () => {
    console.log("🚀 ForeFlight Bridge starting...");

    const foreflightIP = await discoverForeFlight();
    // const foreflightIP = "10.42.0.14";
    if (!foreflightIP) {
        console.error("❌ ForeFlight not found on network");
        return;
    }

    console.log(`✅ ForeFlight found at ${foreflightIP}`);
    startGDL90Stream(foreflightIP);
});
