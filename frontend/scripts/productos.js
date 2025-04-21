//* ==================== Selección de elementos ====================

const modal = document.getElementById("modal");
const closeModalBtn = document.querySelector(".close");
const openModalBtns = document.querySelectorAll(".open-modal");
const forms = document.querySelectorAll(".form-container");
const selectProducto1 = document.getElementById("producto1");
const selectProducto2 = document.getElementById("producto2");

//* ==================== Funciones Auxiliares ====================

function getStockMessage(stock, limits) {
    if (stock === 0) return { text: "Sin stock", color: "red" };
    if (stock < limits.bajo) return { text: "Poco stock", color: "red" };
    if (stock >= limits.bajo && stock <= limits.medio) return { text: "Stock suficiente", color: "orange" };
    return { text: "Stock alto", color: "green" };
}

//* ==================== Modal ====================

openModalBtns.forEach(button => {
    button.addEventListener("click", function () {
        const formId = this.getAttribute("data-form");
        forms.forEach(form => form.style.display = "none");
        document.getElementById(formId).style.display = "block";

        const productoSeleccionado = this.getAttribute("data-producto");
        const productos = {
            "ALFAJORES": "1",
            "GALLETAS MARINAS S/S": "2",
            "GALLETAS MARINAS C/S": "3"
        };
        const valorNumerico = productos[productoSeleccionado];

        switch(formId){
            case "form1": selectProducto1.value = valorNumerico;
            case "form2": selectProducto2.value = valorNumerico;
            // case "form3": selectProducto3.value = valorNumerico;
        }

        modal.style.display = "flex";
    });
});

closeModalBtn.addEventListener("click", function () {
    modal.style.display = "none";
    document.getElementById("msj-error2").classList.add("escondido");
});

window.addEventListener("click", function (e) {
    if (e.target === modal) {
        modal.style.display = "none";
        document.getElementById("msj-error2").classList.add("escondido");
    }
});

//* ==================== Formulario Producción ====================

document.getElementById("formProduccion").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fecha = document.getElementById("fecha").value.trim();
    const producto = document.getElementById("producto1").value.trim();
    const receta = document.getElementById("receta").value.trim();
    const cantidad = document.getElementById("cantidad").value.trim();
    const lote = document.getElementById("lote").value.trim();
    const vencimiento = document.getElementById("vencimiento").value.trim();
    const idProducto = parseInt(producto, 10);

    const msjError = document.getElementById("msj-error1")
    msjError.classList.add("escondido");

    try {
        const res = await fetch("http://localhost:4000/api/guardarProduccion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha, idProducto, receta, cantidad, lote, vencimiento })
        });

        if (res.ok) {
            document.getElementById("formProduccion").reset();
            await cargarStock();
            await cargarCantPedidos();
            const filtroFecha = document.getElementById("filtro-prod").value || "todas";
            const filtroProducto = document.getElementById("filtro-prod2").value || "todos";
            await cargarProduccion(filtroFecha, filtroProducto);
        } else {
            const errorData = await res.json();
            msjError.textContent = errorData.message;
            msjError.classList.remove("escondido");
        }
    } catch (error) {
        console.error("Error al guardar producción:", error);
    }
});

//* ==================== Formulario Ventas ====================

document.getElementById("formVentas").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fecha = document.getElementById("fecha2").value.trim();
    const producto = document.getElementById("producto2").value.trim();
    const cantidad = document.getElementById("cantidad2").value.trim();
    const precio = document.getElementById("precio").value.trim();
    const persona = document.getElementById("persona").value.trim();
    const idProducto = parseInt(producto, 10);

    const msjError2 = document.getElementById("msj-error2")
    msjError2.classList.add("escondido");

    try {
        const res = await fetch("http://localhost:4000/api/guardarVenta", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fecha, idProducto, cantidad, precio, persona })
        });

        if (res.ok) {
            document.getElementById("formVentas").reset();
            await cargarStock();
            await cargarCantPedidos();
            const filtroFecha = document.getElementById("filtro-venta").value || "todas";
            const filtroProducto = document.getElementById("filtro-venta2").value || "todos";
            await cargarVentas(filtroFecha, filtroProducto);
        } else {
            const errorData = await res.json();
            msjError2.textContent = errorData.message;
            msjError2.classList.remove("escondido");
        }
    } catch (error) {
        console.error("Error al realizar la venta:", error);
    }
});


