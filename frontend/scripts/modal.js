
document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modal");
    const closeModalBtn = modal.querySelector(".close");
    const forms = modal.querySelectorAll(".form-container");

    document.addEventListener("click", async function (e) {
        // Botón para abrir modal con detalles de empleado
        const openDetalleBtn = e.target.closest(".open-detalle-empleado");

        // Botón para abrir modal con formulario
        const openBtn = e.target.closest(".open-modal");
        if (openBtn) {
            const formId = openBtn.getAttribute("data-form");
            console.log("Abrir modal para:", formId);

            forms.forEach(f => f.style.display = "none");
            const formToShow = document.getElementById(formId);
            if (formToShow) formToShow.style.display = "block";

            // Si es el modal de materia prima
            const productos = {
            "HARINA": "1",
            "HUEVOS": "2",
            "GRASA": "3",
            "DULCE DE LECHE": "4",
            "SAL": "5",
            "AZUCAR": "6"
            };

            const productoSeleccionado = openBtn.getAttribute("data-producto")?.toUpperCase(); // Obtiene el producto del botón
            const valorNumerico = productos[productoSeleccionado]

            // Actualizar el select según el formulario
            if (formId === "form-mp" && valorNumerico) {
                const selectProducto = document.getElementById("producto");
                if (selectProducto) {
                    selectProducto.value = valorNumerico;
                }
            }
            modal.style.display = "flex";
        }

        // Cerrar modal
        if (e.target === modal || e.target === closeModalBtn) {
            modal.style.display = "none";
            ocultarErrores();
        }
    });

    function ocultarErrores() {
        const errores = modal.querySelectorAll(".msj-error");
        errores.forEach(err => err.classList.add("escondido"));
    }
});
