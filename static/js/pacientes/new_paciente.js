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

// Normalizar teléfono chileno a formato +569XXXXXXXX
function normalizeChilePhone(phone) {
    if (!phone) return phone;
    // Eliminar caracteres no numéricos excepto +
    let normalized = phone.replace(/[^\d+]/g, '');
    // Si empieza con +56, mantener
    if (normalized.startsWith('+56')) {
        normalized = '+56' + normalized.substring(3).replace(/\D/g, '');
    } else if (normalized.startsWith('56')) {
        normalized = '+56' + normalized.substring(2);
    } else {
        // Sin prefijo de país, agregar +56
        normalized = '+56' + normalized;
    }
    return normalized;
}

// Abrir modal en modo nuevo
function abrirModalNuevoPaciente() {
    console.log('Abriendo modal nuevo paciente');
    
    // Resetear formulario
    document.getElementById('addPacienteForm').reset();
    document.getElementById('pacienteIdEdit').value = '';
    limpiarPropietario();
    
    // Modo propietario: crear nuevo
    const radioNuevo = document.getElementById('modoPropietarioNuevo');
    if (radioNuevo) {
        radioNuevo.checked = true;
    }
    setModoPropietario('nuevo');
    
    // Cambiar título
    document.getElementById('tituloModalPaciente').textContent = 'Nuevo Paciente';
    
    // Mostrar sección de búsqueda (oculta)
    document.getElementById('seccionBusquedaPropietario').style.display = 'none';
    
    // Abrir modal
    const modal = document.getElementById('modalNuevoPaciente');
    modal.classList.remove('hide');
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Abrir modal en modo edición
function abrirModalPaciente(button, mode, pacienteId) {
    if (mode !== 'edit') return;
    
    console.log('Abriendo modal editar paciente:', pacienteId);
    
    // Cargar datos del paciente
    fetch(`/pacientes/detalle/${pacienteId}/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const paciente = data.paciente;
                const propietario = data.propietario;
                
                console.log('Datos cargados:', paciente, propietario);
                
                // Llenar datos del paciente (solo campos que existen en la template)
                document.getElementById('pacienteIdEdit').value = paciente.id;
                document.getElementById('pacienteNombre').value = paciente.nombre;
                document.getElementById('pacienteEspecie').value = paciente.especie;
                document.getElementById('pacienteRaza').value = paciente.raza || '';
                document.getElementById('pacienteSexo').value = paciente.sexo;
                document.getElementById('pacienteEdad').value = paciente.edad || '';
                
                // Llenar datos del propietario
                document.getElementById('propietarioId').value = propietario.id;
                document.getElementById('propietarioNombre').value = propietario.nombre;
                document.getElementById('propietarioApellido').value = propietario.apellido;
                document.getElementById('propietarioTelefono').value = propietario.telefono || '';
                document.getElementById('propietarioEmail').value = propietario.email || '';
                document.getElementById('propietarioDireccion').value = propietario.direccion || '';
                
                // Mostrar badge de propietario seleccionado
                document.getElementById('propietarioNombreDisplay').textContent = propietario.nombre_completo;
                document.getElementById('propietarioSeleccionadoBadge').style.display = 'block';
                
                // Cambiar título
                document.getElementById('tituloModalPaciente').textContent = 'Editar Paciente';
                
                // Abrir modal
                const modal = document.getElementById('modalNuevoPaciente');
                modal.classList.remove('hide');
                setTimeout(() => {
                    modal.classList.add('show');
                }, 10);
            } else {
                alert('Error al cargar datos del paciente: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cargar el paciente');
        });
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
    
    fetch(`/pacientes/buscar_propietarios/?q=${encodeURIComponent(busqueda)}`)
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
    
    fetch(`/pacientes/propietarios/${propietarioId}/`)
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
                
                // Mostrar badge de selección
                document.getElementById('propietarioNombreDisplay').textContent = prop.nombre_completo;
                document.getElementById('propietarioSeleccionadoBadge').style.display = 'block';
                document.getElementById('propietarioModo').value = 'existente';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cargar datos del propietario');
        });
}

// Limpiar selección de propietario
function limpiarPropietario() {
    document.getElementById('propietarioId').value = '';
    document.getElementById('propietarioNombre').value = '';
    document.getElementById('propietarioApellido').value = '';
    document.getElementById('propietarioTelefono').value = '';
    document.getElementById('propietarioEmail').value = '';
    document.getElementById('propietarioDireccion').value = '';
    document.getElementById('propietarioModo').value = 'nuevo';
    
    document.getElementById('propietarioSeleccionadoBadge').style.display = 'none';
    document.getElementById('selectPropietario').value = '';
    document.getElementById('resultadosPropietarios').style.display = 'none';
}

// Cambiar modo de propietario (nuevo o existente)
function setModoPropietario(modo) {
    const seccionBusqueda = document.getElementById('seccionBusquedaPropietario');
    document.getElementById('propietarioModo').value = modo;

    if (modo === 'existente') {
        // Mostrar búsqueda, limpiar formulario
        seccionBusqueda.style.display = 'block';
        document.getElementById('propietarioSeleccionadoBadge').style.display = 'none';
        document.getElementById('propietarioId').value = '';
        document.getElementById('propietarioNombre').value = '';
        document.getElementById('propietarioApellido').value = '';
        document.getElementById('propietarioTelefono').value = '';
        document.getElementById('propietarioEmail').value = '';
        document.getElementById('propietarioDireccion').value = '';
        document.getElementById('selectPropietario').value = '';
        document.getElementById('resultadosPropietarios').style.display = 'none';
    } else if (modo === 'nuevo') {
        // Ocultar búsqueda, limpiar todo
        seccionBusqueda.style.display = 'none';
        limpiarPropietario();
    }
}

// Guardar paciente (crear o editar)
function saveNewPaciente() {
    console.log('=== INICIANDO GUARDADO DE PACIENTE ===');
    
    const pacienteId = document.getElementById('pacienteIdEdit').value;
    const esEdicion = pacienteId !== '';
    
    // Obtener modo propietario
    const radioModo = document.querySelector('input[name="modoPropietario"]:checked');
    const modoPropietario = radioModo ? radioModo.value : document.getElementById('propietarioModo').value;
    
    // Obtener valores del propietario
    const propietarioId = document.getElementById('propietarioId').value;
    const propietarioNombre = document.getElementById('propietarioNombre').value.trim();
    const propietarioApellido = document.getElementById('propietarioApellido').value.trim();
    let propietarioTelefono = document.getElementById('propietarioTelefono').value.trim();
    const propietarioEmail = document.getElementById('propietarioEmail').value.trim();
    const propietarioDireccion = document.getElementById('propietarioDireccion').value.trim();
    
    // Obtener valores del paciente
    const nombrePaciente = document.getElementById('pacienteNombre').value.trim();
    const especiePaciente = document.getElementById('pacienteEspecie').value;
    const sexoPaciente = document.getElementById('pacienteSexo').value;
    const razaPaciente = document.getElementById('pacienteRaza').value.trim();
    const edadPaciente = document.getElementById('pacienteEdad').value.trim();
    
    console.log('Es edición:', esEdicion);
    console.log('Modo propietario:', modoPropietario);
    
    // Validar propietario
    if (!propietarioNombre || !propietarioApellido || !propietarioTelefono) {
        alert('Error: Debes completar Nombre, Apellido y Teléfono del propietario');
        return;
    }
    
    // Validar teléfono
    const phoneValid = /^(?:\+?56)?\s*9\s*\d{8}$/.test(propietarioTelefono);
    if (!phoneValid) {
        alert('Error: Teléfono chileno inválido. Formato esperado: +56912345678 o 912345678');
        return;
    }
    
    // Validar email si está presente
    if (propietarioEmail && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(propietarioEmail)) {
        alert('Error: Correo electrónico inválido');
        return;
    }
    
    // Normalizar teléfono
    propietarioTelefono = normalizeChilePhone(propietarioTelefono);
    
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
        propietario_id: modoPropietario === 'nuevo' ? null : (propietarioId || null),
        actualizar_propietario: modoPropietario !== 'nuevo',
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
            raza: razaPaciente,
            sexo: sexoPaciente,
            edad: edadPaciente,
        }
    };
    
    console.log('Datos a enviar:', JSON.stringify(data, null, 2));
    
    // Determinar URL
    const url = esEdicion 
        ? `/pacientes/editar/${pacienteId}/` 
        : '/pacientes/crear/';
    
    // Enviar datos
    fetch(url, {
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
            const mensaje = esEdicion ? '¡Paciente actualizado exitosamente!' : '¡Paciente creado exitosamente!';
            alert(mensaje);
            closeVetModal('modalNuevoPaciente');
            setTimeout(() => {
                window.location.reload();
            }, 400);
        } else {
            alert('Error: ' + (data.error || 'Error desconocido'));
        }
    })
    .catch(error => {
        console.error('Error completo:', error);
        alert('Error de conexión: ' + error.message);
    });
}

// Modal eliminar
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

// Toggle wheel
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

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Inicializando modales pacientes');
    
    // ===== MODAL ELIMINAR PACIENTE =====
    const btnConfirmar = document.getElementById('btnConfirmarEliminarPaciente');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', function() {
            const pacienteId = this.getAttribute('data-paciente-id');
            
            if (!pacienteId) {
                alert('Error: No se encontró el ID del paciente');
                return;
            }
            
            fetch(`/pacientes/eliminar/${pacienteId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
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

    // ===== MODO PROPIETARIO (nuevo / existente) =====
    const modoPropietarioRadios = document.querySelectorAll('input[name="modoPropietario"]');
    modoPropietarioRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            setModoPropietario(this.value);
        });
    });
    
    console.log('Inicialización completada');
});