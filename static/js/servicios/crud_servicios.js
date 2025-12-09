/************************************
 *  NUEVO SERVICIO
 ************************************/
function abrirModalNuevoServicio() {

    const data = {
        nombre: "",
        descripcion: "",
        categoria: "",
        precio: "",
        duracion: ""
    };

    openServicioModal("nuevo", data);
}

/************************************
 *  VER / EDITAR SERVICIO
 ************************************/
function abrirModalServicio(btn, mode) {
    const tr = btn.closest('tr');
    if (!tr) return;

    const data = {
        nombre: tr.cells[0].textContent.trim(),
        categoria: tr.cells[1].textContent.trim(),
        precio: tr.cells[2].textContent.replace(/[^0-9.,]/g, '').trim(),
        duracion: tr.cells[3].textContent.trim()
    };

    if (tr.hasAttribute('data-id')) {
        data.idServicio = tr.getAttribute('data-id');
    }

    openServicioModal(mode, data);
}

/************************************
 *  ABRE EL MODAL
 ************************************/
let servicioDatosOriginales = null;

function openServicioModal(mode, data = {}) {

    const modal = document.getElementById("modalServicio");
    if (!modal) return;

    // Guardar datos originales para detectar cambios
    if (mode === "edit") {
        servicioDatosOriginales = { ...data };
    }

    // Título
    let titulo = "Detalles del Servicio";
    if (mode === "edit") titulo = "Editar Servicio";
    if (mode === "nuevo") titulo = "Nuevo Servicio";

    document.getElementById("modalServicioTitulo").textContent = titulo;

    // Mostrar / Ocultar botones
    document.getElementById("btnGuardarServicio").classList.toggle("d-none", mode === "view");
    document.getElementById("btnEditarServicio").classList.toggle("d-none", mode !== "view");
    document.getElementById("btnEliminarServicio").classList.toggle("d-none", mode === "nuevo");

    // Campos
    const viewFields = modal.querySelectorAll(".field-view");
    const editFields = modal.querySelectorAll(".field-edit");

    viewFields.forEach(f => f.classList.toggle("d-none", mode !== "view"));
    editFields.forEach(f => f.classList.toggle("d-none", mode === "view"));

    // Rellenar campos
    Object.keys(data).forEach(key => {
        modal.querySelectorAll(`.field-view[data-field="${key}"]`)
            .forEach(el => el.textContent = data[key] ?? "-");

        modal.querySelectorAll(`.field-edit[data-field="${key}"]`)
            .forEach(el => el.value = data[key] ?? "");
    });

    // Guardar ID
    if (data.idServicio) modal.dataset.idservicio = data.idServicio;
    else delete modal.dataset.idservicio;

    modal.classList.remove("hide");
    modal.classList.add("show");
}

/************************************
 * MODO EDITAR
 ************************************/
function switchToEditModeServicio() {
    openServicioModal("edit", getServicioModalData());
}

/************************************
 * GUARDAR EDICIÓN
 ************************************/
function guardarServicioEditado() {

    const modal = document.getElementById("modalServicio");
    const inputs = modal.querySelectorAll(".field-edit");

    let updated = {};

    inputs.forEach(input => {
        updated[input.dataset.field] = input.value;
    });

    if (modal.dataset.idservicio) {
        updated.idServicio = modal.dataset.idservicio;
    }

    // VALIDACIÓN
    if (!updated.nombre || !updated.categoria || !updated.precio) {
        alert("Debes completar Nombre, Categoría y Precio antes de guardar.");
        return;
    }

    // Mostrar resumen
    const resumen = construirResumenCambiosServicio(updated);
    //alert(resumen);

    // URL
    const url = updated.idServicio
        ? `/hospital/servicios/editar/${updated.idServicio}/`
        : `/hospital/servicios/crear/`;

    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated)
    })
        .then(r => r.json())
        .then(resp => {
            if (resp.success) {
                closeVetModal("modalServicio");
                location.reload();
            }
        });
}

/************************************
 * LEER CAMPOS DEL MODAL
 ************************************/
function getServicioModalData() {
    const modal = document.getElementById("modalServicio");
    let data = {};

    modal.querySelectorAll(".field-edit").forEach(input => {
        data[input.dataset.field] = input.value;
    });

    modal.querySelectorAll(".field-view").forEach(p => {
        if (!data[p.dataset.field]) data[p.dataset.field] = p.textContent;
    });

    return data;
}

