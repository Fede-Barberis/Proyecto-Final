import { agregarVenta, obtenerVentas, eliminarVenta  } from "../../models/ventas/ventasModels.js";
import { obtenerProductos } from "../../models/produccion/produccionModels.js";

//! ==================================================================================================================================================

//*                                        -------- MANEJAR LAS VENTAS --------                                                                     *//

export const ventaGuardar = async (req, res) => {
    try {
        const {fecha, idProducto, cantidad, precio, persona} = req.body

        if(!fecha || !idProducto || !cantidad || !precio || !persona) {
            return res.status(400).json({ status: "Error", message: "Error, campos incompletos"})
        }

        if (isNaN(idProducto)) {
            return res.status(400).json({ status: "Error", message: "ID de producto inválido" });
        }

        console.log("Verificando stock...");
        const resultadoStock = await verificarStock(idProducto, cantidad);

        if (!resultadoStock.valido) {
            return res.status(400).json({ status: "Error", message: resultadoStock.mensaje });
        }

        await agregarVenta(fecha, idProducto, cantidad, precio, persona)
        res.status(200).json({ Status: "OK", message: "Venta guardada correctamente"})
    }
    catch(error){
        res.status(400).json({ status: "Erorr", message: "Error al guardar los datos"})
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const ventaObtener = async (req, res) => {
    try {
        const { filtroFecha, filtroProducto } = req.query; // Obtener filtro desde la URL
        const ventas = await obtenerVentas(filtroFecha, filtroProducto)

        if (!Array.isArray(ventas)) {
            throw new Error("La respuesta no es un array");
        }

        res.json(ventas);
    } catch (error) {
        res.status(400).json({ status: "Error", message: "Error al obtener las ventas" });
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const ventaEliminar = async (req, res) => {
    try {
        const { id } = req.params;
        const exito = await eliminarVenta(id);

        if (!exito) {
            return res.status(404).json({ error: "No se pudo eliminar la venta o no existe" });
        }

        return res.status(200).json({ mensaje: "Venta eliminada y stock actualizado" });
    } catch (error) {
        console.error("Error en eliminarVentaController:", error);
        return res.status(400).json({ error: "Error del servidor" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const verificarStock = async (idProducto, cantidad) => {
    try {
        // Obtener el producto específico por ID
        const productos = await obtenerProductos();
        console.log("Productos obtenidos de la BD:", productos);
        const producto = productos.find(prod => prod.id_producto === idProducto); 

        if (!producto) {
            return { valido: false, mensaje: "Producto no encontrado" };
        }

        // Verificar stock
        if (cantidad > producto.stock) {
            return { valido: false, mensaje: "Stock insuficiente para realizar esta venta" };
        }

        return { valido: true, producto };
    } catch (error) {
        res.status(500).json({ status: "Error", message: "Error al verificar el stock" });
    }
}

//! ==================================================================================================================================================

export const methodsVentas = {
    ventaGuardar,
    ventaObtener,
    ventaEliminar,
    verificarStock
}