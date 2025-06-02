import {pool} from '../../../database/connectionMySQL.js';

//! ==================================================================================================================================================

//*                                          ------------ PEDIDOS --------------                                                                   *//

export const agregarPedido = async (fechaEntrega, personaPedido) => {
    try {
        const [result] = await pool.query(`
            INSERT INTO pedidos (fecha_entrega, persona) VALUES (?, ?)`, [fechaEntrega, personaPedido]
        );

        console.log("Pedido registrado:", result.insertId);
        return result.insertId

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
            console.log("No se encontró el pedido con el ID proporcionado.");
            return;
        }
        
        // 2. Restar la cantidad al stock total
        await pool.query("DELETE FROM detalle_pedido WHERE id_pedido = ?", [id]);
        await pool.query("DELETE FROM pedidos WHERE id_pedido = ?", [id]);
        console.log({ "mensaje": "Pedido eliminada correctamente y stock actualizado", "id": id});

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
        console.log({ "mensaje": "Pedido actualizada correctamente", "id": id});
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
            SUM(CASE WHEN dp.estado = 1 THEN 1 ELSE 0 END) AS entregados,
            SUM(CASE WHEN dp.estado = 0 THEN 1 ELSE 0 END) AS pendientes
        FROM pedidos p
        JOIN detalle_pedido dp ON p.id_pedido = dp.id_pedido
        WHERE MONTH(p.fecha_entrega) = MONTH(CURDATE()) AND YEAR(p.fecha_entrega) = YEAR(CURDATE())
    `);
    return result[0]; 
};
