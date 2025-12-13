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

// Variable global para guardar los datos originales del propietario en modo edición
let propietarioOriginal = null;

// Calcular edad a partir de fecha de nacimiento
function calcularEdad(fechaNacimiento) {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    
    let anos = hoy.getFullYear() - nacimiento.getFullYear();
    let meses = hoy.getMonth() - nacimiento.getMonth();
    let dias = hoy.getDate() - nacimiento.getDate();
    
    // Ajustar si los días son negativos
    if (dias < 0) {
        meses--;
        const mesAnterior = new Date(hoy.getFullYear(), hoy.getMonth(), 0);
        dias += mesAnterior.getDate();
    }
    
    // Ajustar si los meses son negativos
    if (meses < 0) {
        anos--;
        meses += 12;
    }
    
    return { anos, meses, dias };
}

// Mostrar edad calculada cuando cambia fecha
function mostrarEdadCalculada() {
    const fechaInput = document.getElementById('pacienteFechaNacimiento');
    const edadDisplay = document.getElementById('edadCalculada');
    
    if (fechaInput.value) {
        // Validar que la fecha sea válida
        const fechaObj = new Date(fechaInput.value);
        if (isNaN(fechaObj.getTime())) {
            edadDisplay.style.display = 'none';
            return;
        }
        
        const { anos, meses, dias } = calcularEdad(fechaInput.value);
        
        let edadTexto = '';
        
        // Si tiene menos de un mes, mostrar en días
        if (anos === 0 && meses === 0) {
            edadTexto = `📅 Edad: ${dias} día${dias !== 1 ? 's' : ''}`;
        } else {
            // Si tiene un mes o más, mostrar en años y meses
            edadTexto = `📅 Edad: ${anos} año${anos !== 1 ? 's' : ''} y ${meses} mes${meses !== 1 ? 'es' : ''}`;
        }
        
        edadDisplay.textContent = edadTexto;
        edadDisplay.style.display = 'block';
    } else {
        edadDisplay.style.display = 'none';
    }
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
    
    // Resetear la variable de propietario original
    propietarioOriginal = null;
    
    // Resetear formulario
    document.getElementById('addPacienteForm').reset();
    document.getElementById('pacienteIdEdit').value = '';
    limpiarPropietario();
    
    // Ocultar el botón "Editar actual" en modo nuevo
    const wrapperEditar = document.getElementById('wrapperEditarActual');
    if (wrapperEditar) {
        wrapperEditar.style.display = 'none';
    }
    
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
    
    // Resetear tipo de edad a fecha de nacimiento
    document.getElementById('tipoEdadFecha').checked = true;
    mostrarCampoEdad('fecha');
    
    // Abrir modal
    const modal = document.getElementById('modalNuevoPaciente');
    modal.classList.remove('hide');
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
}

