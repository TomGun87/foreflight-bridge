const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bridge', {
    // Set initial position
    setPosition: (lat, lon) => ipcRenderer.send('set-position', { lat, lon }),
    
    // Set target values (will transition at realistic rates)
    setTargetHeading: (heading) => ipcRenderer.send('set-target-heading', heading),
    setTargetAltitude: (altitude) => ipcRenderer.send('set-target-altitude', altitude),
    setTargetSpeed: (speed) => ipcRenderer.send('set-target-speed', speed),
    
    // Receive state updates
    onStateUpdate: (callback) => ipcRenderer.on('state-update', (event, state) => callback(state)),
    
    // Receive connection status
    onConnectionStatus: (callback) => ipcRenderer.on('connection-status', (event, status) => callback(status))
});
