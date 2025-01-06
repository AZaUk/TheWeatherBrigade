const {
    contextBridge,
    ipcRenderer
} = require("electron");

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
    "api", {
        send: (channel, ids, days) => {
            // whitelist channels
            let validChannels = ["fetch-initial-data", "fetch-gateway-data", "fetch-humidity-data", "fetch-temperature-data", "fetch-battery-data", "fetch-pressure-data", "fetch-illuminance-data"];
            if (validChannels.includes(channel)) {
                ipcRenderer.send(channel, ids, days);
            }
        },
        receive: (channel, func) => {
            let validChannels = ["initial-data-fetched", "gateway-data-fetched", "humidity-data-fetched", "temperature-data-fetched", "battery-data-fetched", "pressure-data-fetched", "illuminance-data-fetched"];
            if (validChannels.includes(channel)) {
                // Deliberately strip event as it includes `sender`
                ipcRenderer.on(channel, (event, ...args) => func(...args));
            }
        }
    }
);