// Mostrar/ocultar campos de edad según tipo
function mostrarCampoEdad(tipo) {
    const fieldFecha = document.getElementById('fieldFechaNacimiento');
    const fieldEstimada = document.getElementById('fieldEdadAproximada');
    
    if (tipo === 'fecha') {
        fieldFecha.style.display = 'block';
        fieldEstimada.style.display = 'none';
        document.getElementById('pacienteFechaNacimiento').focus();
    } else {
        fieldFecha.style.display = 'none';
        fieldEstimada.style.display = 'block';
        document.getElementById('pacienteEdadAnos').focus();
    }
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
                
                // Llenar sexo explícitamente
                const sexoSelect = document.getElementById('pacienteSexo');
                sexoSelect.value = paciente.sexo || '';
                console.log('Sexo cargado:', paciente.sexo, 'Valor en select:', sexoSelect.value);
                
                // Llenar edad: si tiene fecha_nacimiento, mostrar esa; si no, mostrar años/meses
                if (paciente.fecha_nacimiento) {
                    document.getElementById('tipoEdadFecha').checked = true;
                    mostrarCampoEdad('fecha');
                    document.getElementById('pacienteFechaNacimiento').value = paciente.fecha_nacimiento;
                    document.getElementById('pacienteEdadAnos').value = '';
                    document.getElementById('pacienteEdadMeses').value = '';
                    // Mostrar la edad calculada
                    setTimeout(mostrarEdadCalculada, 100);
                } else {
                    document.getElementById('tipoEdadEstimada').checked = true;
                    mostrarCampoEdad('estimada');
                    document.getElementById('pacienteFechaNacimiento').value = '';
                    document.getElementById('pacienteEdadAnos').value = paciente.edad_anos || '';
                    document.getElementById('pacienteEdadMeses').value = paciente.edad_meses || '';
                }
                
                // Llenar datos del propietario
                document.getElementById('propietarioId').value = propietario.id;
                document.getElementById('propietarioNombre').value = propietario.nombre;
                document.getElementById('propietarioApellido').value = propietario.apellido;
                document.getElementById('propietarioTelefono').value = propietario.telefono || '';
                document.getElementById('propietarioEmail').value = propietario.email || '';
                document.getElementById('propietarioDireccion').value = propietario.direccion || '';
                
                // GUARDAR datos originales del propietario para poder restaurarlos después
                propietarioOriginal = {
                    id: propietario.id,
                    nombre: propietario.nombre,
                    apellido: propietario.apellido,
                    telefono: propietario.telefono || '',
                    email: propietario.email || '',
                    direccion: propietario.direccion || '',
                    nombre_completo: propietario.nombre_completo
                };
                
                // Mostrar el botón "Editar actual" en modo edición
                const wrapperEditar = document.getElementById('wrapperEditarActual');
                if (wrapperEditar) {
                    wrapperEditar.style.display = '';
                }
                
                // Establecer modo a "editar" y mostrar los datos actuales del propietario
                document.getElementById('modoPropietarioEditar').checked = true;
                setModoPropietario('editar');
                
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
    } else if (modo === 'editar') {
        // Ocultar búsqueda, restaurar datos originales del propietario
        seccionBusqueda.style.display = 'none';
        
        // Restaurar datos originales si existen
        if (propietarioOriginal) {
            document.getElementById('propietarioId').value = propietarioOriginal.id;
            document.getElementById('propietarioNombre').value = propietarioOriginal.nombre;
            document.getElementById('propietarioApellido').value = propietarioOriginal.apellido;
            document.getElementById('propietarioTelefono').value = propietarioOriginal.telefono;
            document.getElementById('propietarioEmail').value = propietarioOriginal.email;
            document.getElementById('propietarioDireccion').value = propietarioOriginal.direccion;
        }
        
        document.getElementById('resultadosPropietarios').style.display = 'none';
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
    const skipPropietarioValidation = esEdicion && (modoPropietario === 'editar' || modoPropietario === 'existente');
    
    // Obtener valores del propietario
    let propietarioId = document.getElementById('propietarioId').value;
    let propietarioNombre = document.getElementById('propietarioNombre').value.trim();
    let propietarioApellido = document.getElementById('propietarioApellido').value.trim();
    let propietarioTelefono = document.getElementById('propietarioTelefono').value.trim();
    let propietarioEmail = document.getElementById('propietarioEmail').value.trim();
    let propietarioDireccion = document.getElementById('propietarioDireccion').value.trim();

    // Si omitimos validación, reutilizar datos originales si no fueron tocados
    if (skipPropietarioValidation && propietarioOriginal) {
        propietarioId = propietarioId || propietarioOriginal.id;
        propietarioNombre = propietarioNombre || propietarioOriginal.nombre;
        propietarioApellido = propietarioApellido || propietarioOriginal.apellido;
        propietarioTelefono = propietarioTelefono || propietarioOriginal.telefono;
        propietarioEmail = propietarioEmail || propietarioOriginal.email;
        propietarioDireccion = propietarioDireccion || propietarioOriginal.direccion;
    }
    
    // Obtener valores del paciente
    const nombrePaciente = document.getElementById('pacienteNombre').value.trim();
    const especiePaciente = document.getElementById('pacienteEspecie').value;
    const sexoPaciente = document.getElementById('pacienteSexo').value;
    const razaPaciente = document.getElementById('pacienteRaza').value.trim();
    
    // Obtener tipo de edad
    const tipoEdad = document.querySelector('input[name="tipoEdad"]:checked').value;
    let fechaNacimiento = '';
    let edadAnos = '';
    let edadMeses = '';
    
    if (tipoEdad === 'fecha') {
        fechaNacimiento = document.getElementById('pacienteFechaNacimiento').value;
        if (!fechaNacimiento) {
            alert('Error: Debes seleccionar una fecha de nacimiento');
            return;
        }
    } else {
        edadAnos = document.getElementById('pacienteEdadAnos').value || '';
        edadMeses = document.getElementById('pacienteEdadMeses').value || '';
        if (!edadAnos && !edadMeses) {
            alert('Error: Debes ingresar al menos una edad (años o meses)');
            return;
        }
    }
    
    console.log('Es edición:', esEdicion);
    console.log('Modo propietario:', modoPropietario);
    console.log('Tipo edad:', tipoEdad);
    
    // Validar propietario (solo si no estamos en modo editar-propietario)
    if (!skipPropietarioValidation) {
        if (!propietarioNombre || !propietarioApellido || !propietarioTelefono) {
            alert('Error: Debes completar Nombre, Apellido y Teléfono del propietario');
            return;
        }

        const phoneValid = /^(?:\+?56)?\s*9\s*\d{8}$/.test(propietarioTelefono);
        if (!phoneValid) {
            alert('Error: Teléfono chileno inválido. Formato esperado: +56912345678 o 912345678');
            return;
        }

        if (propietarioEmail && !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(propietarioEmail)) {
            alert('Error: Correo electrónico inválido');
            return;
        }

        propietarioTelefono = normalizeChilePhone(propietarioTelefono);
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
        propietario_id: modoPropietario === 'nuevo' ? null : (propietarioId || (propietarioOriginal ? propietarioOriginal.id : null)),
        actualizar_propietario: modoPropietario === 'editar' || (esEdicion && modoPropietario !== 'nuevo'),
        crear_nuevo_propietario: modoPropietario === 'nuevo',
        tipo_edad: tipoEdad,
        fecha_nacimiento: fechaNacimiento,
        edad_anos: edadAnos !== '' ? parseInt(edadAnos) : null,
        edad_meses: edadMeses !== '' ? parseInt(edadMeses) : null,
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
        return response.json().then(data => {
            return { status: response.status, data: data };
        });
    })
    .then(result => {
        const { status, data } = result;
        console.log('Response status:', status);
        console.log('Response data:', data);
        console.log('Error type:', data.error_type);
        console.log('Warning:', data.warning);
        
        if (data.success) {
            const mensaje = esEdicion ? '¡Paciente actualizado exitosamente!' : '¡Paciente creado exitosamente!';
            alert(mensaje);
            closeVetModal('modalNuevoPaciente');
            setTimeout(() => {
                window.location.reload();
            }, 400);
        } else {
            // Verificar si es una advertencia de nombre duplicado
            if (data.error_type === 'nombre_duplicado' && data.warning) {
                if (confirm(data.error + '\n\n¿Desea crear este responsable de todas formas? Son personas diferentes.')) {
                    // Construir datos originales con el flag de ignorar
                    const dataToSend = {
                        propietario_id: modoPropietario === 'nuevo' ? null : (propietarioId || (propietarioOriginal ? propietarioOriginal.id : null)),
                        actualizar_propietario: modoPropietario === 'editar' || (esEdicion && modoPropietario !== 'nuevo'),
                        crear_nuevo_propietario: modoPropietario === 'nuevo',
                        tipo_edad: tipoEdad,
                        fecha_nacimiento: fechaNacimiento,
                        edad_anos: edadAnos !== '' ? parseInt(edadAnos) : null,
                        edad_meses: edadMeses !== '' ? parseInt(edadMeses) : null,
                        ignore_name_warning: true,
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
                        }
                    };
                    
                    console.log('=== REINTENTANDO CON ignore_name_warning ===');
                    console.log('Datos a reenviar:', JSON.stringify(dataToSend, null, 2));
                    
                    fetch(url, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCookie('csrftoken'),
                        },
                        body: JSON.stringify(dataToSend)
                    })
                    .then(response => response.json())
                    .then(data => {
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
                    .catch(err => {
                        console.error('Error en reintento:', err);
                        alert('Error al guardar: ' + err.message);
                    });
                }
            } else {
                alert('Error: ' + (data.error || 'Error desconocido'));
            }
        }
    })
    .catch(error => {
        console.error('Error completo:', error);
        alert('Error de conexión: ' + error.message);
    });
}

