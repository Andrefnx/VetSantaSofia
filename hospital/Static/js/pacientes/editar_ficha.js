document.addEventListener('DOMContentLoaded', function() {
    const btnEditarFicha = document.getElementById('btnEditarFicha');
    const btnEditActions = document.getElementById('btnEditActions');
    const btnCancelar = document.getElementById('btnCancelar');
    const btnGuardar = document.getElementById('btnGuardar');
    
    const viewElements = document.querySelectorAll('.view-mode');
    const editElements = document.querySelectorAll('input.edit-mode, textarea.edit-mode, select.edit-mode, div.edit-mode');

    
    let originalData = {};

    // Guardar datos originales
    function saveOriginalData() {
        editElements.forEach(el => {
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                originalData[el.name] = el.value;
            } else if (el.tagName === 'SELECT') {
                originalData[el.name] = el.value;
            }
        });
        console.log('Datos guardados:', originalData);
    }

    // Manejar cambio entre fecha de nacimiento y edad estimada
    const radioFecha = document.querySelector('input[name="tipo_edad"][value="fecha"]');
    const radioEstimada = document.querySelector('input[name="tipo_edad"][value="estimada"]');
    const fechaNacimiento = document.getElementById('fechaNacimiento');
    const edadEstimadaInputs = document.getElementById('edadEstimadaInputs');

    // Establecer fecha máxima permitida (hoy)
    if (fechaNacimiento) {
        const hoy = new Date().toISOString().split('T')[0];
        fechaNacimiento.setAttribute('max', hoy);
        
        // Validar cuando cambia la fecha
        fechaNacimiento.addEventListener('change', function() {
            if (this.value > hoy) {
                alert('La fecha de nacimiento no puede ser futura');
                this.value = hoy;
            }
        });
    }

    if (radioFecha && radioEstimada) {
        radioFecha.addEventListener('change', function() {
            if (this.checked) {
                fechaNacimiento.style.display = 'block';
                edadEstimadaInputs.style.display = 'none';
                // Limpiar edad estimada
                edadEstimadaInputs.querySelectorAll('input').forEach(input => {
                    input.value = '';
                });
            }
        });

        radioEstimada.addEventListener('change', function() {
            if (this.checked) {
                fechaNacimiento.style.display = 'none';
                fechaNacimiento.value = '';
                edadEstimadaInputs.style.display = 'flex';
            }
        });
    }

    // Activar modo edición
    if (btnEditarFicha) {
        btnEditarFicha.addEventListener('click', function() {
            saveOriginalData();
            
            btnEditarFicha.style.setProperty('display', 'none', 'important');
            btnEditActions.style.display = 'flex';
            
            viewElements.forEach(el => el.style.display = 'none');
            editElements.forEach(el => {
                if (el.tagName === 'DIV') {
                    el.style.display = 'block';
                } else {
                    el.style.display = 'block';
                }
            });
            
            // Mostrar el selector de propietario y campos editables
            const propietarioSelector = document.getElementById('propietarioSelector');
            const camposNombre = document.getElementById('camposNombrePropietario');
            
            if (propietarioSelector) {
                propietarioSelector.style.display = 'block';
            }
            if (camposNombre) {
                camposNombre.style.display = 'block';
            }
            
            // Agregar evento al buscador de propietario
            const buscarPropietario = document.getElementById('buscarPropietario');
            if (buscarPropietario) {
                buscarPropietario.addEventListener('input', buscarPropietarios);
            }
            
            // Agregar evento al botón de nuevo propietario
            const btnNuevoPropietario = document.getElementById('btnNuevoPropietario');
            if (btnNuevoPropietario) {
                btnNuevoPropietario.addEventListener('click', activarModoNuevoPropietario);
            }
        });
    }
    
    // Función para buscar propietarios
    function buscarPropietarios(event) {
        const query = event.target.value.trim();
        const resultadosDiv = document.getElementById('resultadosBusqueda');
        
        if (query.length < 2) {
            resultadosDiv.style.display = 'none';
            return;
        }
        
        fetch(`/hospital/propietarios/buscar/?q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.propietarios.length > 0) {
                    resultadosDiv.innerHTML = data.propietarios.map(prop => `
                        <div class="search-result-item" data-id="${prop.id}" onclick="seleccionarPropietario(${prop.id}, '${prop.nombre}', '${prop.apellido}', '${prop.telefono}', '${prop.email}', '${prop.direccion}')">
                            <strong>${prop.nombre} ${prop.apellido}</strong><br>
                            <small>${prop.telefono || 'Sin teléfono'}</small>
                        </div>
                    `).join('');
                    resultadosDiv.style.display = 'block';
                } else {
                    resultadosDiv.innerHTML = '<div class="search-result-item">No se encontraron resultados</div>';
                    resultadosDiv.style.display = 'block';
                }
            })
            .catch(error => console.error('Error al buscar propietarios:', error));
    }
    
    // Función para seleccionar un propietario del buscador
    window.seleccionarPropietario = function(id, nombre, apellido, telefono, email, direccion) {
        // Ocultar resultados
        document.getElementById('resultadosBusqueda').style.display = 'none';
        document.getElementById('buscarPropietario').value = '';
        
        // Llenar campos
        document.querySelector('input[name="propietario_nombre_edit"]').value = nombre || '';
        document.querySelector('input[name="propietario_apellido_edit"]').value = apellido || '';
        document.querySelector('input[name="propietario_id"]').value = id;
        document.querySelector('input[name="propietario_telefono"]').value = telefono || '';
        document.querySelector('input[name="propietario_email"]').value = email || '';
        document.querySelector('textarea[name="propietario_direccion"]').value = direccion || '';
    }
    
    // Función para activar modo de nuevo propietario
    function activarModoNuevoPropietario() {
        const inputNombre = document.querySelector('input[name="propietario_nombre_edit"]');
        const inputApellido = document.querySelector('input[name="propietario_apellido_edit"]');
        const inputId = document.querySelector('input[name="propietario_id"]');
        const inputTelefono = document.querySelector('input[name="propietario_telefono"]');
        const inputEmail = document.querySelector('input[name="propietario_email"]');
        const textareaDireccion = document.querySelector('textarea[name="propietario_direccion"]');
        
        // Limpiar todos los campos
        if (inputNombre) inputNombre.value = '';
        if (inputApellido) inputApellido.value = '';
        if (inputId) inputId.value = '';
        if (inputTelefono) inputTelefono.value = '';
        if (inputEmail) inputEmail.value = '';
        if (textareaDireccion) textareaDireccion.value = '';
        
        alert('Complete los datos del nuevo responsable. Se creará al guardar la ficha.');
    }

    // Cancelar edición
    if (btnCancelar) {
        btnCancelar.addEventListener('click', function() {
            // Restaurar datos originales
            editElements.forEach(el => {
                if (originalData[el.name] !== undefined) {
                    el.value = originalData[el.name];
                }
            });
            
            btnEditarFicha.style.display = 'inline-block';
            btnEditActions.style.display = 'none';
            
            viewElements.forEach(el => el.style.display = 'inline');
            editElements.forEach(el => el.style.display = 'none');
            
            // Ocultar el selector de propietario y el input de nuevo propietario
            const propietarioSelector = document.getElementById('propietarioSelector');
            const inputNuevoPropietario = document.getElementById('inputNuevoPropietario');
            const camposNombre = document.getElementById('camposNombrePropietario');
            
            if (propietarioSelector) {
                propietarioSelector.style.display = 'none';
            }
            if (inputNuevoPropietario) {
                inputNuevoPropietario.style.display = 'none';
            }
            if (camposNombre) {
                camposNombre.style.display = 'none';
            }
        });
    }

    // Guardar cambios
    if (btnGuardar) {
        btnGuardar.addEventListener('click', function() {
            const pacienteId = window.location.pathname.split('/').filter(Boolean).pop();
            const formData = new FormData();
            
            editElements.forEach(el => {
                if (el.name && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) {
                    formData.append(el.name, el.value || '');
                }
            });
            
            // Agregar tipo de edad
            const tipoEdad = document.querySelector('input[name="tipo_edad"]:checked');
            if (tipoEdad) {
                formData.append('tipo_edad', tipoEdad.value);
                console.log('Tipo de edad:', tipoEdad.value);
            }
            
            // Agregar datos de edad según el tipo seleccionado
            if (tipoEdad && tipoEdad.value === 'fecha') {
                const fechaNac = document.querySelector('input[name="fecha_nacimiento"]');
                if (fechaNac && fechaNac.value) {
                    formData.append('fecha_nacimiento', fechaNac.value);
                    console.log('Fecha de nacimiento:', fechaNac.value);
                }
            } else if (tipoEdad && tipoEdad.value === 'estimada') {
                const edadAnos = document.querySelector('input[name="edad_anos"]');
                const edadMeses = document.querySelector('input[name="edad_meses"]');
                if (edadAnos && edadAnos.value) {
                    formData.append('edad_anos', edadAnos.value);
                    console.log('Edad años:', edadAnos.value);
                }
                if (edadMeses && edadMeses.value) {
                    formData.append('edad_meses', edadMeses.value);
                    console.log('Edad meses:', edadMeses.value);
                }
            }
            
            // Agregar campos del propietario
            const inputNombre = document.querySelector('input[name="propietario_nombre_edit"]');
            const inputApellido = document.querySelector('input[name="propietario_apellido_edit"]');
            const inputId = document.querySelector('input[name="propietario_id"]');
            
            if (inputNombre) formData.append('propietario_nombre_edit', inputNombre.value);
            if (inputApellido) formData.append('propietario_apellido_edit', inputApellido.value);
            if (inputId && inputId.value) {
                formData.append('propietario_id', inputId.value);
            }
            
            const url = `/hospital/pacientes/${pacienteId}/editar/`;
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
            
            // Debug: mostrar todos los datos que se enviarán
            console.log('=== Datos a enviar ===');
            for (let [key, value] of formData.entries()) {
                console.log(key + ': ' + value);
            }
            
            fetch(url, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                },
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Response:', data);
                if (data.success) {
                    alert('Cambios guardados exitosamente');
                    location.reload();
                } else {
                    alert('Error al guardar: ' + (data.error || 'Error desconocido'));
                }
            })
            .catch(error => {
                console.error('Error completo:', error);
                alert('Error al guardar los cambios: ' + error.message);
            });
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
});