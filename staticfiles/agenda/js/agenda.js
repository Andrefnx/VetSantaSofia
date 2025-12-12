let fechaActual = new Date();

document.addEventListener("DOMContentLoaded", () => {
    actualizarTitulo();
    cargarCitas();

    document.getElementById("dayPrev").onclick = () => cambiarDia(-1);
    document.getElementById("dayNext").onclick = () => cambiarDia(1);

    document.querySelectorAll(".slot").forEach(slot => {
        slot.addEventListener("click", () => abrirModal(slot));
    });
});

function cambiarDia(delta) {
    fechaActual.setDate(fechaActual.getDate() + delta);
    actualizarTitulo();
    cargarCitas();
}

function actualizarTitulo() {
    const texto = fechaActual.toLocaleDateString("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
    });

    document.getElementById("currentDay").textContent = texto;
}

function cargarCitas() {
    let fecha = fechaActual.toISOString().slice(0, 10);

    fetch(`/agenda/citas-dia/${fecha}/`)
        .then(r => r.json())
        .then(data => {
            document.querySelectorAll(".slot").forEach(s => s.classList.remove("has-cita"));

            data.citas.forEach(c => {
                let [h, m] = c.hora.split(":");
                let slot = document.querySelector(`.slot[data-hour="${h}"][data-minute="${m}"]`);
                if (slot) {
                    slot.classList.add("has-cita");
                    slot.innerHTML = `
                        <strong>${c.tipo}</strong><br>
                        ${c.mascota}
                    `;
                }
            });
        });
}

function abrirModal(slot) {
    let hora = slot.dataset.hour + ":" + slot.dataset.minute;

    document.querySelector("#formNuevaCita [name='hora']").value = hora;
    document.getElementById("modalNuevaCita").classList.remove("hide");
}

function cerrarModal() {
    document.getElementById("modalNuevaCita").classList.add("hide");
}

document.getElementById("formNuevaCita").onsubmit = function(e) {
    e.preventDefault();

    let fecha = fechaActual.toISOString().slice(0, 10);
    let data = {
        mascota_id: this.mascota.value,
        tipo: this.tipo.value,
        duracion: this.duracion.value,
        notas: this.notas.value,
        fecha: fecha,
        hora: this.hora.value,
    };

    fetch("/agenda/crear/", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(resp => {
        if (resp.success) {
            cerrarModal();
            cargarCitas();
        } else {
            alert("Error al guardar");
        }
    });
};
