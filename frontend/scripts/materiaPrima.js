//*                                              ----- VARIABLES GLOBALES -----                                                                    *//

const modal = document.getElementById("modal");
const closeModalBtn = document.querySelector(".close");
const openModalBtns = document.querySelectorAll(".open-modal");
const form = document.getElementById("form-mp")
const selectProducto = document.getElementById("producto");

//! ===================================================================================================================================================

//*                                                  ----- MODAL -----                                                                             *//

// Abrir modal
openModalBtns.forEach(button => {
    button.addEventListener("click", function () {
        const formId = this.getAttribute("data-form"); // Obtener qué formulario mostrar
        form.style.display = "none"; // Ocultar todos los formularios
        document.getElementById(formId).style.display = "block"; // Mostrar el formulario seleccionado

        const productos = {
            "HARINA": "1",
            "HUEVOS": "2",
            "GRASA": "3",
            "DULCE DE LECHE": "4",
            "SAL": "5",
            "AZUCAR": "6"
        };

        const productoSeleccionado = this.getAttribute("data-producto"); // Obtiene el producto del botón
        const valorNumerico = productos[productoSeleccionado]

        // Actualizar el select según el formulario
        if (formId === "form-mp") { 
            selectProducto.value = valorNumerico;
        }
        
        modal.style.display = "flex"; // Mostrar el modal
    });
});

// Cerrar modal
closeModalBtn.addEventListener("click", cerrarModal);
window.addEventListener("click", (e) => {
    if (e.target === modal) cerrarModal();
});

function cerrarModal() {
    modal.style.display = "none";
    document.getElementById("msj-error").classList.add("escondido");
}

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
    msjError.classList.add("escondido")

    try{
        const res = await fetch("http://localhost:4000/api/materiaPrimaGuardar", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({fecha, idProducto, cantidad, unidad, lote, vencimiento, precio, isPagado})
        })

        if(res.ok){
            document.getElementById("formMateriaPrima").reset();
            await cargarMateriaPrima(
                document.getElementById("filtro-1").value || "todas",
                document.getElementById("filtro-2").value || "todos"
            );
            await cargarStockMP();
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

//*                                         ---------- CARGAR STOCK -----------                                                                    *//

function getStockMessage(stock, limits) {
    if (stock === 0) return { text: "Sin stock", color: "red" };
    if (stock < limits.bajo) return { text: "Poco stock", color: "red" };
    if (stock >= limits.bajo && stock <= limits.medio) return { text: "Stock suficiente", color: "orange" };
    return { text: "Stock alto", color: "green" };
}

async function cargarStockMP() {
    try {
        console.log("\nEjecutando cargarStockMP");
        const res = await fetch("http://localhost:4000/api/materiaPrimaObtener")
        const materiaPrima = await res.json()
        const materiaPrimaMap = new Map(materiaPrima.map(mp => [mp.nombre, mp.stock]));

        // Recorrer todas las tarjetas de productos en el frontend
        const stockDivs = document.querySelectorAll(".stock");

        stockDivs.forEach(div => {
            const productoNombre = div.getAttribute("data-producto");
            const value = div.querySelector(".stock-value");
            const change = div.querySelector(".stock-change");
            const message = div.parentElement.querySelector(".msj-stock");

            // Obtener valor anterior de localStorage
            const anterior = parseFloat(localStorage.getItem(`stock-anterior-${productoNombre}`)) || 0;
            
            if (materiaPrimaMap.has(productoNombre)) {
                const actual = materiaPrimaMap.get(productoNombre);
                
                // Guardar actual como nuevo "anterior" para la próxima ejecución
                localStorage.setItem(`stock-anterior-${productoNombre}`, actual);
                
                console.log(`Producto: ${productoNombre} - Actual: ${actual} - Anterior: ${anterior}`);
                value.textContent = actual;
        
                // Mostrar flecha según el cambio en el stock
                if (actual > anterior) {
                    change.textContent = "↑";
                    change.style.color = "green";
                } 
                else if (actual < anterior) {
                    change.textContent = "↓";
                    change.style.color = "red";
                }

                change.classList.add("show");
                

                // Cambiar el mensaje según la cantidad de stock
                const stockLimits = {
                    "HARINA": { bajo: 22.750, medio: 100 },
                    "HUEVOS": { bajo: 1.180, medio: 10 },
                    "GRASA": { bajo: 4.550, medio: 20 },
                    "DULCE DE LECHE": { bajo: 10, medio: 20 },
                    "SAL": { bajo: 5, medio: 10 },
                    "AZUCAR": { bajo: 10, medio: 20 },
                };
                
                if (stockLimits[productoNombre]) {
                    const { text, color } = getStockMessage(actual, stockLimits[productoNombre]);
                    message.textContent = text;
                    message.style.color = color;
                }
            } 
            else {
                // Si el producto no existe en la API, establecer stock en 0
                value.textContent = "0";
                change.textContent = "";
                change.classList.remove("show");
                message.textContent = "Sin stock";
                message.style.color = "red";
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
                    const res = await fetch(`http://localhost:4000/api/materiaPrimaActualizarEstadoPago/${id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ isPagado: nuevoEstado })
                    });

                    if (!res.ok) throw new Error("Error al actualizar estado de pago");
                    await cargarMateriaPrima(filtroFecha, filtroProducto);
                } catch (error) {
                    console.error(error);
                }
            });

            fila.querySelector(".btn-eliminar")?.addEventListener("click", async function () {
                const id = this.getAttribute("data-id");

                try {
                    const res = await fetch(`http://localhost:4000/api/materiaPrimaEliminarCompra/${id}`, {
                        method: "DELETE"
                    });

                    if (!res.ok) throw new Error("Error al eliminar compra");
                    await cargarMateriaPrima(
                        document.getElementById("filtro-1").value,
                        document.getElementById("filtro-2").value
                    );
                    await cargarStockMP();
                } catch (error) {
                    console.error(error);
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

    window.onload = () => {
        cargarStockMP();
        cargarMateriaPrima();
    };
});
