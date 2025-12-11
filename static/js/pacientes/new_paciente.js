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
    
    // Cambiar título y botones
    document.getElementById('tituloModalPaciente').textContent = 'Nuevo Paciente';
    document.getElementById('textoBotonGuardar').textContent = 'Guardar Paciente';
    
    // Mostrar sección de búsqueda
    document.getElementById('seccionBusquedaPropietario').style.display = 'none';
    document.getElementById('separadorPropietario').style.display = 'none';
    
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
                
                // Llenar datos del paciente
                document.getElementById('pacienteIdEdit').value = paciente.id;
                document.getElementById('pacienteNombre').value = paciente.nombre;
                document.getElementById('pacienteEspecie').value = paciente.especie;
                document.getElementById('pacienteRaza').value = paciente.raza || '';
                document.getElementById('pacienteSexo').value = paciente.sexo;
                document.getElementById('pacienteColor').value = paciente.color || '';
                document.getElementById('pacienteMicrochip').value = paciente.microchip || '';
                document.getElementById('pacientePeso').value = paciente.ultimo_peso || '';
                document.getElementById('pacienteObservaciones').value = paciente.observaciones || '';
                
                // Llenar datos del propietario
                document.getElementById('propietarioId').value = propietario.id;
                document.getElementById('propietarioNombre').value = propietario.nombre;
                document.getElementById('propietarioApellido').value = propietario.apellido;
                document.getElementById('propietarioTelefono').value = propietario.telefono || '';
                document.getElementById('propietarioEmail').value = propietario.email || '';
                document.getElementById('propietarioDireccion').value = propietario.direccion || '';
                
                // Bloquear inicialmente pero permitir editar / cambiar
                bloquearCamposPropietario();
                mostrarBotonesEdicion();
                document.getElementById('propietarioNombreDisplay').textContent = propietario.nombre_completo;
                document.getElementById('propietarioSeleccionadoBadge').style.display = 'block';
                
                // Seleccionar modo "propietario actual"
                const radioActual = document.getElementById('modoPropietarioActual');
                if (radioActual) {
                    radioActual.checked = true;
                }
                setModoPropietario('actual');
                
                // Cambiar título y botones
                document.getElementById('tituloModalPaciente').textContent = 'Editar Paciente';
                document.getElementById('textoBotonGuardar').textContent = 'Actualizar Paciente';
                
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
                
                // Bloquear campos
                bloquearCamposPropietario();
                mostrarBotonesEdicion();
                
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
    document.getElementById('propietarioModo').value = 'nuevo';
    
    desbloquearCamposPropietario();
    ocultarBotonesEdicion();
    
    document.getElementById('propietarioSeleccionadoBadge').style.display = 'none';
    document.getElementById('advertenciaEdicion').style.display = 'none';
    document.getElementById('selectPropietario').value = '';
    document.getElementById('resultadosPropietarios').style.display = 'none';
}

// Cambiar modo de propietario (actual, existente, nuevo)
function setModoPropietario(modo) {
    const seccionBusqueda = document.getElementById('seccionBusquedaPropietario');
    const separador = document.getElementById('separadorPropietario');
    document.getElementById('propietarioModo').value = modo;

    if (modo === 'existente') {
        seccionBusqueda.style.display = 'block';
        separador.style.display = 'block';
        document.getElementById('propietarioSeleccionadoBadge').style.display = 'none';
        document.getElementById('advertenciaEdicion').style.display = 'none';
        document.getElementById('propietarioId').value = '';
        document.getElementById('propietarioNombre').value = '';
        document.getElementById('propietarioApellido').value = '';
        document.getElementById('propietarioTelefono').value = '';
        document.getElementById('propietarioEmail').value = '';
        document.getElementById('propietarioDireccion').value = '';
        document.getElementById('selectPropietario').value = '';
        document.getElementById('resultadosPropietarios').style.display = 'none';
        bloquearCamposPropietario();
        mostrarBotonesEdicion();
    } else {
        seccionBusqueda.style.display = 'none';
        separador.style.display = 'none';
    }

    if (modo === 'nuevo') {
        limpiarPropietario();
        desbloquearCamposPropietario();
    }

    if (modo === 'actual') {
        desbloquearCamposPropietario();
        mostrarBotonesEdicion();
    }
}

