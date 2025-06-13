let parsedData = [];
let map;
let pointLayer;

const LAT_KEYS = ["lat", "latitude", "Latitude", "Lat"];
const LNG_KEYS = ["lon", "lng", "longitude", "Longitude", "Lng"];

window.addEventListener("load", () => {
  const osm = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }
  );

  const esriSat = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution: "Tiles © Esri",
    }
  );

  map = L.map("map", {
    center: [0, 0],
    zoom: 2,
    layers: [osm], // default
  });

  const baseMaps = {
    OpenStreetMap: osm,
    "Esri Satellite": esriSat,
  };

  L.control.layers(baseMaps).addTo(map);
});

document.getElementById("upload").addEventListener("change", function (e) {
  const file = e.target.files[0];
  const status = document.getElementById("status");
  const showMapBtn = document.getElementById("showMapBtn");
  parsedData = [];

  status.textContent = "Processing file...";
  showMapBtn.style.display = "none";

  if (!file) {
    status.textContent = "No file selected.";
    return;
  }

  const reader = new FileReader();

  reader.onload = function (event) {
    try {
      if (file.name.endsWith(".csv")) {
        const result = Papa.parse(event.target.result, {
          header: true,
          dynamicTyping: true,
        });
        parsedData = result.data;
      } else {
        const workbook = XLSX.read(event.target.result, { type: "binary" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        parsedData = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      }

      if (!parsedData.length) {
        status.textContent = "Empty or unreadable file.";
        return;
      }

      const hasCoords = parsedData.some(
        (row) => getLat(row) !== null && getLng(row) !== null
      );

      if (!hasCoords) {
        status.textContent = "Incorrect Format. No Latitude/Longitude found.";
        return;
      }

      status.textContent = "File loaded. Ready to display.";
      showMapBtn.style.display = "inline-block";
    } catch (err) {
      status.textContent = "Error reading file: " + err.message;
    }
  };

  if (file.name.endsWith(".csv")) {
    reader.readAsText(file);
  } else {
    reader.readAsBinaryString(file);
  }
});

function getLat(row) {
  for (let key of LAT_KEYS) {
    if (key in row && !isNaN(parseFloat(row[key]))) {
      return parseFloat(row[key]);
    }
  }
  return null;
}

function getLng(row) {
  for (let key of LNG_KEYS) {
    if (key in row && !isNaN(parseFloat(row[key]))) {
      return parseFloat(row[key]);
    }
  }
  return null;
}

document.getElementById("showMapBtn").addEventListener("click", function () {
  if (!map) return;

  if (pointLayer) {
    map.removeLayer(pointLayer);
  }

  const points = [];

  parsedData.forEach((row) => {
    const lat = getLat(row);
    const lon = getLng(row);

    if (lat !== null && lon !== null) {
      const circle = L.circleMarker([lat, lon], {
        radius: 6,
        fillColor: "#0078FF",
        color: "#fff",
        weight: 1,
        fillOpacity: 0.85,
      });

      let popupContent = "";
      for (const key in row) {
        if (row.hasOwnProperty(key)) {
          popupContent += `<strong>${key}:</strong> ${row[key]}<br>`;
        }
      }

      circle.bindPopup(popupContent);
      circle.addTo(map);
      points.push(circle);
    }
  });

  if (!points.length) {
    document.getElementById("status").textContent =
      "No valid coordinate rows found.";
    return;
  }

  pointLayer = L.featureGroup(points).addTo(map);
  map.fitBounds(pointLayer.getBounds());
});
