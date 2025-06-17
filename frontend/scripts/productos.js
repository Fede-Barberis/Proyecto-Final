//! =================================================================================================================================================

//*                                              ----- FUNCIONES AUXILIARES -----                                                                *//

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
function limpiarFormulario(formId, productosContainerId) {
    document.getElementById(formId).reset();
    document.getElementById(productosContainerId).innerHTML = "";
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

// Funcion para validar productos de un container (producción o pedido)
function validarProductos(containerSelector, esProduccion = true) {
    const productos = [];
    const filas = document.querySelectorAll(containerSelector + " .producto-fila");

    filas.forEach(fila => {
        const select = fila.querySelector("select");
        const inputCantidad = fila.querySelector("input[name^='producto_cantidad']");
        const inputPrecio = esProduccion ? null : fila.querySelector("input[name^='producto_precio']");
        const inputVencimiento = esProduccion ? fila.querySelector("input[name^='producto_vencimiento']") : null;

        if (!select || !inputCantidad || (esProduccion && !inputVencimiento) || (!esProduccion && !inputPrecio)) return;

        const idProducto = select.value;
        const cantidad = inputCantidad.value;
        const vencimiento = esProduccion ? inputVencimiento.value : null;
        const precio = !esProduccion ? inputPrecio.value : null;

        if (idProducto && cantidad > 0 && ((esProduccion && vencimiento) || (!esProduccion && precio > 0))) {
        productos.push(esProduccion
            ? { idProducto: parseInt(idProducto), cantidad: parseInt(cantidad), vencimiento }
            : { nombre: idProducto, cantidad: parseInt(cantidad), precio: parseFloat(precio) });
        }
    });

    return productos;
}

// Función para obtener el mensaje de stock según los límites
function getStockMessage(stock, limits) {
    if (stock === 0) return { text: "Sin stock", color: "red" };
    if (stock < limits.bajo) return { text: "Poco stock", color: "red" };
    if (stock >= limits.bajo && stock <= limits.medio) return { text: "Stock suficiente", color: "orange" };
    return { text: "Stock alto", color: "green" };
}

// Función para agregar un producto al formulario de producción o pedido
function agregarProducto(idBoton, idContenedor, tipo) {
    document.getElementById(idBoton).addEventListener("click", () => {
        const container = document.getElementById(idContenedor);
        const index = container.children.length;

        const div = document.createElement('div');
        div.className = 'producto-fila';

        // Armar el HTML del producto
        div.innerHTML = `
            <select class="producto-item" name="producto_nombre_${index}" required>
                <option value="">Selecciona un producto</option>
                <option value="1">ALFAJORES</option>
                <option value="2">GALLETAS MARINAS S/S</option>
                <option value="3">GALLETAS MARINAS C/S</option>
            </select>
            <input class="producto-item" type="number" name="producto_cantidad_${index}" placeholder="Cantidad" min="1" required>
            ${tipo === "pedido" ? `
                <input class="producto-item" type="number" name="producto_precio_${index}" placeholder="Precio unitario" min="1" required>
            ` : `
                <input class="producto-item" type="date" name="producto_vencimiento_${index}" required>
            `}
            <button class="btn-eliminar-prod" type="button">ELIMINAR</button>
        `;

        container.appendChild(div);
    });
}

//! ===================================================================================================================================================

//*                                                  ----- CARGAR STOCK-----                                                                    *//

async function cargarStock() {
    try {
        const productos = await obtenerDatos("http://localhost:4000/api/productosObtener");
        if (!productos) return; // Si hubo error o no se obtuvo respuesta, salimos

        const productosMap = new Map(productos.map(p => [p.nombre, p.stock]));

        const stockDivs = document.querySelectorAll(".stock");
        stockDivs.forEach(div => {
            const nombre = div.getAttribute("data-producto");
            const value = div.querySelector(".stock-value");
            const change = div.querySelector(".stock-change");
            const mensaje = div.parentElement.querySelector(".msj-stock");

            if (productosMap.has(nombre)) {
                const actual = productosMap.get(nombre);
                const anterior = parseInt(value.textContent, 10) || 0;
                value.textContent = actual;

                if (actual > anterior) {
                    change.textContent = "↑"; change.style.color = "green"; change.classList.add("show");
                } else if (actual < anterior) {
                    change.textContent = "↓"; change.style.color = "red"; change.classList.add("show");
                }

                const limites = {
                    "ALFAJORES": { bajo: 20, medio: 40 },
                    "GALLETAS MARINAS S/S": { bajo: 10, medio: 20 },
                    "GALLETAS MARINAS C/S": { bajo: 10, medio: 20 }
                };

                if (limites[nombre]) {
                    const { text, color } = getStockMessage(actual, limites[nombre]);
                    mensaje.textContent = text;
                    mensaje.style.color = color;
                }
            } else {
                value.textContent = "0";
                change.textContent = "";
                change.classList.remove("show");
                mensaje.textContent = "Sin stock";
                mensaje.style.color = "red";
            }
        });
    } catch (error) {
        console.log(error);
    }
}

//! =================================================================================================================================================

async function cargarCantPedidos() {
    try {
        const pedidos = await obtenerDatos("http://localhost:4000/api/pedidoObtenerCantidadPedidos");
        if (!pedidos) return; 
        const productos = await obtenerDatos("http://localhost:4000/api/productosObtener");
        if (!productos) return; 

        const pedidosMap = new Map(pedidos.map(p => [p.nombre, p.cantidad]));
        const productosMap = new Map(productos.map(p => [p.nombre, p.stock]));

        const pedidoDivs = document.querySelectorAll(".reserva");

        pedidoDivs.forEach(div => {
            const nombre = div.getAttribute("data-producto");
            const value = div.querySelector(".reserva-value");
            const change = div.querySelector(".reserva-change");

            const actual = pedidosMap.get(nombre) || 0;
            const anterior = parseInt(value.textContent, 10) || 0;
            const stockDisponible = productosMap.get(nombre) || 0;

            // Actualizar texto
            value.textContent = actual;

            // Mostrar flecha de cambio
            if (actual > anterior) {
                change.textContent = "↑";
                change.style.color = "green";
                change.classList.add("show");
            } else if (actual < anterior) {
                change.textContent = "↓";
                change.style.color = "red";
                change.classList.add("show");
            } else {
                change.textContent = "-";
                change.style.color = "#888";
                change.classList.add("show");
            }

            // Comparar con stock
            value.style.color = actual > stockDisponible ? "red" : "black";
        }); 
    } catch (error) {
        console.log(error);
    }
}

//! =================================================================================================================================================

//*                                              ----- TABLA PRODUCCION -----                                                                    *//


async function cargarProduccion(filtroFecha = "todas", filtroProducto = "todos") {
    const data = await obtenerDatos(`http://localhost:4000/api/produccionObtener?filtroFecha=${filtroFecha}&filtroProducto=${filtroProducto}`);
    if (!data) return; // Si hubo error o no se obtuvo respuesta, salimos

    const body = document.querySelector(".body-table");
    if (!body) return;

    body.innerHTML = "";

    let ultimoId = null;
    let usarColor1 = true;

    data.forEach(prod => {
        // Si el pedido cambió, alternamos color
        if (prod.id_produccion !== ultimoId) {
            usarColor1 = !usarColor1;
            ultimoId = prod.id_produccion;
        }

        const row = document.createElement("tr");
        row.className = "fila-prod";
        row.classList.add(usarColor1 ? "fila-color1" : "fila-color2");

        row.innerHTML = `
            <td>${prod.id_produccion}</td>
            <td>${new Date(prod.fecha).toLocaleDateString()}</td>
            <td>${prod.producto}</td>
            <td>${prod.receta}</td>
            <td>${prod.cantidad}</td>
            <td>${prod.lote || `-`}</td>
            <td>${new Date(prod.fch_vencimiento).toLocaleDateString()}</td>
            <td><button class="btn-eliminar" data-id="${prod.id_produccion}"><i class="bi bi-trash3"></i></button></td>
        `;

        // Evento eliminar produccion
        row.querySelector(".btn-eliminar").addEventListener("click", async () => {
            try {
                if(!confirm("¿Estás seguro de que querés eliminar esta Produccion?")) return;
                await obtenerDatos(`http://localhost:4000/api/produccionEliminar/${prod.id_produccion}`, { method: "DELETE" });

                // recargar tabla y stock prodcuto.
                await cargarProduccion(filtroFecha, filtroProducto);
                await cargarStock();
            } catch (error) {
                console.log(error);
            }
        });
        body.appendChild(row);
    });
}

//! =================================================================================================================================================

//*                                              ----- TABLA VENTAS -----                                                                         *//


async function cargarVentas(filtroFecha = "todas", filtroProducto = "todos") {
    const ventas = await obtenerDatos(`http://localhost:4000/api/ventaObtener?filtroFecha=${filtroFecha}&filtroProducto=${filtroProducto}`);
    if (!ventas) return; 
    
    const body = document.querySelector(".body-table2");
    if (!body) return;

    body.innerHTML = "";
    ventas.forEach(venta => {
        const row = document.createElement("tr");
        row.className = "fila-ventas";
        row.innerHTML = `
            <td>${venta.id_venta}</td>
            <td>${new Date(venta.fecha).toLocaleDateString()}</td>
            <td>${venta.producto}</td>
            <td>${venta.cantidad}</td>
            <td>${venta.precio}</td>
            <td>$${venta.precio * venta.cantidad}</td>
            <td>${venta.persona}</td>
            <td><button class="btn-eliminar" data-id="${venta.id_venta}"><i class="bi bi-trash3"></i></button></td>
        `;

        // Evento eliminar venta.
        row.querySelector(".btn-eliminar").addEventListener("click", async () => {
            try {
                if(!confirm("¿Estás seguro de que querés eliminar esta Venta?")) return;
                await obtenerDatos(`http://localhost:4000/api/ventaEliminar/${venta.id_venta}`, { method: "DELETE" });

                // recargar tabla y stock prodcuto.
                await cargarVentas(filtroFecha, filtroProducto);
                await cargarStock();
            } catch (error) {
                console.log(error);
            }
        });

        body.appendChild(row);
    });
}

//! =================================================================================================================================================

//*                                                 ----- TABLA PEDIDOS -----                                                                    *//


async function cargarPedidos(filtroFecha = "todas", filtroProducto = "todos") {
    const pedidos = await obtenerDatos(`http://localhost:4000/api/pedidoObtener?filtroFecha=${filtroFecha}&filtroProducto=${filtroProducto}`);
    if(!pedidos) return; 

    const body = document.querySelector(".body-table3");
    if (!body) return;

    body.innerHTML = "";

    let ultimoId = null;
    let usarColor1 = true;
    
    pedidos.forEach(pedido => {
        // Si el pedido cambió, alternamos color
        if (pedido.id_pedido !== ultimoId) {
            usarColor1 = !usarColor1;
            ultimoId = pedido.id_pedido;
        }

        const row = document.createElement("tr");
        row.className = "fila-pedidos";
        row.classList.add(usarColor1 ? "fila-color1" : "fila-color2");

        row.innerHTML = `
            <td>${pedido.id_pedido}</td>
            <td>${new Date(pedido.fecha_entrega).toLocaleDateString()}</td>
            <td>${pedido.persona}</td>
            <td>${pedido.producto}</td>
            <td>${pedido.cantidad}</td>
            <td>${pedido.precio}</td>
            <td>${(pedido.precio * pedido.cantidad)}</td>
            <td>
                <button class="btn-estado ${pedido.estado ? 'btn-entregado' : 'btn-pendiente'}" data-id="${pedido.id_pedido}">
                ${pedido.estado ? '<i class="bi bi-truck"></i>' : '<i class="bi bi-hourglass-split"></i>'}
                </button>
            </td>
            <td>
                <button class="btn-eliminar" data-id="${pedido.id_pedido}"><i class="bi bi-trash3"></i></button>
            </td>
        `;
        body.appendChild(row);

        // Evento para actualizar el estado de entrega    
        row.querySelector(".btn-estado")?.addEventListener("click", async function () {
            try {
                const id = this.getAttribute("data-id");
                const nuevoEstado = pedido.estado ? false : true;

                const res = await fetch(`http://localhost:4000/api/pedidoActualizarEstadoEntrega/${id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ estado: nuevoEstado })
                });

                const data = await res.json();

                if (!res.ok) {
                    // Mostrar error recibido del backend
                    alert(data.message || "Error al actualizar el estado del pedido");
                    return;
                }

                // Recargar tabla y actualizar cantidad de pedidos.
                await cargarPedidos(filtroFecha, filtroProducto);
                await cargarCantPedidos();
                await cargarStock();
                await cargarVentas(
                    document.getElementById("filtro-prod").value || "todas",
                    document.getElementById("filtro-prod2").value || "todos"
                );

            } catch (error) {
                console.error(error);
            }
        });

        // Evento eliminar pedido
        row.querySelector(".btn-eliminar")?.addEventListener("click", async () => {
            try {
                if(!confirm("¿Estás seguro de que querés eliminar este Pedido?")) return;
                await obtenerDatos(`http://localhost:4000/api/pedidoEliminar/${pedido.id_pedido}`, { method: "DELETE" });

                // recargar tabla, stock prodcuto y cantidad pedidos.
                await cargarPedidos(filtroFecha, filtroProducto);
                await cargarStock();
                await cargarCantPedidos();
            } catch (error) {
                console.log(error);
            }
        });
    });
}


//! =================================================================================================================================================

//*                                            ----- FORMULARIO PRODUCCION-----                                                                  *//


document.addEventListener("DOMContentLoaded", () => {
    const container = document.getElementById('productosProd');
    const btnAgregar = document.getElementById("btnAgregarProducto");

    if (!container || !btnAgregar) return;

    // Delegación para eliminar productos
    container.addEventListener('click', e => {
        if (e.target.classList.contains('btn-eliminar-prod')) {
            e.target.closest('.producto-fila').remove();
        }
    });

    // Agregar productos
    agregarProducto("btnAgregarProducto", "productosProd", "produccion");
});

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

//* ENVIAR FORMLARIO PRODUCCION
document.getElementById('formProduccion').addEventListener('submit', async function (e) {
    e.preventDefault();
    
    const msjError = document.getElementById("msj-error1")
    ocultarError(msjError);

    const datos = {
        fecha: document.getElementById("fecha").value.trim(),
        receta: document.getElementById("receta").value.trim(),
        lote: document.getElementById("lote").value.trim(),
    };

    const productos = validarProductos("#productosProd", true);
    if (productos.length === 0) {
        mostrarError(msjError, "Debe agregar al menos un producto.");
        return;
    }

    try {
        await enviarDatos("http://localhost:4000/api/produccionGuardar", { datos, productos });
        alert("Producción registrada correctamente");
        limpiarFormulario("formProduccion", "productosProd");

        await cargarStock();
        await cargarCantPedidos();
        await cargarProduccion();
    } catch (error) {
        mostrarError(msjError, error.message);
    }
});

//! =================================================================================================================================================

//*                                               ----- FORMULARIO VENTAS-----                                                                  *//

document.getElementById("formVentas").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fecha = document.getElementById("fecha2").value.trim();
    const producto = document.getElementById("producto2").value.trim();
    const cantidad = document.getElementById("cantidad2").value.trim();
    const precio = document.getElementById("precio").value.trim();
    const persona = document.getElementById("persona").value.trim();
    const idProducto = parseInt(producto, 10);

    const msjError2 = document.getElementById("msj-error2")
    ocultarError(msjError2);

    try {
        await enviarDatos("http://localhost:4000/api/ventaGuardar", { fecha, idProducto, cantidad, precio, persona });
        alert("Venta registrada correctamente");
        document.getElementById(`formVentas`).reset();
        await cargarStock();
        await cargarCantPedidos();
        await cargarVentas(
        document.getElementById("filtro-prod").value || "todas",
        document.getElementById("filtro-prod2").value || "todos"
        );
    } catch (error) {
        mostrarError(msjError2, error.message);
    } 
});

