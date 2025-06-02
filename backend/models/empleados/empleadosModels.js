import {pool} from '../../../database/connectionMySQL.js';

//! ==================================================================================================================================================

export const obtenerEmpleados = async () => {
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

export const agregarEmpleados = async (empleado) => {
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

export const agregarDetalle = async (detalle) => {
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

export const obtenerDetalleEmpleados = async (id) => {
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

export const obtenerGraficoEmpleados = async () => {
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