
import bcrypts from "bcryptjs";
import jsonWebToken from "jsonwebtoken";
import dotenv from "dotenv";

import { obtenerUsuariosRegistrados, obtenerNombreUsuario } from "../../models/usuarios/usuariosModels.js";

dotenv.config() 

//! ===================================================================================================================================================

//*                                         -------- MANEJO DE USUARIO --------                                                                *//

async function login(req, res) {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ status: "Error", message: "Los campos están incompletos" });
    }

    const usuarioARevisar = await obtenerUsuariosRegistrados(email);
    if (!usuarioARevisar) {
        return res.status(400).json({ status: "Error", message: "Email o contraseña incorrectos" });
    }
    
    const loginCorrecto = await bcrypts.compare(password, usuarioARevisar.contraseña);

    if (!loginCorrecto) {
        return res.status(400).json({ status: "Error", message: "Email o contraseña incorrectos" });
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
    res.status(200).send({ status: "ok", message: "Usuario logueado", redirect: "/admin", nombre: usuarioARevisar.usuario  });
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const usuarioObtenerNombre = async (req, res) => {
    try {
        const user = await obtenerNombreUsuario();
        res.json({ user: user?.usuario || null });
    } catch (error) {
        res.status(400).json({ status: "Error", message: "Error al obtener nombre de usuario" });
    }
};

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const methodsUsuarios = {
    login,
    usuarioObtenerNombre,
}




// Controladores de usuario para la funcionalidad de registrarse (comentados para no interferir con el login actual)

// async function register(req, res) {
//     try{
//         const { user, password, email } = req.body;

//         if (!user || !password || !email) {
//             return res.status(400).json({ status: "Error", message: "ERROR, los campos están incompletos" });
//         }

//         if(user.length < 4 || user.length > 8){
//             return res.status(400).json({ status: "Error", message: "El nombre de usuario debe contener entre 4 y 8 caracteres" });
//         }

//         if(password.length < 4 || password.length > 15){
//             return res.status(400).json({ status: "Error", message: "La contraseña debe contener entre 4 y 15 caracteres" });
//         }

//         const usuarioARevisar = await obtenerUsuariosRegistrados(email);
//         if (usuarioARevisar) {
//             return res.status(400).json({ status: "Error", message: "ERROR, El usuario ya existe" });
//         }

//         const salt = await bcrypts.genSalt(5);
//         const hashPassword = await bcrypts.hash(password, salt);

//         await agregarUsuario(user, hashPassword, email);
//         return res.status(201).json({ status: "Ok", message: `Usuario ${user} registrado exitosamente` });
//     }
//     catch(error){
//         console.error("Error al guardar el usuario:", error);
//         res.status(400).json({ status: "Error", message: "Error, usuario no registrado"})
//     }
// }

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

// export const usuarioGuardar = async (req, res) => {
//     try {
//         const { user, password, email } = req.body;
//         if (!user || !password || !email) {
//             return res.status(400).json({ status: "Error", message: "Campos incompletos" });
//         }
        
//         await agregarUsuario(user, password, email);
//         res.status(200).json({ status: "OK", message: "Datos guardados correctamente" });
//     } catch (error) {
//         res.status(400).json({ status: "Error", message: "Error al guardar datos" });
//     }
// };




