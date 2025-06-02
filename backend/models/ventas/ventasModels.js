import {pool} from '../../../database/connectionMySQL.js';

//! ==================================================================================================================================================

//*                                          ------------ VENTAS --------------                                                                    *// 

export const agregarVenta = async (fecha, idProducto, cantidad, precio, persona) => {
    try{
        const [result] = await pool.query("INSERT INTO ventas (fecha, id_producto, cantidad, precio, persona) VALUES (?, ?, ?, ?, ?)", [fecha, idProducto, cantidad, precio, persona])
        console.log("Venta realizada");

        await pool.query(`
            UPDATE productos 
            SET stock = stock - ? 
            WHERE id_producto = ?
        `, [cantidad, idProducto])
    }
    catch(error){
        console.log(error);
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerVentas = async (filtroFecha, filtroProducto) => {
    try {
        let query = `
                SELECT v.id_venta, v.fecha, p.nombre AS producto, v.cantidad, v.precio, v.persona 
                FROM ventas v 
                JOIN productos p 
                ON v.id_producto = p.id_producto `

        let conditions = [];
        let params = [];

        if (filtroFecha === "hoy") {
            conditions.push("DATE(v.fecha) = CURDATE()");
        } else if (!isNaN(filtroFecha) && filtroFecha >= 1 && filtroFecha <= 12) {
            conditions.push("MONTH(v.fecha) = ?");
            params.push(filtroFecha);
        }

        if (filtroProducto !== "todos") {
            conditions.push("p.nombre = ?");
            params.push(filtroProducto);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }


        query += "ORDER BY v.id_venta DESC"
    
        const [result] = await pool.query(query, params)
        return result
    } catch (error) {
        console.log(error);
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const eliminarVenta = async (id) => {
    try{
        const [rows] = await pool.query(`
            SELECT 
                id_venta, 
                id_producto, 
                cantidad 
            FROM ventas 
            WHERE id_venta = ?
        `, [id]);
        
        if(rows.length === 0) {
            console.log("No se encontró la venta con el ID proporcionado.");
            return false;
        }

        // 2. Sumar la cantidad al stock total del producto
        await pool.query(`
            UPDATE productos 
            SET stock = stock + ? 
            WHERE id_producto = ?
        `, [rows[0].cantidad, rows[0].id_producto])

        // 3. Eliminar la produccion
        await pool.query("DELETE FROM ventas WHERE id_venta = ?", [id]);
        console.log({ "mensaje": "Venta eliminada correctamente y stock actualizado", "id": id});

        return true;
    }
    catch(error){
        console.log("Error al eliminar la venta y actualizar el stock:", error);
        return false;
    }
}
