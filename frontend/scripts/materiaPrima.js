//* Variables globales

const modal = document.getElementById("modal");
const closeModalBtn = document.querySelector(".close");
const openModalBtns = document.querySelectorAll(".open-modal");
const form = document.getElementById("form-mp")
const selectProducto = document.getElementById("producto"); // Select del formulario de producción

//* ============================ MODAL ============================

//! Evento para abrir el modal y mostrar el formulario correspondiente
openModalBtns.forEach(button => {
    button.addEventListener("click", function () {
        const formId = this.getAttribute("data-form"); // Obtener qué formulario mostrar
        form.style.display = "none"; // Ocultar todos los formularios
        document.getElementById(formId).style.display = "block"; // Mostrar el formulario seleccionado

        const productoSeleccionado = this.getAttribute("data-producto"); // Obtiene el producto del botón

        const productos = {
            "HARINA": "1",
            "HUEVOS": "2",
            "GRASA": "3",
            "DULCE DE LECHE": "4",
            "SAL": "5",
            "AZUCAR": "6"
        };
        const valorNumerico = productos[productoSeleccionado]

        // Actualizar el select según el formulario
        if (formId === "form-mp") { 
            selectProducto.value = valorNumerico;
        }
        
        modal.style.display = "flex"; // Mostrar el modal
    });
});

//! Evento para cerrar el modal
closeModalBtn.addEventListener("click", function () {
    modal.style.display = "none";

    const msjError = document.getElementById("msj-error");
    msjError.classList.add("escondido");

});

//! Cerrar modal si se hace clic fuera del contenido
window.addEventListener("click", function (e) {
    if (e.target === modal) {
        modal.style.display = "none";

        const msjError = document.getElementById("msj-error");
        msjError.classList.add("escondido");
    }
});

//! ===================================================================================================================================================

//* ======================= FORMULARIO MP =========================

//! evento para guardar los datos del formulario de materia prima
document.getElementById("formMateriaPrima").addEventListener("submit", async (e) => {
    e.preventDefault()

    const fecha = document.getElementById("fecha").value.trim();
    const producto = document.getElementById("producto").value.trim();
    const cantidad = document.getElementById("cantidad").value.trim();
    const unidad = document.getElementById("unidad").value.trim();
    const lote = document.getElementById("lote").value.trim();
    const vencimiento = document.getElementById("vencimiento").value.trim();
    const precio = document.getElementById("precio").value.trim();
    const isPagado = document.getElementById("pago").checked;

    const idProducto = parseInt(producto, 10);
    console.log("Datos enviados: ", fecha, idProducto, cantidad, unidad, lote, vencimiento, precio, isPagado);

    const msjError = document.getElementById("msj-error")
    msjError.classList.add("escondido")


    try{
        const res = await fetch("http://localhost:4000/api/guardarMateriaPrima", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ fecha, idProducto, cantidad, unidad, lote, vencimiento, precio, isPagado })
        })

        if(res.ok){
            document.getElementById("formMateriaPrima").reset();
            await cargarStockMP();
            msjError.classList.add("escondido")

            //Actualizar la tabla de producción con los filtros actuales
            const filtroFecha = document.getElementById("filtro-1").value || "todas";
            const filtroProducto = document.getElementById("filtro-2").value || "todos";
            await cargarMateriaPrima(filtroFecha, filtroProducto);

            msjError.classList.add("escondido");
        }
        else{
            // Manejar errores del servidor
            const errorData = await res.json(); // Obtener el mensaje de error del backend
            msjError.textContent = errorData.message;
            msjError.classList.remove("escondido");
        }
    }
    catch(error){
        console.log("Error al realizar la compra",error);
    }
})

//! ===================================================================================================================================================

//* ========================= CARGAR STOCK =========================

function getStockMessage(stock, limits) {
    if (stock === 0) return { text: "Sin stock", color: "red" };
    if (stock < limits.bajo) return { text: "Poco stock", color: "red" };
    if (stock >= limits.bajo && stock <= limits.medio) return { text: "Stock suficiente", color: "orange" };
    return { text: "Stock alto", color: "green" };
}

