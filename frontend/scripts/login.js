const container = document.getElementById("container")
const registerbtn = document.getElementById("register")
const loginbtn = document.getElementById("login")

registerbtn.addEventListener("click", () => {
    container.classList.add("active")
})

loginbtn.addEventListener("click", () => {
    container.classList.remove("active")
})

//! ==============================================================================================================================================

//*                                                  ------ REGISTRARSE ------                                                                 *//

document.getElementById("registrarse").addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const user = document.getElementById("user").value.trim()
    const password = document.getElementById("password").value.trim()
    const email = document.getElementById("email").value.trim()

    const msjError = document.getElementById("msj-error1")
    msjError.classList.add("escondido");

    try{
        const res = await fetch("http://localhost:4000/api/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ user, password, email })
        });

        if (res.ok){ 
            msjError.classList.add("escondido");
        }
        else {
            const errorData = await res.json();
            msjError.textContent = errorData.message;
            msjError.classList.remove("escondido");
        }
    }
    catch(error){
        console.error("Error al registrarse:", error);
    }
});

//! ==============================================================================================================================================

//*                                                ------ INICIAR SESION ------                                                                *//


document.getElementById("iniciarSesion").addEventListener("submit", async (e) => {
    e.preventDefault()

    const email = document.getElementById("email2").value.trim()
    const password = document.getElementById("password2").value.trim()

    const msjError2 = document.getElementById("msj-error2")

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
            msjError2.classList.add("escondido");
            const data = await res.json()

            if(data.redirect) { 
                window.location.href = data.redirect
            }
        }
        else {
            const errorData = await res.json(); 
            msjError2.textContent = errorData.message;
            msjError2.classList.remove("escondido");
        }
    }
    catch(error){
        console.error("Error al iniciar sesion:", error);
    }
})
