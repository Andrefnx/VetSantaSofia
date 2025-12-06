// Abrir modal nuevo paciente
function abrirModalNuevoPaciente() {
    const modal = document.getElementById('modalNuevoPaciente');
    modal.classList.remove('hide');
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Cerrar modal
function closeVetModal(modalId) {
    const modal = document.getElementById(modalId);
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hide');
        if (modalId === 'modalNuevoPaciente') {
            document.getElementById('addPacienteForm').reset();
            limpiarPropietario();
        }
    }, 350);
}

// Buscar propietarios
function buscarPropietarios() {
    const busqueda = document.getElementById('buscarPropietario').value.trim();
    
    if (busqueda.length < 2) {
        alert('Ingresa al menos 2 caracteres para buscar');
        return;
    }
    
    fetch(`/hospital/propietarios/buscar/?q=${encodeURIComponent(busqueda)}`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.propietarios.length > 0) {
                const select = document.getElementById('selectPropietario');
                select.innerHTML = '<option value="">Selecciona un propietario...</option>';
                
                data.propietarios.forEach(prop => {
                    const option = document.createElement('option');
                    option.value = prop.id;
                    option.textContent = `${prop.nombre_completo} - ${prop.telefono}${prop.email ? ' - ' + prop.email : ''}`;
                    select.appendChild(option);
                });
                
                document.getElementById('resultadosPropietarios').style.display = 'block';
            } else {
                alert('No se encontraron propietarios con ese criterio');
                document.getElementById('resultadosPropietarios').style.display = 'none';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al buscar propietarios');
        });
}

