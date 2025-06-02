import { obtenerProductos, agregarProduccion, obtenerProduccion, eliminarProduccion } from "../../models/produccion/produccionModels.js";

//! ===================================================================================================================================================

//*                                         -------- MANEJA LA PRODUCCION --------                                                                  *//

export const produccionGuardar = async (req, res) => {
    try{
        const {datos, productos} = req.body

        const {fecha, receta, lote} = datos

        if (!fecha || !receta || !Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({ status: "Error", message: "Error, campos incompletos" });
        }

        if (lote.length < 4 || lote.length > 8) {
            return res.status(400).json({ status: "Error", message: "El lote debe tener entre 4 y 8 caracteres" });
        }

        for (const p of productos) {
            if (!p.idProducto || isNaN(p.idProducto) || p.cantidad <= 0 || !p.vencimiento) {
                return res.status(400).json({ status: "Error", message: "Datos de producto inválidos" });
            }

            if (p.vencimiento <= fecha) {
                return res.status(400).json({ status: "Error", message: "La fecha de vencimiento no puede ser menor o igual a la fecha de producción" });
            }
        }

        // Llamar al modelo para registrar cada producto
        await agregarProduccion(datos, productos);
        res.status(200).json({ status: "OK", message: "Producción registrada correctamente" });
    }
    catch(error){
        res.status(400).json({ status: "Error", message: error.message })
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const produccionObtener = async (req, res) => {
    try {
        const { filtroFecha, filtroProducto } = req.query; // Obtener filtro desde la URL
        const prod = await obtenerProduccion(filtroFecha, filtroProducto)

        if (!Array.isArray(prod)) {
            throw new Error("La respuesta no es un array");
        }

        res.json(prod);
    } catch (error) {
        res.status(400).json({ status: "Error", message: "Error al obtener las ventas" });
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const produccionEliminar = async (req, res) => {
    try {
        const { id } = req.params;
        const exito = await eliminarProduccion(id);

        if (!exito) {
            return res.status(404).json({ error: "No se pudo eliminar la compra o no existe" });
        }

        return res.status(200).json({ mensaje: "Compra eliminada y stock actualizado" });
    } catch (error) {
        console.error("Error en eliminarCompraController:", error);
        return res.status(400).json({ error: "Error del servidor" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const productosObtener = async (req, res) => {
    try {
        const productos = await obtenerProductos();
        res.json(productos)
    } catch (error) {
        res.status(400).json({ status: "Error", message: "Error al obtener productos" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//


export const methodsProduccion = {
    produccionGuardar,
    produccionObtener,
    produccionEliminar,
    productosObtener
}