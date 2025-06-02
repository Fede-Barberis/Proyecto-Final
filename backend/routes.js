import express from "express";
import { methodsUsuarios as authentication } from "./controllers/usuarios/usuariosControllers.js";
import { methodsProduccion  } from "./controllers/produccion/produccionControllers.js";
import { methodsVentas } from "./controllers/ventas/ventasControllers.js";
import { methodsMateriaPrima } from "./controllers/materiaPrima/materiaPrimaControllers.js";
import { methodsPedidos } from "./controllers/pedidos/pedidosControllers.js";
import { methodsEmpleados } from "./controllers/empleados/empleadosControllers.js";
import { methodsGraficos } from "./controllers/graficos/graficosControllers.js";
import { methodsAdicionales } from "./controllers/adicionales/utilsControllers.js";


const router = express.Router();

router.post("/login", authentication.login);
router.get("/usuarioObtenerNombre", authentication.usuarioObtenerNombre);
// router.post("/register", authentication.register);
// router.post("/usuarioGuardar", authentication.usuarioGuardar);

router.get("/produccionObtener", methodsProduccion.produccionObtener);
router.post("/produccionGuardar", methodsProduccion.produccionGuardar);
router.delete("/produccionEliminar/:id", methodsProduccion.produccionEliminar);
router.get("/productosObtener", methodsProduccion.productosObtener);

router.get("/ventaObtener", methodsVentas.ventaObtener);
router.post("/ventaGuardar", methodsVentas.ventaGuardar);
router.delete("/ventaEliminar/:id", methodsVentas.ventaEliminar);
router.get("/verificarStock", methodsVentas.verificarStock);

router.get("/materiaPrimaObtener", methodsMateriaPrima.materiaPrimaObtener);
router.post("/materiaPrimaGuardar", methodsMateriaPrima.materiaPrimaGuardar);
router.get("/materiaPrimaObtenerCompra", methodsMateriaPrima.materiaPrimaObtenerCompra);
router.delete("/materiaPrimaEliminarCompra/:id", methodsMateriaPrima.materiaPrimaEliminarCompra);
router.put("/materiaPrimaActualizarEstadoPago/:id", methodsMateriaPrima.materiaPrimaActualizarEstadoPago);

router.get("/pedidoObtener", methodsPedidos.pedidoObtener);
router.post("/pedidoGuardar", methodsPedidos.pedidoGuardar);
router.delete("/pedidoEliminar/:id", methodsPedidos.pedidoEliminar);
router.get("/pedidoObtenerCantidadPedidos", methodsPedidos.pedidoObtenerCantidadPedidos);
router.put("/pedidoActualizarEstadoEntrega/:id", methodsPedidos.pedidoActualizarEstadoEntrega);
router.get("/pedidoObtenerEstadoPedidos", methodsPedidos.pedidoObtenerEstadoPedidos);

router.get("/empleadoObtener", methodsEmpleados.empleadoObtener);
router.post("/empleadoAgregar", methodsEmpleados.empleadoAgregar);
router.delete("/empleadoEliminar/:id", methodsEmpleados.empleadoEliminar);
router.get("/empleadoObtenerDetalle/:id", methodsEmpleados.empleadoObtenerDetalle);
router.post("/empleadoAgregarDetalle", methodsEmpleados.empleadoAgregarDetalle);
router.delete("/empleadoEliminarDetalle/:id", methodsEmpleados.empleadoEliminarDetalle);
router.get("/empleadoObtenerGrafico", methodsEmpleados.empleadoObtenerGrafico);

router.get("/obtenerDatosGraficos", methodsGraficos.obtenerDatosGraficos);
router.get("/obtenerDatosTorta", methodsGraficos.obtenerDatosTorta);

router.get("/adicionalesObtenerRecordatorios", methodsAdicionales.adicionalesObtenerRecordatorios);
router.get("/adicionalesObtenerTarjetas", methodsAdicionales.adicionalesObtenerTarjetas);
router.get("/adicionalesObtenerTarjetasPdf", methodsAdicionales.adicionalesObtenerTarjetasPdf);
router.get("/adicionalesObtenerDatosMesPasado", methodsAdicionales.adicionalesObtenerDatosMesPasado);

export default router;