// Guardar paciente (crear o editar)
function saveNewPaciente() {
    console.log('=== INICIANDO GUARDADO DE PACIENTE ===');
    
    const pacienteId = document.getElementById('pacienteIdEdit').value;
    const esEdicion = pacienteId !== '';
    
    // Obtener valores
    const propietarioId = document.getElementById('propietarioId').value;
    const modoPropietario = document.querySelector('input[name="modoPropietario"]:checked')
        ? document.querySelector('input[name="modoPropietario"]:checked').value
        : document.getElementById('propietarioModo').value;
    const propietarioNombre = document.getElementById('propietarioNombre').value.trim();
    const propietarioApellido = document.getElementById('propietarioApellido').value.trim();
    const propietarioTelefono = document.getElementById('propietarioTelefono').value.trim();
    const propietarioEmail = document.getElementById('propietarioEmail').value.trim();
    const propietarioDireccion = document.getElementById('propietarioDireccion').value.trim();
    
    const nombrePaciente = document.getElementById('pacienteNombre').value.trim();
    const especiePaciente = document.getElementById('pacienteEspecie').value;
    const sexoPaciente = document.getElementById('pacienteSexo').value;
    
    console.log('Es edición:', esEdicion);
    console.log('Paciente ID:', pacienteId);
    console.log('Propietario ID:', propietarioId);
    
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
            raza: document.getElementById('pacienteRaza').value || '',
            sexo: sexoPaciente,
            color: document.getElementById('pacienteColor').value || '',
            microchip: document.getElementById('pacienteMicrochip').value.trim() || '',
            ultimo_peso: document.getElementById('pacientePeso').value || null,
            observaciones: document.getElementById('pacienteObservaciones').value || '',
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
                if (esEdicion) {
                    window.location.reload();
                } else {
                    window.location.href = `/pacientes/${data.paciente_id}/`;
                }
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

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Inicializando validaciones');
    
    // ===== VALIDACIÓN DE MICROCHIP (SOLO NÚMEROS) =====
    const microchipInput = document.getElementById('pacienteMicrochip');
    if (microchipInput) {
        console.log('Microchip input encontrado, agregando validaciones');
        
        // Validar mientras escribe
        microchipInput.addEventListener('input', function(e) {
            const cursorPosition = this.selectionStart;
            const valorAnterior = this.value;
            const valorLimpio = this.value.replace(/[^0-9]/g, '');
            
            if (valorAnterior !== valorLimpio) {
                this.value = valorLimpio;
                this.setSelectionRange(cursorPosition - 1, cursorPosition - 1);
                console.log('Caracteres no numéricos removidos');
            }
        });
        
        // Validar al pegar
        microchipInput.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedText = (e.clipboardData || window.clipboardData).getData('text');
            const numericOnly = pastedText.replace(/[^0-9]/g, '');
            
            // Insertar solo números
            const start = this.selectionStart;
            const end = this.selectionEnd;
            const currentValue = this.value;
            this.value = currentValue.substring(0, start) + numericOnly + currentValue.substring(end);
            
            // Posicionar cursor
            const newPosition = start + numericOnly.length;
            this.setSelectionRange(newPosition, newPosition);
            
            console.log('Texto pegado filtrado:', numericOnly);
        });
        
        // Prevenir arrastrar y soltar texto
        microchipInput.addEventListener('drop', function(e) {
            e.preventDefault();
            const droppedText = e.dataTransfer.getData('text');
            const numericOnly = droppedText.replace(/[^0-9]/g, '');
            this.value = numericOnly;
            console.log('Texto arrastrado filtrado:', numericOnly);
        });
        
        // Prevenir teclas no numéricas
        microchipInput.addEventListener('keypress', function(e) {
            // Permitir teclas especiales (backspace, delete, flechas, etc.)
            if (e.ctrlKey || e.metaKey || e.altKey) {
                return;
            }
            
            // Permitir teclas de navegación
            const specialKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'];
            if (specialKeys.includes(e.key)) {
                return;
            }
            
            // Solo permitir números 0-9
            if (!/[0-9]/.test(e.key)) {
                e.preventDefault();
                console.log('Tecla no numérica bloqueada:', e.key);
            }
        });
        
        console.log('Validaciones de microchip configuradas correctamente');
    } else {
        console.warn('Input de microchip no encontrado');
    }
    
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

    // ===== MODO PROPIETARIO (actual / existente / nuevo) =====
    const modoPropietarioRadios = document.querySelectorAll('input[name="modoPropietario"]');
    modoPropietarioRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            setModoPropietario(this.value);
        });
    });
});