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

//*                                          ------------ PRODUCCION --------------                                                                 *//

async function verificarStockIngredientes(receta) {
    const [ingredientes] = await pool.query(
        "SELECT id_materiaPrima, cantidad_necesaria FROM receta_materiaPrima WHERE id_receta = ?",
        [receta]
    );

    for (const ing of ingredientes) {
        const cantidadNecesaria = parseFloat(ing.cantidad_necesaria);

        const [stockResult] = await pool.query(
            "SELECT stock FROM materia_prima WHERE id_materiaPrima = ?",
            [ing.id_materiaPrima]
        );

        if (!stockResult.length) {
            throw new Error(`No se encontró stock para la materia prima ID ${ing.id_materiaPrima}`);
        }

        const stockActual = parseFloat(stockResult[0].stock);

        if (stockActual < cantidadNecesaria) {
            throw new Error(`Stock insuficiente de materia prima`);
        }

        return ingredientes
    }
}

async function verificarYDescontarDulceDeLeche(productos) {
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
    }
}

async function verificarYDescontarGlasee(productos) {
    const alfajores = productos.find(p => parseInt(p.idProducto) === 1);
    if (alfajores) {
        const docenasPorGlasee = 48;
        const glaseesNecesarios = Math.ceil(alfajores.cantidad / docenasPorGlasee);
        const idRecetaGlasee = 100;

        const [ingredientesGlasee] = await pool.query(
            "SELECT id_materiaPrima, cantidad_necesaria FROM receta_materiaPrima WHERE id_receta = ?",
            [idRecetaGlasee]
        );

        for (const ing of ingredientesGlasee) {
            const cantidadTotal = parseFloat(ing.cantidad_necesaria) * glaseesNecesarios;

            const [stockResult] = await pool.query(
                "SELECT stock FROM materia_prima WHERE id_materiaPrima = ?",
                [ing.id_materiaPrima]
            );

            if (!stockResult.length) {
                throw new Error(`No se encontró stock para la materia prima ID ${ing.id_materiaPrima} (glasee)`);
            }

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
}

async function insertarProduccionYDetalles(datos, productos) {
    const [produccionRes] = await pool.query(
        "INSERT INTO produccion (fecha, receta, lote) VALUES (?, ?, ?)",
        [datos.fecha, datos.receta, datos.lote]
    );

    const idProduccion = produccionRes.insertId;

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
}


export const agregarProduccion = async (datos, productos) => {
    try {
        const ingredientes = await verificarStockIngredientes(datos.receta);
        await verificarYDescontarDulceDeLeche(productos);
        await verificarYDescontarGlasee(productos);
        await insertarProduccionYDetalles(datos, productos);

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

export async function obtenerDetalleProduccion(id) {
    const [res] = await pool.query(`
        SELECT
            pr.id_produccion,
            dp.id_producto, 
            dp.cantidad, 
            pr.receta 
        FROM detalle_produccion dp 
        JOIN produccion pr ON pr.id_produccion = dp.id_produccion
        WHERE pr.id_produccion = ?`
    , [id]);
    return res;
}

export async function obtenerIngredientesPorReceta(idReceta) {
    const [res] = await pool.query(`
        SELECT 
            id_materiaPrima, 
            cantidad_necesaria 
        FROM receta_materiaPrima 
        WHERE id_receta = ?
    `, [idReceta] );
    return res;
}

export async function devolverStockMateriaPrima(ingredientes) {
    for (const ing of ingredientes) {
        await pool.query(`
            UPDATE materia_prima SET stock = stock + ?
            WHERE id_materiaPrima = ?`, [ing.cantidad_necesaria, ing.id_materiaPrima]);
    }
}

export async function devolverStockGlasee(cantidadDocenas) {
    const docenasPorGlasee = 48;
    const glaseesUsados = Math.ceil(cantidadDocenas / docenasPorGlasee);
    const idRecetaGlasee = 100;

    const ingredientesGlasee = await obtenerIngredientesPorReceta(idRecetaGlasee);

    for (const ing of ingredientesGlasee) {
        const cantidadTotal = parseFloat(ing.cantidad_necesaria) * glaseesUsados;
        await pool.query(`
            UPDATE materia_prima SET stock = stock + ?
            WHERE id_materiaPrima = ?`, [cantidadTotal, ing.id_materiaPrima]);
    }
}

export async function devolverDulceDeLeche(cantidadDocenas) {
    const gramosPorDocena = 260;
    const cantidad = (cantidadDocenas * gramosPorDocena) / 1000;

    await pool.query(`
        UPDATE materia_prima SET stock = stock + ?
        WHERE nombre = 'DULCE DE LECHE'`, [cantidad]);
}

export const eliminarProduccion = async (id) => {
    try {
        const detalle = await obtenerDetalleProduccion(id);
        if (!detalle.length) throw new Error("Producción no encontrada");

        const receta = detalle[0].receta;

        const ingredientes = await obtenerIngredientesPorReceta(receta);
        await devolverStockMateriaPrima(ingredientes);

        for (const prod of detalle) {
            if (prod.id_producto === 1) { // Alfajores
                await devolverDulceDeLeche(prod.cantidad);
                await devolverStockGlasee(prod.cantidad);
            }

            await pool.query(`
                UPDATE productos SET stock = stock - ?
                WHERE id_producto = ?`, [prod.cantidad, prod.id_producto]);
        }

        await pool.query(`
            DELETE FROM detalle_produccion WHERE id_produccion = ?`, [id]);
        await pool.query(`
            DELETE FROM produccion WHERE id_produccion = ?`, [id]);

        console.log("Producción eliminada correctamente");
        return true;
    } catch (error) {
        console.error("Error al eliminar la producción:", error);
        return false;
    }
};