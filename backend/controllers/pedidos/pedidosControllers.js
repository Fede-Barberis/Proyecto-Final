import { agregarPedido, guardarDetallePedido, obtenerPedidos, obtenerCantidadPedidos, eliminarPedidos, actualizarEntregaPedido, obtenerEstadoPedidos  } from "../../models/pedidos/pedidosModels.js";

//! ==================================================================================================================================================

//*                                            -------- PEDIDOS --------                                                                         *//  

export const pedidoGuardar = async (req, res) => {
    try {
        const { fechaEntrega, personaPedido, productos } = req.body;

        // Validación segura
        if (!fechaEntrega || !personaPedido || !productos ||!Array.isArray(productos)) {
            return res.status(400).json({ status: "Error", message: 'Campos incompletos' });
        }
    
        if (fechaEntrega) {
            const hoy = new Date();

            if(fechaEntrega < hoy){
                return res.status(400).json({ status: "Error", message: "La fecha de entrega no puede ser anterior a hoy" });
            }
        }

        if(productos.length === 0){
            return res.status(400).json({ status: "Error", message: "Debe agregar al menos un producto." });
        }

        if(productos.precio < 0){
            return res.status(400).json({ status: "Error", message: "El precio debe ser mayor a 0" });

        }
    
        const pedidoId = await agregarPedido(fechaEntrega, personaPedido, productos);
        await guardarDetallePedido(pedidoId, productos);
    
        return res.status(201).json({ status: "Success", message: "Pedido guardado correctamente", pedidoId});
    }
    catch(error){
        // Captura cualquier error inesperado (ej: error en DB)
        console.error("ERROR REAL:", error); 
        res.status(500).json({ status: "Error", message: "Error al guardar el pedido" });
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const pedidoObtener = async (req, res) => {
    try {
        const { filtroFecha, filtroProducto } = req.query; // Obtener filtro desde la URL
        const pedidos = await obtenerPedidos(filtroFecha, filtroProducto)
        res.json(pedidos)
    } catch (error) {
        res.status(500).json({ status: "Error", message: "Error al obtener pedidos" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const pedidoObtenerCantidadPedidos = async (req, res) => {
    try {
        const pedidos = await obtenerCantidadPedidos();
        res.json(pedidos)
    } catch (error) {
        res.status(500).json({ status: "Error", message: "Error al obtener la cantidad de pedidos" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const pedidoEliminar = async (req, res) => {
    try {
        const { id } = req.params;
        const exito = await eliminarPedidos(id);

        if (!exito) {
            return res.status(404).json({ error: "No se pudo eliminar el pedido o no existe" });
        }

        return res.status(200).json({ mensaje: "Pedido eliminado y stock actualizado" });
    } catch (error) {
        console.error("Error en eliminarPedidoController:", error);
        return res.status(500).json({ error: "Error del servidor" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const pedidoActualizarEstadoEntrega = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body; // recibimos true o false

        const entregaActualizada = await actualizarEntregaPedido(id, estado);
        
        if (!entregaActualizada) {
            return res.status(404).json({ error: "No se encontró el pedido" });
        }
    
        return res.status(200).json({ success: true, message: "Estado de la entrega actualizado" });

    } catch (error) {
        console.error("Error en actualizarEstadoEntrega:", error);
        return res.status(400).json({ error: "Error al actualizar el estado de la entrega" });
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const pedidoObtenerEstadoPedidos = async (req, res) => {
    try {
        const data = await obtenerEstadoPedidos();
        res.json(data);
    } catch (error) {
        console.error("Error al obtener el estado de los pedidos:", error);
        res.status(500).json({ message: "Error al obtener estado de los peedidos" });
    }
};



export const methodsPedidos = {
    pedidoGuardar,
    pedidoObtener,
    pedidoObtenerCantidadPedidos,
    pedidoEliminar,
    pedidoActualizarEstadoEntrega,
    pedidoObtenerEstadoPedidos
}