// Cambiar estado de pestañas
function cambiarEstadoPacientes(estado) {
    window.location.href = `/pacientes/?estado=${estado}`;
}

// Modal archivar/restaurar
function abrirModalArchivarPaciente(button, pacienteId, esRestaurar = false) {
    const modal = document.getElementById('modalArchivarPaciente');
    const titulo = document.getElementById('tituloArchivar');
    const mensaje = document.getElementById('archivarPacienteMensaje');
    const btnTexto = document.getElementById('btnTextoArchivar');
    const modalTitle = modal.querySelector('.vet-custom-modal-title');
    
    if (esRestaurar) {
        titulo.textContent = 'Restaurar Paciente';
        mensaje.textContent = '¿Estás seguro que deseas restaurar este paciente? Volverá a aparecer en la lista de activos.';
        btnTexto.textContent = 'Restaurar';
        modalTitle.style.background = '#2e7d32';
    } else {
        titulo.textContent = 'Archivar Paciente';
        mensaje.textContent = '¿Estás seguro que deseas archivar este paciente? Podrás restaurarlo desde la pestaña de archivados.';
        btnTexto.textContent = 'Archivar';
        modalTitle.style.background = '#f57c00';
    }
    
    modal.classList.remove('hide');
    setTimeout(() => {
        modal.classList.add('show');
    }, 10);
    document.getElementById('btnConfirmarArchivarPaciente').setAttribute('data-paciente-id', pacienteId);
}