//! =================================================================================================================================================

//*                                               ----- FORMULARIO PEDIDOS-----                                                                  *//


document.getElementById('productosPedido').addEventListener('click', e => {
    if (e.target.classList.contains('btn-eliminar-prod')) {
        e.target.closest('.producto-fila').remove();
    }
});

agregarProducto("btnAgregarProducto1", "productosPedido", "pedido");

//* ENVIAR FORMULARIO DE PEDIDOS

document.getElementById('formPedidos').addEventListener('submit', async function (e) {
    e.preventDefault();
    const msjError = document.getElementById("msj-error3");
    ocultarError(msjError);

    const fechaEntrega = document.getElementById('fechaEntrega').value;
    const personaPedido = document.getElementById('personaPedido').value;
    const productos = validarProductos("#productosPedido", false);

    if (productos.length === 0) {
        mostrarError(msjError, "Debe agregar al menos un producto.");
        return;
    }

    try {
        await enviarDatos("http://localhost:4000/api/pedidoGuardar", { fechaEntrega, personaPedido, productos });
        alert("Pedido registrado correctamente");
        limpiarFormulario("formPedidos", "productosPedido");
        await cargarCantPedidos();
        await cargarPedidos(
        document.getElementById("filtro-prod").value || "todas",
        document.getElementById("filtro-prod2").value || "todos"
        );
    } catch (error) {
        mostrarError(msjError, error.message);
    }
});

