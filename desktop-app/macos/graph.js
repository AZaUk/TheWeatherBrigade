let chart;
let graphType = "temperature", symbol = '°C';
const oneDayButton = document.getElementById('oneDay');
const oneWeekButton = document.getElementById('oneWeek');
const oneMonthButton = document.getElementById('oneMonth');
const TemperatureButton = document.getElementById('temperature');
const humidityButton = document.getElementById('humidity');
const pressureButton = document.getElementById('pressure');
const voltageButton = document.getElementById('battery');
const illButton = document.getElementById('illuminance');
const selectElement = document.getElementById('locationSelect');
let toggleButtons = document.querySelectorAll(".toggle-button");

// RECEIVE DATA FROM DB
window.api.receive("gateway-data-fetched", (data) => {
    averageAirtimeText.innerText = data[0]?.AvgAirtime;
    setMapView(data);
});

window.api.receive("initial-data-fetched", (data) => {
    if (data != "error") {
        populateDevices(data);
        window.api.send("fetch-gateway-data", data[0]?.ID); // Location ID
        window.api.send("fetch-temperature-data", data[0]?.ID);
    } else {
        populateDevices([]);
        (document.getElementById('error_banner')).style.display = "flex";
    }
});
window.api.send("fetch-initial-data");

window.api.receive("temperature-data-fetched", (data) => {
    if (typeof data == "string" && data.startsWith('error')) fetchError(data);
    const arrayOfFirstLocationValues = data[Object.keys(data)[0]];
    graphType = "temperature";
    symbol = '°C';

    fillInTempFeeling((arrayOfFirstLocationValues[arrayOfFirstLocationValues.length - 1].y)?.toFixed(1));

    const cityColors = {};
    Object.keys(data).forEach(cityName => {
        cityColors[cityName] = cityToColor(cityName);
    });

    const series = Object.keys(data).map(cityName => ({
        name: cityName,
        data: data[cityName],
        color: cityColors[cityName]
    }));

    if (chart) {
        chart.updateSeries(series);
        updateAnnotationDensity(arrayOfFirstLocationValues,500);
    }
});
window.api.receive("humidity-data-fetched", (data) => {
    if (typeof data == "string" && data.startsWith('error')) fetchError(data);
    const arrayOfFirstLocationValues = data[Object.keys(data)[0]];
    graphType = "humidity";
    symbol = 'g/m3';

    const cityColors = {};
    Object.keys(data).forEach(cityName => {
        cityColors[cityName] = cityToColor(cityName);
    });

    const series = Object.keys(data).map(cityName => ({
        name: cityName,
        data: data[cityName],
        color: cityColors[cityName]
    }));

    if (chart) {
        chart.updateSeries(series);
        updateAnnotationDensity(arrayOfFirstLocationValues,500);
    }
});
window.api.receive("battery-data-fetched", (data) => {
    if (typeof data == "string" && data.startsWith('error')) fetchError(data);
    const arrayOfFirstLocationValues = data[Object.keys(data)[0]];
    graphType = "battery";
    symbol = 'V';

    const cityColors = {};
    Object.keys(data).forEach(cityName => {
        cityColors[cityName] = cityToColor(cityName);
    });

    const series = Object.keys(data).map(cityName => ({
        name: cityName,
        data: data[cityName],
        color: cityColors[cityName]
    }));

    if (chart) {
        chart.updateSeries(series);
        updateAnnotationDensity(arrayOfFirstLocationValues,500);
    }
});
window.api.receive("pressure-data-fetched", (data) => {
    if (typeof data == "string" && data.startsWith('error')) fetchError(data);
    const arrayOfFirstLocationValues = data[Object.keys(data)[0]];
    graphType = "pressure";
    symbol = 'Pa';

    const cityColors = {};
    Object.keys(data).forEach(cityName => {
        cityColors[cityName] = cityToColor(cityName);
    });

    const series = Object.keys(data).map(cityName => ({
        name: cityName,
        data: data[cityName],
        color: cityColors[cityName]
    }));

    if (chart) {
        chart.updateSeries(series);
        updateAnnotationDensity(arrayOfFirstLocationValues,500);
    }
});
window.api.receive("illuminance-data-fetched", (data) => {
    if (typeof data == "string" && data.startsWith('error')) fetchError(data);
    const arrayOfFirstLocationValues = data.dataByCity[Object.keys(data.dataByCity)[0]];
    graphType = "illuminance";
    symbol = '%';

    const cityColors = {};
    Object.keys(data.dataByCity).forEach(cityName => {
        cityColors[cityName] = cityToColor(cityName);
    });

    Object.keys(data.dataByCity).map(cityName => {
        const min = data.minMaxByCity[cityName].min[0].min;
        const max = data.minMaxByCity[cityName].max[0].max;
        data.dataByCity[cityName].forEach(dp => {
            dp.y = illuminanceInPercentage(dp.y, min, max);
        });
    });

    const series = Object.keys(data.dataByCity).map(cityName => ({
        name: cityName,
        data: data.dataByCity[cityName],
        color: cityColors[cityName]
    }));

    if (chart) {
        chart.updateSeries(series);
        updateAnnotationDensity(arrayOfFirstLocationValues,500);
    }
});

