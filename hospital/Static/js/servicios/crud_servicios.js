// -------- NUEVO SERVICIO --------
function abrirModalNuevoServicio() {
    const form = document.getElementById('addServiceForm');
    if (form) form.reset();
    // Limpiar selección de insumos
    const insumosSelect = form.insumos;
    if (insumosSelect) {
        Array.from(insumosSelect.options).forEach(option => option.selected = false);
    }
    openVetModal('modalNuevoServicio');
}

// -------- VER/EDITAR SERVICIO --------
function abrirModalServicio(btn, mode) {
    const tr = btn.closest('tr');
    if (!tr) return;
    const data = {
        nombre_servicio: tr.cells[0].textContent.trim(),
        tipo_servicio: tr.cells[1].textContent.trim(),
        precio: tr.cells[2].textContent.replace(/\D/g, '').trim(),
        descripcion: tr.cells[3].textContent.trim(),
        insumos: tr.cells[4].textContent.trim().split(',').map(i => i.trim())
    };
    openServicioModal(mode, data);
}

function openServicioModal(mode, data = {}) {
    const modal = document.getElementById("modalServicio");
    if (!modal) return;

    // Cargar insumos en el select
    renderInsumosOptions('insumosEdit');
    // Seleccionar insumos si hay
    if (data.insumos && Array.isArray(data.insumos)) {
        const select = document.getElementById('insumosEdit');
        Array.from(select.options).forEach(option => {
            option.selected = data.insumos.includes(option.value);
        });
    }

    // Cambiar título según acción
    let titulo = "Detalles del Servicio";
    if (mode === "edit") titulo = "Editar Servicio";
    if (mode === "nuevo") titulo = "Nuevo Servicio";
    document.getElementById("modalServicioTitulo").textContent = titulo;

    // Mostrar/ocultar botones
    document.getElementById("btnGuardarServicio").classList.toggle("d-none", mode === "view");
    document.getElementById("btnEditarServicio").classList.toggle("d-none", mode !== "view");
    document.getElementById("btnEliminarServicio").classList.toggle("d-none", mode === "nuevo");

    // Mostrar modo ver / editar
    const viewFields = modal.querySelectorAll(".field-view");
    const editFields = modal.querySelectorAll(".field-edit");
    viewFields.forEach(f => f.classList.toggle("d-none", mode !== "view"));
    editFields.forEach(f => f.classList.toggle("d-none", mode === "view"));

    // Rellenar datos
    Object.keys(data).forEach(key => {
        modal.querySelectorAll(`.field-view[data-field="${key}"]`)
            .forEach(el => el.textContent = data[key] ?? "-");
        modal.querySelectorAll(`.field-edit[data-field="${key}"]`)
            .forEach(el => el.value = data[key] ?? "");
    });

    renderDualListbox();
    // Si hay productos/insumos seleccionados en data, muévelos a la lista derecha
    if (data.productos && Array.isArray(data.productos)) {
        const prodSel = document.getElementById('productosSeleccionados');
        data.productos.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            prodSel.appendChild(opt);
        });
    }
    if (data.insumos && Array.isArray(data.insumos)) {
        const insSel = document.getElementById('insumosSeleccionados');
        data.insumos.forEach(i => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = i;
            insSel.appendChild(opt);
        });
    }

    modal.classList.remove("hide");
    modal.classList.add("show");
}

function switchToEditModeServicio() {
    openServicioModal("edit", getServicioModalData());
}

function guardarServicioEditado() {
    const modal = document.getElementById("modalServicio");
    const productos = Array.from(document.getElementById('productosSeleccionados').options).map(opt => opt.value);
    const insumos = Array.from(document.getElementById('insumosSeleccionados').options).map(opt => opt.value);
    const inputs = modal.querySelectorAll(".field-edit");
    let updated = {};
    inputs.forEach(input => {
        updated[input.dataset.field] = input.value;
    });
    // Actualiza los campos de vista
    modal.querySelector('[data-field="productos"]').textContent = productos.join(', ') || '-';
    modal.querySelector('[data-field="insumos"]').textContent = insumos.join(', ') || '-';
    openServicioModal("view", {...getServicioModalData(), productos, insumos});
}

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