async function cargarStockMP() {
    try {
        const res = await fetch("http://localhost:4000/api/obtenerMateriaPrima")
        const materiaPrima = await res.json()

        const materiaPrimaMap = new Map();
        materiaPrima.forEach(mp => { materiaPrimaMap.set(mp.nombre, mp.stock);});
        console.log("Datos de stock de materia prima:", materiaPrimaMap);

        // Recorrer todas las tarjetas de productos en el frontend
        document.querySelectorAll(".stock").forEach(stockDiv => {
            const productoNombre = stockDiv.getAttribute("data-producto");
            const stockValue = stockDiv.querySelector(".stock-value");
            const stockChange = stockDiv.querySelector(".stock-change");
            const stockMessage = stockDiv.parentElement.querySelector(".msj-stock");

            // Verificar si el producto existe en los datos de la API
            if (materiaPrimaMap.has(productoNombre)) {
                const stockActual = materiaPrimaMap.get(productoNombre);
                const stockAnterior = parseInt(stockValue.textContent, 10) || 0;

                // Actualizar el stock
                stockValue.textContent = stockActual;

                // Mostrar flecha según el cambio en el stock
                if (stockActual > stockAnterior) {
                    stockChange.textContent = "↑";
                    stockChange.style.color = "green";
                } 
                else if (stockActual < stockAnterior) {
                    stockChange.textContent = "↓";
                    stockChange.style.color = "red";
                } 
                // else {
                //     if (!stockChange.textContent) {
                //         stockChange.textContent = ""; // Mantener el estado actual
                //     }
                // }

                stockChange.classList.add("show");

                // Cambiar el mensaje según la cantidad de stock
                const stockLimits = {
                    "HARINA": { bajo: 25, medio: 250 },
                    "HUEVOS": { bajo: 5, medio: 10 },
                    "GRASA": { bajo: 10, medio: 20 },
                    "DULCE DE LECHE": { bajo: 10, medio: 20 },
                    "SAL": { bajo: 5, medio: 10 },
                    "AZUCAR": { bajo: 10, medio: 20 },
                };
                
                if (stockLimits[productoNombre]) {
                    const { text, color } = getStockMessage(stockActual, stockLimits[productoNombre]);
                    stockMessage.textContent = text;
                    stockMessage.style.color = color;
                }
            } 
            else {
                // Si el producto no existe en la API, establecer stock en 0
                stockValue.textContent = "0";
                stockChange.textContent = "";
                stockChange.classList.remove("show");
                stockMessage.textContent = "Sin stock";
                stockMessage.style.color = "red";
            }
        });
    }
    catch(error) {
        console.log(error);
    }
}

//! ===================================================================================================================================================

//* ==================== TABLA DE COMPRAS MP =====================

async function cargarMateriaPrima(filtroFecha = "todas", filtroProducto = "todos") {
    try {
        const res = await fetch(`http://localhost:4000/api/obtenerCompra?filtroFecha=${filtroFecha}&filtroProducto=${filtroProducto}`);
        const materiaPrima = await res.json();

        const bodyTable = document.querySelector(".body-table");

        if (bodyTable) {
            bodyTable.innerHTML = "";

            materiaPrima.forEach(mp => {
                const fila = document.createElement(`tr`);
                fila.className = "fila-compra";
                fila.innerHTML = `
                    <td>${mp.id_compra}</td>
                    <td>${new Date(mp.fecha).toLocaleDateString()}</td>
                    <td>${mp.producto}</td>
                    <td>${mp.cantidad}</td>
                    <td>${mp.lote}</td>
                    <td>$${mp.precio}</td>
                    <td>$${(mp.precio * mp.cantidad)}</td>
                    <td>${mp.isPagado ? "Sí" : "No"}</td>
                    <td>
                        <button class="${mp.isPagado ? 'btn-despagar' : 'btn-pagado'}" data-id="${mp.id_compra}">
                            ${mp.isPagado ? '↩' : '$'}
                        </button>
                    </td>
                    <td>
                        <button class="btn-eliminar" data-id="${mp.id_compra}">X</button>
                    </td>
                `;
                bodyTable.appendChild(fila);

                const btn = fila.querySelector(mp.isPagado ? ".btn-despagar" : ".btn-pagado");
                
                btn.addEventListener("click", async function () {
                    const id = this.getAttribute("data-id");
                    const nuevoEstado = mp.isPagado ? false : true;

                    try {
                        const res = await fetch(`http://localhost:4000/api/actualizarEstadoPago/${id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ isPagado: nuevoEstado })
                        });

                        if (!res.ok) throw new Error("Error al actualizar el estado de pago");

                        const data = await res.json();
                        console.log(data.message);

                        // Actualizar visualmente la tabla al instante
                        const celdaPago = this.parentElement.previousElementSibling;
                        celdaPago.textContent = nuevoEstado ? "Sí" : "No";

                        // Recargar tabla para que se vea bien el cambio y aparezcan los botones correctos
                        const filtroFecha = document.getElementById("filtro-1").value;
                        const filtroProducto = document.getElementById("filtro-2").value;
                        await cargarMateriaPrima(filtroFecha, filtroProducto);

                    } catch (error) {
                        console.error(error);
                    }
                });

                const btnEliminar = fila.querySelector(".btn-eliminar")
                
                btnEliminar.addEventListener("click", async function () {
                    const id = this.getAttribute("data-id");

                    try{
                        const res = await fetch(`http://localhost:4000/api/eliminarCompra/${id}`, {
                            method: "DELETE",
                        })

                        if(!res.ok) throw new Error("Error al eliminar la compra");

                        const data = await res.json();
                        console.log(data.mensaje);

                        await cargarMateriaPrima(document.getElementById("filtro-1").value, document.getElementById("filtro-2").value);
                        await cargarStockMP();
                    }
                    catch(error){
                        console.log(error);
                    }
                })
            });
        }
    } catch (error) {
        console.error("Error al cargar la materia prima:", error);
    }
}

//!=======================================================================================================================================

//* ========================== INICIO ============================

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

    window.onload = () => {
        cargarStockMP();
        cargarMateriaPrima();
    };
});
