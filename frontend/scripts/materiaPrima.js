
// Función para mostrar mensaje de error
function mostrarError(msjElemento, mensaje) {
    msjElemento.textContent = mensaje;
    msjElemento.classList.remove("escondido");
}

// Función para ocultar mensaje de error
function ocultarError(msjElemento) {
    msjElemento.textContent = "";
    msjElemento.classList.add("escondido");
}

// Función para limpiar productos y formulario
function limpiarFormulario(formId) {
    document.getElementById(formId).reset();
}

// Funcion para obtener datos de la API
async function obtenerDatos(url, options = {}) {
    try {
        const res = await fetch(url, options);
        if (!res.ok) throw new Error(`Error en la solicitud: ${res.status} ${res.statusText}`);
        return await res.json();
    } catch (error) {
        console.error(error);
        return null;
    }
}

// Función genérica para enviar datos POST a la API
async function enviarDatos(url, body) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error en la solicitud");
    }
    return res.json();
}

function getStockMessage(stock, limits) {
    if (stock === 0) return { text: "Sin stock", color: "red" };
    if (stock < limits.bajo) return { text: "Poco stock", color: "red" };
    if (stock >= limits.bajo && stock <= limits.medio) return { text: "Stock suficiente", color: "orange" };
    return { text: "Stock alto", color: "green" };
}

// Cambiar el mensaje según la cantidad de stock
const stockLimits = {
    "HARINA": { bajo: 22.750, medio: 100 },
    "HUEVOS": { bajo: 1.180, medio: 10 },
    "GRASA": { bajo: 4.550, medio: 20 },
    "DULCE DE LECHE": { bajo: 10, medio: 20 },
    "SAL": { bajo: 5, medio: 10 },
    "AZUCAR": { bajo: 10, medio: 20 },
};


//! ===================================================================================================================================================

//*                                 ----------- FORMULARIO DE COMPRA DE MATERIA PRIMA --------------                                               *//

document.getElementById("formMateriaPrima").addEventListener("submit", async (e) => {
    e.preventDefault()
    const fecha = document.getElementById("fecha").value.trim();
    const idProducto = parseInt(document.getElementById("producto").value.trim(), 10);
    const cantidad = document.getElementById("cantidad").value.trim();
    const unidad = document.getElementById("unidad").value.trim();
    const lote = document.getElementById("lote").value.trim();
    const vencimiento = document.getElementById("vencimiento").value.trim();
    const precio = document.getElementById("precio").value.trim();
    const isPagado = document.getElementById("pago").checked;
    
    const msjError = document.getElementById("msj-error")
    ocultarError(msjError);

    try{
        await enviarDatos("http://localhost:4000/api/materiaPrimaGuardar", {fecha, idProducto, cantidad, unidad, lote, vencimiento, precio, isPagado});
        alert("Compra de Materia Prima registrada correctamente");
        limpiarFormulario("formMateriaPrima");
        await cargarStockMP();
        await cargarMateriaPrima(
            document.getElementById("filtro-1").value || "todas",
            document.getElementById("filtro-2").value || "todos"
        );
    }
    catch(error){
        mostrarError(msjError, error.message);
    }
})

//! ===================================================================================================================================================

//*                                         ---------- CARGAR STOCK -----------                                                                    *//

async function cargarStockMP() {
    try {
        console.log("\nEjecutando cargarStockMP");

        const materiaPrima = await obtenerDatos("http://localhost:4000/api/materiaPrimaObtener")
        if (!materiaPrima) return;

        const materiaPrimaMap = new Map(materiaPrima.map(mp => [mp.nombre, mp.stock]));

        // Recorrer todas las tarjetas de productos en el frontend
        document.querySelectorAll(".stock").forEach(div => {
            const productoNombre = div.getAttribute("data-producto");
            const value = div.querySelector(".stock-value");
            const change = div.querySelector(".stock-change");
            const message = div.parentElement.querySelector(".msj-stock");

            // Obtener valor anterior de localStorage
            const anterior = parseFloat(localStorage.getItem(`stock-anterior-${productoNombre}`)) || 0;
            
            if (materiaPrimaMap.has(productoNombre)) {
                const actual = parseFloat(materiaPrimaMap.get(productoNombre));
                // Guardar actual como nuevo "anterior" para la próxima ejecución
                localStorage.setItem(`stock-anterior-${productoNombre}`, actual);
                console.log(`Producto: ${productoNombre} - Actual: ${actual} - Anterior: ${anterior}`);
                value.textContent = actual;
        
                // Mostrar flecha según el cambio en el stock
                if (actual > anterior) {
                    change.textContent = "↑"; change.style.color = "green";
                } else if (actual < anterior) {
                    change.textContent = "↓"; change.style.color = "red";
                }else {
                    change.textContent = "-"; change.style.color = "#888";
                }
                change.classList.add("show");
                
                // Mensaje stock
                if (stockLimits[productoNombre]) {
                    const { text, color } = getStockMessage(actual, stockLimits[productoNombre]);
                    message.textContent = text;
                    message.style.color = color;
                }
            } 
        });
    }
    catch(error) {
        console.log(error);
    }
}

