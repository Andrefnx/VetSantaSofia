function saveNewPaciente() {
    const form = document.getElementById('addPacienteForm');
    const formData = new FormData(form);

    const nombre = formData.get('nombre');
    const especie = formData.get('especie');
    const sexo = formData.get('sexo');
    const rutCliente = formData.get('rutCliente');
    const dvCliente = formData.get('dvCliente');
    const nombreCliente = formData.get('nombreCliente');

    if (!nombre || !especie || !sexo || !rutCliente || !dvCliente || !nombreCliente) {
        alert('Por favor, complete todos los campos obligatorios.');
        return;
    }

    
    fetch('/hospital/pacientes/crear/', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': formData.get('csrfmiddlewaretoken')
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closeVetModal('modalNuevoPaciente');
            location.reload();
        } else {
            alert('Error al crear el paciente: ' + (data.error || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al crear el paciente. Intente nuevamente.');
    });
}

function abrirModalPaciente(button, mode) {
    const row = button.closest('tr');
    const cells = row.querySelectorAll('td');
    const nombre = cells[0].textContent.trim();
    const especie = cells[1].textContent.trim();
    const raza = cells[2].textContent.trim();
    const edad = cells[3].textContent.replace(' años', '').trim();
    const sexo = cells[4].textContent.trim();
    const propietario = cells[5].textContent.trim();

    
    fetch(`/hospital/pacientes/${row.dataset.mascotaId}/data/`)
        .then(response => response.json())
        .then(data => {
            document.querySelector('[data-field="nombre"]').textContent = data.nombreMascota;
            document.querySelector('[data-field="especie"]').textContent = data.animal_mascota;
            document.querySelector('[data-field="raza"]').textContent = data.raza_mascota;
            document.querySelector('[data-field="edad"]').textContent = data.edad;
            document.querySelector('[data-field="sexo"]').textContent = data.sexo;
            document.querySelector('[data-field="peso"]').textContent = data.peso;
            document.querySelector('[data-field="rutCliente"]').textContent = data.idCliente.rutCliente;
            document.querySelector('[data-field="dvCliente"]').textContent = data.idCliente.dvCliente;
            document.querySelector('[data-field="nombreCliente"]').textContent = data.idCliente.nombreCliente;
            document.querySelector('[data-field="telCliente"]').textContent = data.idCliente.telCliente;
            document.querySelector('[data-field="emailCliente"]').textContent = data.idCliente.emailCliente;
            document.querySelector('[data-field="direccion"]').textContent = data.idCliente.direccion;
            document.querySelector('[data-field="nombre"].field-edit').value = data.nombreMascota;
            document.querySelector('[data-field="especie"].field-edit').value = data.animal_mascota;
            document.querySelector('[data-field="raza"].field-edit').value = data.raza_mascota;
            document.querySelector('[data-field="edad"].field-edit').value = data.edad;
            document.querySelector('[data-field="sexo"].field-edit').value = data.sexo;
            document.querySelector('[data-field="peso"].field-edit').value = data.peso;
            document.querySelector('[data-field="rutCliente"].field-edit').value = data.idCliente.rutCliente;
            document.querySelector('[data-field="dvCliente"].field-edit').value = data.idCliente.dvCliente;
            document.querySelector('[data-field="nombreCliente"].field-edit').value = data.idCliente.nombreCliente;
            document.querySelector('[data-field="telCliente"].field-edit').value = data.idCliente.telCliente;
            document.querySelector('[data-field="emailCliente"].field-edit').value = data.idCliente.emailCliente;
            document.querySelector('[data-field="direccion"].field-edit').value = data.idCliente.direccion;

            document.getElementById('modalPacienteTitulo').textContent = `Detalles de ${data.nombreMascota}`;

            if (mode === 'view') {
                document.getElementById('btnEditarPaciente').classList.remove('d-none');
                document.getElementById('btnGuardarPaciente').classList.add('d-none');
                document.getElementById('btnEliminarPaciente').classList.add('d-none');
                document.querySelectorAll('.field-view').forEach(el => el.classList.remove('d-none'));
                document.querySelectorAll('.field-edit').forEach(el => el.classList.add('d-none'));
            } else if (mode === 'edit') {
                switchToEditModePaciente();
            }

            openVetModal('modalPaciente');
        })
        .catch(error => {
            console.error('Error fetching patient data:', error);
            alert('Error al cargar los datos del paciente.');
        });
}

function switchToEditModePaciente() {
    document.getElementById('btnEditarPaciente').classList.add('d-none');
    document.getElementById('btnGuardarPaciente').classList.remove('d-none');
    document.getElementById('btnEliminarPaciente').classList.remove('d-none');
    document.querySelectorAll('.field-view').forEach(el => el.classList.add('d-none'));
    document.querySelectorAll('.field-edit').forEach(el => el.classList.remove('d-none'));
}

function guardarPacienteEditado() {
    const row = document.querySelector('tr[data-mascota-id]');
    const mascotaId = row ? row.getAttribute('data-mascota-id') : null;

    if (!mascotaId) {
        alert('Error: No se pudo identificar la mascota a editar.');
        return;
    }

    const formData = new FormData();
    formData.append('nombre', document.querySelector('[data-field="nombre"].field-edit').value);
    formData.append('especie', document.querySelector('[data-field="especie"].field-edit').value);
    formData.append('raza', document.querySelector('[data-field="raza"].field-edit').value);
    formData.append('edad', document.querySelector('[data-field="edad"].field-edit').value);
    formData.append('sexo', document.querySelector('[data-field="sexo"].field-edit').value);
    formData.append('peso', document.querySelector('[data-field="peso"].field-edit').value);
    formData.append('rutCliente', document.querySelector('[data-field="rutCliente"].field-edit').value);
    formData.append('dvCliente', document.querySelector('[data-field="dvCliente"].field-edit').value);
    formData.append('nombreCliente', document.querySelector('[data-field="nombreCliente"].field-edit').value);
    formData.append('telCliente', document.querySelector('[data-field="telCliente"].field-edit').value);
    formData.append('emailCliente', document.querySelector('[data-field="emailCliente"].field-edit').value);
    formData.append('direccion', document.querySelector('[data-field="direccion"].field-edit').value);

    const nombre = formData.get('nombre');
    const especie = formData.get('especie');
    const sexo = formData.get('sexo');
    const rutCliente = formData.get('rutCliente');
    const dvCliente = formData.get('dvCliente');
    const nombreCliente = formData.get('nombreCliente');

    if (!nombre || !especie || !sexo || !rutCliente || !dvCliente || !nombreCliente) {
        alert('Por favor, complete todos los campos obligatorios.');
        return;
    }

    fetch(`/hospital/pacientes/${mascotaId}/editar/`, {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            closePacienteModal();
            location.reload();
        } else {
            alert('Error al editar el paciente: ' + (data.error || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al editar el paciente. Intente nuevamente.');
    });
}

function closePacienteModal() {
    closeVetModal('modalPaciente');
}

function abrirModalEliminarPaciente(button) {
    const row = button.closest('tr');
    const nombre = row.querySelectorAll('td')[0].textContent.trim();
    document.getElementById('eliminarPacienteMensaje').textContent = `¿Estás seguro que deseas eliminar a ${nombre}?`;
    openVetModal('modalEliminarPaciente');
}

function closeEliminarPacienteModal() {
    closeVetModal('modalEliminarPaciente');
}

// Filter functionality
document.addEventListener('DOMContentLoaded', function() {
    // Initialize filters with current values
    const especieFilter = document.getElementById('filterEspecie');
    const sexoFilter = document.getElementById('filterSexo');

    // Set initial selected values in dropdowns
    if (especieFilter && especieFilter.value) {
        const especieDropdown = especieFilter.closest('.vet-custom-select-wrapper').querySelector('.vet-selected-value');
        if (especieFilter.value === 'canino') {
            especieDropdown.textContent = 'Canino';
        } else if (especieFilter.value === 'felino') {
            especieDropdown.textContent = 'Felino';
        }
    }

    if (sexoFilter && sexoFilter.value) {
        const sexoDropdown = sexoFilter.closest('.vet-custom-select-wrapper').querySelector('.vet-selected-value');
        if (sexoFilter.value === 'macho') {
            sexoDropdown.textContent = 'Macho';
        } else if (sexoFilter.value === 'hembra') {
            sexoDropdown.textContent = 'Hembra';
        }
    }

    // Add event listeners to filter dropdowns
    document.querySelectorAll('.vet-custom-select-dropdown li').forEach(item => {
        item.addEventListener('click', function() {
            const value = this.getAttribute('data-value');
            const wrapper = this.closest('.vet-custom-select-wrapper');
            const selectedValue = wrapper.querySelector('.vet-selected-value');
            const hiddenInput = wrapper.querySelector('input[type="hidden"]');

            // Update display
            selectedValue.textContent = this.textContent;
            hiddenInput.value = value;

            // Apply filters
            applyFilters();
        });
    });
});

function applyFilters() {
    const especie = document.getElementById('filterEspecie').value;
    const sexo = document.getElementById('filterSexo').value;

    // Build query string
    const params = new URLSearchParams();
    if (especie) params.append('especie', especie);
    if (sexo) params.append('sexo', sexo);

    // Reload page with filters
    const url = window.location.pathname + (params.toString() ? '?' + params.toString() : '');
    window.location.href = url;
}
