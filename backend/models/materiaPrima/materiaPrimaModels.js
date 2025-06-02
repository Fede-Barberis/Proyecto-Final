import {pool} from '../../../database/connectionMySQL.js';

//! ==================================================================================================================================================

//*                                          ------------ MATERIA PRIMA --------------                                                              *//

export const agregarMateriaPrima = async (fecha, idProducto, cantidad, unidad, lote, vencimiento, precio, isPagado) => {
    try{
        await pool.query("INSERT INTO comprar_mp (fecha, id_materiaPrima, cantidad, unidad, lote, fch_vencimiento, precio, isPagado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [fecha, idProducto, cantidad, unidad, lote, vencimiento, precio, isPagado])
        console.log("Compra materia prima cargada");

        await pool.query(`
            UPDATE materia_prima
            SET stock = stock + ?
            WHERE id_materiaPrima = ?;
        `,[cantidad, idProducto])
    }
    catch(error){
        console.log(error);
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerMateriaPrimas = async () => {
    try {
        const [result] = await pool.query('SELECT * FROM materia_prima');
        return result;
    } catch (error) {
        console.log(error);
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerComprasMateriaPrima = async (filtroFecha, filtroProducto) => {
    try {
        let query = `
                SELECT cmp.id_compra, cmp.fecha, mp.nombre AS producto, cmp.cantidad, cmp.fch_vencimiento, cmp.precio, cmp.isPagado 
                FROM comprar_mp cmp 
                JOIN materia_prima mp 
                ON cmp.id_materiaPrima = mp.id_materiaPrima `

        let conditions = [];
        const params = [];

        if (filtroFecha === "hoy") {
            conditions.push("DATE(cmp.fecha) = CURDATE()");
        } else if (!isNaN(filtroFecha) && filtroFecha >= 1 && filtroFecha <= 12) {
            conditions.push("MONTH(cmp.fecha) = ?");
            params.push(filtroFecha);
        }

        if (filtroProducto !== "todos") {
            conditions.push("mp.nombre = ?");
            params.push(filtroProducto);
        }

        if (conditions.length > 0) {
            query += " WHERE " + conditions.join(" AND ");
        }

        query += "ORDER BY cmp.id_compra DESC"

        const [result] = await pool.query(query, params)
        return result
    } catch (error) {
        console.log(error);
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const eliminarCompraMp = async (id) => {
    try{
        const [rows] = await pool.query("SELECT id_materiaPrima, cantidad FROM comprar_mp WHERE id_compra = ?", [id]);
        
        if(rows.length === 0) {
            console.log("No se encontró la compra con el ID proporcionado.");
            return;
        }

        const {id_materiaPrima, cantidad } = rows[0];
        
        // 2. Restar la cantidad al stock total
        await pool.query("UPDATE materia_prima SET stock = stock - ? WHERE id_materiaPrima = ?", [cantidad, id_materiaPrima]);

        // 3. Eliminar la compra
        await pool.query("DELETE FROM comprar_mp WHERE id_compra = ?", [id]);
        console.log({ "mensaje": "Compra eliminada correctamente y stock actualizado", "id": id});

        return true;
    }
    catch(error){
        console.log("Error al eliminar la compra y actualizar el stock:", error);
        return false;
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const actualizarPagoMp = async (id, isPagado) => {
    try {
        const [result] = await pool.query("UPDATE comprar_mp SET isPagado = ? WHERE id_compra = ?", [isPagado, id]);
        console.log({ "mensaje": "Compra actualizada correctamente", "id": id});
        return result.affectedRows > 0;
    }
    catch(error){
        console.log(error);
        return false
    }
}