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

//! ===================================================================================================================================================

// Función para cargar los detalles de un empleado
async function cargarDetallesEmpleado(id) {
    try {
        const data = await obtenerDatos(`http://localhost:4000/api/empleadoObtenerDetalle/${id}`);
        if(!data) return;

        const tbody = document.querySelector(".body-detalle-empleado");
        tbody.innerHTML = ""; // Limpiar tabla

        let ultimaFecha = null;
        let usarColor1 = true;

        data.forEach(det => {
            const fecha = new Date(det.fechaCobro);
            const mesAnio = `${fecha.getFullYear()}-${fecha.getMonth()}`; // clave única por mes y año

            if (mesAnio !== ultimaFecha) {
                usarColor1 = !usarColor1;
                ultimaFecha = mesAnio;
            }

            const row = document.createElement("tr");
            row.className = "fila-detalle";
            row.classList.add(usarColor1 ? "fila-color1" : "fila-color2");

            row.innerHTML = `
                <td>${det.nro_detalle || det.id_detalle}</td>
                <td>$ ${det.precioHora}</td>
                <td><i class="bi bi-clock"></i> ${det.cantHoras}</td>
                <td>$ ${(det.cantHoras * det.precioHora)}</td>
                <td><i class="bi bi-calendar-event"></i> ${new Date(det.fechaCobro).toLocaleDateString()}</td>
                <td><button class="btn-eliminar-detalle" data-id="${det.id_detalle}" data-empleado="${det.id_empleado}"><i class="bi bi-trash3"></i></button></button></td>
            `;
            tbody.appendChild(row);
        });
    } catch (error) {
        console.error("Error al cargar los detalles:", error);
    }
}

document.addEventListener("click", async (e) => {
    if(e.target.classList.contains("btn-eliminar-detalle")){
        const idDetalle = e.target.getAttribute("data-id");
        const idEmpleado = e.target.getAttribute("data-empleado")

        if(!confirm("¿Estás seguro de que querés eliminar este Detalle?")) return;
        
        try {
            await obtenerDatos(`http://localhost:4000/api/empleadoEliminarDetalle/${idDetalle}`, {
                method: "DELETE"
            })
            
            await cargarDetallesEmpleado(idEmpleado)
            await cargarGraficoEmpleados();
        }
        catch(error){
            mostrarError(msjError, error.message);
        }
    }
})


//! =============================================================================================================================================

//*                                              ----- TABLA EMPLEADOS -----                                                                 *//

async function cargarEmpleados() {
    const res = await fetch(`http://localhost:4000/api/empleadoObtener`);
    const data = await res.json();
    const body = document.querySelector(".body-table");
    if (!body) return;

    body.innerHTML = "";

    data.forEach(empl => {
        const row = document.createElement("tr");
        row.className = "fila-empleado";

        row.innerHTML = `
            <td>${empl.id_empleado}</td>
            <td>${empl.nombre}</td>
            <td>${empl.apellido}</td>
            <td><button class="btn-detalle open-modal" data-id="${empl.id_empleado}"><i class="bi bi-list-ul"></i></button></td>
            <td><button class="btn-eliminar" data-id="${empl.id_empleado}"><i class="bi bi-trash3"></i></button></td>
        `;
        body.appendChild(row);

        row.querySelector(".btn-eliminar").addEventListener("click", async () => {
            if(!confirm("¿Estás seguro de que querés eliminar este Empleado?")) return;

            try {
                await obtenerDatos(`http://localhost:4000/api/empleadoEliminar/${empl.id_empleado}`, { 
                    method: "DELETE" 
                });

                await cargarEmpleados();
            } catch (error) {
                mostrarError(msjError, error.message);
            }
        });
    });
}

cargarEmpleados()


async function obtenerEmpleados() {
    try {
        const datos = await obtenerDatos('http://localhost:4000/api/empleadoObtener');
        if(!datos) return;
        return datos;
    } catch (error) {
        console.error(error);
    }
}