// EVENT LISTENERS
document.getElementById('customInput').addEventListener('input', (e) => {
    const selectedOptions = getIdsOfSelectedLocations(selectElement);
    const numberOfDays = e.target.value >= 1 ? e.target.value : 365;

    try {
        getActiveButton(selectedOptions, parseInt(numberOfDays, 10));
    } catch (err) {
        fetchError(err);
    }
});
document.querySelector('.bottom_buttons_container').addEventListener('click', (event) => {
    const clickedButton = event.target;

    if (clickedButton.classList.contains('toggle-button')) {
        document.querySelectorAll('.toggle-button').forEach((button) => {
            button.classList.remove("pressed");
        });

        clickedButton.classList.add("pressed");
    }
});

// Call the initChart function when the window has finished loading
window.addEventListener('DOMContentLoaded', () => {
    createOrUpdateChart();

    toggleButtons.forEach(function(button) {
        button.addEventListener("click", function() {
            button.classList.toggle("pressed");
        });
    });

    selectElement.addEventListener('change', function () {
        const selectedOptions = getIdsOfSelectedLocations(selectElement);
        window.api.send("fetch-gateway-data", selectedOptions);

        getActiveButton(selectedOptions);
    });
});

function getActiveButton(selectedOptions, days = 365) {
    toggleButtons.forEach(function(button) {
        if (button.classList.contains('pressed')) {
            switch (button.id) {
                case 'battery':
                    window.api.send("fetch-battery-data", selectedOptions, days);
                    break;
                case 'humidity':
                    window.api.send("fetch-humidity-data", selectedOptions, days);
                    break;
                case 'temperature':
                    window.api.send("fetch-temperature-data", selectedOptions, days);
                    break;
                case 'pressure':
                    window.api.send("fetch-pressure-data", selectedOptions, days);
                    break;
                case 'illuminance':
                    window.api.send("fetch-illuminance-data", selectedOptions, days);
                    break;
                default:
                    console.error("something went wrong");
            }
        }
    });
}

function getIdsOfSelectedLocations(selectElement) {
    return Array.from(selectElement.selectedOptions).map(option => option.value);
}

window.addEventListener('resize', () => {
    createOrUpdateChart();
});
oneDayButton.addEventListener('click', () => {
    updateChartWithTimeInterval(1);
});
oneWeekButton.addEventListener('click', () => {
    updateChartWithTimeInterval(7);
});
oneMonthButton.addEventListener('click', () => {
    updateChartWithTimeInterval(30);
});

TemperatureButton.addEventListener('click',()=> {
    if (!TemperatureButton.className.includes("pressed")) {
        const selectedOptions = getIdsOfSelectedLocations(selectElement);
        window.api.send("fetch-temperature-data", selectedOptions);
    }
});
humidityButton.addEventListener('click',()=> {
    if (!humidityButton.className.includes("pressed")) {
        const selectedOptions = getIdsOfSelectedLocations(selectElement);
        window.api.send("fetch-humidity-data", selectedOptions);
    }
});

illButton.addEventListener('click',()=> {
    if (!illButton.className.includes("pressed")) {
        const selectedOptions = getIdsOfSelectedLocations(selectElement);
        window.api.send("fetch-illuminance-data", selectedOptions);
    }
});

pressureButton.addEventListener('click',()=> {
    if (!pressureButton.className.includes("pressed")) {
        const selectedOptions = getIdsOfSelectedLocations(selectElement);
        window.api.send("fetch-pressure-data", selectedOptions);
    }
});

voltageButton.addEventListener('click',()=> {
    if (!voltageButton.className.includes("pressed")) {
        const selectedOptions = getIdsOfSelectedLocations(selectElement);
        window.api.send("fetch-battery-data", selectedOptions);
    }
});

