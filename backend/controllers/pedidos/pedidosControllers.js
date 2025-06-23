import { agregarPedido, guardarDetallePedido, obtenerPedidos, obtenerPedidoPorId , obtenerCantidadPedidos, eliminarPedidos, actualizarEntregaPedido, obtenerEstadoPedidos, crearVentaDesdePedido, eliminarVentaYRestaurarStock  } from "../../models/pedidos/pedidosModels.js";
import { verificarStock } from "../../controllers/ventas/ventasControllers.js";

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
    
        return res.status(200).json({ status: "OK", message: "Pedido guardado correctamente", pedidoId});
    }
    catch(error){
        console.error("Error al guardar el pedido:", error);
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
            return res.status(404).json({ status: "Error", message: "No se pudo eliminar el pedido o no existe" });
        }

        return res.status(200).json({ status: "OK", message: "Pedido eliminado y stock actualizado" });
    } catch (error) {
        console.error("Error en eliminarPedidoController:", error);
        return res.status(500).json({ status: "Error", message: "Error del servidor" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const pedidoActualizarEstadoEntrega = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body; // recibimos true o false

        const detalles = await obtenerPedidoPorId(id);
        
        if (estado) {
            // VALIDACIÓN DE STOCK
            for (const item of detalles) {
                const { id_producto, cantidad } = item;
                const resultado = await verificarStock(id_producto, cantidad);

                if (!resultado.valido) return res.status(400).json({ status: "Error", message: `No es posible efectuar esta venta.\nStock insuficiente para el producto: ${item.producto}`});
            }

            const entregaActualizada = await actualizarEntregaPedido(id, estado);
            if (!entregaActualizada) {
                return res.status(404).json({ status: "Error", message: "No se encontró el pedido" });
            }

            // Si se entregó, crear ventas por cada producto
            await crearVentaDesdePedido(id, detalles);
        }
        else {
            // Estado pendiente: eliminar ventas y restaurar stock
            const entregaActualizada = await actualizarEntregaPedido(id, estado);
            if (!entregaActualizada) {
                return res.status(404).json({ status: "Error", message: "No se encontró el pedido" });
            }
            
            // Estado pendiente: eliminar ventas y restaurar stock
            await eliminarVentaYRestaurarStock(id);
        }

        return res.status(200).json({ status: "OK", message: "Estado de la entrega actualizado" });

    } catch (error) {
        console.error("Error en actualizarEstadoEntrega:", error);
        return res.status(400).json({ status: "Error", message: "Error al actualizar el estado de la entrega" });
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const pedidoObtenerEstadoPedidos = async (req, res) => {
    try {
        const data = await obtenerEstadoPedidos();
        res.json(data);
    } catch (error) {
        console.error("Error al obtener el estado de los pedidos:", error);
        res.status(500).json({ status: "Error", message: "Error al obtener estado de los pedidos" });
    }
};

//! ==================================================================================================================================================

export const methodsPedidos = {
    pedidoGuardar,
    pedidoObtener,
    pedidoObtenerCantidadPedidos,
    pedidoEliminar,
    pedidoActualizarEstadoEntrega,
    pedidoObtenerEstadoPedidos
}