import {pool} from '../../../database/connectionMySQL.js';

//! ===================================================================================================================================================

//*                                          ------------ PRODUCTOS --------------                                                                 *// 

export const obtenerProductos = async () => {
    try {
        const [result] = await pool.query('SELECT * FROM productos');
        return result;
    } catch (error) {
        console.log(error);
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const agregarProduccion = async (datos, productos) => {
    try {
        // 1. Obtener los ingredientes de la receta
        const [ingredientes] = await pool.query(
            "SELECT id_materiaPrima, cantidad_necesaria FROM receta_materiaPrima WHERE id_receta = ?",
            [datos.receta]
        );

        for (const ing of ingredientes) {
            const cantidadNecesaria = parseFloat(ing.cantidad_necesaria);

            const [stockResult] = await pool.query(
                "SELECT stock FROM materia_prima WHERE id_materiaPrima = ?", [ing.id_materiaPrima]
            );

            if (!stockResult.length) throw new Error(`No se encontró stock para la materia prima ID ${ing.id_materiaPrima}`);
        
            const stockActual = parseFloat(stockResult[0].stock)

            if (stockActual < cantidadNecesaria) throw new Error(`Stock insuficiente de materia prima`);
        }

        // 3. Verificar si hay alfajores para descontar dulce de leche y glasee
        const alfajores = productos.find(p => parseInt(p.idProducto) === 1);
        if (alfajores) {
            const gramosPorDocena = 260;
            const cantidadDulceDeLeche = (alfajores.cantidad * gramosPorDocena) / 1000;

            const [dulceDeLecheRes] = await pool.query(
                "SELECT stock FROM materia_prima WHERE nombre = 'DULCE DE LECHE'"
            );

            const stockDulce = parseFloat(dulceDeLecheRes[0]?.stock || 0);

            if (stockDulce < cantidadDulceDeLeche) {
                throw new Error(`Stock insuficiente de dulce de leche. Necesita ${cantidadDulceDeLeche}, hay ${stockDulce}`);
            }

            // Descontar dulce de leche
            await pool.query(
                "UPDATE materia_prima SET stock = stock - ? WHERE nombre = 'DULCE DE LECHE'",
                [cantidadDulceDeLeche]
            );


            // Descontar glasee
            const docenasPorGlasee = 48;
            const glaseesNecesarios = Math.ceil(alfajores.cantidad / docenasPorGlasee);

            const idRecetaGlasee = 100;

            // Obtener ingredientes del glasee
            const [ingredientesGlasee] = await pool.query(`
                SELECT id_materiaPrima, cantidad_necesaria FROM receta_materiaPrima WHERE id_receta = ?`,
                [idRecetaGlasee]
            );

            for (const ing of ingredientesGlasee) {
                const cantidadTotal = parseFloat(ing.cantidad_necesaria) * glaseesNecesarios;

                const [stockResult] = await pool.query(`
                    SELECT stock FROM materia_prima WHERE id_materiaPrima = ?`, 
                    [ing.id_materiaPrima]
                );

                if (!stockResult.length) throw new Error(`No se encontró stock para la materia prima ID ${ing.id_materiaPrima} (glasee)`);

                const stockActual = parseFloat(stockResult[0].stock);

                if (stockActual < cantidadTotal) {
                    throw new Error(`Stock insuficiente de materia prima (glasee). Necesita ${cantidadTotal}, hay ${stockActual}`);
                }

                // Descontar del stock
                await pool.query(
                    "UPDATE materia_prima SET stock = stock - ? WHERE id_materiaPrima = ?",
                    [cantidadTotal, ing.id_materiaPrima]
                );
            }
        }

        // 4. Insertar en tabla produccion (una sola vez)
        const [produccionRes] = await pool.query(
            "INSERT INTO produccion (fecha, receta, lote) VALUES (?, ?, ?)",
            [datos.fecha, datos.receta, datos.lote]
        );

        const idProduccion = produccionRes.insertId;

        // 5. Insertar detalle de produccion (todos los productos)
        for (const prod of productos) {
            await pool.query(
                "INSERT INTO detalle_produccion (id_produccion, id_producto, cantidad, fch_vencimiento) VALUES (?, ?, ?, ?)",
                [idProduccion, prod.idProducto, prod.cantidad, prod.vencimiento]
            );

            await pool.query(
                "UPDATE productos SET stock = stock + ? WHERE id_producto = ?",
                [prod.cantidad, prod.idProducto]
            );
        }

        // 6. Descontar ingredientes (una sola vez)
        for (const ing of ingredientes) {
            await pool.query(
                "UPDATE materia_prima SET stock = stock - ? WHERE id_materiaPrima = ?",
                [ing.cantidad_necesaria, ing.id_materiaPrima]
            );
        }

        console.log("Producción cargada correctamente");
    } catch (error) {
        console.error("Error al cargar la producción:", error);
        throw error;
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerProduccion = async (filtroFecha, filtroProducto) => {
    try {
        let query = `
            SELECT 
                pr.id_produccion,
                pr.fecha,
                p.nombre AS producto,
                r.cantidad AS receta,
                dp.cantidad,
                pr.lote,
                dp.fch_vencimiento
            FROM produccion pr
            JOIN detalle_produccion dp ON pr.id_produccion = dp.id_produccion
            JOIN productos p ON dp.id_producto = p.id_producto
            JOIN receta r ON pr.receta = r.id_receta
        `

        let conditions = [];
        let params = [];

        if (filtroFecha === "hoy") {
            conditions.push("DATE(pr.fecha) = CURDATE()");
        } else if (!isNaN(filtroFecha) && filtroFecha >= 1 && filtroFecha <= 12) {
            conditions.push(`MONTH(pr.fecha) = ?`);
            params.push(filtroFecha);
        }

        if (filtroProducto !== "todos") {
            conditions.push(`p.nombre = ?`);
            params.push(filtroProducto);
        }

        if (conditions.length > 0) {
            query += "WHERE " + conditions.join(" AND ");
        }

        query += "ORDER BY pr.id_produccion DESC"
    
        const [result] = await pool.query(query, params)
        return result
    } catch (error) {
        console.log(error);
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const eliminarProduccion = async (id) => {
    try{
        const [detalleProduccion] = await pool.query(`
            SELECT
                pr.id_produccion,
                dp.id_producto, 
                dp.cantidad, 
                pr.receta 
            FROM detalle_produccion dp 
            JOIN produccion pr ON pr.id_produccion = dp.id_produccion
            WHERE pr.id_produccion = ?`
        , [id]);
        
        if(!detalleProduccion.length) throw new Error("Producción no encontrada");

        const receta = detalleProduccion[0].receta;

        // 2. Buscar ingredientes de la receta
        const [ingredientes] = await pool.query(`
            SELECT 
                id_materiaPrima, 
                cantidad_necesaria 
            FROM receta_materiaPrima 
            WHERE id_receta = ?
        `, [receta] );

        // 3. Devolver ingredientes al stock (receta fija)
        for (const ing of ingredientes) {
            await pool.query(`
                UPDATE materia_prima 
                SET stock = stock + ? 
                WHERE id_materiaPrima = ?
            `, [ing.cantidad_necesaria, ing.id_materiaPrima]);
        }
        
        // 4. Devolver dulce de leche y ingredientes glasee si hay alfajores
        const gramosPorDocena = 260
        for (const prod of detalleProduccion) {
            if (prod.id_producto === 1) { // Alfajores
                const cantidadDulceDeLeche = (prod.cantidad * gramosPorDocena) / 1000;
                await pool.query(`
                    UPDATE materia_prima 
                    SET stock = stock + ? 
                    WHERE nombre = 'DULCE DE LECHE'
                `, [cantidadDulceDeLeche]);

                // Devolver glasee
                const docenasPorGlasee = 48;
                const glaseesUsados = Math.ceil(prod.cantidad / docenasPorGlasee);
                const idRecetaGlasee = 100;

                const [ingredientesGlasee] = await pool.query(
                    "SELECT id_materiaPrima, cantidad_necesaria FROM receta_materiaPrima WHERE id_receta = ?",
                    [idRecetaGlasee]
                );

                for (const ing of ingredientesGlasee) {
                    const cantidadTotal = parseFloat(ing.cantidad_necesaria) * glaseesUsados;

                    await pool.query(
                    `UPDATE materia_prima SET stock = stock + ? WHERE id_materiaPrima = ?`,
                    [cantidadTotal, ing.id_materiaPrima]
                    );
                }
            }
    
            // 5. Restar la cantidad al stock total del producto
            await pool.query(`
                UPDATE productos 
                SET stock = stock - ? 
                WHERE id_producto = ?
            `, [prod.cantidad, prod.id_producto]);
        }

        // 6. Eliminar el detalle de la produccion
        await pool.query(`
            DELETE FROM detalle_produccion 
            WHERE id_produccion = ?
        `, [id]);

        // 7. eliminar producción
        await pool.query(`
            DELETE FROM produccion 
            WHERE id_produccion = ?
        `, [id]);

        console.log({ "mensaje": "Produccion eliminada correctamente y stock actualizado", "id": id});
        return true;
    }
    catch(error){
        console.log("Error al eliminar la produccion y actualizar el stock:", error);
        return false;
    }
}