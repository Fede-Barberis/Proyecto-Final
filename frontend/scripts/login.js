//*                                                ------ INICIAR SESION ------                                                                *//

document.getElementById("iniciarSesion").addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("email").value.trim()
    const password = document.getElementById("password").value.trim()

    const msjError = document.getElementById("msj-error")

    try{
        const res = await fetch("http://localhost:4000/api/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        })

        if (res.ok){ 
            msjError.classList.add("escondido");
            const data = await res.json()

            if (data.nombre) {
                localStorage.setItem("nombreUsuario", data.nombre);
            }

            if(data.redirect) { 
                window.location.href = data.redirect
            }
        }
        else {
            const errorData = await res.json(); 
            msjError.textContent = errorData.message;
            msjError.classList.remove("escondido");
        }
    }
    catch(error){
        console.error("Error al iniciar sesion:", error);
    }
})


//! ==============================================================================================================================================

// Funcionalidad registrarse (para mas adelante, si se desea implementar)

// const container = document.getElementById("container")
// const loginbtn = document.getElementById("login")
// const registerbtn = document.getElementById("register")

// registerbtn.addEventListener("click", () => {
//     container.classList.add("active")
// })

// loginbtn.addEventListener("click", () => {
//     container.classList.remove("active")
// })


//                                                   ------ REGISTRARSE ------                                                                 *//

// document.getElementById("registrarse").addEventListener("submit", async (e) => {
//     e.preventDefault();
    
//     const user = document.getElementById("user").value.trim()
//     const password = document.getElementById("password").value.trim()
//     const email = document.getElementById("email").value.trim()

//     const msjError = document.getElementById("msj-error1")
//     msjError.classList.add("escondido");

//     try{
//         const res = await fetch("http://localhost:4000/api/register", {
//             method: "POST",
//             headers: {
//                 "Content-Type": "application/json"
//             },
//             body: JSON.stringify({ user, password, email })
//         });

//         if (res.ok){ 
//             msjError.classList.add("escondido");
//         }
//         else {
//             const errorData = await res.json();
//             msjError.textContent = errorData.message;
//             msjError.classList.remove("escondido");
//         }
//     }
//     catch(error){
//         console.error("Error al registrarse:", error);
//     }
// });