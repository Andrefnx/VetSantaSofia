// Variables globales
let currentRow = null;
let formChanged = false;
let deleteConfirmed = false;
let allowClose = false;

// ====== DATOS DE SERVICIOS DE EJEMPLO ======
const serviceData = {
    'Vacunación': {
        tipo_servicio: 'Vacunación',
        descripcion: 'Vacuna antirrábica anual',
        duracion_minutos: 15,
        peso_animal: '6–15 kg',
        costo_base: 500,
        ajuste_peso: 50,
        insumos: ['Vacuna antirrábica', 'Jeringa 3ml'],
        costo_total: 570
    },
    'Desparasitación': {
        tipo_servicio: 'Desparasitación',
        descripcion: 'Desparasitación interna y externa',
        duracion_minutos: 10,
        peso_animal: '0–5 kg',
        costo_base: 300,
        ajuste_peso: 0,
        insumos: ['Desparasitante oral', 'Guantes'],
        costo_total: 320
    }
};

// ====== LISTA DE INSUMOS DISPONIBLES (puedes cargarla dinámicamente) ======
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

// ====== UTILIDADES ======
function setCurrentRow(row) {
    currentRow = row;
}

function getCurrentRow() {
    return currentRow;
}

// ====== DETECTAR CAMBIOS EN FORMULARIOS ======
function trackFormChanges(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    formChanged = false;

    form.querySelectorAll('input, select, textarea').forEach(field => {
        field.addEventListener('input', () => {
            formChanged = true;
        });
        field.addEventListener('change', () => {
            formChanged = true;
        });
    });
}

// ====== MODAL EDITAR SERVICIO ======
function openEditModal() {
    if (!currentRow) return;

    const tipoServicio = currentRow.cells[0].textContent.trim();
    const data = serviceData[tipoServicio] || {};
    const form = document.getElementById('editServiceForm');
    if (!form) return;

    // Resetear flags
    formChanged = false;
    allowClose = false;

    // Llenar campos
    form.tipo_servicio.value = data.tipo_servicio || '';
    form.descripcion.value = data.descripcion || '';
    form.duracion_minutos.value = data.duracion_minutos || '';
    form.peso_animal.value = data.peso_animal || '';
    form.costo_base.value = data.costo_base || '';
    form.ajuste_peso.value = data.ajuste_peso || '';
    form.costo_total.value = data.costo_total || '';

    // Seleccionar insumos en el multiselect
    const insumosSelect = form.insumos;
    if (insumosSelect) {
        Array.from(insumosSelect.options).forEach(option => {
            option.selected = data.insumos && data.insumos.includes(option.value);
        });
    }

    // Activar detección de cambios
    trackFormChanges('editServiceForm');

    new bootstrap.Modal(document.getElementById('editServiceModal')).show();
}

function saveEditService() {
    const form = document.getElementById('editServiceForm');
    if (form && form.checkValidity()) {
        allowClose = true;
        formChanged = false;
        bootstrap.Modal.getInstance(document.getElementById('editServiceModal')).hide();
        alert('✅ Cambios guardados exitosamente');
    } else if (form) {
        form.reportValidity();
    }
}

function cancelEditService() {
    if (formChanged) {
        const confirmCancel = confirm('⚠️ Tienes cambios sin guardar.\n\n¿Estás seguro de que deseas cancelar?\n\nLos cambios se perderán.');
        if (confirmCancel) {
            allowClose = true;
            formChanged = false;
            bootstrap.Modal.getInstance(document.getElementById('editServiceModal')).hide();
        }
    } else {
        allowClose = true;
        bootstrap.Modal.getInstance(document.getElementById('editServiceModal')).hide();
    }
}

// ====== MODAL AGREGAR SERVICIO ======
function openAddServiceModal() {
    const form = document.getElementById('addServiceForm');
    if (form) form.reset();

    // Limpiar selección de insumos
    const insumosSelect = form.insumos;
    if (insumosSelect) {
        Array.from(insumosSelect.options).forEach(option => option.selected = false);
    }

    formChanged = false;
    allowClose = false;
    trackFormChanges('addServiceForm');

    new bootstrap.Modal(document.getElementById('addServiceModal')).show();
}

function saveNewService() {
    const form = document.getElementById('addServiceForm');
    if (form && form.checkValidity()) {
        allowClose = true;
        formChanged = false;
        bootstrap.Modal.getInstance(document.getElementById('addServiceModal')).hide();
        alert('✅ Servicio agregado exitosamente');
    } else if (form) {
        form.reportValidity();
    }
}

function cancelAddService() {
    if (formChanged) {
        const confirmCancel = confirm('⚠️ Tienes cambios sin guardar.\n\n¿Estás seguro de que deseas cancelar?\n\nLos cambios se perderán.');
        if (confirmCancel) {
            allowClose = true;
            formChanged = false;
            bootstrap.Modal.getInstance(document.getElementById('addServiceModal')).hide();
        }
    } else {
        allowClose = true;
        bootstrap.Modal.getInstance(document.getElementById('addServiceModal')).hide();
    }
}

// ====== PREVENIR CIERRE ACCIDENTAL ======
document.addEventListener('DOMContentLoaded', () => {
    // Modal Editar Servicio
    const editServiceModal = document.getElementById('editServiceModal');
    if (editServiceModal) {
        editServiceModal.addEventListener('hide.bs.modal', (e) => {
            if (!allowClose && formChanged) {
                e.preventDefault();
                e.stopPropagation();
                const confirmCancel = confirm('⚠️ Tienes cambios sin guardar.\n\n¿Estás seguro de que deseas cerrar?\n\nLos cambios se perderán.');
                if (confirmCancel) {
                    allowClose = true;
                    formChanged = false;
                    bootstrap.Modal.getInstance(editServiceModal).hide();
                }
            }
        });
        editServiceModal.addEventListener('show.bs.modal', () => {
            formChanged = false;
            allowClose = false;
        });
        editServiceModal.addEventListener('hidden.bs.modal', () => {
            allowClose = false;
            formChanged = false;
        });
    }

    // Modal Agregar Servicio
    const addServiceModal = document.getElementById('addServiceModal');
    if (addServiceModal) {
        addServiceModal.addEventListener('hide.bs.modal', (e) => {
            if (!allowClose && formChanged) {
                e.preventDefault();
                e.stopPropagation();
                const confirmCancel = confirm('⚠️ Tienes cambios sin guardar.\n\n¿Estás seguro de que deseas cerrar?\n\nLos cambios se perderán.');
                if (confirmCancel) {
                    allowClose = true;
                    formChanged = false;
                    bootstrap.Modal.getInstance(addServiceModal).hide();
                }
            }
        });
        addServiceModal.addEventListener('show.bs.modal', () => {
            formChanged = false;
            allowClose = false;
        });
        addServiceModal.addEventListener('hidden.bs.modal', () => {
            allowClose = false;
            formChanged = false;
        });
    }
});

// ====== MULTISELECT DE INSUMOS ======
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

// Llama esto al cargar el DOM para ambos formularios
document.addEventListener('DOMContentLoaded', () => {
    renderInsumosOptions('insumosAdd');
    renderInsumosOptions('insumosEdit');
});