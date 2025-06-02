import jsonwebtoken from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

function soloAdmin(req,res,next){
    const logueado = revisarCookie(req);
    if(logueado) return next();
    return res.redirect("/")
}

// conectarse a la base de datos para acceder a los usuraios y comparar

function revisarCookie(req){
    try{
        const cookieJWT = req.headers.cookie.split("; ").find(cookie => cookie.startsWith("jwt=")).slice(4);
        const decodificada = jsonwebtoken.verify(cookieJWT,process.env.JWT_SECRET);
        console.log(decodificada)
        return true;
    }
    catch{
        return false;
    }
}

export const methods = {
    soloAdmin
}