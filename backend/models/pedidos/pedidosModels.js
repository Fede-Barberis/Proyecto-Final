import {pool} from '../../../database/connectionMySQL.js';

//! ==================================================================================================================================================

//*                                          ------------ PEDIDOS --------------                                                                   *//

export const agregarPedido = async (fechaEntrega, personaPedido) => {
    try {
        const [result] = await pool.query(`
            INSERT INTO pedidos (fecha_entrega, persona) VALUES (?, ?)`, [fechaEntrega, personaPedido]
        );

        console.log({ "Mensaje": "Pedido registrado correctamente", "Id": result.insertId });
        return result.insertId;

    } catch (error) {
        console.error("Error en addPedido:", error);
        throw error; // dejamos que el controller lo capture
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

// Guardar los productos del pedido en detalle_pedido
export const guardarDetallePedido = async (pedidoId, productos) => {
    try {
        for (const producto of productos) {
            await pool.query(
            'INSERT INTO detalle_pedido (id_pedido, id_producto, cantidad, precio) VALUES (?, ?, ?, ?)',
            [pedidoId, producto.nombre, producto.cantidad, producto.precio]
            );
        }
    } catch (error) {
        console.error("Error en guardarDetallePedido:", error);
        throw error;
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerPedidos = async (filtroFecha, filtroProducto) => {
    try {
        let query = `
            SELECT 
                p.id_pedido, 
                p.fecha_entrega, 
                p.persona, 
                pr.nombre AS producto, 
                dp.cantidad, 
                dp.precio, 
                dp.estado 
            FROM pedidos p 
            JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
            JOIN productos pr ON dp.id_producto = pr.id_producto
        `;

        const conditions = [];
        const params = [];

        if (filtroFecha === "hoy") {
            conditions.push("DATE(p.fecha_entrega) = CURDATE()");
        } else if (!isNaN(filtroFecha) && filtroFecha >= 1 && filtroFecha <= 12) {
            conditions.push("MONTH(p.fecha_entrega) = ?");
            params.push(filtroFecha);
        }

        if (filtroProducto !== "todos") {
            conditions.push("pr.nombre = ?");
            params.push(filtroProducto);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += " ORDER BY p.id_pedido DESC";

        const [result] = await pool.query(query, params);
        return result;
    } catch (error) {
        console.log(error);
    }
};

export const obtenerPedidoPorId = async (id) => {
    try {
        const [result] = await pool.query(`
            SELECT 
                p.id_pedido, 
                p.fecha_entrega, 
                p.persona, 
                dp.id_producto,
                pr.nombre AS producto, 
                dp.cantidad, 
                dp.precio, 
                dp.estado 
            FROM pedidos p 
            JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
            JOIN productos pr ON dp.id_producto = pr.id_producto
            WHERE p.id_pedido = ?
        `, [id]);

        if (result.length === 0) {
            console.log("No se encontró el pedido con el ID proporcionado.");
            return null;
        }

        return result;
    }
    catch(error) {
        console.log(error);
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerCantidadPedidos = async () => {
    try{
        const [result] = await pool.query(`
            SELECT pr.nombre, SUM(dp.cantidad) AS cantidad
            FROM pedidos p
            JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
            JOIN productos pr ON pr.id_producto = dp.id_producto
            WHERE dp.estado = 'pendiente'
            GROUP BY pr.nombre`
        );
        return result
    }
    catch(error){
        console.log(error);
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const eliminarPedidos = async (id) => {
    try{
        const [rows] = await pool.query("SELECT id_pedido, cantidad FROM detalle_pedido WHERE id_pedido = ?", [id]);
        
        if(rows.length === 0) {
            console.log({ "Mensaje": "No se encontró el pedido con el ID proporcionado." });
            return;
        }
        
        // 2. Restar la cantidad al stock total
        await pool.query("DELETE FROM detalle_pedido WHERE id_pedido = ?", [id]);
        await pool.query("DELETE FROM pedidos WHERE id_pedido = ?", [id]);
        console.log({ "Mensaje": "Pedido eliminada correctamente y stock actualizado", "Id": id });

        return true;
    }
    catch(error){
        console.log("Error al eliminar la compra y actualizar el stock:", error);
        return false;
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const actualizarEntregaPedido = async (id, estado) => {
    try {
        const [result] = await pool.query("UPDATE detalle_pedido SET estado = ? WHERE id_pedido = ?", [estado, id]);
        console.log({ "Mensaje": "Estado del pedido actualizado correctamente", "Id": id});
        return result.affectedRows > 0;
    }
    catch(error){
        console.log(error);
        return false
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerEstadoPedidos = async () => {
    const [result] = await pool.query(`
        SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN estado_global = 'Entregado' THEN 1 ELSE 0 END) AS entregados,
            SUM(CASE WHEN estado_global = 'Pendiente' THEN 1 ELSE 0 END) AS pendientes
        FROM (
            SELECT 
                p.id_pedido,
                CASE 
                    WHEN MIN(dp.estado) = 1 THEN 'Entregado'
                    ELSE 'Pendiente'
                END AS estado_global
            FROM pedidos p
            JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
            WHERE MONTH(p.fecha_entrega) = MONTH(CURDATE()) 
            AND YEAR(p.fecha_entrega) = YEAR(CURDATE())
            GROUP BY p.id_pedido
        ) AS resumen;
    `);
    return result[0]; 
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export async function crearVentaDesdePedido(id_pedido, detalles) {
    try {
        const fecha = new Date();

        for (const item of detalles) {
            const { id_producto, cantidad, precio, persona } = item;

            await pool.query(`
                INSERT INTO ventas (fecha, id_producto, cantidad, precio, persona, id_pedido)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [fecha, id_producto, cantidad, precio, persona, id_pedido]);

            // 2. Actualizar stock (restar)
            await pool.query(`
                UPDATE productos
                SET stock = stock - ?
                WHERE id_producto = ?
            `, [cantidad, id_producto]);
        }

        console.log({ "Mensaje": "Venta creada desde el pedido", "Id": detalles[0].id_pedido });
    } catch (error) {
        console.error("Error al crear la venta desde el pedido:", error);
        throw error;
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export async function eliminarVentaYRestaurarStock(pedidoId) {
    try {
        const [ventas] = await pool.query(`
            SELECT id_producto, cantidad 
            FROM ventas
            WHERE id_pedido = ?
        `, [pedidoId]);

        for (const venta of ventas) {
            const { id_producto, cantidad } = venta;

            await pool.query(`
                UPDATE productos
                SET stock = stock + ?
                WHERE id_producto = ?
            `, [cantidad, id_producto]);
        }

        await pool.query(`
            DELETE FROM ventas WHERE id_pedido = ?
        `, [pedidoId]);

        console.log({ "Mensaje": "Venta eliminada y stock restaurado para el pedido", "Id": pedidoId });
    } catch (error) {
        console.error("Error al eliminar ventas y restaurar stock:", error);
        throw error;
    }
}