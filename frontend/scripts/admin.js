document.addEventListener("DOMContentLoaded", () => {

    //*                                              ------ LOGOUT ------                                                                         *//

    const logoutButton = document.getElementById("cerrarSesion");

    logoutButton.addEventListener("click", async (e) => {
        e.preventDefault(); 
        localStorage.removeItem("nombreUsuario");
        document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";   // Borro el token de las cookies
        window.location.href = "/frontend/pages/login.html";    // Redirijo al usuario a la página de login
    });

    //! =============================================================================================================================================
    
    async function cargarNombreUsuario() {
        try {
            const nombre = localStorage.getItem("nombreUsuario");

            const div = document.getElementById("nombre-user");
            div.textContent = nombre ; // Si no hay nombre, muestra "Usuario"
        }
        catch(error) {
            console.error("Error al cargar el nombre de usuario:", error);
        }
    }

    //! =============================================================================================================================================
    
    //*                                       ------ TARJETAS RESUMEN NEGOCIO------                                                              *//

    const ventasMes = document.getElementById("ventasMes")
    const ingresosMes = document.getElementById("ingresosMes")
    const ventasTotales = document.getElementById("ventasTotales")
    const ingresosTotales = document.getElementById("ingresosTotales")

    async function cargarTarjetas() {
        try {
            const res = await fetch("http://localhost:4000/api/adicionalesObtenerTarjetas")
            const datos = await res.json()
            console.log("Datos recibidos:", datos);

            ventasMes.textContent = datos.ventasMes  || 0;
            ingresosMes.textContent = `$ ${datos.ingresosMes || 0}`;
            ventasTotales.textContent = datos.totalVentas || 0;
            ingresosTotales.textContent = `$ ${datos.ingresosTotales || 0}`;  
        }
        catch(error) {
            console.error("Error al cargar las tarjetas:", error);
        }
    }

    //! ==============================================================================================================================================

    //*                                      ------ GRAFICA DE VENTAS Y PRODUCCIONES ------                                                       *//
    
    let graficoProdVentas = null;

    async function cargarGrafico(){
        try{
            const res = await fetch("http://localhost:4000/api/obtenerDatosGraficos")
            if (!res.ok) throw new Error("Error al obtener datos");
            const data = await res.json()
            
            const ctx = document.getElementById('graficaVentas').getContext('2d');

            // Si ya hay un gráfico, lo destruimos
            if (graficoProdVentas) {
                graficoProdVentas.destroy();
            }

            graficoProdVentas = new Chart(ctx, {
                type: "line",
                data: {
                    labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
                    datasets: [{
                        label: "Cantidad Ventas",
                        data: data.ventas,
                        fill: true, // << Esto habilita el área debajo de la línea
                        pointBorderColor: 'rgb(0, 0, 0)',
                        pointBackgroundColor: 'rgb(72, 255, 0)',
                        backgroundColor: 'rgba(11, 93, 0, 0.05)',
                        borderColor: 'rgb(41, 155, 99)',
                        borderWidth: 2,
                    },
                    {
                        label: "Cantidad Produccion",
                        data: data.produccion,
                        fill: true, // << Esto habilita el área debajo de la línea
                        pointBorderColor: 'rgb(0, 0, 0)',
                        pointBackgroundColor: 'rgb(30, 0, 255)',
                        backgroundColor: 'rgba(17, 0, 255, 0.05)',
                        borderColor: 'rgb(41, 52, 155)',
                        borderWidth: 2
                    },
                    {
                        label: "Cantidad Pedidos",
                        data: data.pedidos,
                        fill: true, // << Esto habilita el área debajo de la línea
                        pointBorderColor: 'rgb(0, 0, 0)',
                        pointBackgroundColor: 'rgb(255, 230, 0)',
                        backgroundColor: 'rgba(255, 247, 0, 0.05)',
                        borderColor: 'rgb(238, 255, 0)',
                        borderWidth: 2
                    }]
                },

                options: {
                    responsive: true,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }
        catch(error){
            console.error("Error al cargar el gráfico:", error);
        }
        
    }

    //!=============================================================================================================================================

    //*                                      ------ GRAFICA DE TORTA ------                                                                     *//

    let graficoTorta = null;

    async function cargarGraficoTorta() {
        try {
            const res = await fetch("http://localhost:4000/api/obtenerDatosTorta");
            if (!res.ok) throw new Error("Error al obtener datos");
            const data = await res.json();

            const ctx2 = document.getElementById('graficaProduccion').getContext('2d');

            // Si ya hay un gráfico, lo destruimos
            if (graficoTorta) {
                graficoTorta.destroy();
            }
            
            graficoTorta = new Chart(ctx2, {
                type: "doughnut",
                data: {
                    labels: data.labels,
                    datasets: [{
                        label: "Grafica Productos",
                        data: data.value,
                        backgroundColor: [
                            'rgba(99, 90, 201, 0.6)',
                            'rgba(232, 235, 134, 0.6)',
                            'rgba(130, 227, 125, 0.6)',
                        ],    
                        borderColor: [
                            'rgba(12, 0, 142, 0.6)',
                            'rgba(246, 255, 0, 1)',
                            'rgba(13, 255, 0, 1)',
                        ],
                        borderWidth: 1
                    }]
                },

                options: {
                    responsive: true,
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        } catch (error) {
            console.error("Error al cargar el gráfico de torta:", error);
        }
    }

    //! =============================================================================================================================================
    
    //*                                                ------ RECORDATORIOS ------                                                                *//

    async function cargarRecordatorios() {
        try{
            const res = await fetch("http://localhost:4000/api/adicionalesObtenerRecordatorios")
            if (!res.ok) throw new Error("Error al obtener datos");
            const alertas = await res.json();

            const lista = document.getElementById("lista-alertas");
            lista.innerHTML = ""; 

            alertas.forEach(msg =>{
                const row = document.createElement("div")
                row.classList.add("recordatorios")
                row.innerHTML = `<p>${msg}</p>`
                lista.appendChild(row)
            })
        }
        catch(error){
            console.error("Error al cargar los recordatorios:", error);
            throw error
        }    
    }

    //! ==============================================================================================================================================

    //*                                             ------ DESCARGA PDF ------                                                                    *//

    document.getElementById("btn-descargar-pdf").addEventListener("click", async () => {
        try{
            // Verifica si jsPDF está disponible
            if (!window.jspdf) {
                console.error("jsPDF no está disponible. Asegúrate de haber incluido la biblioteca correctamente.");
                return;
            }
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
        
            const res = await fetch("http://localhost:4000/api/adicionalesObtenerTarjetasPdf")
            if (!res.ok) throw new Error("Error al obtener datos para el PDF");
            const data = await res.json();

            const ventasMes = data.ventasMes || 0;
            const ingresosMes = data.ingresosMes || 0;
            const ventasTotales = data.totalVentas || 0;
            const ingresosTotales = data.ingresosTotales || 0;
            const stockAlfajores = data.stockAlfajores || 0;
            const stockGalletasSS = data.stockGalletasSS || 0;
            const stockGalletasCS = data.stockGalletasCS || 0;
            const ventaAlfajores = data.ventaAlfajores || 0;
            const ventaGalletasSS = data.ventaGalletasSS || 0;
            const ventaGalletasCS = data.ventaGalletasCS || 0;
            const mes = new Date().toLocaleString("default", { month: "long" });

            // Título
            doc.setFont("helvetica", "bold");
            doc.setFontSize(26);
            doc.text("500 MILLAS", 105, 15, { align: "center" }); // Centrado en la parte superior
            doc.setFontSize(18);
            doc.text(`Resumen del Mes de ${mes}`, 105, 30, { align: "center" }); // Centrado debajo del título

            // Línea separadora
            doc.setDrawColor(0);
            doc.setLineWidth(0.5);
            doc.line(10, 35, 200, 35);

            // Información
            doc.setFont("helvetica", "normal");
            doc.setFontSize(12);
            doc.text(`Ventas: ${ventasMes}`, 10, 45);
            doc.text(`Ingresos: ${ingresosMes}`, 10, 55);
            doc.text(`Ventas Totales: ${ventasTotales}`, 10, 65);
            doc.text(`Ingresos Totales: ${ingresosTotales}`, 10, 75);

            doc.setFont("helvetica", "bold");
            doc.text(`PRODUCCION`, 10, 90); 

            doc.setFont("helvetica", "normal");
            doc.text(`Alfajores producidos: ${stockAlfajores}`, 10, 100);
            doc.text(`Galletas S/S producidas: ${stockGalletasSS}`, 10, 110);
            doc.text(`Galletas C/S Producidas: ${stockGalletasCS}`, 10, 120);

            doc.setFont("helvetica", "bold");
            doc.text(`PRODUCTOS VENDIDOS`, 10, 135); 

            doc.setFont("helvetica", "normal");
            doc.text(`Alfajores: ${ventaAlfajores}`, 10, 145);
            doc.text(`Galletas S/S: ${ventaGalletasSS}`, 10, 155);
            doc.text(`Galletas C/S: ${ventaGalletasCS}`, 10, 165);
        
            // Descargar el PDF
            doc.save(`Resumen_Mensual_${mes}.pdf`);
            alert("PDF descargado con éxito.");
        }
        catch(error){
            console.log(error);
        }
    });

    //! =============================================================================================================================================
    
    //*                                                ------ ESTADO PEDIDOS ------                                                                *//

    const total = document.getElementById("totalPedidos");
    const entregados = document.getElementById("pedidosEntregados");
    const pendientes = document.getElementById("pedidosPendientes");

    async function cargarEstadoPedidos(){
        try {
            const res = await fetch('http://localhost:4000/api/pedidoObtenerEstadoPedidos');
            if (!res.ok) throw new Error("Error al obtener datos");
            const data = await res.json();
            console.log("Datos recibidos:", data);

            total.textContent = data.total || 0;
            entregados.textContent = data.entregados || 0;
            pendientes.textContent = data.pendientes || 0;
        }
        catch(error){
            console.error("Error al cargar el estado de los pedidos:", error);
        }

    }

    //! =============================================================================================================================================

    //*                                             ------ INICIALIZACIONES ------                                                                *//

    cargarNombreUsuario();
    cargarTarjetas();
    cargarGrafico();
    cargarGraficoTorta();
    cargarRecordatorios();
    cargarEstadoPedidos();
})

//! =================================================================================================================================================

//*                                              ------ PORCENTAJES TARJETAS------                                                               *//

// Llamar a la función al cargar la página
document.addEventListener("DOMContentLoaded", () => {
    actualizarPorcentajes();
});

async function actualizarPorcentajes() {
    try {
        const resActual = await fetch("http://localhost:4000/api/adicionalesObtenerTarjetas");
        const resPasado = await fetch("http://localhost:4000/api/adicionalesObtenerDatosMesPasado");

        const datosActuales = await resActual.json();
        const datosMesPasado = await resPasado.json();

        // porcentajes de cambio
        const porcentajes = {
            ventasMes: ((datosActuales.ventasMes - datosMesPasado.ventasMesPasado) / datosMesPasado.ventasMesPasado) * 100,
            ingresosMes: ((datosActuales.ingresosMes - datosMesPasado.ingresosMesPasado) / datosMesPasado.ingresosMesPasado) * 100,
        };

        // Actualizar los círculos
        actualizarCirculo("ventasMesPorcentaje", porcentajes.ventasMes);
        actualizarCirculo("ingresosMesPorcentaje", porcentajes.ingresosMes);

    } catch (error) {
        console.error("Error al actualizar los porcentajes:", error);
    }

}

//? =================================================================================================================================================

function actualizarCirculo(id, porcentaje) {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    // Redondear el porcentaje
    const porcentajeRedondeado = Math.round(porcentaje);

    // Actualizar el texto del círculo
    elemento.textContent = `${porcentajeRedondeado > 0 ? "+" : ""}${porcentajeRedondeado}%`;

    // Cambiar el color según el porcentaje
    if (porcentajeRedondeado >= 0) {
        elemento.classList.remove("decrease");
        elemento.style.backgroundColor = "var(--color-success-variant)";
    } else {
        elemento.classList.add("decrease");
        elemento.style.backgroundColor = "var(--color-danger)";
    }
}

//! ==================================================================================================================================================