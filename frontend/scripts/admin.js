document.addEventListener("DOMContentLoaded", () => {
    const logoutButton = document.getElementById("cerrarSesion");

    logoutButton.addEventListener("click", async (e) => {
        // Evito el comportamiento predeterminado del botón
        e.preventDefault(); 

        // Borro el token de las cookies
        document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;"; // Si usaste cookies

        // Redirijo al usuario a la página de login
        window.location.href = "/frontend/pages/login.html";
    });

    const ventasHoy = document.getElementById("ventasHoy")
    const ingresosHoy = document.getElementById("ingresosHoy")
    const ventasTotales = document.getElementById("ventasTotales")
    const ingresosTotales = document.getElementById("ingresosTotales")

    async function cargarTarjetas() {
        try {
            const res = await fetch("http://localhost:4000/api/obtenerTarjetas")
            const datos = await res.json()
            console.log("Datos recibidos:", datos);

            ventasHoy.textContent = datos.ventasHoy  || 0;
            ingresosHoy.textContent = `$${datos.ingresosHoy || 0}`;
            ventasTotales.textContent = datos.totalVentas || 0;
            ingresosTotales.textContent = `$${datos.ingresosTotales || 0}`;  
        }
        catch(error) {
            console.error("Error al cargar las tarjetas:", error);
        }
    }
    

    window.onload = () => {
        cargarTarjetas();
    };
})
