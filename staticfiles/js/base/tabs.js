
document.addEventListener("DOMContentLoaded", () => {

    const btns = document.querySelectorAll(".tab-btn");
    const contents = document.querySelectorAll(".tab-content");

    btns.forEach(btn => {
        btn.addEventListener("click", () => {

            // remover active de todos
            btns.forEach(b => b.classList.remove("active"));
            contents.forEach(c => c.classList.remove("active"));

            // activar el botón clickeado
            btn.classList.add("active");

            // abrir el contenido correspondiente
            const tabName = btn.getAttribute("data-tab");
            const tabContent = document.getElementById(tabName);
            tabContent.classList.add("active");
        });
    });

});