//* ==================== Formulario Pedidos ====================

document.addEventListener("DOMContentLoaded", () => {
    // 1. Conectamos el botón después de que el DOM esté listo
    const btnAgregar = document.getElementById("btnAgregarProducto");
    if (btnAgregar) {
        btnAgregar.addEventListener("click", agregarProducto);
    }

    function agregarProducto() {
        const container = document.getElementById('productosPedido');
        if (!container) {
            console.error("No se encontró el contenedor #productosPedido");
            return;
        }

        const index = container.children.length;

        const div = document.createElement('div');
        div.className = 'producto-fila';

        div.innerHTML = `
        <select class="producto-item" name="producto_nombre_${index}" required>
            <option value="">Selecciona un producto</option>
            <option value="1">ALFAJORES</option>
            <option value="2">GALLETAS MARINAS S/S</option>
            <option value="3">GALLETAS MARINAS C/S</option>
        </select>
        <input class="producto-item" type="number" name="producto_cantidad" placeholder="Cantidad" min="1" required>
        <input class="producto-item" type="number" name="producto_precio" placeholder="Precio unitario" min="1" required>
        <button class="btn-eliminarPedido" type="button" onclick="this.parentElement.remove()">ELIMINAR</i></button>
        
        `;

        container.appendChild(div);
        console.log(`Producto agregado: producto_nombre_${index}`);
    }
});

document.getElementById('formPedidos').addEventListener('submit', async function (e) {
    e.preventDefault();

    const fechaEntrega = document.getElementById('fechaEntrega').value;
    const personaPedido = document.getElementById('personaPedido').value;
    const filas = document.querySelectorAll('.producto-fila');
    const productos = [];

    const msjError = document.getElementById("msj-error3");
    msjError.classList.add("escondido");
    msjError.textContent = "";

    filas.forEach((fila) => {
        const nombre = fila.querySelector('select').value;
        const cantidad = fila.querySelector(`input[name="producto_cantidad"]`).value;
        const precio = fila.querySelector(`input[name="producto_precio"]`).value;

        if (nombre && cantidad > 0 && precio > 0) {
            productos.push({ nombre, cantidad, precio });
        }
    });

    try {
        const res = await fetch("http://localhost:4000/api/guardarPedido", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fechaEntrega, personaPedido, productos }),
        });

        if (res.ok) {
            alert("✅ Pedido guardado correctamente");
            document.getElementById("productosPedido").innerHTML = "";
            document.getElementById("formPedidos").reset();
            cargarCantPedidos();
            const filtroFecha = document.getElementById("filtro-venta").value || "todas";
            const filtroProducto = document.getElementById("filtro-venta2").value || "todos";
            cargarPedidos(filtroFecha, filtroProducto);
        } else {
            const errorData = await res.json();
            msjError.textContent = errorData.message;
            msjError.classList.remove("escondido");
        }
    } catch (error) {
        console.error("Error al guardar el pedido:", error);
        msjError.textContent = "Error de conexión con el servidor.";
        msjError.classList.remove("escondido");
    }
});