async function cargarOpcionesSelect() {
    const datos = await obtenerEmpleados();
    const opciones = datos.map((dato) => ({
        valor: dato.id_empleado,
        texto: dato.nombre
    }));

    console.log("Opciones para el select:", opciones);

    const select = document.getElementById('select-empleados');
    select.innerHTML = '';
    opciones.forEach(option => {
        const nuevoOption = document.createElement('option');
        nuevoOption.value = option.valor;
        nuevoOption.textContent = option.texto;
        select.appendChild(nuevoOption);
    });
}

cargarOpcionesSelect();

//! =============================================================================================================================================
//*                                              ----- GRAFICO EMPLEADOS -----                                                             *//

let graficoEmpleados = null;

async function cargarGraficoEmpleados(){
    try{
        const data = await obtenerDatos("http://localhost:4000/api/empleadoObtenerGrafico")
        if (!data) return;
        
        const ctx = document.getElementById('graficaEmpleados').getContext('2d');

        // Si ya hay un gráfico, lo destruimos
        if (graficoEmpleados) {
            graficoEmpleados.destroy();
        }

        graficoEmpleados = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.nombres,
                datasets: [{
                    label: 'HORAS TRABAJADAS',
                    data: data.horas || [0],
                    backgroundColor: 'rgba(87, 124, 255, 0.5)',
                    borderColor: 'rgb(4, 0, 255)',
                    borderWidth: 1,
                    borderRadius: 5
                }]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
            }
        });
    }
    catch(error){
            console.error("Error al cargar el gráfico:", error);
    }
}

cargarGraficoEmpleados()


//! =============================================================================================================================================
//*                                              ----- AGREGAR EMPLEADO -----                                                             *//

document.getElementById('form-empleado').addEventListener('submit', async (e) => {
    e.preventDefault()

    const empleado = {
        nombre: document.getElementById('nombre-empleado').value.trim(),
        apellido: document.getElementById('apellido-empleado').value.trim()
    }
    
    const msjError = document.getElementById("msj-error1");
    ocultarError(msjError);

    try{
        await enviarDatos(`http://localhost:4000/api/empleadoAgregar`, {empleado})
        alert("Empleado registrado correctamente");
        limpiarFormulario("form-empleado");

        await cargarEmpleados();
        await cargarGraficoEmpleados();
        await cargarOpcionesSelect();
    }
    catch(error){
        mostrarError(msjError, error.message);
    }
})

//! =============================================================================================================================================
//*                                              ----- AGREGAR HORAS -----                                                             *//

document.getElementById('form-horasEmpleado').addEventListener('submit', async (e) => {
    e.preventDefault()

    const detalle = {
        id_empleado: document.getElementById('select-empleados').value.trim(),
        valor: document.getElementById('valor-hora').value.trim(),
        horas: document.getElementById('horas-trabajadas').value.trim(),
        fecha: document.getElementById('fecha-cobro').value.trim(),
    };
    
    const msjError = document.getElementById("msj-error2");
    ocultarError(msjError);

    try{
        await enviarDatos(`http://localhost:4000/api/empleadoAgregarDetalle`, {detalle});
        alert("Jornada registrada correctamente")
        limpiarFormulario("form-horasEmpleado")
        
        await cargarEmpleados();
        await cargarGraficoEmpleados();
    }
    catch(error){
        mostrarError(msjError, error.message);
    }
})

//! =============================================================================================================================================
//*                                              ----- INICIALIZACION -----                                                             *//

document.addEventListener("DOMContentLoaded", () => {

    const modal = document.getElementById("modal");
    const closeBtn = document.querySelector(".close");

    // Abrir modal y cargar detalles
    document.addEventListener("click", async (e) => {
        if (e.target.classList.contains("btn-detalle")) {
            const empleadoId = e.target.getAttribute("data-id");
            await cargarDetallesEmpleado(empleadoId)
            modal.style.display = "flex";
        }
    })

    // Cerrar modal
    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });


    document.getElementById("cerrarSesion").addEventListener("click", (e) => {
        e.preventDefault();
        document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.href = "/frontend/pages/login.html";
    });

    cargarEmpleados();
    cargarGraficoEmpleados();
})