// FUNCTIONS
function fetchError(errorText) {
    slideIn(errorText);
    setTimeout(() => {
        slideOut();
    }, 4000);
}
function slideIn(errorText) {
    let errorMessage = document.getElementById('error-message');
    errorMessage.innerHTML = errorText;
    errorMessage.style.animation = 'slideError 0.5s ease-in-out';
    errorMessage.style.top = '2%';
}

function slideOut() {
    let errorMessage = document.getElementById('error-message');
    errorMessage.style.top = '-10%';
    errorMessage.style.animation = 'slideErrorOut 0.5s ease-in-out';
}

// Optional: You can add a callback function to reset the animation after it completes
document.getElementById('error-message').addEventListener('animationend', function() {
    this.style.animation = ''; // Reset animation
});

function populateDevices(devices) {
    locationSelect.innerText = 'fetching locations...';
    if (devices.length == 0) {
        const option = document.createElement('option');
        option.text = "No sensors could be found";
        locationSelect.appendChild(option);
    } else {
        devices.forEach((device, index) => {
            const option = document.createElement('option');
            option.value = device.ID;
            option.text = device.Display_name ?? device.Device_name;
            locationSelect.appendChild(option);

            // Set the first option as selected by default
            if (index == 0) option.selected = true;
        });
    }
}

// Function to change icon visibility based on temperature range
function showWeatherIcon(iconId) {
    let icons = document.getElementsByClassName('weather-icon');
    for (let i = 0; i < icons.length; i++) {
        icons[i].style.display = 'none'; // Hide all icons
    }
    document.getElementById(iconId).style.display = 'inline-block'; // Show the specified icon
}

// Turns station luminance data from database into graphable percentage
function illuminanceInPercentage(value, min, max){
    if (min === 0 && max === 255) return ((value / max) * 100).toFixed(1); // for MKR sensors, value is linear 0-255
    else { // for LHT sensors, the value is on a logarithmic scale
        if (min === 0) min = 1; // log10(0) = -inf which we don't want
        if (value === 0) value = 1;
        let minlog = Math.log10(min);
        let maxlog = Math.log10(max);
        let range = maxlog - minlog;
        return (((Math.log10(value) - minlog) / range) * 100).toFixed(1);
    }
}

function fillInTempFeeling(currentTemperature) {
    if (currentTemperature < -5) {
        showWeatherIcon('freezingIcon');
        textRepresentationOfTemperature.innerText = 'Freezing';
    } else if (currentTemperature > -5 && currentTemperature < 7) {
        showWeatherIcon('coldIcon');
        textRepresentationOfTemperature.innerText = 'Cold';
    } else if (currentTemperature > 7 && currentTemperature < 15) {
        showWeatherIcon('coolIcon');
        textRepresentationOfTemperature.innerText = 'Cool';
    } else if (currentTemperature > 15 && currentTemperature < 25) {
        showWeatherIcon('warmIcon');
        textRepresentationOfTemperature.innerText = 'Warm';
    } else if (currentTemperature > 25) {
        showWeatherIcon('veryHotIcon');
        textRepresentationOfTemperature.innerText = 'Very hot';
    } else if (currentTemperature == null) {
        textRepresentationOfTemperature.innerText = 'Nothing selected.';
        temperatureNumber.innerText = "";
        showWeatherIcon(null);
    }
    else {
        showWeatherIcon('apocalypseIcon');
        textRepresentationOfTemperature.innerText = 'Apocalypse';
    }
    if (currentTemperature != null) temperatureNumber.innerText = ', ' + currentTemperature + '°C';
}

function cityToColor(cityName) {
    // Simple hash function to generate a unique number based on the city name
    let hashCode = 0;
    for (let i = 0; i < cityName.length; i++) {
        hashCode = (hashCode << 7) - hashCode + cityName.charCodeAt(i);
    }

    // Convert the hash code to a hexadecimal color code
    const colorCode = (hashCode & 0x00FFFFFF).toString(16).toUpperCase();

    // Ensure the color code is always 6 digits long by padding with zeros if needed
    return '#' + '00000'.substring(0, 6 - colorCode.length) + colorCode;
}

function updateChartWithTimeInterval(intervalDays) {
    const now = new Date().getTime();
    const daysInMillis = intervalDays * 24 * 60 * 60 * 1000;

    chart.zoomX(now - daysInMillis, now);
}

