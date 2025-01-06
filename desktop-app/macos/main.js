const { app, BrowserWindow, ipcMain } = require('electron');
const glasstron = require('glasstron');
const sql = require('mssql');
const path = require("path");

app.commandLine.appendSwitch("enable-transparent-visuals");

let mainWindow;
const createWindow = () => {
    mainWindow = new glasstron.BrowserWindow({
        width: 800,
        height: 600,
        icon: path.join(__dirname, 'logo.icns'),
        titleBarStyle: "default",
        titleBarOverlay: true,
        autoHideMenuBar: true,
        webPreferences: {
            nodeIntegration: false, // is default value after Electron v5
            contextIsolation: true, // protect against prototype pollution
            enableRemoteModule: false, // turn off remote
            preload: path.join(__dirname, "preload.js") // use a preload script
        }
    });

    mainWindow.setMinimumSize(750, 550);
    mainWindow.loadFile('index.html');
    mainWindow.setVibrancy('fullscreen-ui');
    mainWindow.setBlur(true);
}

app.whenReady().then(() => {
        createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})







async function initialDataFetch() {
    try {
        await sql.connect('Server=the-weather-brigade.database.windows.net,1433;DATABASE=weatherbrg;UID=brigadier;PWD=mW24Fh6Pt1pE;Encrypt=true');
        return (await sql.query`SELECT * FROM [Device]`).recordset;  // where id = ${value}`
    } catch (e) {
        console.error("error:", e);
        return "error. restart app";
    }
}

async function fetchGatewayInfo(ids) {
    try {
        await sql.connect('Server=the-weather-brigade.database.windows.net,1433;DATABASE=weatherbrg;UID=brigadier;PWD=mW24Fh6Pt1pE;Encrypt=true');

        let result;
        if (Array.isArray(ids) && ids.length > 0) {
            const parameters = ids.map(id => parseInt(id)).join(', ');
            const query = `
                SELECT Gateway.ID, Gateway.Longitude, Gateway.Latitude, Device.Display_name, Device.AvgAirtime
                FROM Gateway
                LEFT JOIN Device ON Gateway.ID = Device.Gateway_id
                WHERE Device.ID IN (${parameters});
            `;
            result = (await sql.query(query)).recordset;
        } else {
            result = (await sql.query`
                SELECT Gateway.ID, Gateway.Longitude, Gateway.Latitude, Device.Display_name, Device.AvgAirtime
                FROM Gateway
                LEFT JOIN Device ON Gateway.ID = Device.Gateway_id
                WHERE Device.ID = ${parseInt(ids)};
            `).recordset;
        }
        return result;
    } catch (err) {
        console.error("error fetching gateway:", err);
        return "error fetching gateway";
    }
}