/************************************
 * DETECTAR CAMBIOS
 ************************************/
function hayCambiosServicio() {
    if (!servicioDatosOriginales) return false;

    const modal = document.getElementById("modalServicio");

    let actual = {};

    modal.querySelectorAll(".field-edit").forEach(input => {
        actual[input.dataset.field] = input.value;
    });

    return Object.keys(servicioDatosOriginales).some(
        key => (servicioDatosOriginales[key] ?? "") !== (actual[key] ?? "")
    );
}

/************************************
 * CERRAR MODAL CON WARNING
 ************************************/
function closeServicioModal() {
    if (hayCambiosServicio()) {
        if (window.Swal) {
            Swal.fire({
                title: "¿Cerrar sin guardar?",
                text: "Si cierras, los cambios no se guardarán.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Entendido",
                cancelButtonText: "Cancelar",
            }).then(result => {
                if (result.isConfirmed) closeVetModal("modalServicio");
            });
        } else {
            if (confirm("Si cierras, no se guardarán los cambios. ¿Continuar?")) {
                closeVetModal("modalServicio");
            }
        }
    } else closeVetModal("modalServicio");
}

/************************************
 * ELIMINAR SERVICIO
 ************************************/
let servicioAEliminarId = null;

function abrirModalEliminarServicio(btn) {

    let tr = btn.closest("tr");
    let nombre = "";

    if (tr) {
        nombre = tr.cells[0].textContent.trim();
        servicioAEliminarId = tr.getAttribute("data-id");
    } else {
        const modal = document.getElementById("modalServicio");
        servicioAEliminarId = modal.dataset.idservicio || null;

        const nombreField = modal.querySelector('[data-field="nombre"]');
        nombre = nombreField ? nombreField.textContent.trim() : "";
    }

    document.getElementById("eliminarServicioMensaje").textContent =
        `¿Estás seguro que deseas eliminar el servicio "${nombre}"?`;

    openVetModal('modalEliminarServicio');
}

function closeEliminarServicioModal() {
    if (window.Swal) {
        Swal.fire({
            title: "¿Cerrar sin eliminar?",
            text: "Si cierras, no se eliminará.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Entendido",
            cancelButtonText: "Cancelar",
        }).then(result => {
            if (result.isConfirmed) closeVetModal("modalEliminarServicio");
        });
    } else {
        if (confirm("¿Cerrar sin eliminar?")) closeVetModal("modalEliminarServicio");
    }
}

document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("btnConfirmarEliminarServicio").onclick = function () {

        if (window.Swal) {
            Swal.fire({
                title: "¿Eliminar servicio?",
                text: "Esta acción no se puede deshacer.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar",
            }).then(result => {
                if (result.isConfirmed) eliminarServicioConfirmado();
            });
        } else {
            if (confirm("¿Eliminar servicio?")) eliminarServicioConfirmado();
        }
    };
});

function eliminarServicioConfirmado() {
    if (!servicioAEliminarId) return;

    fetch(`/hospital/servicios/eliminar/${servicioAEliminarId}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    })
        .then(r => r.json())
        .then(resp => {
            if (resp.success) location.reload();
        });
}

/************************************
 * RESUMEN DE CAMBIOS
 ************************************/
function construirResumenCambiosServicio(updated) {

    const labels = {
        nombre: "Nombre",
        descripcion: "Descripción",
        categoria: "Categoría",
        precio: "Precio",
        duracion: "Duración"
    };

    const lineas = [];

    if (servicioDatosOriginales) {
        // EDICIÓN
        Object.keys(labels).forEach(key => {
            const antes = servicioDatosOriginales[key] ?? "";
            const ahora = updated[key] ?? "";

            if ((antes + "").trim() !== (ahora + "").trim()) {
                lineas.push(`${labels[key]}: "${antes || "-"}" → "${ahora || "-"}"`);
            }
        });

        if (!lineas.length) lineas.push("No se detectaron cambios.");

        return "Cambios realizados:\n\n" + lineas.join("\n");

    } else {
        // NUEVO
        Object.keys(labels).forEach(key => {
            const v = (updated[key] ?? "").trim();
            if (v) lineas.push(`${labels[key]}: "${v}"`);
        });

        if (!lineas.length) lineas.push("No se ingresaron datos.");

        return "Datos del nuevo servicio:\n\n" + lineas.join("\n");
    }
}
