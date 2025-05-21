//! Define cómo interactuar con la base de datos

import {pool} from '../database/connectionMySQL.js';

//! ===================================================================================================================================================

//*                                          ------------ LOGIN Y REGISTRO --------------                                                          *// 

export const getUsersRegister = async (email) => {
    try {
        const [result] = await pool.query('SELECT usuario, contraseña, email FROM usuario_registrado WHERE email = ?', [email])
        return result[0];
    } catch (error) {
        console.log(error);
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const addUserRegister = async (user, password, email) => {
    try {
        const [result] = await pool.query("INSERT INTO usuario_registrado (usuario, contraseña, email) VALUES (?, ?, ?)", [user, password, email]);
        console.log("Usuario registrado");
    } catch (error) {
        console.error(error);
    }
}

//! ===================================================================================================================================================

//*                                          ------------ PRODUCTOS --------------                                                                 *// 

export const getProductos = async () => {
    try {
        const [result] = await pool.query('SELECT * FROM productos');
        return result;
    } catch (error) {
        console.log(error);
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const addProduction = async (datos, productos) => {
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

        // 3. Verificar si hay alfajores para descontar dulce de leche
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

export const getProduccion = async (filtroFecha, filtroProducto) => {
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

export const eliminarProduccionYActualizarStock = async (id) => {
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
        // const { cantidad, receta } = produccion;

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
        
        // 4. Devolver dulce de leche si hay alfajores
        const gramosPorDocena = 260
        for (const prod of detalleProduccion) {
            if (prod.id_producto === 1) { // Alfajores
                const cantidadDulceDeLeche = (prod.cantidad * gramosPorDocena) / 1000;
                await pool.query(`
                    UPDATE materia_prima 
                    SET stock = stock + ? 
                    WHERE nombre = 'DULCE DE LECHE'
                `, [cantidadDulceDeLeche]);
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

//! ==================================================================================================================================================

//*                                          ------------ VENTAS --------------                                                                    *// 

export const addSale = async (fecha, idProducto, cantidad, precio, persona) => {
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

export const getVentas = async (filtroFecha, filtroProducto) => {
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

export const eliminarVentaYActualizarStock = async (id) => {
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

//! ==================================================================================================================================================

//*                                          ------------ MATERIA PRIMA --------------                                                              *//

export const addMateriaPrima = async (fecha, idProducto, cantidad, unidad, lote, vencimiento, precio, isPagado) => {
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

export const getMp = async () => {
    try {
        const [result] = await pool.query('SELECT * FROM materia_prima');
        return result;
    } catch (error) {
        console.log(error);
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const getMateriaPrima = async (filtroFecha, filtroProducto) => {
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

export const eliminarCompraYActualizarStock = async (id) => {
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

//! ==================================================================================================================================================

//*                                          ------------ PEDIDOS --------------                                                                   *//

export const addPedido = async (fechaEntrega, personaPedido) => {
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

export const getPedidos = async (filtroFecha, filtroProducto) => {
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

export const getCantidadPedidos = async () => {
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

//! ==================================================================================================================================================

//*                                          ------------ EXTRAS --------------                                                                    *//


export const getTarjetas = async () => {
    try {
        const [result] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM ventas WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())) AS ventasMes,
                (SELECT SUM(precio * cantidad) FROM ventas WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())) AS ingresosMes,
                (SELECT COUNT(*) FROM ventas) AS totalVentas,
                (SELECT SUM(precio * cantidad) FROM ventas) AS ingresosTotales
        `);
        return result[0]
    } catch (error) {
        console.log(error);
    }
}

export const getTarjetasPdf = async () => {
    try {
        const [result] = await pool.query(`
            WITH
            ventas_mes AS (
                SELECT 
                    COUNT(*) AS ventasMes,
                    SUM(precio * cantidad) AS ingresosMes
                FROM ventas
                WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
            ),
            ventas_totales AS (
                SELECT 
                    COUNT(*) AS totalVentas,
                    SUM(precio * cantidad) AS ingresosTotales
                FROM ventas
            ),
            stock_mes AS (
                SELECT 
                    dp.id_producto,
                    SUM(dp.cantidad) AS cantidad
                FROM detalle_produccion dp
                JOIN produccion p ON dp.id_produccion = p.id_produccion
                WHERE MONTH(p.fecha) = MONTH(CURDATE()) AND YEAR(p.fecha) = YEAR(CURDATE())
                GROUP BY dp.id_producto
            ),
            ventas_productos AS (
                SELECT 
                    id_producto,
                    SUM(cantidad) AS cantidad
                FROM ventas
                WHERE MONTH(fecha) = MONTH(CURDATE()) AND YEAR(fecha) = YEAR(CURDATE())
                GROUP BY id_producto
            )
            SELECT
                vm.ventasMes,
                vm.ingresosMes,
                vt.totalVentas,
                vt.ingresosTotales,

                COALESCE(sm1.cantidad, 0) AS stockAlfajores,
                COALESCE(sm2.cantidad, 0) AS stockGalletasSS,
                COALESCE(sm3.cantidad, 0) AS stockGalletasCS,

                COALESCE(vp1.cantidad, 0) AS ventaAlfajores,
                COALESCE(vp2.cantidad, 0) AS ventaGalletasSS,
                COALESCE(vp3.cantidad, 0) AS ventaGalletasCS

            FROM ventas_mes vm
            JOIN ventas_totales vt
            LEFT JOIN stock_mes sm1 ON sm1.id_producto = 1
            LEFT JOIN stock_mes sm2 ON sm2.id_producto = 2
            LEFT JOIN stock_mes sm3 ON sm3.id_producto = 3
            LEFT JOIN ventas_productos vp1 ON vp1.id_producto = 1
            LEFT JOIN ventas_productos vp2 ON vp2.id_producto = 2
            LEFT JOIN ventas_productos vp3 ON vp3.id_producto = 3
        `);
        return result[0]
    } catch (error) {
        console.log(error);
    }
}

//! ==================================================================================================================================================

export const actualizarPago = async (id, isPagado) => {
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

export const actualizarEntrega = async (id, estado) => {
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


//! ==================================================================================================================================================

//*                                          ------------ GRAFICOS --------------                                                                  *//

export const getGraficos = async () => {
    try{
        const [ventas] = await pool.query(`
            SELECT MONTH(fecha) AS mes, COUNT(*) AS cantidad_ventas
            FROM ventas
            GROUP BY MONTH(fecha)
        `);
        const [produccion] = await pool.query(`
            SELECT MONTH(fecha) AS mes, COUNT(*) AS cantidad_produccion
            FROM produccion
            GROUP BY MONTH(fecha)
        `);

        return {ventas, produccion}
    }
    catch(error){
        console.log(error);
        throw error; // Lanza el error para que pueda ser manejado por el llamador
    }
}

export const getGraficoTorta = async () => {
    try{
        const [productos] = await pool.query(`
        SELECT 
            p.nombre AS producto, 
            SUM(dp.cantidad) AS cantidad
        FROM detalle_produccion dp
        JOIN produccion pr ON dp.id_produccion = pr.id_produccion
        JOIN productos p ON dp.id_producto = p.id_producto
        WHERE MONTH(pr.fecha) = MONTH(CURDATE()) AND YEAR(pr.fecha) = YEAR(CURDATE())
        GROUP BY p.nombre;
        `);
        
        return productos;
    }
    catch(error){
        console.log(error);
        throw error; // Lanza el error para que pueda ser manejado por el llamador
    }
}

export const getGraficoEmpleados = async () => {
    try{
        const [result] = await pool.query (`
            SELECT 
                e.id_empleado, 
                e.nombre, 
                de.cantHoras 
            FROM empleados e
            JOIN (
                SELECT de1.*
                FROM detalle_empleados de1
                JOIN (
                    SELECT id_empleado, MAX(fechaCobro) AS ultimaFecha
                    FROM detalle_empleados
                    GROUP BY id_empleado
                ) de2 ON de1.id_empleado = de2.id_empleado AND de1.fechaCobro = de2.ultimaFecha
            ) de ON e.id_empleado = de.id_empleado 
        `)
        return result
    }
    catch(error){
        console.log(error);
        throw error;
    }
}

//! ==================================================================================================================================================

//*                                          ------------ RECORDATORIOS --------------                                                            *//

export const getRecordatorios = async () => {
    try{
        const recordatorios = []; 
        
        const [productos] = await pool.query(`
            SELECT nombre AS producto, stock
            FROM productos
        `);

        const [mp] = await pool.query(`
            SELECT nombre AS materiaPrima, stock
            FROM materia_prima
        `);

        const [cmp] = await pool.query(`
            SELECT cmp.id_compra AS id, cmp.isPagado, cmp.fch_vencimiento, mp.nombre
            FROM comprar_mp cmp
            JOIN materia_prima mp ON cmp.id_materiaPrima = mp.id_materiaPrima
        `);

        const [pedidos] = await pool.query(`
            SELECT p.id_pedido, p.fecha_entrega AS fechaEntrega
            FROM pedidos p
        `);

        const [detallePedidos] = await pool.query(`
            SELECT dp.id_pedido, pr.nombre AS producto, SUM(dp.cantidad) AS cantidad, dp.estado
            FROM detalle_pedido dp
            JOIN productos pr ON dp.id_producto = pr.id_producto
            WHERE dp.estado = 0
            GROUP BY dp.id_pedido, pr.nombre
        `);
        

        // Crear mapas para acceso rápido
        const productosMap = new Map(productos.map(item => [item.producto, item.stock]));
        const materiaPrimaMap = new Map(mp.map(item => [item.materiaPrima, item.stock]));
        
        const pedidoProductosMap = new Map();
        for (const detalle of detallePedidos) {
            if (!pedidoProductosMap.has(detalle.id_pedido)) {
                pedidoProductosMap.set(detalle.id_pedido, []);
            }
            pedidoProductosMap.get(detalle.id_pedido).push({
                producto: detalle.producto,
                cantidad: detalle.cantidad,
                estado: detalle.estado
            });
        }

        const stockLimitesProductos = {
            "ALFAJORES": { bajo: 20 },
            "GALLETAS MARINAS S/S": { bajo: 10 },
            "GALLETAS MARINAS C/S": { bajo: 10 }
        };

        const stockLimitesMp = {
            "HARINA": { bajo: 22.750 },
            "HUEVOS": { bajo: 1.180 },
            "GRASA": { bajo: 4.550 },
            "DULCE DE LECHE": { bajo: 10 },
            "SAL": { bajo: 5 },
            "AZUCAR": { bajo: 10 },
        };

        // Validar stock bajo para productos y materia prima
        const checkStockBajo = (mapa, limites, tipo) => {
            for (const [nombre, stock] of mapa) {
                const limite = limites[nombre];
                if (limite && stock < limite.bajo) {
                    recordatorios.push(`${nombre}(${tipo}) con poco stock (${stock} unidades).`);
                } 
            }
        }
        checkStockBajo(productosMap, stockLimitesProductos, "producto");
        checkStockBajo(materiaPrimaMap, stockLimitesMp, "materia prima");

        // Validar compras de materia prima (pago y vencimiento)
        for(const compra of cmp){
            if (compra.isPagado === 0) {
                recordatorios.push(`La compra de materia prima con el ID: ${compra.id}, aun NO ha sido PAGADA.`);
            }
        
            const fechaActual = new Date();
            const diferenciaMs = new Date(compra.fch_vencimiento) - fechaActual
            const diferenciaDias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24)); // Convertir a días

            if(diferenciaDias >= 0 && diferenciaDias <= 5) {
                recordatorios.push(`La compra de materia prima con el ID: ${compra.id}, VENCE en (${diferenciaDias} días).`);
            }
            else if (diferenciaDias < 0) {
                recordatorios.push(`La materia prima con el ID: ${compra.id}, ha VENCIDO.`);
            }
        }
    
        // Validar pedidos (stock y entrega)
        for (const pedido of pedidos) {
            const productosPedido = pedidoProductosMap.get(pedido.id_pedido) || [];
    
            // Verifica si todos los productos ya fueron entregados (estado === 1)
            const todosEntregados = productosPedido.every(p => p.estado === 1);
            if (todosEntregados) continue; // si todos fueron entregados, salteamos

            const fechaActual = new Date();
            const fechaEntregaDate = new Date(pedido.fechaEntrega);
            const diferenciaMs = fechaEntregaDate - fechaActual;
            const diferenciaDias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24)); 
    
            if (diferenciaDias > 0) {
                recordatorios.push(`El pedido con el ID: ${pedido.id_pedido}, se ENTREGA en (${diferenciaDias} días).`);
            } else if (diferenciaDias < 0) {
                recordatorios.push(`El pedido con el ID: ${pedido.id_pedido}, NO fue ENTREGADO. Retraso de (${Math.abs(diferenciaDias)} días).`);
            } else {
                recordatorios.push(`El pedido con el ID: ${pedido.id_pedido}, debe ENTREGARSE hoy.`);
            }

            // Recordatorio por stock insuficiente
            for (const item of productosPedido) {
                const stockActual = productosMap.get(item.producto) || 0;
                if (stockActual < item.cantidad) {
                    recordatorios.push(`Stock de ${item.producto} insuficiente para completar el pedido ${pedido.id_pedido} (${item.cantidad}).`);
                }
            }
        }
        
        return recordatorios.length > 0 ? recordatorios : ["No hay recordatorios"];
    }
    catch(error){
        console.log("Error al obtener los recordatorios:", error);
        throw error; // Lanza el error para que pueda ser manejado por el llamador
    }
}

export const getDatosMesPasado = async () => {
    try {
        const [result] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM ventas 
                WHERE MONTH(fecha) = IF(MONTH(CURDATE()) = 1, 12, MONTH(CURDATE()) - 1) 
                AND YEAR(fecha) = IF(MONTH(CURDATE()) = 1, YEAR(CURDATE()) - 1, YEAR(CURDATE()))) AS ventasMesPasado,
                (SELECT SUM(precio * cantidad) FROM ventas 
                WHERE MONTH(fecha) = IF(MONTH(CURDATE()) = 1, 12, MONTH(CURDATE()) - 1) 
                AND YEAR(fecha) = IF(MONTH(CURDATE()) = 1, YEAR(CURDATE()) - 1, YEAR(CURDATE()))) AS ingresosMesPasado
        `);
        return result[0];
    } catch (error) {
        console.error("Error al obtener los datos del mes pasado:", error);
        throw error;
    }
};

//! ==================================================================================================================================================

export const getNombreUser = async() => {
    try{
        const [result] = await pool.query(`
            SELECT usuario
            FROM usuario_registrado LIMIT 1
        `)

        return result[0];
    }
    catch(error){
        console.log(error);
    }
}

//! ==================================================================================================================================================

export const getEmpleados = async () => {
    try{
        const [result] = await pool.query (`
            SELECT id_empleado, nombre, apellido 
            FROM empleados
        `)
        return result
    }
    catch(error){
        console.log(error);
        throw error;
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const addEmpleados = async (empleado) => {
    try {
        const [result] = await pool.query(`
            INSERT INTO empleados (nombre, apellido) VALUES (?, ?)`, [empleado.nombre, empleado.apellido]
        );

        console.log("Empleado agregado correctamente:", result.insertId);
        return result.insertId

    } catch (error) {
        console.error("Error en addEmpleado:", error);
        throw error; // dejamos que el controller lo capture
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const eliminarEmpleados = async (id) => {
    try{
        const [rows] = await pool.query("SELECT id_empleado FROM empleados WHERE id_empleado = ?", [id]);
        
        if(rows.length === 0) {
            console.log("No se encontró el empleado con el ID proporcionado.");
            return;
        }
        
        // 2. Restar tabla detalles y empleado
        await pool.query("DELETE FROM detalle_empleados WHERE id_empleado = ?", [id]);
        await pool.query("DELETE FROM empleados WHERE id_empleado = ?", [id]);
        console.log({ "mensaje": "Empleado eliminado correctamente", id});

        return true;
    }
    catch(error){
        console.log("Error al eliminar al empleado:", error);
        return false;
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const addDetalle = async (detalle) => {
    try {
        const [result] = await pool.query(`
            INSERT INTO detalle_empleados (id_empleado, precioHora, cantHoras, fechaCobro) 
            VALUES (?, ?, ?, ?)
            `, [detalle.id_empleado, detalle.precioHora, detalle.cantHoras, detalle.fechaCobro]
        );

        console.log("Detalle agregado correctamente:", result.insertId);
        return result.insertId

    } catch (error) {
        console.error("Error en addDetalle:", error);
        throw error; // dejamos que el controller lo capture
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const eliminarDetalleEmpleados = async (id) => {
    try{
        const [rows] = await pool.query("SELECT * FROM detalle_empleados WHERE id_detalle = ?", [id]);
        
        if(rows.length === 0) {
            console.log("No se encontró el detalle del empleado con el ID proporcionado.");
            return false;
        }
        
        // eliminar el detalle
        await pool.query("DELETE FROM detalle_empleados WHERE id_detalle = ?", [id]);
        console.log({ "mensaje": "Detalle eliminado correctamente", id});

        return true;
    }
    catch(error){
        console.log("Error al eliminar al empleado:", error);
        return false;
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const getDetalleEmpleados = async (id) => {
    try{
        const [result] = await pool.query(`
            SELECT 
                ROW_NUMBER() OVER (PARTITION BY de.id_empleado ORDER BY de.id_empleado) AS nro_detalle,
                de.id_detalle, 
                de.id_empleado,
                e.nombre, 
                de.precioHora, 
                de.cantHoras, 
                de.fechaCobro
            FROM detalle_empleados de
            JOIN empleados e ON de.id_empleado = e.id_empleado
            WHERE de.id_empleado = ?
            ORDER BY nro_detalle DESC
        `, [id]);
        return result;
    }
    catch(error){
        console.log(error);
        throw error;
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