// Seleccionar propietario existente
function seleccionarPropietario(propietarioId) {
    if (!propietarioId) {
        limpiarPropietario();
        return;
    }
    
    fetch(`/hospital/propietarios/${propietarioId}/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const prop = data.propietario;
                
                // Llenar campos
                document.getElementById('propietarioId').value = prop.id;
                document.getElementById('propietarioNombre').value = prop.nombre;
                document.getElementById('propietarioApellido').value = prop.apellido;
                document.getElementById('propietarioTelefono').value = prop.telefono || '';
                document.getElementById('propietarioEmail').value = prop.email || '';
                document.getElementById('propietarioDireccion').value = prop.direccion || '';
                
                // Deshabilitar campos
                bloquearCamposPropietario();
                
                // Mostrar botones de edición
                mostrarBotonesEdicion();
                
                // Mostrar badge de selección
                document.getElementById('propietarioNombreDisplay').textContent = prop.nombre_completo;
                document.getElementById('propietarioSeleccionadoBadge').style.display = 'block';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cargar datos del propietario');
        });
}

// Bloquear campos de propietario
function bloquearCamposPropietario() {
    document.getElementById('propietarioNombre').disabled = true;
    document.getElementById('propietarioApellido').disabled = true;
    document.getElementById('propietarioTelefono').disabled = true;
    document.getElementById('propietarioEmail').disabled = true;
    document.getElementById('propietarioDireccion').disabled = true;
}

// Desbloquear campos de propietario
function desbloquearCamposPropietario() {
    document.getElementById('propietarioNombre').disabled = false;
    document.getElementById('propietarioApellido').disabled = false;
    document.getElementById('propietarioTelefono').disabled = false;
    document.getElementById('propietarioEmail').disabled = false;
    document.getElementById('propietarioDireccion').disabled = false;
}

// Mostrar botones de edición individual
function mostrarBotonesEdicion() {
    document.getElementById('btnEditarNombre').classList.remove('d-none');
    document.getElementById('btnEditarApellido').classList.remove('d-none');
    document.getElementById('btnEditarTelefono').classList.remove('d-none');
    document.getElementById('btnEditarEmail').classList.remove('d-none');
    document.getElementById('btnEditarDireccion').classList.remove('d-none');
}

// Ocultar botones de edición individual
function ocultarBotonesEdicion() {
    document.getElementById('btnEditarNombre').classList.add('d-none');
    document.getElementById('btnEditarApellido').classList.add('d-none');
    document.getElementById('btnEditarTelefono').classList.add('d-none');
    document.getElementById('btnEditarEmail').classList.add('d-none');
    document.getElementById('btnEditarDireccion').classList.add('d-none');
}

// Habilitar edición de todos los campos del propietario
function habilitarEdicionPropietario() {
    desbloquearCamposPropietario();
    document.getElementById('advertenciaEdicion').style.display = 'block';
    
    // Cambiar el texto del botón
    const badge = document.getElementById('propietarioSeleccionadoBadge');
    const btnEditar = badge.querySelector('.btn-warning');
    btnEditar.innerHTML = '<i class="bi bi-lock"></i> Bloquear campos';
    btnEditar.onclick = function() {
        bloquearCamposPropietario();
        document.getElementById('advertenciaEdicion').style.display = 'none';
        btnEditar.innerHTML = '<i class="bi bi-pencil"></i> Editar datos';
        btnEditar.onclick = habilitarEdicionPropietario;
    };
}

// Habilitar edición de un campo individual
function habilitarCampoPropietario(campoId, btnId) {
    const campo = document.getElementById(campoId);
    const btn = document.getElementById(btnId);
    
    if (campo.disabled) {
        campo.disabled = false;
        campo.focus();
        btn.classList.remove('btn-outline-secondary');
        btn.classList.add('btn-success');
        btn.innerHTML = '<i class="bi bi-check"></i>';
        btn.title = 'Campo habilitado';
        document.getElementById('advertenciaEdicion').style.display = 'block';
    } else {
        campo.disabled = true;
        btn.classList.remove('btn-success');
        btn.classList.add('btn-outline-secondary');
        btn.innerHTML = '<i class="bi bi-pencil"></i>';
        btn.title = 'Editar ' + campo.name.replace('propietario_', '');
    }
}

// Limpiar selección de propietario
function limpiarPropietario() {
    document.getElementById('propietarioId').value = '';
    document.getElementById('propietarioNombre').value = '';
    document.getElementById('propietarioApellido').value = '';
    document.getElementById('propietarioTelefono').value = '';
    document.getElementById('propietarioEmail').value = '';
    document.getElementById('propietarioDireccion').value = '';
    
    desbloquearCamposPropietario();
    ocultarBotonesEdicion();
    
    document.getElementById('propietarioSeleccionadoBadge').style.display = 'none';
    document.getElementById('advertenciaEdicion').style.display = 'none';
    document.getElementById('selectPropietario').value = '';
    document.getElementById('resultadosPropietarios').style.display = 'none';
}

// Guardar nuevo paciente (actualizado)
function saveNewPaciente() {
    console.log('=== INICIANDO GUARDADO DE PACIENTE ===');
    
    const form = document.getElementById('addPacienteForm');
    const formData = new FormData(form);
    
    // Obtener valores
    const propietarioId = document.getElementById('propietarioId').value;
    const propietarioNombre = document.getElementById('propietarioNombre').value.trim();
    const propietarioApellido = document.getElementById('propietarioApellido').value.trim();
    const propietarioTelefono = document.getElementById('propietarioTelefono').value.trim();
    const propietarioEmail = document.getElementById('propietarioEmail').value.trim();
    const propietarioDireccion = document.getElementById('propietarioDireccion').value.trim();
    
    const nombrePaciente = formData.get('nombre').trim();
    const especiePaciente = formData.get('especie');
    const sexoPaciente = formData.get('sexo');
    
    console.log('Propietario ID:', propietarioId);
    console.log('Propietario Nombre:', propietarioNombre);
    console.log('Propietario Apellido:', propietarioApellido);
    console.log('Propietario Teléfono:', propietarioTelefono);
    console.log('Paciente Nombre:', nombrePaciente);
    console.log('Paciente Especie:', especiePaciente);
    console.log('Paciente Sexo:', sexoPaciente);
    
    // Validar propietario
    if (!propietarioNombre || !propietarioApellido || !propietarioTelefono) {
        alert('Error: Debes completar Nombre, Apellido y Teléfono del propietario');
        return;
    }
    
    // Validar paciente
    if (!nombrePaciente) {
        alert('Error: El nombre del paciente es obligatorio');
        return;
    }
    
    if (!especiePaciente) {
        alert('Error: La especie del paciente es obligatoria');
        return;
    }
    
    if (!sexoPaciente) {
        alert('Error: El sexo del paciente es obligatorio');
        return;
    }
    
    // Construir datos
    const data = {
        propietario_id: propietarioId || null,
        actualizar_propietario: propietarioId ? true : false, // Flag para actualizar propietario existente
        propietario: {
            nombre: propietarioNombre,
            apellido: propietarioApellido,
            telefono: propietarioTelefono,
            email: propietarioEmail,
            direccion: propietarioDireccion,
        },
        paciente: {
            nombre: nombrePaciente,
            especie: especiePaciente,
            raza: formData.get('raza') || '',
            edad: formData.get('edad') || '',
            sexo: sexoPaciente,
            color: formData.get('color') || '',
            microchip: formData.get('microchip') || '',
            ultimo_peso: formData.get('peso') || null,
            observaciones: formData.get('observaciones') || '',
        }
    };
    
    console.log('Datos a enviar:', JSON.stringify(data, null, 2));
    
    // Enviar datos
    fetch('/hospital/pacientes/crear/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('Response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Response data:', data);
        if (data.success) {
            alert('¡Paciente creado exitosamente!');
            closeVetModal('modalNuevoPaciente');
            setTimeout(() => {
                window.location.href = `/hospital/pacientes/${data.paciente_id}/`;
            }, 400);
        } else {
            alert('Error al crear paciente: ' + (data.error || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error completo:', error);
        alert('Error de conexión: ' + error.message);
    });
}

// Función para obtener el CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Toggle wheel (botón de gestión)
function toggleWheel(button) {
    const options = button.parentElement.querySelector('.manage-options');
    document.querySelectorAll('.manage-options').forEach(opt => {
        if (opt !== options) {
            opt.style.display = 'none';
        }
    });
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

// Otras funciones...
function abrirModalPaciente(button, mode, pacienteId) {
    console.log('Editar paciente:', pacienteId);
}

function closePacienteModal() {
    const modal = document.getElementById('modalPaciente');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hide');
    }, 350);
}

function switchToEditModePaciente() {
    alert('Funcionalidad en desarrollo');
}

function guardarPacienteEditado() {
    alert('Funcionalidad en desarrollo');
}

function abrirModalEliminarPaciente(button, pacienteId) {
    const modal = document.getElementById('modalEliminarPaciente');
    modal.classList.remove('hide');
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    document.getElementById('btnConfirmarEliminarPaciente').setAttribute('data-paciente-id', pacienteId);
}

function closeEliminarPacienteModal() {
    const modal = document.getElementById('modalEliminarPaciente');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.classList.add('hide');
    }, 350);
}

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
});