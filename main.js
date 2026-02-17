const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");

// Load airport database
let airports = [];
const airportsPath = path.join(__dirname, 'airports.json');
if (fs.existsSync(airportsPath)) {
    try {
        airports = JSON.parse(fs.readFileSync(airportsPath, 'utf8'));
        console.log(`✈️  Loaded ${airports.length} airports`);
    } catch (err) {
        console.error('Failed to load airports:', err.message);
    }
}
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
    
    // Airport search handler
    ipcMain.handle('search-airports', (event, query) => {
        if (!query || query.length < 2) return [];
        
        const q = query.toLowerCase();
        const results = airports.filter(apt => {
            return apt.icao.toLowerCase().includes(q) ||
                   apt.iata.toLowerCase().includes(q) ||
                   apt.name.toLowerCase().includes(q) ||
                   apt.city.toLowerCase().includes(q);
        });
        
        // Return top 20 results, prioritizing exact ICAO/IATA matches
        results.sort((a, b) => {
            const aExact = a.icao.toLowerCase() === q || a.iata.toLowerCase() === q;
            const bExact = b.icao.toLowerCase() === q || b.iata.toLowerCase() === q;
            if (aExact && !bExact) return -1;
            if (bExact && !aExact) return 1;
            
            // Then by type (large airports first)
            const typeOrder = { 'large_airport': 0, 'medium_airport': 1, 'small_airport': 2 };
            return typeOrder[a.type] - typeOrder[b.type];
        });
        
        return results.slice(0, 20);
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