async function fetchHumidity(ids, days) {
    try {
        await sql.connect('Server=the-weather-brigade.database.windows.net,1433;DATABASE=weatherbrg;UID=brigadier;PWD=mW24Fh6Pt1pE;Encrypt=true');

        let humidity;
        if (Array.isArray(ids) && ids.length > 0) {
            const parameters = ids.map(id => parseInt(id)).join(', ');
            const query = `
                SELECT Data.Humidity, Data.Time, Device.Display_name
                FROM Gateway
                INNER JOIN Device ON Gateway.ID = Device.Gateway_id
                LEFT JOIN Data ON Device.ID = Data.Device_id
                WHERE Data.Time >= DATEADD(day, -${days}, GETDATE())
                AND Device.ID IN (${parameters});
            `;
            humidity = (await sql.query(query)).recordset;
        } else {
            humidity = (await sql.query`
                SELECT Data.Humidity, Data.Time, Device.Display_name
                FROM Gateway
                INNER JOIN Device ON Gateway.ID = Device.Gateway_id
                LEFT JOIN Data ON Device.ID = Data.Device_id
                WHERE Data.Time >= DATEADD(day, -${days}, GETDATE())
                AND Device.ID = ${parseInt(ids)};
            `).recordset;
        }

        if (humidity && humidity.length > 0) {
            const dataByCity = {};
            humidity.forEach(entry => {
                const cityName = entry.Display_name;
                if (!dataByCity[cityName]) {
                    dataByCity[cityName] = [];
                }
                dataByCity[cityName].push({
                    x: entry.Time,
                    y: entry.Humidity
                });
            });

            return dataByCity;
        } else {
            console.warn("No data found for humidity:", ids);
            return "error no data found for humidity";
        }
    } catch (err) {
        console.error("error fetching humidity:", err);
        return "error fetching humidity";
    }
}
async function fetchTemperature(ids, days) {
    try {
        await sql.connect('Server=the-weather-brigade.database.windows.net,1433;DATABASE=weatherbrg;UID=brigadier;PWD=mW24Fh6Pt1pE;Encrypt=true');

        let temperature;
        if (Array.isArray(ids) && ids.length > 0) {
            const parameters = ids.map(id => parseInt(id)).join(', ');
            const query = `
                SELECT Data.OutTemp, Data.InTemp, Data.Time, Device.Display_name
                FROM Gateway
                INNER JOIN Device ON Gateway.ID = Device.Gateway_id
                LEFT JOIN Data ON Device.ID = Data.Device_id
                WHERE Data.Time >= DATEADD(day, -${days}, GETDATE())
                AND Device.ID IN (${parameters});
            `;
            temperature = (await sql.query(query)).recordset;
        } else {
            temperature = (await sql.query`
                SELECT Data.OutTemp, Data.InTemp, Data.Time, Device.Display_name
                FROM Gateway
                INNER JOIN Device ON Gateway.ID = Device.Gateway_id
                LEFT JOIN Data ON Device.ID = Data.Device_id
                WHERE Data.Time >= DATEADD(day, -${days}, GETDATE())
                AND Device.ID = ${parseInt(ids)};
            `).recordset;
        }

        if (temperature && temperature.length > 0) {
            const dataByCity = {};
            temperature.forEach(entry => {
                const cityName = entry.Display_name;
                if (!dataByCity[cityName]) {
                    dataByCity[cityName] = [];
                }
                dataByCity[cityName].push({
                    x: entry.Time,
                    y: entry.InTemp ?? entry.OutTemp
                });
            });

            return dataByCity;
        } else {
            console.warn("No data found for temperature:", ids);
            return "error no data found for temperature";
        }
    } catch (err) {
        console.error("error fetching temperature:", err);
        return "error fetching temperature";
    }
}
async function fetchBattery(ids, days) {
    try {
        await sql.connect('Server=the-weather-brigade.database.windows.net,1433;DATABASE=weatherbrg;UID=brigadier;PWD=mW24Fh6Pt1pE;Encrypt=true');

        let battery;
        if (Array.isArray(ids) && ids.length > 0) {
            const parameters = ids.map(id => parseInt(id)).join(', ');
            const query = `
                SELECT Data.BatVoltage, Data.Time, Device.Display_name
                FROM Gateway
                INNER JOIN Device ON Gateway.ID = Device.Gateway_id
                LEFT JOIN Data ON Device.ID = Data.Device_id
                WHERE Data.Time >= DATEADD(day, -${days}, GETDATE())
                AND Device.ID IN (${parameters});
            `;
            battery = (await sql.query(query)).recordset;
        } else {
            battery = (await sql.query`
                SELECT Data.BatVoltage, Data.Time, Device.Display_name
                FROM Gateway
                INNER JOIN Device ON Gateway.ID = Device.Gateway_id
                LEFT JOIN Data ON Device.ID = Data.Device_id
                WHERE Data.Time >= DATEADD(day, -${days}, GETDATE())
                AND Device.ID = ${parseInt(ids)};
            `).recordset;
        }

        if (battery && battery.length > 0) {
            const dataByCity = {};
            battery.forEach(entry => {
                const cityName = entry.Display_name;
                if (!dataByCity[cityName]) {
                    dataByCity[cityName] = [];
                }
                dataByCity[cityName].push({
                    x: entry.Time,
                    y: entry.BatVoltage
                });
            });

            return dataByCity;
        } else {
            console.warn("No data found for battery:", ids);
            return "error no data found for battery";
        }
    } catch (err) {
        console.error("error fetching battery:", err);
        return "error fetching battery";
    }
}
async function fetchPressure(ids, days) {
    try {
        await sql.connect('Server=the-weather-brigade.database.windows.net,1433;DATABASE=weatherbrg;UID=brigadier;PWD=mW24Fh6Pt1pE;Encrypt=true');

        let pressure;
        if (Array.isArray(ids) && ids.length > 0) {
            const parameters = ids.map(id => parseInt(id)).join(', ');
            const query = `
                SELECT Data.Pressure, Data.Time, Device.Display_name
                FROM Gateway
                INNER JOIN Device ON Gateway.ID = Device.Gateway_id
                LEFT JOIN Data ON Device.ID = Data.Device_id
                WHERE Data.Time >= DATEADD(day, -${days}, GETDATE())
                AND Device.ID IN (${parameters});
            `;
            pressure = (await sql.query(query)).recordset;
        } else {
            pressure = (await sql.query`
                SELECT Data.Pressure, Data.Time, Device.Display_name
                FROM Gateway
                INNER JOIN Device ON Gateway.ID = Device.Gateway_id
                LEFT JOIN Data ON Device.ID = Data.Device_id
                WHERE Data.Time >= DATEADD(day, -${days}, GETDATE())
                AND Device.ID = ${parseInt(ids)};
            `).recordset;
        }

        if (pressure && pressure.length > 0) {
            const dataByCity = {};
            pressure.forEach(entry => {
                const cityName = entry.Display_name;
                if (!dataByCity[cityName]) {
                    dataByCity[cityName] = [];
                }
                dataByCity[cityName].push({
                    x: entry.Time,
                    y: entry.Pressure
                });
            });

            return dataByCity;
        } else {
            console.warn("No data found for pressure:", ids);
            return "error no data found for pressure";
        }
    } catch (err) {
        console.error("error fetching pressure:", err);
        return "error fetching pressure";
    }
}
async function fetchIlluminance(ids, days) {
    try {
        await sql.connect('Server=the-weather-brigade.database.windows.net,1433;DATABASE=weatherbrg;UID=brigadier;PWD=mW24Fh6Pt1pE;Encrypt=true');

        let illuminance, min, max;
        if (Array.isArray(ids) && ids.length > 0) {
            // For multiple IDs (as an array)
            const parameters = Array.isArray(ids) ? ids : [ids];
            const query = `
                SELECT Data.Illuminance, Data.Time, Device.Display_name
                FROM Gateway
                INNER JOIN Device ON Gateway.ID = Device.Gateway_id
                LEFT JOIN Data ON Device.ID = Data.Device_id
                WHERE Data.Time >= DATEADD(day, -${days}, GETDATE())
                AND Device.ID IN (${parameters});
            `;
            illuminance = (await sql.query(query)).recordset;

            min = (await sql.query`
                SELECT MIN(Illuminance) AS min FROM Data
                LEFT JOIN Device ON Data.Device_id = Device.ID
                WHERE Device.ID IN (${parameters});
            `).recordset;

            max = (await sql.query`
                SELECT MAX(Illuminance) AS max FROM Data
                LEFT JOIN Device ON Data.Device_id = Device.ID
                WHERE Device.ID IN (${parameters});
            `).recordset;
        } else {
            illuminance = (await sql.query`
                SELECT Data.Illuminance, Data.Time, Device.Display_name
                FROM Gateway
                INNER JOIN Device ON Gateway.ID = Device.Gateway_id
                LEFT JOIN Data ON Device.ID = Data.Device_id
                WHERE Data.Time >= DATEADD(day, -${days}, GETDATE())
                AND Device.ID = ${parseInt(ids)};
            `).recordset;

            min = (await sql.query`
                SELECT MIN(Illuminance) AS min FROM Data
                WHERE Device_id = ${parseInt(ids)};
            `).recordset;

            max = (await sql.query`
                SELECT MAX(Illuminance) AS max FROM Data
                WHERE Device_id = ${parseInt(ids)};
            `).recordset;
        }

        if (illuminance && illuminance.length > 0) {
            const dataByCity = {};
            const minMaxByCity = {};
            illuminance.forEach(entry => {
                const cityName = entry.Display_name;
                if (!dataByCity[cityName]) {
                    dataByCity[cityName] = [];
                }
                if (!minMaxByCity[cityName]) {
                    minMaxByCity[cityName] = { min: null, max: null };
                }
                dataByCity[cityName].push({
                    x: entry.Time,
                    y: entry.Illuminance
                });
                minMaxByCity[cityName].min = min;
                minMaxByCity[cityName].max = max;
            });

            return { dataByCity, minMaxByCity };
        } else {
            console.warn("No data found for illuminance:", ids);
            return "error no data found for illuminance";
        }
    } catch (err) {
        console.error("error fetching illuminance:", err);
        return "error fetching illuminance";
    }
}

