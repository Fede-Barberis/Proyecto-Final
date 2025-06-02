import { obtenerEmpleados, agregarEmpleados, eliminarEmpleados, agregarDetalle, eliminarDetalleEmpleados, obtenerDetalleEmpleados, obtenerGraficoEmpleados } from "../../models/empleados/empleadosModels.js";

//! ===================================================================================================================================================

export const empleadoObtener = async (req, res) => {
    try {
        const datos = await obtenerEmpleados();
        res.json(datos)
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Error al obtener datos de empleados" });
    }
}

//? ===================================================================================================================================================

export const empleadoAgregar = async (req, res) => {
    try{
        const { empleado } = req.body;

        if(!empleado.nombre || !empleado.apellido){
            return res.status(400).json({ status: "Error", message: "Error, campos incompletos" });
        }


        await agregarEmpleados(empleado);
        res.status(200).json({ status: "OK", message: "Empleado registrado correctamente" });
    }
    catch(error){
        res.status(400).json({ status: "Error", message: "Error al guardar empleado" });
    }
}

//? ===================================================================================================================================================

export const empleadoAgregarDetalle = async (req, res) => {
    try{
        const { detalle } = req.body;
        const { id_empleado, valor, horas, fecha } = detalle;

        if(!id_empleado || !valor || !horas || !fecha){
            return res.status(400).json({ status: "Error", message: "Error, campos incompletos" });
        }

        if(valor < 0){
            return res.status(400).json({ status: "Error", message: "El valor no puede ser negativo" });
        }

        if(horas < 0){
            return res.status(400).json({ status: "Error", message: "Las horas no pueden ser negativas" });
        }

        console.log("Valores recibidos:", detalle);

        await agregarDetalle({
            id_empleado,
            precioHora: valor,
            cantHoras: horas,
            fechaCobro: fecha
        });

        res.status(200).json({ status: "OK", message: "Detalle agregado correctamente" });
    }
    catch(error){
        res.status(400).json({ status: "Error", message: "Error al guardar detalle" });
    }
}

//? ===================================================================================================================================================
export const empleadoObtenerDetalle = async (req, res) => {
    try {
        const { id } = req.params;
        const datos = await obtenerDetalleEmpleados(id);
        res.json(datos)
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Error al obtener datos de empleados" });
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const empleadoEliminar = async (req, res) => {
    try {
        const { id } = req.params;
        const exito = await eliminarEmpleados(id);

        if (!exito) {
            return res.status(404).json({ error: "No se pudo eliminar al empleado" });
        }

        return res.status(200).json({ mensaje: "Empleado eliminado" });
    } catch (error) {
        console.error("Error en eliminarEmpleadoController:", error);
        return res.status(500).json({ error: "Error del servidor" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const empleadoEliminarDetalle = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ error: "ID no proporcionado" });
        }

        const exito = await eliminarDetalleEmpleados(id);

        if (!exito) {
            return res.status(404).json({ error: "No se pudo eliminar el detalle del empleado" });
        }

        return res.status(200).json({ mensaje: "Detalle del empleado eliminado" });
    } catch (error) {
        console.error("Error en eliminarDetalleEmpleadoController:", error);
        return res.status(500).json({ error: "Error del servidor" });
    }
};

//? ===================================================================================================================================================

export const empleadoObtenerGrafico = async (req, res) => {
    try {
        const datos = await obtenerGraficoEmpleados();
        
        const labels = datos.map(d => d.nombre);
        const value = datos.map(d => d.cantHoras);

        res.json({ nombres:labels, horas: value });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Error al obtener datos de empleados" });
    }
}




export const methodsEmpleados = {
    empleadoObtener,
    empleadoAgregar,
    empleadoAgregarDetalle,
    empleadoObtenerDetalle,
    empleadoEliminar,
    empleadoEliminarDetalle,
    empleadoObtenerGrafico
}