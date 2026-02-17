const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { discoverForeFlight } = require("./discovery");
const { 
    startGDL90Stream, 
    setPosition, 
    setTargetHeading, 
    setTargetAltitude, 
    setTargetSpeed,
    setClimbRate
} = require("./gdl90");

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 850,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false
        },
        backgroundColor: "#1a1a2e",
        title: "ForeFlight Bridge"
    });

    mainWindow.loadFile("index.html");
}

app.whenReady().then(async () => {
    console.log("🚀 ForeFlight Bridge starting...");
    
    createWindow();
    
    // Set up IPC handlers
    ipcMain.on("set-position", (event, { lat, lon }) => {
        console.log(`📍 Setting position to ${lat}, ${lon}`);
        setPosition(lat, lon);
    });
    
    ipcMain.on("set-target-heading", (event, heading) => {
        console.log(`🧭 Target heading: ${heading}°`);
        setTargetHeading(heading);
    });
    
    ipcMain.on("set-target-altitude", (event, altitude) => {
        console.log(`📈 Target altitude: ${altitude} ft`);
        setTargetAltitude(altitude);
    });
    
    ipcMain.on("set-target-speed", (event, speed) => {
        console.log(`🚀 Target speed: ${speed} kt`);
        setTargetSpeed(speed);
    });
    
    ipcMain.on("set-climb-rate", (event, rate) => {
        console.log(`📊 Climb rate: ${rate} fpm`);
        setClimbRate(rate);
    });
    
    // Notify UI that we're searching
    mainWindow.webContents.on("did-finish-load", async () => {
        mainWindow.webContents.send("connection-status", { 
            connected: false, 
            message: "Searching for ForeFlight..." 
        });
        
        const result = await discoverForeFlight();

        if (!result) {
            console.error("❌ ForeFlight not found on network");
            mainWindow.webContents.send("connection-status", { 
                connected: false, 
                message: "ForeFlight not found - check network" 
            });
            return;
        }

        console.log(`✅ Starting GDL-90 stream to ${result.ip}:${result.port}`);
        mainWindow.webContents.send("connection-status", { 
            connected: true, 
            ip: result.ip, 
            port: result.port 
        });
        
        // Start streaming with state update callback
        startGDL90Stream(result.ip, result.port, (state) => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send("state-update", state);
            }
        });
    });
});

app.on("window-all-closed", () => {
    app.quit();
});
