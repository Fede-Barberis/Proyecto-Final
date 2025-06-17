
function inicializarEventos() {
    const logoutButton = document.getElementById("cerrarSesion");
    if (logoutButton) {
        logoutButton.addEventListener("click", cerrarSesion);
    }

    const btnPDF = document.getElementById("btn-descargar-pdf");
    if (btnPDF) {
        btnPDF.addEventListener("click", descargarPDF);
    }
}

async function cerrarSesion(e) {
    e.preventDefault();
    localStorage.removeItem("nombreUsuario");
    document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    window.location.href = "/frontend/pages/login.html";
}

async function cargarNombreUsuario() {
    try {
        const nombre = localStorage.getItem("nombreUsuario") || "Usuario";
        const div = document.getElementById("nombre-user");
        if (div) div.textContent = nombre;
    } catch (error) {
        console.error("Error al cargar el nombre de usuario:", error);
    }
}

async function obtenerDatos(url){
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Error en la solicitud: ${url}`);
        return await res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

async function cargarTarjetas() {
    try {
        const data = await obtenerDatos("http://localhost:4000/api/adicionalesObtenerTarjetas");
        if (!data) return; // Si hubo error o no se obtuvo respuesta, salimos

        document.getElementById("ventasMes").textContent = data.ventasMes || 0;
        document.getElementById("ingresosMes").textContent = `$${data.ingresosMes || 0}`;
        document.getElementById("ventasTotales").textContent = data.totalVentas || 0;
        document.getElementById("ingresosTotales").textContent = `$${data.ingresosTotales || 0}`;
    } catch (error) {
        console.error("Error al cargar las tarjetas:", error);
    }
}

let graficoResumen = null;
async function cargarGrafico() {
    try {
        const data = await obtenerDatos("http://localhost:4000/api/obtenerDatosGraficos")
        if (!data) return; // Si hubo error o no se obtuvo respuesta, salimos
        
        const ctx = document.getElementById('graficaResumen').getContext('2d');
        if (graficoResumen) graficoResumen.destroy();

        graficoResumen = new Chart(ctx, {
            type: "line",
            data: {
                labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
                datasets: [
                    generarDataset("Cantidad Ventas", data.ventas, 'rgb(41, 155, 99)', 'rgba(11, 93, 0, 0.05)', 'rgb(72, 255, 0)'),
                    generarDataset("Cantidad Produccion", data.produccion, 'rgb(41, 52, 155)', 'rgba(17, 0, 255, 0.05)', 'rgb(30, 0, 255)'),
                    generarDataset("Cantidad Pedidos", data.pedidos, 'rgb(238, 255, 0)', 'rgba(255, 247, 0, 0.05)', 'rgb(255, 230, 0)')
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    } catch (error) {
        console.error("Error al cargar el gráfico:", error);
    }
}

function generarDataset(label, data, borderColor, backgroundColor, pointColor) {
    return {
        label,
        data,
        fill: true,
        borderColor,
        backgroundColor,
        pointBorderColor: 'rgb(0, 0, 0)',
        pointBackgroundColor: pointColor,
        borderWidth: 2
    };
}

let graficoTorta = null;
async function cargarGraficoTorta() {
    try {
        const data = await obtenerDatos("http://localhost:4000/api/obtenerDatosTorta");
        if (!data) return; // Si hubo error o no se obtuvo respuesta, salimos
        
        const ctx = document.getElementById('graficaProduccion').getContext('2d');
        if (graficoTorta) graficoTorta.destroy();

        graficoTorta = new Chart(ctx, {
            type: "doughnut",
            data: {
                labels: data.labels,
                datasets: [{
                    label: "Grafica Productos",
                    data: data.value,
                    backgroundColor: ['rgba(99, 90, 201, 0.6)', 'rgba(232, 235, 134, 0.6)', 'rgba(130, 227, 125, 0.6)'],
                    borderColor: ['rgba(12, 0, 142, 0.6)', 'rgba(246, 255, 0, 1)', 'rgba(13, 255, 0, 1)'],
                    borderWidth: 1
                }]
            },
            options: { responsive: true }
        });
    } catch (error) {
        console.error("Error al cargar el gráfico de torta:", error);
    }
}

async function cargarRecordatorios() {
    try {
        const data = await obtenerDatos("http://localhost:4000/api/adicionalesObtenerRecordatorios");
        if (!data) return; // Si hubo error o no se obtuvo respuesta, salimos

        const lista = document.getElementById("lista-alertas");
        lista.innerHTML = "";
        data.forEach(msg => {
            const row = document.createElement("div");
            row.classList.add("recordatorios");
            row.innerHTML = `<p>${msg}</p>`;
            lista.appendChild(row);
        });
    } catch (error) {
        console.error("Error al cargar los recordatorios:", error);
    }
}

async function descargarPDF() {
    try {
        if (!window.jspdf) throw new Error("jsPDF no está disponible");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const data = await obtenerDatos("http://localhost:4000/api/adicionalesObtenerTarjetasPdf");
        if (!data) return; // Si hubo error o no se obtuvo respuesta, salimos
        
        const mes = new Date().toLocaleString("default", { month: "long" });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(26);
        doc.text("500 MILLAS", 105, 15, { align: "center" });
        doc.setFontSize(18);
        doc.text(`Resumen del Mes de ${mes}`, 105, 30, { align: "center" });
        doc.line(10, 35, 200, 35);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(12);
        doc.text(`Ventas: ${data.ventasMes || 0}`, 10, 45);
        doc.text(`Ingresos: ${data.ingresosMes || 0}`, 10, 55);
        doc.text(`Ventas Totales: ${data.totalVentas || 0}`, 10, 65);
        doc.text(`Ingresos Totales: ${data.ingresosTotales || 0}`, 10, 75);
        doc.setFont("helvetica", "bold");
        doc.text(`PRODUCCION`, 10, 90);
        doc.setFont("helvetica", "normal");
        doc.text(`Alfajores producidos: ${data.stockAlfajores || 0}`, 10, 100);
        doc.text(`Galletas S/S: ${data.stockGalletasSS || 0}`, 10, 110);
        doc.text(`Galletas C/S: ${data.stockGalletasCS || 0}`, 10, 120);
        doc.setFont("helvetica", "bold");
        doc.text(`PRODUCTOS VENDIDOS`, 10, 135);
        doc.setFont("helvetica", "normal");
        doc.text(`Alfajores: ${data.ventaAlfajores || 0}`, 10, 145);
        doc.text(`Galletas S/S: ${data.ventaGalletasSS || 0}`, 10, 155);
        doc.text(`Galletas C/S: ${data.ventaGalletasCS || 0}`, 10, 165);

        doc.save(`Resumen_Mensual_${mes}.pdf`);
        alert("PDF descargado con éxito.");
    } catch (error) {
        console.error("Error al descargar el PDF:", error);
    }
}

async function cargarEstadoPedidos() {
    try {
        const data = await obtenerDatos("http://localhost:4000/api/pedidoObtenerEstadoPedidos");
        if (!data) return; // Si hubo error o no se obtuvo respuesta, salimos
        
        document.getElementById("totalPedidos").textContent = data.total || 0;
        document.getElementById("pedidosEntregados").textContent = data.entregados || 0;
        document.getElementById("pedidosPendientes").textContent = data.pendientes || 0;
    } catch (error) {
        console.error("Error al cargar el estado de los pedidos:", error);
    }
}

async function actualizarPorcentajes() {
    try {
        const [resActual, resPasado] = await Promise.all([
            fetch("http://localhost:4000/api/adicionalesObtenerTarjetas"),
            fetch("http://localhost:4000/api/adicionalesObtenerDatosMesPasado")
        ]);

        const datosActuales = await resActual.json();
        const datosMesPasado = await resPasado.json();

        actualizarCirculo("ventasMesPorcentaje", calcularPorcentaje(datosActuales.ventasMes, datosMesPasado.ventasMesPasado));
        actualizarCirculo("ingresosMesPorcentaje", calcularPorcentaje(datosActuales.ingresosMes, datosMesPasado.ingresosMesPasado));
    } catch (error) {
        console.error("Error al actualizar los porcentajes:", error);
    }
}

function calcularPorcentaje(actual, pasado) {
    if (!pasado || pasado === 0) return 0;
    return ((actual - pasado) / pasado) * 100;
}

function actualizarCirculo(id, porcentaje) {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    const redondeado = Math.round(porcentaje);
    elemento.textContent = `${redondeado > 0 ? "+" : ""}${redondeado}%`;

    if (redondeado >= 0) {
        elemento.classList.remove("decrease");
        elemento.style.backgroundColor = "var(--color-success-variant)";
    } else {
        elemento.classList.add("decrease");
        elemento.style.backgroundColor = "var(--color-danger)";
    }
}

// Esta función se asegura de que todo se cargue correctamente al finalizar el DOM.
document.addEventListener("DOMContentLoaded", () => {
    inicializarApp();
});

async function inicializarApp() {
    inicializarEventos();
    await cargarNombreUsuario();
    await Promise.all([
        cargarTarjetas(),
        cargarGrafico(),
        cargarGraficoTorta(),
        cargarRecordatorios(),
        cargarEstadoPedidos(),
        actualizarPorcentajes()
    ]);
}