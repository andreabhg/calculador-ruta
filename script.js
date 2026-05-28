let map;
let directionsService;
let directionsRenderer;

// CONFIGURACIÓN: REEMPLAZA CON TU API KEY DE GOOGLE AI STUDIO
const GEMINI_API_KEY = "TU_GEMINI_API_KEY_AQUI"; 

function initMap() {
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    const defaultCenter = { lat: -33.4489, lng: -70.6693 }; // Santiago

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        center: defaultCenter,
        mapTypeControl: false,
        streetViewControl: false
    });

    directionsRenderer.setMap(map);

    const form = document.getElementById("route-form");
    form.addEventListener("submit", function (event) {
        event.preventDefault();
        calcularRuta();
    });
}

function calcularRuta() {
    const originAddress = document.getElementById("origin").value;
    const destinationAddress = document.getElementById("destination").value;

    const request = {
        origin: originAddress,
        destination: destinationAddress,
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, function (response, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            directionsRenderer.setDirections(response);

            const routeLeg = response.routes[0].legs[0];
            const distanceText = routeLeg.distance.text; // Ej: "120 km"
            
            // Mostrar la sección de resultados y la distancia del mapa
            document.getElementById("distance-output").textContent = distanceText;
            document.getElementById("result").style.style.display = "block";

            // Capturar el resto de los datos para la IA
            const car = document.getElementById("car-model").value;
            const engine = document.getElementById("engine-size").value;
            const passengers = document.getElementById("passengers").value;
            const price = document.getElementById("fuel-price").value;

            // Invocar a Gemini enviándole los parámetros limpios
            consultarGemini(car, engine, passengers, price, distanceText);

        } else {
            alert("No se pudo trazar la ruta debido a: " + status);
        }
    });
}

async function consultarGemini(auto, motor, personas, precioLitro, distancia) {
    const loadingDiv = document.getElementById("gemini-loading");
    const outputDiv = document.getElementById("gemini-output");

    loadingDiv.style.display = "block";
    outputDiv.innerHTML = ""; // Limpiar respuesta anterior

    // Construcción de instrucciones estrictas para que devuelva un formato limpio y procesable
    const prompt = `
        Actúa como un asistente experto en eficiencia vehicular en Chile. 
        Un usuario va a realizar un viaje de ${distancia}. 
        Vehículo: ${auto}, Motor: ${motor} litros.
        Pasajeros a bordo: ${personas}.
        Precio de la bencina ingresado: $${precioLitro} CLP por litro.

        Calcula el consumo estimado considerando el rendimiento promedio de ese auto en carretera/mixto y el peso extra de los pasajeros. 
        Devuelve la respuesta estructurada EXACTAMENTE usando las siguientes etiquetas HTML básicas (no uses markdown \`\`\`html ni bloques de código, solo el texto plano con las etiquetas):
        
        <p><b>Consumo Estimado:</b> X Litros</p>
        <p><b>Costo Estimado del Tramo:</b> $Y CLP</p>
        <p style="font-size: 14px; color: #555; margin-top: 10px;"><i>Explicación del cálculo:</i> Breve detalle de cuántos km/l rinde aprox. este modelo y cómo influyen los pasajeros.</p>
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }]
            })
        });

        if (!response.ok) throw new Error("Error en la respuesta de la API");

        const data = await response.json();
        
        // Extraer el texto generado por Gemini
        const resultadoHTML = data.candidates[0].content.parts[0].text;
        
        // Inyectar directamente el HTML limpio entregado por la IA
        outputDiv.innerHTML = resultadoHTML;

    } catch (error) {
        console.error("Error al conectar con Gemini:", error);
        outputDiv.innerHTML = "<p style='color: red;'>No se pudo obtener la estimación de consumo en este momento.</p>";
    } finally {
        loadingDiv.style.display = "none";
    }
}
