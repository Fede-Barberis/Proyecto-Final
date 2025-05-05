//! Maneja las solicitudes y respuestas HTTP.
import bcrypts from "bcryptjs";
import jsonWebToken from "jsonwebtoken";
import dotenv from "dotenv";
import { 
    getUsersRegister, addUserRegister, addProduction, addSale, getProductos, getVentas, getTarjetas, getProduccion, getMateriaPrima, addMateriaPrima, getMp, actualizarPago, eliminarCompraYActualizarStock, eliminarProduccionYActualizarStock, eliminarVentaYActualizarStock, addPedido, guardarDetallePedido, getPedidos, getCantidadPedidos, actualizarEntrega, eliminarPedidos, getGraficos, getGraficoTorta, getRecordatorios, getTarjetasPdf, getDatosMesPasado 
} from "./models.js";

dotenv.config() // permite acceder a las variables de entorno}

//! ===================================================================================================================================================

//*                                         -------- MANEJO DE USUARIO --------                                                                *//

async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ status: "Error", message: "ERROR, los campos están incompletos" });
    }

    const usuarioARevisar = await getUsersRegister(email);
    if (!usuarioARevisar) {
        return res.status(400).json({ status: "Error", message: "ERROR, email o contraseña incorrectos" });
    }
    
    const loginCorrecto = await bcrypts.compare(password, usuarioARevisar.contraseña);

    if (!loginCorrecto) {
        return res.status(400).json({ status: "Error", message: "ERROR, email o contraseña incorrectos" });
    } 
    
    if(!usuarioARevisar && !loginCorrecto ) {
        return res.status(400).json({ status: "Error", message: "Error durante el login" });
    }
    
    const token = jsonWebToken.sign(
        { id: usuarioARevisar.email },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRATION });

    const cookieOptions = {
        expires: new Date (Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
        path: "/"
    }

    res.cookie("jwt", token, cookieOptions);
    res.status(200).send({ status: "ok", message: "Usuario logueado", redirect: "/admin" });
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

async function register(req, res) {
    try{
        const { user, password, email } = req.body;

        if (!user || !password || !email) {
            return res.status(400).json({ status: "Error", message: "ERROR, los campos están incompletos" });
        }

        if(user.length < 4 || user.length > 8){
            return res.status(400).json({ status: "Error", message: "El nombre de usuario debe contener entre 4 y 8 caracteres" });
        }

        if(password.length < 4 || password.length > 15){
            return res.status(400).json({ status: "Error", message: "La contraseña debe contener entre 4 y 15 caracteres" });
        }

        const usuarioARevisar = await getUsersRegister(email);
        if (usuarioARevisar) {
            return res.status(400).json({ status: "Error", message: "ERROR, El usuario ya existe" });
        }

        const salt = await bcrypts.genSalt(5);
        const hashPassword = await bcrypts.hash(password, salt);

        await addUserRegister(user, hashPassword, email);
        return res.status(201).json({ status: "Ok", message: `Usuario ${user} registrado exitosamente` });
    }
    catch(error){
        console.error("Error al guardar el usuario:", error);
        res.status(400).json({ status: "Error", message: "Error, usuario no registrado"})
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const guardarDatos = async (req, res) => {
    try {
        const { user, password, email } = req.body;
        if (!user || !password || !email) {
            return res.status(400).json({ status: "Error", message: "Campos incompletos" });
        }
        
        await addUserRegister(user, password, email);
        res.status(200).json({ status: "OK", message: "Datos guardados correctamente" });
    } catch (error) {
        res.status(400).json({ status: "Error", message: "Error al guardar datos" });
    }
};

//! ===================================================================================================================================================

//*                                         -------- MANEJA LA PRODUCCION --------                                                                  *//


export const guardarProduccion = async (req, res) => {
    try{
        const {datos, productos} = req.body

        const {fecha, receta, lote} = datos

        if (!fecha || !receta || !Array.isArray(productos) || productos.length === 0) {
            return res.status(400).json({ status: "Error", message: "Error, campos incompletos" });
        }

        if (lote.length < 4 || lote.length > 8) {
            return res.status(400).json({ status: "Error", message: "El lote debe tener entre 4 y 8 caracteres" });
        }

        for (const p of productos) {
            if (!p.idProducto || isNaN(p.idProducto) || p.cantidad <= 0 || !p.vencimiento) {
                return res.status(400).json({ status: "Error", message: "Datos de producto inválidos" });
            }

            if (p.vencimiento <= fecha) {
                return res.status(400).json({ status: "Error", message: "La fecha de vencimiento no puede ser menor o igual a la fecha de producción" });
            }
        }

        // Llamar al modelo para registrar cada producto
        await addProduction(datos, productos);
        res.status(200).json({ status: "OK", message: "Producción registrada correctamente" });
    }
    catch(error){
        res.status(400).json({ status: "Error", message: error.message })
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerProduccion = async (req, res) => {
    try {
        const { filtroFecha, filtroProducto } = req.query; // Obtener filtro desde la URL
        const prod = await getProduccion(filtroFecha, filtroProducto)

        if (!Array.isArray(prod)) {
            throw new Error("La respuesta no es un array");
        }

        res.json(prod);
    } catch (error) {
        res.status(400).json({ status: "Error", message: "Error al obtener las ventas" });
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerProductos = async (req, res) => {
    try {
        const productos = await getProductos();
        res.json(productos)
    } catch (error) {
        res.status(400).json({ status: "Error", message: "Error al obtener productos" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const eliminarProduccion = async (req, res) => {
    try {
        const { id } = req.params;
        const exito = await eliminarProduccionYActualizarStock(id);

        if (!exito) {
            return res.status(404).json({ error: "No se pudo eliminar la compra o no existe" });
        }

        return res.status(200).json({ mensaje: "Compra eliminada y stock actualizado" });
    } catch (error) {
        console.error("Error en eliminarCompraController:", error);
        return res.status(400).json({ error: "Error del servidor" });
    }
};

//! ==================================================================================================================================================

//*                                        -------- MANEJAR LAS VENTAS --------                                                                     *//

export const guardarVenta = async (req, res) => {
    try {
        const {fecha, idProducto, cantidad, precio, persona} = req.body

        if(!fecha || !idProducto || !cantidad || !precio || !persona) {
            return res.status(400).json({ status: "Error", message: "Error, campos incompletos"})
        }

        if (isNaN(idProducto)) {
            return res.status(400).json({ status: "Error", message: "ID de producto inválido" });
        }

        console.log("Verificando stock...");
        const resultadoStock = await verificarStock(idProducto, cantidad);

        if (!resultadoStock.valido) {
            return res.status(400).json({ status: "Error", message: resultadoStock.mensaje });
        }

        await addSale(fecha, idProducto, cantidad, precio, persona)
        res.status(200).json({ Status: "OK", message: "Venta guardada correctamente"})
    }
    catch(error){
        res.status(400).json({ status: "Erorr", message: "Error al guardar los datos"})
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerVentas = async (req, res) => {
    try {
        const { filtroFecha, filtroProducto } = req.query; // Obtener filtro desde la URL
        const ventas = await getVentas(filtroFecha, filtroProducto)

        if (!Array.isArray(ventas)) {
            throw new Error("La respuesta no es un array");
        }

        res.json(ventas);
    } catch (error) {
        res.status(400).json({ status: "Error", message: "Error al obtener las ventas" });
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const eliminarVenta = async (req, res) => {
    try {
        const { id } = req.params;
        const exito = await eliminarVentaYActualizarStock(id);

        if (!exito) {
            return res.status(404).json({ error: "No se pudo eliminar la venta o no existe" });
        }

        return res.status(200).json({ mensaje: "Venta eliminada y stock actualizado" });
    } catch (error) {
        console.error("Error en eliminarVentaController:", error);
        return res.status(400).json({ error: "Error del servidor" });
    }
};

//! ==================================================================================================================================================

//*                                        -------- MANEJAR LA MATERIA PRIMA --------                                                               *//

export const guardarMateriaPrima = async (req, res) => {
    try{
        const {fecha, idProducto, cantidad, unidad, lote, vencimiento, precio, isPagado} = req.body

        if(!fecha || !idProducto || !cantidad || !unidad || !vencimiento || !precio){
            return res.status(400).json({ status: "Error", message: "Error, campos incompletos"})
        }

        if (isNaN(idProducto)) {
            return res.status(400).json({ status: "Error", message: "ID de producto inválido" });
        }

        if(cantidad < 0){
            return res.status(400).json({ status:"Error", message: "La cantidad debe ser mayor a 0"})
        }

        if(lote.length < 4 || lote.length > 8){
            return res.status(400).json({ status: "Error", message: "El lote debe tener entre 4 y 8 caracteres" });
        }

        if (vencimiento <= fecha) {
            return res.status(400).json({ status: "Error", message: "La fecha de vencimiento no puede ser menor o igual a la fecha de producción" });
        }

        if(precio < 0){
            return res.status(400).json({ status:"Error", message: "El precio debe ser mayor a 0"})
        }

        await addMateriaPrima(fecha, idProducto, cantidad, unidad, lote, vencimiento, precio, isPagado)
        res.status(200).json({ status: "OK", message: "Datos guadados correctamente"})
    }
    catch(error){
        console.error("Error al guardar la compra de materia prima:", error);
        res.status(400).json({ status: "Error", message: error.message})
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerMateriaPrima = async (req, res) => {
    try {
        const productos = await getMp();
        res.json(productos)

    } catch (error) {
        res.status(400).json({ status: "Error", message: "Error al obtener las materia primas" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerCompra = async (req, res) => {
    try {
        const { filtroFecha, filtroProducto } = req.query; // Obtener filtro desde la URL
        const Mp = await getMateriaPrima(filtroFecha, filtroProducto)

        if (!Array.isArray(Mp)) {
            throw new Error("La respuesta no es un array");
        }

        res.json(Mp);
    } catch (error) {
        res.status(400).json({ status: "Error", message: "Error al obtener la materia prima" });
        res.status(400).json({ status: "Error", message: error.message})
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const eliminarCompra = async (req, res) => {
    try {
        const { id } = req.params;
        const exito = await eliminarCompraYActualizarStock(id);

        if (!exito) {
            return res.status(404).json({ error: "No se pudo eliminar la compra o no existe" });
        }

        return res.status(200).json({ message: "Compra eliminada y stock actualizado" });
    } catch (error) {
        console.error("Error en eliminarCompraController:", error);
        return res.status(500).json({ error: "Error del servidor" });
    }
};

//! ==================================================================================================================================================

//*                                            -------- PEDIDOS --------                                                                         *//  

export const guardarPedido = async (req, res) => {
    try {
        const { fechaEntrega, personaPedido, productos } = req.body;

        // Validación segura
        if (!fechaEntrega || !personaPedido || !productos ||!Array.isArray(productos)) {
            return res.status(400).json({ status: "Error", message: 'Campos incompletos' });
        }
    
        if (fechaEntrega) {
            const hoy = new Date();

            if(fechaEntrega < hoy){
                return res.status(400).json({ status: "Error", message: "La fecha de entrega no puede ser anterior a hoy" });
            }
        }

        if(productos.length === 0){
            return res.status(400).json({ status: "Error", message: "Debe agregar al menos un producto." });
        }

        if(productos.precio < 0){
            return res.status(400).json({ status: "Error", message: "El precio debe ser mayor a 0" });

        }
    
        const pedidoId = await addPedido(fechaEntrega, personaPedido, productos);
        await guardarDetallePedido(pedidoId, productos);
    
        return res.status(201).json({ status: "Success", message: "Pedido guardado correctamente", pedidoId});
    }
    catch(error){
        // Captura cualquier error inesperado (ej: error en DB)
        console.error("ERROR REAL:", error); 
        res.status(500).json({ status: "Error", message: "Error al guardar el pedido" });
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerPedidos = async (req, res) => {
    try {
        const { filtroFecha, filtroProducto } = req.query; // Obtener filtro desde la URL
        const pedidos = await getPedidos(filtroFecha, filtroProducto)
        res.json(pedidos)
    } catch (error) {
        res.status(500).json({ status: "Error", message: "Error al obtener pedidos" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerCantidadPedidos = async (req, res) => {
    try {
        const pedidos = await getCantidadPedidos();
        res.json(pedidos)
    } catch (error) {
        res.status(500).json({ status: "Error", message: "Error al obtener la cantidad de pedidos" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const eliminarPedido = async (req, res) => {
    try {
        const { id } = req.params;
        const exito = await eliminarPedidos(id);

        if (!exito) {
            return res.status(404).json({ error: "No se pudo eliminar el pedido o no existe" });
        }

        return res.status(200).json({ mensaje: "Pedido eliminado y stock actualizado" });
    } catch (error) {
        console.error("Error en eliminarPedidoController:", error);
        return res.status(500).json({ error: "Error del servidor" });
    }
};

//! ==================================================================================================================================================

//*                                        -------- OBTENER TARJETAS --------                                                                     *//

export const obtenerTarjetas = async (req, res) => {
    try {
        const datosTarjetas = await getTarjetas()
        if (!datosTarjetas) {
            return res.status(404).json({ error: "No se encontraron datos" });
        }
        res.json(datosTarjetas)
    }
    catch(error){
        res.status(500).json({ status: "Error", message: "Error al obtener los datos de las tarjetas" });
    }
}

export const obtenerTarjetasPdf = async (req, res) => {
    try {
        const datosTarjetas = await getTarjetasPdf()
        if (!datosTarjetas) {
            return res.status(404).json({ error: "No se encontraron datos" });
        }
        res.json(datosTarjetas)
    }
    catch(error){
        res.status(500).json({ status: "Error", message: "Error al obtener los datos de las tarjetas" });
    }
}


export const obtenerDatosMesPasado = async (req, res) => {
    try {
        const datosMesPasado = await getDatosMesPasado();
        res.json(datosMesPasado);
    } catch (error) {
        console.error("Error al obtener los datos del mes pasado:", error);
        res.status(500).json({ error: "Error al obtener los datos del mes pasado" });
    }
};


//! ===================================================================================================================================================

//*                                        -------- ACTUALIZAR DE ESTADO --------                                                            *//

export const actualizarEstadoPago = async (req, res) => {
    try {
        const { id } = req.params;
        const { isPagado } = req.body; // recibimos true o false

        const pagoActualizado = await actualizarPago(id, isPagado);
        
        if (!pagoActualizado) {
            return res.status(404).json({ error: "No se encontró la compra" });
        }
    
        return res.status(200).json({ success: true, message: "Estado de pago actualizado" });

    } catch (error) {
        console.error("Error en actualizarEstadoPago:", error);
        return res.status(500).json({ error: "Error al actualizar el estado de pago" });
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const actualizarEstadoEntrega = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body; // recibimos true o false

        const entregaActualizada = await actualizarEntrega(id, estado);
        
        if (!entregaActualizada) {
            return res.status(404).json({ error: "No se encontró el pedido" });
        }
    
        return res.status(200).json({ success: true, message: "Estado de la entrega actualizado" });

    } catch (error) {
        console.error("Error en actualizarEstadoEntrega:", error);
        return res.status(400).json({ error: "Error al actualizar el estado de la entrega" });
    }
}

//! ===================================================================================================================================================

//*                                         -------- INFORMACION GRAFICOS --------                                                                 *//

export const obtenerDatosGraficos = async (req, res) => {
    try{
        const {ventas, produccion} = await getGraficos()

        const ventasPorMes = Array(12).fill(0);
        const produccionPorMes = Array(12).fill(0);

        ventas.forEach(v => {
            ventasPorMes[v.mes - 1] = v.cantidad_ventas;
        });

        produccion.forEach(p => {
            produccionPorMes[p.mes - 1] = p.cantidad_produccion;
        });

        res.json({ ventas: ventasPorMes, produccion: produccionPorMes });
    }
    catch(error){
        console.error("Error al obtener los datos de los graficos:", error);
        res.status(400).json({ status: "Error", message: "Error al obtener los datos de los graficos" });
    }
}

//? ===================================================================================================================================================

export const obtenerDatosTorta = async (req, res) => {
    try {
        const datos = await getGraficoTorta();
        
        const labels = datos.map(d => d.producto);
        const value = datos.map(d => d.cantidad);

        res.json({ labels, value });
    } catch (error) {
        console.error(error);
        res.status(400).json({ message: "Error al obtener datos de productos" });
    }
}

//! ===================================================================================================================================================

//*                                               -------- RECORDATORIOS --------                                                              *//

export const obtenerRecordatorios = async (req, res) => {
    try {
        const alertas = await getRecordatorios();
        res.json(alertas);
    } catch (error) {
        console.error("Error al obtener alertas:", error);
        res.status(500).json({ message: "Error al obtener alertas" });
    }
};

//! ==================================================================================================================================================

//*                                            -------- INFORMACION ADICIONAL --------                                                           *//  

export const verificarStock = async (idProducto, cantidad) => {
    try {
        // Obtener el producto específico por ID
        const productos = await getProductos();
        console.log("Productos obtenidos de la BD:", productos);
        const producto = productos.find(prod => prod.id_producto === idProducto); 

        if (!producto) {
            return { valido: false, mensaje: "Producto no encontrado" };
        }

        // Verificar stock
        if (cantidad > producto.stock) {
            return { valido: false, mensaje: "Stock insuficiente para realizar esta venta" };
        }

        return { valido: true, producto };
    } catch (error) {
        res.status(500).json({ status: "Error", message: "Error al verificar el stock" });
    }
}

//! ===================================================================================================================================================


export const methods = {
    login,
    register,
    guardarDatos,
    guardarProduccion,
    obtenerProductos,
    obtenerProduccion,
    eliminarProduccion,
    guardarVenta,
    obtenerVentas,
    eliminarVenta,
    guardarMateriaPrima,
    obtenerMateriaPrima,
    obtenerCompra,
    eliminarCompra,
    guardarPedido,
    verificarStock,
    actualizarEstadoPago,
    obtenerTarjetas,
    obtenerPedidos,
    obtenerCantidadPedidos,
    actualizarEstadoEntrega,
    eliminarPedido,
    obtenerDatosGraficos,
    obtenerDatosTorta,
    obtenerRecordatorios,
    obtenerTarjetasPdf,
    obtenerDatosMesPasado,
}