let map;
let routeLayer;

// TU CLAVE DE GEMINI (Esta sí es gratis y no pide tarjeta)
const GEMINI_API_KEY = "AQ.Ab8RN6K2GTP8CUO1RbhtZphtVACmCQ3kJKLMdcWhs2P1PKGyMQ"; 

// Inicializar el mapa al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    // Centrado inicial
    map = L.map('map').setView([-33.4489, -70.6693], 10);
    
    // Cargar visual de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    document.getElementById("route-form").addEventListener("submit", async function (event) {
        event.preventDefault();
        procesarRuta();
    });
});

async function procesarRuta() {
    const origin = document.getElementById("origin").value;
    const destination = document.getElementById("destination").value;

    try {
        // 1. Convertir direcciones a coordenadas (Geocoding gratuito)
        const coordA = await obtenerCoordenadas(origin);
        const coordB = await obtenerCoordenadas(destination);

        if (!coordA || !coordB) {
            alert("No se encontró una de las ubicaciones. Intenta ser más específico (Ej: agregando ', Chile').");
            return;
        }

        // 2. Calcular ruta y distancia (Routing gratuito OSRM)
        const rutaData = await calcularRutaOSRM(coordA, coordB);
        
        // Convertir la distancia de metros a kilómetros
        const kilometrosTotales = (rutaData.routes[0].distance / 1000).toFixed(1);
        const distanceText = `${kilometrosTotales} km`;

        // 3. Dibujar la ruta en el mapa
        dibujarRutaEnMapa(rutaData.routes[0].geometry, coordA, coordB);

        // 4. Mostrar resultados e invocar a Gemini
        document.getElementById("distance-output").textContent = distanceText;
        document.getElementById("result").style.display = "block";

        const car = document.getElementById("car-model").value;
        const engine = document.getElementById("engine-size").value;
        const passengers = document.getElementById("passengers").value;
        const price = document.getElementById("fuel-price").value;

        consultarGemini(car, engine, passengers, price, distanceText);

    } catch (error) {
        console.error(error);
        alert("Ocurrió un error al calcular la ruta.");
    }
}

// Funciones de apoyo para las APIs gratuitas
async function obtenerCoordenadas(direccion) {
    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}`);
    const data = await response.json();
    return data.length > 0 ? [data[0].lon, data[0].lat] : null; // Retorna [longitud, latitud]
}

async function calcularRutaOSRM(coordA, coordB) {
    // OSRM usa el formato: longitud,latitud
    const url = `https://router.project-osrm.org/route/v1/driving/${coordA[0]},${coordA[1]};${coordB[0]},${coordB[1]}?overview=full&geometries=geojson`;
    const response = await fetch(url);
    return await response.json();
}

function dibujarRutaEnMapa(geoJsonCords, coordA, coordB) {
    // Limpiar ruta anterior si existe
    if (routeLayer) map.removeLayer(routeLayer);

    // Dibujar nueva línea
    routeLayer = L.geoJSON(geoJsonCords, {
        style: { color: '#3498db', weight: 5 }
    }).addTo(map);

    // Ajustar la vista del mapa para que se vea toda la ruta
    map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
}

// Función de Gemini (Exactamente la misma que ya teníamos)
async function consultarGemini(auto, motor, personas, precioLitro, distancia) {
    const loadingDiv = document.getElementById("gemini-loading");
    const outputDiv = document.getElementById("gemini-output");

    loadingDiv.style.display = "block";
    outputDiv.innerHTML = ""; 

    const prompt = `
        Actúa como un asistente experto en eficiencia vehicular en Chile. 
        Un usuario va a realizar un viaje de ${distancia}. 
        Vehículo: ${auto}, Motor: ${motor} litros.
        Pasajeros a bordo: ${personas}.
        Precio de la bencina ingresado: $${precioLitro} CLP por litro.

        Calcula el consumo estimado considerando el rendimiento promedio de ese auto en carretera/mixto y el peso extra de los pasajeros. 
        Devuelve la respuesta estructurada EXACTAMENTE usando las siguientes etiquetas HTML básicas:
        
        <p><b>Consumo Estimado:</b> X Litros</p>
        <p><b>Costo Estimado del Tramo:</b> $Y CLP</p>
        <p style="font-size: 14px; color: #555; margin-top: 10px;"><i>Explicación del cálculo:</i> Breve detalle de cuántos km/l rinde aprox. este modelo y cómo influyen los pasajeros.</p>
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });

        const data = await response.json();
        outputDiv.innerHTML = data.candidates[0].content.parts[0].text;
    } catch (error) {
        outputDiv.innerHTML = "<p style='color: red;'>No se pudo obtener la estimación de consumo en este momento.</p>";
    } finally {
        loadingDiv.style.display = "none";
    }
}