async function cargarCantPedidos() {
    try {
        const resPedidos = await fetch("http://localhost:4000/api/obtenerCantidadPedidos");
        const pedidos = await resPedidos.json();

        const resProductos = await fetch("http://localhost:4000/api/obtenerProductos");
        const productos = await resProductos.json();

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

//* ==================== Stock ====================

async function cargarStock() {
    try {
        const res = await fetch("http://localhost:4000/api/obtenerProductos");
        const productos = await res.json();
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

//* ==================== Tabla Producción ====================

async function cargarProduccion(filtroFecha = "todas", filtroProducto = "todos") {
    const res = await fetch(`http://localhost:4000/api/obtenerProduccion?filtroFecha=${filtroFecha}&filtroProducto=${filtroProducto}`);
    const data = await res.json();
    const body = document.querySelector(".body-table");
    if (!body) return;

    body.innerHTML = "";
    data.forEach(prod => {
        const row = document.createElement("tr");
        row.className = "fila-prod";
        row.innerHTML = `
            <td>${prod.id_produccion}</td>
            <td>${new Date(prod.fecha).toLocaleDateString()}</td>
            <td>${prod.producto}</td>
            <td>${prod.receta}</td>
            <td>${prod.cantidad}</td>
            <td>${prod.lote}</td>
            <td>${new Date(prod.fch_vencimiento).toLocaleDateString()}</td>
            <td><button class="btn-eliminar" data-id="${prod.id_produccion}"><i class="bi bi-trash3"></i></button></td>
        `;

        row.querySelector(".btn-eliminar").addEventListener("click", async () => {
            try {
                const res = await fetch(`http://localhost:4000/api/eliminarProduccion/${prod.id_produccion}`, { 
                    method: "DELETE" 
                });

                if (!res.ok) throw new Error("Error al eliminar la producción");

                await cargarProduccion(filtroFecha, filtroProducto);
                await cargarStock();
            } catch (error) {
                console.log(error);
            }
        });

        body.appendChild(row);
    });
}

//* ==================== Tabla Ventas ====================

async function cargarVentas(filtroFecha = "todas", filtroProducto = "todos") {
    const res = await fetch(`http://localhost:4000/api/obtenerVentas?filtroFecha=${filtroFecha}&filtroProducto=${filtroProducto}`);
    const ventas = await res.json();
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

        row.querySelector(".btn-eliminar").addEventListener("click", async () => {
            try {
                const res = await fetch(`http://localhost:4000/api/eliminarVenta/${venta.id_venta}`, { 
                    method: "DELETE" 
                });

                if (!res.ok) throw new Error("Error al eliminar la producción");

                await cargarVentas(filtroFecha, filtroProducto);
                await cargarStock();
            } catch (error) {
                console.log(error);
            }
        });

        body.appendChild(row);
    });
}

//* ==================== Tabla Pedidos ====================

async function cargarPedidos(filtroFecha = "todas", filtroProducto = "todos") {
    const res = await fetch(`http://localhost:4000/api/obtenerPedidos?filtroFecha=${filtroFecha}&filtroProducto=${filtroProducto}`);
    const pedidos = await res.json();
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

        const btn = row.querySelector(".btn-estado");
        if (btn) {    
            btn.addEventListener("click", async function () {
                const id = this.getAttribute("data-id");
                const nuevoEstado = pedido.estado ? false : true;

                try {
                    const res = await fetch(`http://localhost:4000/api/actualizarEstadoEntrega/${id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ estado: nuevoEstado })
                    });

                    if (!res.ok) throw new Error("Error al actualizar el estado de entrega");

                    // Recargar tabla
                    await cargarPedidos(filtroFecha, filtroProducto);
                    await cargarCantPedidos();

                } catch (error) {
                    console.error(error);
                }
            });
        }

        row.querySelector(".btn-eliminar").addEventListener("click", async () => {
            try {
                const res = await fetch(`http://localhost:4000/api/eliminarPedido/${pedido.id_pedido}`, { 
                    method: "DELETE" 
                });

                if (!res.ok) throw new Error("Error al eliminar el pedido");
                
                await cargarPedidos(filtroFecha, filtroProducto);
                await cargarStock();
                await cargarCantPedidos();
            } catch (error) {
                console.log(error);
            }
        });
    });
}

//* ==================== Inicio ====================

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("filtrarBtn").addEventListener("click", async () => {
        await cargarProduccion(
            document.getElementById("filtro-prod").value,
            document.getElementById("filtro-prod2").value
        );
    });

    document.getElementById("filtrarBtn2").addEventListener("click", async () => {
        await cargarVentas(
            document.getElementById("filtro-venta").value,
            document.getElementById("filtro-venta2").value
        );
    });

    document.getElementById("filtrarBtn3").addEventListener("click", async () => {
        await cargarPedidos(
            document.getElementById("filtro-pedidos").value,
            document.getElementById("filtro-pedidos2").value
        );
    });

    document.getElementById("cerrarSesion").addEventListener("click", (e) => {
        e.preventDefault();
        document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/frontend/pages/login.html";
    });

    window.onload = () => {
        cargarStock();
        cargarCantPedidos();
        cargarProduccion();
        cargarVentas();
        cargarPedidos();
    };
    
});

//* ==================== Scroll automático ====================

document.getElementById("btn-abajo").addEventListener("click", () => {
    document.getElementById("section2").scrollIntoView({ behavior: "smooth" });
});






