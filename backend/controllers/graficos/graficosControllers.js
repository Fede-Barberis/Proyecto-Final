import { obtenerGraficoLinea, obtenerGraficoTorta } from "../../models/graficos/graficosModels.js";

//! ===================================================================================================================================================

//*                                         -------- INFORMACION GRAFICOS --------                                                                 *//

export const obtenerDatosGraficos = async (req, res) => {
    try{
        const {ventas, produccion, pedidos} = await obtenerGraficoLinea()

        const ventasPorMes = Array(12).fill(0);
        const produccionPorMes = Array(12).fill(0);
        const pedidosPorMes = Array(12).fill(0);

        ventas.forEach(v => {
            ventasPorMes[v.mes - 1] = v.cantidad_ventas;
        });

        produccion.forEach(p => {
            produccionPorMes[p.mes - 1] = p.cantidad_produccion;
        });

        pedidos.forEach(p => {
            pedidosPorMes[p.mes - 1] = p.cantidad_pedidos;
        });

        res.json({ ventas: ventasPorMes, produccion: produccionPorMes, pedidos: pedidosPorMes });
    }
    catch(error){
        console.error("Error al obtener los datos de los graficos:", error);
        res.status(500).json({ status: "Error", message: "Error al obtener los datos de los graficos" });
    }
}

//? ===================================================================================================================================================

export const obtenerDatosTorta = async (req, res) => {
    try {
        const datos = await obtenerGraficoTorta();
        
        const labels = datos.map(d => d.producto);
        const value = datos.map(d => d.cantidad);

        res.json({ labels, value });
    } catch (error) {
        console.error(error);
        res.status(500).json({ status: "Error", message: "Error al obtener datos de productos" });
    }
}



export const methodsGraficos = { 
    obtenerDatosGraficos,
    obtenerDatosTorta
}