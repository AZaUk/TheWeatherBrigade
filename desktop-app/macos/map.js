const locationSelect = document.getElementById('locationSelect');
const textRepresentationOfTemperature = document.getElementById('temperatureTextRepresentation');
const temperatureNumber = document.getElementById('tempNum');
const apocalypseIcon = document.getElementById('apocalypseIcon');
const freezingIcon = document.getElementById('freezingIcon');
const coldIcon = document.getElementById('coldIcon');
const coolIcon = document.getElementById('coolIcon');
const warmIcon = document.getElementById('warmIcon');
const veryHotIcon = document.getElementById('veryHotIcon');
const averageAirtimeText = document.getElementById('averageAirtime');

const map = L.map('map', {zoomControl: false}).setView([79.136667, 2.816667], 13);

// Create an empty array to store markers
const markers = [];

function setMapView(data) {
    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers.length = 0;

    // Loop through data and add markers with popups
    data.forEach(gateway => {
        const { Latitude, Longitude, Display_name, ID } = gateway;

        const marker = L.marker([Latitude, Longitude]).addTo(map);
        marker.bindPopup(Display_name).openPopup();

        // Add the marker to the markers array
        markers.push(marker);
    });

    // Fit the map to the bounds of all markers
    const group = new L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.5));
}

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'Map by <a href="https://www.openstreetmap.org/" target="_blank">OpenStreetMap</a>',
    maxZoom: 18,
}).addTo(map);

map.attributionControl.setPrefix(`<a href="https://leafletjs.com" target="_blank" title="A JavaScript library for interactive maps"><svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="12" height="8" viewBox="0 0 12 8" class="leaflet-attribution-flag"><path fill="#4C7BE1" d="M0 0h12v4H0z"></path><path fill="#FFD500" d="M0 4h12v3H0z"></path><path fill="#E0BC00" d="M0 7h12v1H0z"></path></svg> Leaflet</a>`);

const customZoomControl = L.control.zoom({
    position: 'topright' // Change position to topright, topleft, bottomleft, bottomright
});
customZoomControl.addTo(map);