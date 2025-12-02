// Abrir modal nuevo paciente
function abrirModalNuevoPaciente() {
    const modal = document.getElementById('modalNuevoPaciente');
    modal.classList.remove('hide');
    // Usar setTimeout para permitir que el DOM se actualice antes de agregar 'show'
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Cerrar modal
function closeVetModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    // Esperar a que termine la animación antes de ocultar
    setTimeout(() => {
        modal.classList.add('hide');
        // Limpiar formulario si es el modal de nuevo paciente
        if (modalId === 'modalNuevoPaciente') {
            const form = document.getElementById('addPacienteForm');
            if (form) form.reset();
        }
    }, 350); // Mismo tiempo que la transición CSS (0.35s)
}

// Guardar nuevo paciente
function saveNewPaciente() {
    const form = document.getElementById('addPacienteForm');
    const formData = new FormData(form);
    
    // Validar campos requeridos
    if (!formData.get('nombre') || !formData.get('especie') || !formData.get('sexo') || !formData.get('propietario')) {
        alert('Por favor completa todos los campos obligatorios');
        return;
    }
    
    const data = {
        nombre: formData.get('nombre'),
        especie: formData.get('especie'),
        raza: formData.get('raza') || '',
        edad: formData.get('edad') || '',
        sexo: formData.get('sexo'),
        propietario: formData.get('propietario'),
    };
    
    fetch('/hospital/pacientes/crear/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Paciente creado exitosamente');
            closeVetModal('modalNuevoPaciente');
            // Redirigir a la ficha del paciente
            setTimeout(() => {
                window.location.href = `/hospital/pacientes/${data.paciente_id}/`;
            }, 400);
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al crear el paciente');
    });
}

// Toggle wheel (botón de gestión)
function toggleWheel(button) {
    const options = button.parentElement.querySelector('.manage-options');
    // Cerrar todos los demás wheels abiertos
    document.querySelectorAll('.manage-options').forEach(opt => {
        if (opt !== options) {
            opt.style.display = 'none';
        }
    });
    // Toggle el actual
    options.style.display = options.style.display === 'none' ? 'block' : 'none';
}

// Cerrar wheels al hacer click fuera
document.addEventListener('click', function(event) {
    if (!event.target.closest('.manage-wheel')) {
        document.querySelectorAll('.manage-options').forEach(opt => {
            opt.style.display = 'none';
        });
    }
});

// Abrir modal de edición de paciente
function abrirModalPaciente(button, mode, pacienteId) {
    const modal = document.getElementById('modalPaciente');
    modal.classList.remove('hide');
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    console.log('Editar paciente:', pacienteId);
    
    // Aquí podrías hacer un fetch para cargar los datos del paciente
    // fetch(`/hospital/pacientes/${pacienteId}/datos/`)
    //     .then(response => response.json())
    //     .then(data => {
    //         if (data.success) {
    //             // Llenar los campos con los datos
    //         }
    //     })
    //     .catch(error => console.error('Error:', error));
}

// Cerrar modal paciente
function closePacienteModal() {
    const modal = document.getElementById('modalPaciente');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hide');
    }, 350);
}

// Switch a modo edición
function switchToEditModePaciente() {
    document.querySelectorAll('.field-view').forEach(el => el.classList.add('d-none'));
    document.querySelectorAll('.field-edit').forEach(el => el.classList.remove('d-none'));
    document.getElementById('btnEditarPaciente').classList.add('d-none');
    document.getElementById('btnGuardarPaciente').classList.remove('d-none');
}

// Guardar paciente editado
function guardarPacienteEditado() {
    alert('Funcionalidad de edición en desarrollo');
}

// Abrir modal eliminar
function abrirModalEliminarPaciente(button, pacienteId) {
    const modal = document.getElementById('modalEliminarPaciente');
    modal.classList.remove('hide');
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    
    // Guardar el ID del paciente a eliminar
    document.getElementById('btnConfirmarEliminarPaciente').setAttribute('data-paciente-id', pacienteId);
}

// Cerrar modal eliminar
function closeEliminarPacienteModal() {
    const modal = document.getElementById('modalEliminarPaciente');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hide');
    }, 350);
}

// Confirmar eliminación
document.addEventListener('DOMContentLoaded', function() {
    const btnConfirmar = document.getElementById('btnConfirmarEliminarPaciente');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', function() {
            const pacienteId = this.getAttribute('data-paciente-id');
            
            if (!pacienteId) {
                alert('Error: No se encontró el ID del paciente');
                return;
            }
            
            fetch(`/hospital/pacientes/${pacienteId}/eliminar/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Paciente eliminado exitosamente');
                    closeEliminarPacienteModal();
                    closePacienteModal();
                    setTimeout(() => {
                        window.location.reload();
                    }, 400);
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al eliminar el paciente');
            });
        });
    }
    
    // Cerrar modal al hacer clic en el overlay
    document.querySelectorAll('.vet-modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', function(e) {
            if (e.target === this) {
                const modalId = this.id;
                if (modalId === 'modalNuevoPaciente') {
                    closeVetModal(modalId);
                } else if (modalId === 'modalPaciente') {
                    closePacienteModal();
                } else if (modalId === 'modalEliminarPaciente') {
                    closeEliminarPacienteModal();
                }
            }
        });
    });
});