function updateAnnotationDensity(data, divider) {
    chart.updateOptions({
        annotations: {
            xaxis: data.map((dataPoint, index) => {
                if(dataPoint.y == null || dataPoint.y == "NaN"){
                    dataPoint.y = "No Data";
                    symbol = "";
                }
                if (index % divider === 0) {
                    return {
                        x: dataPoint.x.getTime(),
                        label: {
                            text: `${dataPoint.y}${symbol}`,
                            borderColor: 'transparent',
                            offsetY: -30,
                            style: {
                                color: '#fff',
                                background: 'transparent',
                                fontWeight: 'bold',
                                fontSize: '11px',
                            },
                        },
                        strokeDashArray: 0,
                        borderColor: 'rgba(255, 255, 255, 0.25)',
                    };
                } else {
                    return null; // Return null for indices that should not have annotations
                }
            }).filter(annotation => annotation !== null) // Remove null values from the array
        }
    });
}

function createOrUpdateChart() {
    const heightOfGraph = document.querySelector('.graph_container').clientHeight;

    // Update the chart's height using ApexCharts API
    if (chart) {
        chart.updateOptions({
            chart: {
                height: heightOfGraph
            }
        });
    } else {
        chart = new ApexCharts(document.querySelector('#chart'), {
            chart: {
                type: 'line',
                height: heightOfGraph,
                animations: {
                    enabled: true,
                    animateGradually: {
                        enabled: true,
                        delay: 200
                    },
                    dynamicAnimation: {
                        enabled: true,
                        speed: 400
                    }
                },
                background: 'rgba(0, 0, 0, 0.2)',
                events: {
                    zoomed: function(chartContext, { xaxis, yaxis }) {
                        const timeDifference = (xaxis.max - xaxis.min);
                        if (timeDifference > 45547823000) updateAnnotationDensity(4000);
                        else if (timeDifference < 45547824000 && timeDifference > 15073911000) updateAnnotationDensity(2000);
                        else if (timeDifference < 15073912000 && timeDifference > 9604510000) updateAnnotationDensity(1200);
                        else if (timeDifference < 9604520000 && timeDifference > 4806650000) updateAnnotationDensity(800);
                        else if (timeDifference < 4816660000 && timeDifference > 1922739908) updateAnnotationDensity(500);
                        else if (timeDifference < 1922739909 && timeDifference > 532851000) updateAnnotationDensity(400);
                        else if (timeDifference < 532851100 && timeDifference > 216425540) updateAnnotationDensity(160);
                        else if (timeDifference < 216425550 && timeDifference > 118212765) updateAnnotationDensity(84);
                        else if (timeDifference < 118212775 && timeDifference > 55555244) updateAnnotationDensity(48);
                        else if (timeDifference < 55555254 && timeDifference > 13784402) updateAnnotationDensity(16);
                        else if (timeDifference < 13784404 && timeDifference > 3534291) updateAnnotationDensity(5);
                        else if (timeDifference < 3534292) updateAnnotationDensity(3);
                    }
                }
            },
            noData: {
                text: 'No data here...',
                style: {
                    color: 'white',
                },
            },
            legend: {
                labels: {
                    colors: 'white',
                },
            },
            markers: {
                size: 0,
            },
            grid: {
                show: false,
            },
            series: [],
            tooltip: {
                enabled: true, // Set to false to disable tooltips completely
                theme: 'dark', // Set the theme ('light' or 'dark') for the tooltip
                style: {
                    fontSize: '14px',
                    fontFamily: 'Arial, sans-serif',
                },
                x: {
                    show: true, // Show or hide the x-axis tooltip
                    format: 'dd MMM HH:mm', // Date format for x-axis tooltip (use appropriate format)
                },
                y: {
                    formatter: function (val) {
                        if (val === 0) {
                            return '1' + symbol;
                        } else {
                            return val + symbol; // Customize the y-axis tooltip value
                        }
                    }
                }
            },
            xaxis: {
                type: 'datetime',
                labels: {
                    style: {
                        colors: '#fff' // Make x-axis labels black
                    },
                    datetimeFormatter: {
                        year: 'yyyy',
                        month: 'MMM \'yy',
                        day: 'dd MMM',
                        hour: 'HH:mm',
                    },
                },
                // tooltip: {
                //     formatter: function(val, opts) {
                //         opts.series.forEach(line => {
                //             console.log(line[opts.dataPointIndex]);
                //         })
                //         return val + symbol;
                //     }
                // }
            },
            yaxis: {
                labels: {
                    show: false // Hide y-axis labels
                },
            },
        });
        chart.render();
    }
}