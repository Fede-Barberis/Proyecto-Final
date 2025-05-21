// modalManager.js

function configurarModal({
    modalId = "modal",
    formSelector = ".form-container",
    openBtnSelector = ".open-modal",
    closeBtnSelector = ".close",
    extraSetup = null // función personalizada opcional
}) {
    const modal = document.getElementById(modalId);
    const closeBtn = modal.querySelector(closeBtnSelector);
    const forms = modal.querySelectorAll(formSelector);

    // Abrir modal
    document.querySelectorAll(openBtnSelector).forEach(button => {
        button.addEventListener("click", () => {
            const formId = button.getAttribute("data-form");

            // Ocultar todos los formularios
            forms.forEach(f => f.style.display = "none");

            // Mostrar el formulario correspondiente
            const formToShow = document.getElementById(formId);
            if (formToShow) formToShow.style.display = "block";

            // Lógica personalizada
            if (typeof extraSetup === "function") {
                extraSetup(button);
            }

            modal.style.display = "flex";
        });
    });

    // Cerrar modal con botón
    closeBtn.addEventListener("click", () => {
        modal.style.display = "none";
    });

    // Cerrar modal al hacer click fuera
    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
}

// === Inicialización para modales comunes ===
configurarModal({});

// === Inicialización para el modal con select de producto ===
configurarModal({
    extraSetup: (btn) => {
        const formId = btn.getAttribute("data-form");
        const producto = btn.getAttribute("data-producto");
        const productos = {
            "HARINA": "1",
            "HUEVOS": "2",
            "GRASA": "3",
            "DULCE DE LECHE": "4",
            "SAL": "5",
            "AZUCAR": "6"
        };
        if (formId === "form-mp") {
            const select = document.querySelector("#producto");
            if (select && producto in productos) {
                select.value = productos[producto];
            }
        }
    }
});