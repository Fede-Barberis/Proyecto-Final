import {pool} from '../../../database/connectionMySQL.js';

//! ==================================================================================================================================================

//*                                          ------------ GRAFICOS --------------                                                                  *//

export const obtenerGraficoLinea = async () => {
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

        const [pedidos] = await pool.query(`
            SELECT MONTH(fecha_entrega) AS mes, COUNT(DISTINCT id_pedido) AS cantidad_pedidos
            FROM pedidos
            GROUP BY MONTH(fecha_entrega)
        `);

        return {ventas, produccion, pedidos}
    }
    catch(error){
        console.log(error);
        throw error; // Lanza el error para que pueda ser manejado por el llamador
    }
}

export const obtenerGraficoTorta = async () => {
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