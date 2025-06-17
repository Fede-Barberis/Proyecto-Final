import express from "express";
import routes from "./routes.js";
import path from 'path';
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { methods as authorization } from "./middlewares/authorization.js";


//* Server
const app = express(); // instancia de express
app.set("port", 4000);


//* Middleware para parsear JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


// Servir archivos estáticos desde la carpeta 'frontend'
// Si me piden /algo.png, /css/style.css, /js/archivo.js, buscá en la carpeta /frontend”
//* Configuracion
// app.use(express.static(path.join(__dirname, "../frontend")));                  /css/login.css 
app.use('/frontend', express.static(path.join(__dirname, '../frontend')));    // /frontend/css/login.css


//* Rutas
app.get("/", (req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/login.html')));
app.get("/admin",authorization.soloAdmin,(req, res) => res.sendFile(path.join(__dirname, '../frontend/pages/admin.html')));
app.use("/api", routes);


app.listen(app.get("port"), () => {
    console.log("Servidor corriendo en el puerto ", app.get("port"));
});

