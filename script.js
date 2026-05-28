let map;
let directionsService;
let directionsRenderer;

// Función global que invoca automáticamente la API de Google Maps al cargar
function initMap() {
    // Inicializar los servicios de enrutamiento de Google
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer();

    // Coordenadas iniciales para centrar el mapa (Santiago, Chile)
    const defaultCenter = { lat: -33.4489, lng: -70.6693 };

    // Crear el objeto del mapa
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        center: defaultCenter,
        mapTypeControl: false,
        streetViewControl: false
    });

    // Enlazar el renderizador de rutas directamente al mapa creado
    directionsRenderer.setMap(map);

    // Escuchar el evento de envío del formulario
    const form = document.getElementById("route-form");
    form.addEventListener("submit", function (event) {
        event.preventDefault(); // Evitar que la página se refresque
        calcularRuta();
    });
}

// Solicita los datos de la ruta y extrae la distancia
function calcularRuta() {
    const originAddress = document.getElementById("origin").value;
    const destinationAddress = document.getElementById("destination").value;

    const request = {
        origin: originAddress,
        destination: destinationAddress,
        travelMode: google.maps.TravelMode.DRIVING // Configurado para viajes en auto
    };

    // Llamada asíncrona a los servidores de Google Maps
    directionsService.route(request, function (response, status) {
        if (status === google.maps.DirectionsStatus.OK) {
            // Dibujar la ruta óptima encontrada sobre el mapa
            directionsRenderer.setDirections(response);

            // Obtener datos del primer tramo ("leg") de la primera ruta devuelta
            const routeLeg = response.routes[0].legs[0];
            
            // distance.text entrega el valor formateado de forma legible (ej: "120 km" o "850 m")
            const distanceText = routeLeg.distance.text; 

            // Desplegar el cuadro de información con el resultado en la pantalla
            const resultBox = document.getElementById("result");
            const distanceOutput = document.getElementById("distance-output");
            
            distanceOutput.textContent = distanceText;
            resultBox.style.display = "block";
        } else {
            alert("No se pudo trazar la ruta o calcular la distancia debido a: " + status);
        }
    });
}