function closeArchivarPacienteModal() {
    const modal = document.getElementById('modalArchivarPaciente');
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
    
    // ===== TOGGLE TIPO DE EDAD =====
    const tipoEdadRadios = document.querySelectorAll('input[name="tipoEdad"]');
    tipoEdadRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            mostrarCampoEdad(this.value);
        });
    });
    
    // ===== CÁLCULO DE EDAD POR FECHA =====
    const fechaInput = document.getElementById('pacienteFechaNacimiento');
    if (fechaInput) {
        fechaInput.addEventListener('change', mostrarEdadCalculada);
        fechaInput.addEventListener('input', mostrarEdadCalculada);
    }
    
    // ===== MODAL ARCHIVAR/RESTAURAR PACIENTE =====
    const btnConfirmar = document.getElementById('btnConfirmarArchivarPaciente');
    if (btnConfirmar) {
        btnConfirmar.addEventListener('click', function() {
            const pacienteId = this.getAttribute('data-paciente-id');
            
            if (!pacienteId) {
                alert('Error: No se encontró el ID del paciente');
                return;
            }
            
            fetch(`/pacientes/archivar/${pacienteId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken'),
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert(data.message);
                    closeArchivarPacienteModal();
                    setTimeout(() => {
                        window.location.reload();
                    }, 400);
                } else {
                    alert('Error: ' + data.error);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Error al procesar la solicitud');
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