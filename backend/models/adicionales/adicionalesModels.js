//! Define cómo interactuar con la base de datos

import {pool} from '../../../database/connectionMySQL.js';

//! ==================================================================================================================================================

//*                                          ------------ EXTRAS --------------                                                                    *//

export const obtenerTarjetasAdmin = async () => {
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

export const obtenerTarjetasAdminPdf = async () => {
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


export const obtenerTarjetasMesPasado = async () => {
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

//*                                          ------------ RECORDATORIOS --------------                                                            *//

const checkStockBajo = (mapa, limites, tipo, recordatorios) => {
    for (const [nombre, stock] of mapa) {
        const limite = limites[nombre];
        if (limite && stock < limite.bajo) {
            recordatorios.push(`${nombre} (${tipo}) con poco stock (${stock} unidades).`);
        } 
    }
};

const checkComprasMateriaPrima = (cmp, recordatorios) => {
    const fechaActual = new Date();
    for(const compra of cmp){
        if (compra.isPagado === 0) {
            recordatorios.push(`La compra de materia prima con el ID: ${compra.id}, aun NO ha sido PAGADA.`);
        }

        const diferenciaDias = Math.ceil((new Date(compra.fch_vencimiento) - fechaActual) / (1000 * 60 * 60 * 24));
        if (diferenciaDias > 0 && diferenciaDias <= 5) {
            recordatorios.push(`La compra de materia prima con el ID: ${compra.id}, VENCE en (${diferenciaDias} días).`);
        } else if (diferenciaDias === 0) {
            recordatorios.push(`La materia prima con el ID: ${compra.id}, VENCE hoy.`);
        }
    }
};

const checkPedidos = (pedidos, productosMap, pedidoProductosMap, recordatorios) => {
    const fechaActual = new Date();
    for (const pedido of pedidos) {
        const productosPedido = pedidoProductosMap.get(pedido.id_pedido) || [];
        const todosEntregados = productosPedido.every(p => p.estado === 1);
        if (todosEntregados) continue;

        const fechaEntrega = new Date(pedido.fechaEntrega);
        const diferenciaDias = Math.ceil((fechaEntrega - fechaActual) / (1000 * 60 * 60 * 24));

        if (diferenciaDias > 0 && diferenciaDias <= 5) {    
            recordatorios.push(`El pedido con el ID: ${pedido.id_pedido}, se ENTREGA en (${diferenciaDias} días).`);
        } else if (diferenciaDias < 0) {
            recordatorios.push(`El pedido con el ID: ${pedido.id_pedido}, NO fue ENTREGADO. Retraso de (${Math.abs(diferenciaDias)} días).`);
        } else if (diferenciaDias === 0) {
            recordatorios.push(`El pedido con el ID: ${pedido.id_pedido}, debe ENTREGARSE hoy.`);
        }

        for (const item of productosPedido) {
            const stockActual = productosMap.get(item.producto) || 0;
            if (stockActual < item.cantidad) {
                recordatorios.push(`Stock de ${item.producto} insuficiente para completar el pedido ${pedido.id_pedido} (${item.cantidad}).`);
            }
        }
    }
};

export const obtenerRecordatorios = async () => {
    try {
        const recordatorios = [];

        const [[productos], [mp], [cmp], [pedidos], [detallePedidos]] = await Promise.all([
            pool.query(`SELECT nombre AS producto, stock FROM productos`),
            pool.query(`SELECT nombre AS materiaPrima, stock FROM materia_prima`),
            pool.query(`
                SELECT cmp.id_compra AS id, cmp.isPagado, cmp.fch_vencimiento, mp.nombre
                FROM comprar_mp cmp
                JOIN materia_prima mp ON cmp.id_materiaPrima = mp.id_materiaPrima
            `),
            pool.query(`SELECT p.id_pedido, p.fecha_entrega AS fechaEntrega FROM pedidos p`),
            pool.query(`
                SELECT dp.id_pedido, pr.nombre AS producto, SUM(dp.cantidad) AS cantidad, dp.estado
                FROM detalle_pedido dp
                JOIN productos pr ON dp.id_producto = pr.id_producto
                WHERE dp.estado = 0
                GROUP BY dp.id_pedido, pr.nombre
            `)
        ]);

        const productosMap = new Map(productos.map(p => [p.producto, p.stock]));
        const materiaPrimaMap = new Map(mp.map(p => [p.materiaPrima, p.stock]));
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
            "ALFAJORES": { bajo: 21 },
            "GALLETAS MARINAS S/S": { bajo: 10 },
            "GALLETAS MARINAS C/S": { bajo: 10 }
        };

        const stockLimitesMp = {
            "HARINA": { bajo: 22.750 },
            "HUEVOS": { bajo: 1.180 },
            "GRASA": { bajo: 4.550 },
            "DULCE DE LECHE": { bajo: 10 },
            "SAL": { bajo: 5 },
            "AZUCAR": { bajo: 10 }
        };

        checkStockBajo(productosMap, stockLimitesProductos, "producto", recordatorios);
        checkStockBajo(materiaPrimaMap, stockLimitesMp, "materia prima", recordatorios);
        checkComprasMateriaPrima(cmp, recordatorios);
        checkPedidos(pedidos, productosMap, pedidoProductosMap, recordatorios);

        return recordatorios.length > 0 ? recordatorios : ["No hay recordatorios"];
    } catch (error) {
        console.log("Error al obtener los recordatorios:", error);
        throw error;
    }
};

//! ==================================================================================================================================================