// -------- ELIMINAR SERVICIO --------
let servicioAEliminar = null;
function abrirModalEliminarServicio(btn) {
    let tr = btn.closest('tr');
    let nombre = '';
    if (tr) {
        nombre = tr.cells[0].textContent.trim();
        servicioAEliminar = tr;
    } else {
        const nombreField = document.querySelector('#modalServicio [data-field="nombre_servicio"]');
        nombre = nombreField ? nombreField.textContent.trim() : '';
        servicioAEliminar = null;
    }
    document.getElementById('eliminarServicioMensaje').textContent =
        `¿Estás seguro que deseas eliminar el servicio "${nombre}"?`;
    openVetModal('modalEliminarServicio');
}

function closeEliminarServicioModal() {
    if (confirm("Si cierras, el servicio no se eliminará. ¿Deseas continuar?")) {
        closeVetModal('modalEliminarServicio');
    }
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btnConfirmarEliminarServicio').onclick = function () {
        if (confirm("¿Estás segura/o de eliminar este servicio?")) {
            eliminarServicioConfirmado();
        }
    };
});

function eliminarServicioConfirmado() {
    if (servicioAEliminar) {
        servicioAEliminar.remove();
    }
    closeVetModal('modalEliminarServicio');
    closeVetModal('modalServicio');
    alert("El servicio ha sido eliminado.");
}

// --------- INSUMOS MULTISELECT ---------
const insumosDisponibles = [
    'Vacuna antirrábica',
    'Jeringa 3ml',
    'Desparasitante oral',
    'Guantes',
    'Gasas estériles',
    'Aguja 21G',
    'Alcohol',
    'Sutura',
    'Anestesia'
];

// Productos e insumos de ejemplo
const productosDisponiblesList = [
    'Vacuna Rabia',
    'Antiparasitario',
    'Anestesia',
    'Sutura',
    'Antibiótico'
];
const insumosDisponiblesList = [
    'Jeringa 3ml',
    'Guantes',
    'Gasas estériles',
    'Aguja 21G',
    'Alcohol'
];

function renderInsumosOptions(selectId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    select.innerHTML = '';
    insumosDisponibles.forEach(insumo => {
        const option = document.createElement('option');
        option.value = insumo;
        option.textContent = insumo;
        select.appendChild(option);
    });
}

// Render dual listbox
function renderDualListbox() {
    const prodDisp = document.getElementById('productosDisponibles');
    const prodSel = document.getElementById('productosSeleccionados');
    const insDisp = document.getElementById('insumosDisponibles');
    const insSel = document.getElementById('insumosSeleccionados');
    if (prodDisp && prodSel) {
        prodDisp.innerHTML = '';
        productosDisponiblesList.forEach(p => {
            if (![...prodSel.options].some(opt => opt.value === p)) {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                prodDisp.appendChild(opt);
            }
        });
    }
    if (insDisp && insSel) {
        insDisp.innerHTML = '';
        insumosDisponiblesList.forEach(i => {
            if (![...insSel.options].some(opt => opt.value === i)) {
                const opt = document.createElement('option');
                opt.value = i;
                opt.textContent = i;
                insDisp.appendChild(opt);
            }
        });
    }
}

// Mover seleccionados entre listas
function moverSeleccionados(origenId, destinoId) {
    const origen = document.getElementById(origenId);
    const destino = document.getElementById(destinoId);
    if (!origen || !destino) return;
    Array.from(origen.selectedOptions).forEach(opt => {
        origen.removeChild(opt);
        destino.appendChild(opt);
    });
}

// Llama esto al cargar el DOM para ambos formularios
document.addEventListener('DOMContentLoaded', () => {
    renderInsumosOptions('insumosAdd');
    renderInsumosOptions('insumosEdit');
    renderDualListbox();
});