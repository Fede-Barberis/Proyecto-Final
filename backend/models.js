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

export const addProduction = async (fecha, idProducto, receta, cantidad, lote, vencimiento) => {
    try{
        // 1. Obtener los ingredientes de la receta
        const [ingredientes] = await pool.query("SELECT id_materiaPrima, cantidad_necesaria FROM receta_materiaPrima WHERE id_receta = ?", [receta]);
        
        console.log(ingredientes);

        // 2. Verificar si hay stock suficiente para cada ingrediente
        for (const ing of ingredientes) {
            const cantidadNecesaria = parseFloat(ing.cantidad_necesaria);

            const [stockResult] = await pool.query(
                "SELECT stock FROM materia_prima WHERE id_materiaPrima = ?", [ing.id_materiaPrima]
            );

            if (!stockResult.length) {
                throw new Error(`No se encontró stock para la materia prima ID ${ing.id_materiaPrima}`);
            }

            const stockActual = parseFloat(stockResult[0].stock)

            if (stockActual < cantidadNecesaria) {
                throw new Error(`Stock insuficiente de materia prima`);
            }
        }
    
        const gramosPorDocena = 260
        const cantidadDulceDeLeche = cantidad * gramosPorDocena / 1000 // Convertir a kg
        
        const [dulceDeLeche] = await pool.query("SELECT * FROM materia_prima WHERE nombre = ?", ['DULCE DE LECHE']);
        const dulce = parseFloat(dulceDeLeche[0].stock);
        
        if(!dulce || dulce < cantidadDulceDeLeche) {
            throw new Error(`Stock insuficiente de dulce de leche. Necesita ${cantidadDulceDeLeche}, hay ${dulce.stock}`);
        }
        
        if(idProducto === 1){
        await pool.query("UPDATE materia_prima SET stock = stock - ? WHERE nombre = 'DULCE DE LECHE' ", [cantidadDulceDeLeche]);
        }
        
        const [result] = await pool.query("INSERT INTO produccion (fecha, id_producto, receta, cantidad, lote, fch_vencimiento) VALUES (?, ?, ?, ?, ?, ?)", [fecha, idProducto, receta, cantidad, lote, vencimiento])
        
        for(const ing of ingredientes){
            await pool.query("UPDATE materia_prima SET stock = stock - ? WHERE id_materiaPrima = ?", [ing.cantidad_necesaria, ing.id_materiaPrima]);
        }
        
        console.log("Produccion cargada");
    }
    catch(error){
        console.log("Error al cargar la producción:", error);
        throw error; // Lanza el error para que pueda ser manejado por el llamador
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
                    pr.cantidad, 
                    pr.lote, 
                    pr.fch_vencimiento 
                FROM produccion pr 
                JOIN productos p ON pr.id_producto = p.id_producto
                JOIN receta r ON pr.receta = r.id_receta `

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
        const [producciones] = await pool.query("SELECT id_produccion, id_producto, cantidad, receta FROM produccion WHERE id_produccion = ?", [id]);
        
        if(!producciones.length) {
            throw new Error("Producción no encontrada");
        }

        const produccion = producciones[0];
        const { cantidad, receta } = produccion;

        // 2. Buscar ingredientes de la receta
        const [ingredientes] = await pool.query("SELECT id_materiaPrima, cantidad_necesaria FROM receta_materiaPrima WHERE id_receta = ?", [receta] );

        // 3. Devolver ingredientes al stock (receta fija)
        for (const ing of ingredientes) {
            await pool.query( "UPDATE materia_prima SET stock = stock + ? WHERE id_materiaPrima = ?", [ing.cantidad_necesaria, ing.id_materiaPrima]);
        }
        
        const gramosPorDocena = 260
        const cantidadDulceDeLeche = (cantidad * gramosPorDocena) / 1000 // Convertir a kg
        
        if(produccion.id_producto === 1){
            await pool.query("UPDATE materia_prima SET stock = stock + ? WHERE nombre = 'DULCE DE LECHE' ", [cantidadDulceDeLeche]);
        }

        // 5. Restar la cantidad al stock total del producto
        await pool.query("UPDATE productos SET stock = stock - ? WHERE id_producto = ?", [producciones[0].cantidad, producciones[0].id_producto])

        // 6. Eliminar la produccion
        await pool.query("DELETE FROM produccion WHERE id_produccion = ?", [id]);
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
            conditions.push("DATE(v.fecha_entrega) = CURDATE()");
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
        const [rows] = await pool.query("SELECT id_venta, id_producto, cantidad FROM ventas WHERE id_venta = ?", [id]);
        
        if(rows.length === 0) {
            console.log("No se encontró la venta con el ID proporcionado.");
            return false;
        }

        // 2. Sumar la cantidad al stock total del producto
        await pool.query("UPDATE productos SET stock = stock + ? WHERE id_producto = ?", [rows[0].cantidad, rows[0].id_producto])

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
        const [result] = await pool.query("INSERT INTO comprar_mp (fecha, id_materiaPrima, cantidad, unidad, lote, fch_vencimiento, precio, isPagado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [fecha, idProducto, cantidad, unidad, lote, vencimiento, precio, isPagado])
        console.log("Compra materia prima cargada");
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
                SELECT cmp.id_compra, cmp.fecha, mp.nombre AS producto, cmp.cantidad, cmp.lote, cmp.precio, cmp.isPagado 
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
        
        console.log("pedidos devueltos");
        return result
    }
    catch(error){
        console.log(error);
    }
}

//! ==================================================================================================================================================

//*                                          ------------ EXTRAS --------------                                                                    *//


export const getTarjetas = async () => {
    try {
        const [result] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM ventas WHERE DATE(fecha) = CURDATE()) AS ventasHoy,
                (SELECT SUM(precio * cantidad) FROM ventas WHERE DATE(fecha) = CURDATE()) AS ingresosHoy,
                (SELECT COUNT(*) FROM ventas) AS totalVentas,
                (SELECT SUM(precio * cantidad) FROM ventas) AS ingresosTotales
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