//! ===================================================================================================================================================

//*                                    ---------- TABLA COMPRAS MATERIA PRIMA -------------                                                        *//

async function cargarMateriaPrima(filtroFecha = "todas", filtroProducto = "todos") {
    try {
        const res = await fetch(`http://localhost:4000/api/materiaPrimaObtenerCompra?filtroFecha=${filtroFecha}&filtroProducto=${filtroProducto}`);
        const materiaPrima = await res.json();

        const bodyTable = document.querySelector(".body-table");
        if (!bodyTable) return;
        
        bodyTable.innerHTML = "";

        materiaPrima.forEach(mp => {
            const fila = document.createElement(`tr`);
            fila.className = "fila-compra";
            fila.innerHTML = `
                <td>${mp.id_compra}</td>
                <td>${new Date(mp.fecha).toLocaleDateString()}</td>
                <td>${mp.producto}</td>
                <td>${mp.cantidad}</td>
                <td>${new Date(mp.fch_vencimiento).toLocaleDateString()}</td>
                <td>$${mp.precio}</td>
                <td>$${(mp.precio * mp.cantidad)}</td>
                <td>
                    <button class="btn-estado ${mp.isPagado ? 'btn-pagado' : 'btn-despagar'}" data-id="${mp.id_compra}">
                        ${mp.isPagado ? '<i class="bi bi-currency-dollar"></i>' : '<i class="bi bi-hourglass-split"></i>'}
                    </button>
                </td>
                <td>
                    <button class="btn-eliminar" data-id="${mp.id_compra}"><i class="bi bi-trash3"></i></button>
                </td>
            `;
            bodyTable.appendChild(fila);

            fila.querySelector(".btn-estado")?.addEventListener("click", async function () {
                const id = this.getAttribute("data-id");
                const nuevoEstado = mp.isPagado ? false : true;

                try {
                    await obtenerDatos(`http://localhost:4000/api/materiaPrimaActualizarEstadoPago/${id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isPagado: nuevoEstado })
                    });

                    // Recargar tabla.
                    await cargarMateriaPrima(filtroFecha, filtroProducto);
                } catch (error) {
                    mostrarError(msjError, error.message);
                }
            });

            fila.querySelector(".btn-eliminar")?.addEventListener("click", async function () {
                try {
                    const id = this.getAttribute("data-id");
                    const confirmar = confirm("¿Estás seguro de que querés eliminar esta Compra?");
                    if (!confirmar) return;

                    await obtenerDatos(`http://localhost:4000/api/materiaPrimaEliminarCompra/${id}`, {
                        method: "DELETE"
                    });

                    await cargarStockMP();
                    await cargarMateriaPrima(
                        document.getElementById("filtro-1").value,
                        document.getElementById("filtro-2").value
                    );
                } catch (error) {
                    mostrarError(msjError, error.message);
                }
            });
        });
    } catch (error) {
        console.error("Error al cargar la materia prima:", error);
    }
}

//!=======================================================================================================================================

//*                                     --------------- INICIALIZACION ----------------                                                        *//

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("filtrarBtn").addEventListener("click", async () => {
        const filtroFecha = document.getElementById("filtro-1").value;
        const filtroProducto = document.getElementById("filtro-2").value;
        await cargarMateriaPrima(filtroFecha, filtroProducto);
    });

    document.getElementById("cerrarSesion").addEventListener("click", async (e) => {
        e.preventDefault();
        document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/frontend/pages/login.html";
    });

    cargarStockMP();
    cargarMateriaPrima();
});