//! =================================================================================================================================================

//*                                                  ----- CARGA INICIAL Y EVENTOS DE FILTRO -----                                                *//

document.addEventListener("DOMContentLoaded", () => {
    
    function configurarFiltro(btnId, inputId1, inputId2, callback) {
        document.getElementById(btnId).addEventListener("click", async () => {
            await callback(
                document.getElementById(inputId1).value,
                document.getElementById(inputId2).value
            );
        });
    }

    configurarFiltro("filtrarBtn", "filtro-prod", "filtro-prod2", cargarProduccion);
    configurarFiltro("filtrarBtn2", "filtro-venta", "filtro-venta2", cargarVentas);
    configurarFiltro("filtrarBtn3", "filtro-pedidos", "filtro-pedidos2", cargarPedidos);

    document.getElementById("cerrarSesion").addEventListener("click", (e) => {
        e.preventDefault();
        document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/frontend/pages/login.html";
    });

    // Scroll automático
    ["btn-abajo1", "btn-abajo2", "btn-abajo3"].forEach((btnId, i) => {
        document.getElementById(btnId).addEventListener("click", () => {
            document.getElementById(["section-produccion", "section-venta", "section-pedidos"][i])
                .scrollIntoView({ behavior: "smooth" });
        });
    });

    // Carga inicial
    cargarStock();
    cargarCantPedidos();
    cargarProduccion();
    cargarVentas();
    cargarPedidos();
});






