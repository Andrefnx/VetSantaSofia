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
        categoria: tr.getAttribute('data-categoria') || tr.cells[1].textContent.trim(),
        descripcion: tr.getAttribute('data-descripcion') || '',
        precio: tr.cells[2].textContent.replace(/[^0-9.,]/g, '').trim(),
        duracion: tr.cells[3].textContent.replace(/[^0-9]/g, '').trim()
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
            .forEach(el => {
                el.value = data[key] ?? "";
                // Para select, forzar la actualización
                if (el.tagName === 'SELECT') {
                    el.value = data[key] ?? "";
                }
            });
    });

    // Guardar ID
    if (data.idServicio) {
        modal.dataset.idservicio = data.idServicio;
        modal.setAttribute('data-objeto-id', data.idServicio); // Para historial
    } else {
        delete modal.dataset.idservicio;
        modal.removeAttribute('data-objeto-id');
    }

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
        ? `/servicios/editar/${updated.idServicio}/`
        : `/servicios/crear/`;

    // Get CSRF token
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                      document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='))?.split('=')[1];

    fetch(url, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken
        },
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

    // Incluir el ID si existe
    if (modal.dataset.idservicio) {
        data.idServicio = modal.dataset.idservicio;
    }

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

/************************************
 *  ARCHIVAR / RESTAURAR SERVICIO
 ************************************/
let servicioAArchivarId = null;

function abrirModalArchivarServicio(btn) {
    let tr = btn.closest("tr");
    let nombre = "";
    let esArchivar = true;

    if (tr) {
        nombre = tr.cells[0].textContent.trim();
        servicioAArchivarId = tr.getAttribute("data-id");
        // Detectar si es archivar o restaurar por el ícono del botón
        const icono = btn.querySelector("i");
        esArchivar = icono && icono.classList.contains("fa-archive");
    } else {
        const modal = document.getElementById("modalServicio");
        servicioAArchivarId = modal.dataset.idservicio || null;

        const nombreField = modal.querySelector('[data-field="nombre"]');
        nombre = nombreField ? nombreField.textContent.trim() : "";
    }

    // Actualizar mensaje y título según la acción
    const tituloModal = document.querySelector("#modalArchivarServicio .vet-custom-modal-title h3");
    const btnConfirmar = document.getElementById("btnConfirmarArchivarServicio");
    
    if (esArchivar) {
        tituloModal.innerHTML = '<i class="fas fa-archive"></i> Archivar Servicio';
        document.getElementById("archivarServicioMensaje").textContent =
            `¿Estás seguro que deseas archivar el servicio "${nombre}"? Podrás restaurarlo desde la pestaña de archivados.`;
        btnConfirmar.innerHTML = '<i class="fas fa-archive"></i> Archivar';
    } else {
        tituloModal.innerHTML = '<i class="fas fa-undo"></i> Restaurar Servicio';
        document.getElementById("archivarServicioMensaje").textContent =
            `¿Estás seguro que deseas restaurar el servicio "${nombre}"? Volverá a aparecer en la pestaña de activos.`;
        btnConfirmar.innerHTML = '<i class="fas fa-undo"></i> Restaurar';
    }

    openVetModal('modalArchivarServicio');
}

function closeArchivarServicioModal() {
    closeVetModal("modalArchivarServicio");
}

document.addEventListener("DOMContentLoaded", function () {
    const btnConfirmar = document.getElementById("btnConfirmarArchivarServicio");
    if (btnConfirmar) {
        btnConfirmar.onclick = function () {
            archivarServicioConfirmado();
        };
    }
});

function archivarServicioConfirmado() {
    if (!servicioAArchivarId) return;

    // Get CSRF token
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                      document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='))?.split('=')[1];

    fetch(`/servicios/archivar/${servicioAArchivarId}/`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken
        },
        body: JSON.stringify({})
    })
        .then(r => r.json())
        .then(resp => {
            if (resp.success) {
                closeVetModal("modalArchivarServicio");
                location.reload();
            } else {
                alert(resp.error || 'Error al archivar/restaurar servicio');
            }
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Error al archivar/restaurar servicio');
        });
}

/************************************
 *  ELIMINAR SERVICIO
 ************************************/
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

    // Get CSRF token
    const csrftoken = document.querySelector('[name=csrfmiddlewaretoken]')?.value ||
                      document.cookie.split(';').find(c => c.trim().startsWith('csrftoken='))?.split('=')[1];

    fetch(`/servicios/eliminar/${servicioAEliminarId}/`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "X-CSRFToken": csrftoken
        },
        body: JSON.stringify({})
    })
        .then(r => r.json())
        .then(resp => {
            if (resp.success) {
                closeVetModal("modalEliminarServicio");
                // Si fue archivado en lugar de eliminado, mostrar mensaje especial
                if (resp.archived) {
                    if (window.Swal) {
                        Swal.fire({
                            title: 'Servicio archivado',
                            text: resp.message,
                            icon: 'info',
                            confirmButtonText: 'Entendido'
                        }).then(() => location.reload());
                    } else {
                        alert(resp.message);
                        location.reload();
                    }
                } else {
                    location.reload();
                }
            } else {
                alert(resp.error || 'Error al eliminar servicio');
            }
        })
        .catch(err => {
            console.error('Error:', err);
            alert('Error al eliminar servicio');
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

/************************************
 *  CAMBIAR ESTADO (ACTIVOS/ARCHIVADOS)
 ************************************/
function cambiarEstadoServicios(estado) {
    window.location.href = `/servicios/?estado=${estado}`;
}
