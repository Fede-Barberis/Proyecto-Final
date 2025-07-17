import {pool} from '../../../database/connectionMySQL.js';

//! ===================================================================================================================================================

//*                                          ------------ LOGIN Y REGISTRO --------------                                                          *// 

export const obtenerUsuariosRegistrados = async (email) => {
    try {
        const [result] = await pool.query('SELECT usuario, contrasenia, email FROM usuario_registrado WHERE email = ?', [email])
        return result[0];
    } catch (error) {
        console.log(error);
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

export const obtenerNombreUsuario = async() => {
    try{
        const [result] = await pool.query(`
            SELECT usuario
            FROM usuario_registrado 
        `)

        return result[0];
    }
    catch(error){
        console.log(error);
    }
}

//? **********   **********   **********   **********   **********   **********   **********   **********   **********   **********   **********    ?//

// Consulta para agregar un usuario (sin implementar). 

// export const agregarUsuario = async (user, password, email) => {
//     try {
//         const [result] = await pool.query("INSERT INTO usuario_registrado (usuario, contraseña, email) VALUES (?, ?, ?)", [user, password, email]);
//         console.log("Usuario registrado");
//     } catch (error) {
//         console.error(error);
//     }
// }