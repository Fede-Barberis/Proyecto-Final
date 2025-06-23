import { agregarMateriaPrima, obtenerComprasMateriaPrima, obtenerMateriaPrimas, eliminarCompraMp, actualizarPagoMp } from "../../models/materiaPrima/materiaPrimaModels.js";

//! ==================================================================================================================================================

//*                                        -------- MANEJAR LA MATERIA PRIMA --------                                                               *//

export const materiaPrimaGuardar = async (req, res) => {
    try{
        const {fecha, idProducto, cantidad, unidad, lote, vencimiento, precio, isPagado} = req.body

        if(!fecha || !idProducto || !cantidad || !unidad || !vencimiento || !precio){
            return res.status(400).json({ status: "Error", message: "Error, campos incompletos"})
        }

        if (isNaN(idProducto)) {
            return res.status(400).json({ status: "Error", message: "ID de producto inválido" });
        }

        if(cantidad < 0){
            return res.status(400).json({ status:"Error", message: "La cantidad debe ser mayor a 0"})
        }

        // if(lote.length < 4 || lote.length > 8){
        //     return res.status(400).json({ status: "Error", message: "El lote debe tener entre 4 y 8 caracteres" });
        // }

        if (vencimiento <= fecha) {
            return res.status(400).json({ status: "Error", message: "La fecha de vencimiento no puede ser menor o igual a la fecha de producción" });
        }

        if(precio < 0){
            return res.status(400).json({ status:"Error", message: "El precio debe ser mayor a 0"})
        }

        await agregarMateriaPrima(fecha, idProducto, cantidad, unidad, lote, vencimiento, precio, isPagado)
        res.status(200).json({ status: "OK", message: "Compra de materia prima registrada correctamente"})
    }
    catch(error){
        console.error("Error al registrar la compra de materia prima:", error);
        res.status(500).json({ status: "Error", message: error.message})
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const materiaPrimaObtener = async (req, res) => {
    try {
        const productos = await obtenerMateriaPrimas();
        res.json(productos)

    } catch (error) {
        res.status(500).json({ status: "Error", message: "Error al obtener las materia primas" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const materiaPrimaObtenerCompra = async (req, res) => {
    try {
        const { filtroFecha, filtroProducto } = req.query; // Obtener filtro desde la URL
        const Mp = await obtenerComprasMateriaPrima(filtroFecha, filtroProducto)

        if (!Array.isArray(Mp)) {
            throw new Error("La respuesta no es un array");
        }

        res.json(Mp);
    } catch (error) {
        res.status(500).json({ status: "Error", message: error.message})
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const materiaPrimaEliminarCompra = async (req, res) => {
    try {
        const { id } = req.params;
        const exito = await eliminarCompraMp(id);

        if (!exito) {
            return res.status(404).json({ status: "Error", message: "No se pudo eliminar la compra o no existe" });
        }

        return res.status(200).json({ status: "OK", message: "Compra eliminada y stock actualizado" });
    } catch (error) {
        console.error("Error en eliminarCompraController:", error);
        return res.status(500).json({ status: "Error", message: "Error del servidor" });
    }
};

//! ==================================================================================================================================================

//*                                        -------- ACTUALIZAR  ESTADO --------                                                            *//

export const materiaPrimaActualizarEstadoPago = async (req, res) => {
    try {
        const { id } = req.params;
        const { isPagado } = req.body; // recibimos true o false

        const pagoActualizado = await actualizarPagoMp(id, isPagado);
        
        if (!pagoActualizado) {
            return res.status(404).json({ status: "Error", message: "No se encontró la compra" });
        }

        return res.status(200).json({ status: "OK", message: "Estado de pago actualizado" });

    } catch (error) {
        console.error("Error en actualizarEstadoPago:", error);
        return res.status(500).json({ status: "Error", message: "Error al actualizar el estado de pago" });
    }
}

//! ==================================================================================================================================================

export const methodsMateriaPrima = {
    materiaPrimaGuardar,
    materiaPrimaObtener,
    materiaPrimaObtenerCompra,
    materiaPrimaEliminarCompra,
    materiaPrimaActualizarEstadoPago
}