// Event listener for incoming requests from the front-end
ipcMain.on('fetch-initial-data', async (event) => {
    const data = await initialDataFetch();
    event.reply('initial-data-fetched', data); // Send the fetched data back to the front-end
    // if above does not work do this
    // mainWindow.webContents.send("initial-data-fetched", data);
});
// Event listener for incoming requests from the front-end
ipcMain.on('fetch-gateway-data', async (event, ids, days = 365) => {
    const data = await fetchGatewayInfo(ids);
    event.reply('gateway-data-fetched', data);
});
ipcMain.on('fetch-humidity-data', async (event, ids, days = 365) => {
    const data = await fetchHumidity(ids, days);
    event.reply('humidity-data-fetched', data);
});
ipcMain.on('fetch-temperature-data', async (event, ids, days = 365) => {
    const data = await fetchTemperature(ids, days);
    event.reply('temperature-data-fetched', data);
});
ipcMain.on('fetch-battery-data', async (event, ids, days = 365) => {
    const data = await fetchBattery(ids, days);
    event.reply('battery-data-fetched', data);
});
ipcMain.on('fetch-pressure-data', async (event, ids, days = 365) => {
    const data = await fetchPressure(ids, days);
    event.reply('pressure-data-fetched', data);
});
ipcMain.on('fetch-illuminance-data', async (event, ids, days = 365) => {
    const data = await fetchIlluminance(ids, days);
    event.reply('illuminance-data-fetched', data);
});