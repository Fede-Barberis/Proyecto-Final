import { obtenerTarjetasAdmin, obtenerTarjetasAdminPdf, obtenerTarjetasMesPasado, obtenerRecordatorios} from "../../models/adicionales/adicionalesModels.js";

//! ==================================================================================================================================================

//*                                        -------- OBTENER TARJETAS --------                                                                     *//

export const adicionalesObtenerTarjetas = async (req, res) => {
    try {
        const datosTarjetas = await obtenerTarjetasAdmin()
        if (!datosTarjetas) {
            return res.status(404).json({ error: "No se encontraron datos" });
        }
        res.json(datosTarjetas)
    }
    catch(error){
        res.status(500).json({ status: "Error", message: "Error al obtener los datos de las tarjetas" });
    }
}

export const adicionalesObtenerTarjetasPdf = async (req, res) => {
    try {
        const datosTarjetas = await obtenerTarjetasAdminPdf()
        if (!datosTarjetas) {
            return res.status(404).json({ error: "No se encontraron datos" });
        }
        res.json(datosTarjetas)
    }
    catch(error){
        res.status(500).json({ status: "Error", message: "Error al obtener los datos de las tarjetas" });
    }
}


export const adicionalesObtenerDatosMesPasado = async (req, res) => {
    try {
        const datosMesPasado = await obtenerTarjetasMesPasado();
        res.json(datosMesPasado);
    } catch (error) {
        console.error("Error al obtener los datos del mes pasado:", error);
        res.status(500).json({ error: "Error al obtener los datos del mes pasado" });
    }
};


//! ===================================================================================================================================================

//*                                               -------- RECORDATORIOS --------                                                              *//

export const adicionalesObtenerRecordatorios = async (req, res) => {
    try {
        const alertas = await obtenerRecordatorios();
        res.json(alertas);
    } catch (error) {
        console.error("Error al obtener alertas:", error);
        res.status(500).json({ message: "Error al obtener alertas" });
    }
};


//! ==================================================================================================================================================

//*                                            -------- INFORMACION ADICIONAL --------                                                           *//  




export const methodsAdicionales = { 
    adicionalesObtenerTarjetas,
    adicionalesObtenerTarjetasPdf,
    adicionalesObtenerDatosMesPasado,
    adicionalesObtenerRecordatorios
}