import express from "express";
import { methods as authentication } from "./controllers.js";

const router = express.Router();

router.post("/register", authentication.register);
router.post("/login", authentication.login);
router.post("/guardarDatos", authentication.guardarDatos);
router.post("/guardarProduccion", authentication.guardarProduccion);
router.post("/guardarVenta", authentication.guardarVenta);
router.get("/obtenerProductos", authentication.obtenerProductos);
router.get("/obtenerVentas", authentication.obtenerVentas);
router.get("/obtenerTarjetas", authentication.obtenerTarjetas);
router.get("/obtenerProduccion", authentication.obtenerProduccion);
router.get("/verificarStock", authentication.verificarStock);
router.post("/guardarMateriaPrima", authentication.guardarMateriaPrima);
router.get("/obtenerMateriaPrima", authentication.obtenerMateriaPrima);
router.get("/obtenerCompra", authentication.obtenerCompra);
router.put("/actualizarEstadoPago/:id", authentication.actualizarEstadoPago);
router.delete("/eliminarCompra/:id", authentication.eliminarCompra);
router.delete("/eliminarProduccion/:id", authentication.eliminarProduccion);
router.delete("/eliminarVenta/:id", authentication.eliminarVenta);
router.post("/guardarPedido", authentication.guardarPedido);



export default router;
