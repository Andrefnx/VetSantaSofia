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
        
        fetch(`/pacientes/buscar_propietarios/?q=${encodeURIComponent(query)}`)
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
            
            // Capturar propietario_id válido y evitar duplicados vacíos
            const propietarioIdInputs = Array.from(document.querySelectorAll('input[name="propietario_id"]'));
            let propietarioIdValue = (propietarioIdInputs.find(i => i.value && i.value.trim() !== '') || propietarioIdInputs[0] || { value: '' }).value;
            // Fallback al id original si el input fue vaciado (ej. al cambiar de modo pero luego volver)
            if ((!propietarioIdValue || propietarioIdValue.trim() === '') && propietarioIdOriginal) {
                propietarioIdValue = propietarioIdOriginal;
            }

            editElements.forEach(el => {
                if (el.name && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA')) {
                    if (el.name === 'propietario_id') {
                        return; // manejamos propietario_id al final para que no entre el vacío
                    }
                    formData.append(el.name, el.value || '');
                }
            });

            if (propietarioIdValue) {
                formData.append('propietario_id', propietarioIdValue);
            }
            
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
            
            const url = `/pacientes/editar/${pacienteId}/`;
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
            .then(async response => {
                const data = await response.json().catch(() => ({ success: false, error: 'Error desconocido' }));
                if (!response.ok) {
                    throw new Error(data.error || `Error ${response.status}`);
                }
                return data;
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

    // ============ EDITAR RESPONSABLE ============
    const btnEditarResponsable = document.getElementById('btnEditarResponsable');
    const btnCancelarResponsable = document.getElementById('btnCancelarResponsable');
    const btnGuardarResponsable = document.getElementById('btnGuardarResponsable');
    const btnEditResponsableActions = document.getElementById('btnEditResponsableActions');
    const infoResponsable = document.getElementById('infoResponsable');
    const buscarPropietario = document.getElementById('buscarPropietario');
    const resultadosBusqueda = document.getElementById('resultadosBusqueda');
    const enlaceNuevoPropietario = document.getElementById('enlaceNuevoPropietario');
    const enlaceVoltearAlSelect = document.getElementById('enlaceVoltearAlSelect');
    const btnCambiarResponsable = document.getElementById('btnCambiarResponsable');
    const propietarioSelector = document.getElementById('propietarioSelector');
    const camposNombrePropietario = document.getElementById('camposNombrePropietario');
    const camposNombreEditable = document.getElementById('camposNombreEditable');
    const separadorCambiarResponsable = document.getElementById('separadorCambiarResponsable');
    const enlaceCambiarResponsable = document.getElementById('enlaceCambiarResponsable');

    let propietarioSeleccionado = null; // Para guardar el propietario seleccionado en la búsqueda
    let datosOriginalesPropietario = null; // Para guardar los datos originales del propietario
    const propietarioIdOriginal = (document.querySelector('#camposNombreEditable input[name="propietario_id"]') || {}).value || null;

    console.log('Responsable Edit Elements:', {
        btnEditarResponsable,
        buscarPropietario,
        btnCambiarResponsable
    });

    if (btnEditarResponsable) {
        btnEditarResponsable.addEventListener('click', function() {
            console.log('Botón editar responsable clickeado');
            
            // Mostrar botones de guardar/cancelar
            btnEditarResponsable.style.setProperty('display', 'none', 'important');
            btnEditResponsableActions.style.setProperty('display', 'flex', 'important');
            
            // Ocultar todos los span.view-mode
            infoResponsable.querySelectorAll('.view-mode').forEach(el => {
                el.style.display = 'none';
            });
            
            // Mostrar el div con los inputs de nombre y apellido
            if (camposNombreEditable) {
                console.log('Mostrando camposNombreEditable');
                camposNombreEditable.style.setProperty('display', 'block', 'important');
                camposNombreEditable.classList.add('show-edit-mode');
                // Asegurarse de que los inputs dentro se muestren también
                camposNombreEditable.querySelectorAll('.edit-mode').forEach(el => {
                    el.style.setProperty('display', 'block', 'important');
                });
            } else {
                console.error('camposNombreEditable no encontrado');
            }
            
            // Mostrar solo los inputs de contacto (teléfono, email, dirección)
            infoResponsable.querySelectorAll('input[name="propietario_telefono"], input[name="propietario_email"], textarea[name="propietario_direccion"]').forEach(el => {
                el.style.setProperty('display', 'block', 'important');
            });
            
            // Mostrar la línea separadora y el enlace "Cambiar de responsable"
            if (separadorCambiarResponsable) separadorCambiarResponsable.style.display = 'block';
            if (enlaceCambiarResponsable) enlaceCambiarResponsable.style.display = 'block';
            
            // El selector no se muestra inicialmente
            propietarioSelector.style.display = 'none';
            camposNombrePropietario.style.display = 'none';
            resultadosBusqueda.style.display = 'none';
            
            // Guardar datos originales para cancelación
            originalData = {};
            datosOriginalesPropietario = {};
            infoResponsable.querySelectorAll('input.edit-mode, textarea.edit-mode, select.edit-mode').forEach(el => {
                if (el.name) {
                    originalData[el.name] = el.value;
                    datosOriginalesPropietario[el.name] = el.value;
                    console.log('Guardando dato original:', el.name, '=', el.value);
                }
            });
            
            propietarioSeleccionado = null;
        });
    } else {
        console.error('btnEditarResponsable no encontrado');
    }

    // Agregar validación en tiempo real a teléfono y email - una sola vez al cargar
    const inputTelefono = infoResponsable.querySelector('input[name="propietario_telefono"]');
    const inputEmail = infoResponsable.querySelector('input[name="propietario_email"]');
    const errorTelefono = document.getElementById('errorTelefono');
    const errorEmail = document.getElementById('errorEmail');
    
    if (inputTelefono) {
        // Prevenir espacios mientras escribe
        inputTelefono.addEventListener('keypress', function(e) {
            if (e.key === ' ') {
                e.preventDefault();
            }
        });
        
        // Eliminar espacios si se pegan
        inputTelefono.addEventListener('paste', function(e) {
            setTimeout(() => {
                this.value = this.value.replace(/\s/g, '');
            }, 0);
        });
        
        inputTelefono.addEventListener('input', function() {
            if (this.value && !validarTelefono(this.value)) {
                errorTelefono.style.display = 'block';
                this.classList.add('is-invalid');
            } else {
                errorTelefono.style.display = 'none';
                this.classList.remove('is-invalid');
            }
        });
    }
    
    if (inputEmail) {
        // Prevenir espacios mientras escribe
        inputEmail.addEventListener('keypress', function(e) {
            if (e.key === ' ') {
                e.preventDefault();
            }
        });
        
        // Eliminar espacios si se pegan
        inputEmail.addEventListener('paste', function(e) {
            setTimeout(() => {
                this.value = this.value.replace(/\s/g, '');
            }, 0);
        });
        
        inputEmail.addEventListener('input', function() {
            if (this.value && !validarEmail(this.value)) {
                errorEmail.style.display = 'block';
                this.classList.add('is-invalid');
            } else {
                errorEmail.style.display = 'none';
                this.classList.remove('is-invalid');
            }
        });
    }

    // Manejar enlace "Cambiar de responsable"
    if (btnCambiarResponsable) {
        btnCambiarResponsable.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Enlace cambiar responsable clickeado');
            
            // Ocultar TODOS los campos de edición excepto el selector
            if (camposNombreEditable) {
                camposNombreEditable.style.display = 'none';
                camposNombreEditable.classList.remove('show-edit-mode');
            }
            
            // Ocultar campos de contacto
            infoResponsable.querySelectorAll('input[name="propietario_telefono"], input[name="propietario_email"], textarea[name="propietario_direccion"]').forEach(el => {
                el.style.display = 'none';
            });
            
            // Ocultar línea separadora y enlace
            if (separadorCambiarResponsable) separadorCambiarResponsable.style.display = 'none';
            if (enlaceCambiarResponsable) enlaceCambiarResponsable.style.display = 'none';
            
            // Mostrar el selector con el buscador
            propietarioSelector.style.display = 'block';
            camposNombrePropietario.style.display = 'none';
            resultadosBusqueda.style.display = 'none';
            buscarPropietario.value = '';
            buscarPropietario.focus();
            
            propietarioSeleccionado = null;
        });
    }

    // Manejar búsqueda de propietarios
    if (buscarPropietario) {
        buscarPropietario.addEventListener('input', function(e) {
            const query = e.target.value.trim();
            console.log('Buscando:', query);
            
            if (query.length < 2) {
                resultadosBusqueda.style.display = 'none';
                return;
            }
            
            fetch(`/pacientes/buscar_propietarios/?q=${encodeURIComponent(query)}`)
                .then(response => response.json())
                .then(data => {
                    console.log('Resultados de búsqueda:', data);
                    if (data.success && data.propietarios.length > 0) {
                        resultadosBusqueda.innerHTML = data.propietarios.map(prop => `
                            <div style="padding: 10px; border-bottom: 1px solid #eee; cursor: pointer;" 
                                 onmouseover="this.style.backgroundColor='#f5f5f5'" 
                                 onmouseout="this.style.backgroundColor='transparent'"
                                 onclick="seleccionarPropietarioDelBuscador(${prop.id}, '${prop.nombre}', '${prop.apellido}', '${prop.telefono}', '${prop.email}', '${prop.direccion}')">
                                <strong>${prop.nombre} ${prop.apellido}</strong><br>
                                <small>${prop.telefono || 'Sin teléfono'}</small>
                            </div>
                        `).join('');
                        resultadosBusqueda.style.display = 'block';
                    } else {
                        // Si no hay resultados, mostrar opción de crear nuevo
                        resultadosBusqueda.innerHTML = `
                            <div style="padding: 10px; text-align: center;">
                                <em>No se encontraron resultados</em><br>
                                <small style="display: block; margin-top: 5px;">
                                    <a href="#" id="enlaceNuevoPropietarioSinResultados" style="font-size: 0.85rem;">+ Crear nuevo responsable</a>
                                </small>
                            </div>
                        `;
                        resultadosBusqueda.style.display = 'block';
                        
                        // Agregar evento al enlace dinámico
                        const enlazeSinResultados = document.getElementById('enlaceNuevoPropietarioSinResultados');
                        if (enlazeSinResultados) {
                            enlazeSinResultados.addEventListener('click', function(evt) {
                                evt.preventDefault();
                                mostrarCamposNuevoPropietario();
                            });
                        }
                    }
                })
                .catch(error => {
                    console.error('Error al buscar propietarios:', error);
                    resultadosBusqueda.innerHTML = '<div style="padding: 10px; color: red;"><em>Error en la búsqueda</em></div>';
                    resultadosBusqueda.style.display = 'block';
                });
        });
    }

    // Función para seleccionar un propietario del buscador
    window.seleccionarPropietarioDelBuscador = function(id, nombre, apellido, telefono, email, direccion) {
        console.log('Propietario seleccionado:', {id, nombre, apellido});
        
        propietarioSeleccionado = {
            id: id,
            nombre: nombre,
            apellido: apellido,
            telefono: telefono || '',
            email: email || '',
            direccion: direccion || ''
        };
        
        // Ocultar el buscador y resultados
        resultadosBusqueda.style.display = 'none';
        propietarioSelector.style.display = 'none';
        
        // Actualizar los inputs de edición con los nuevos datos
        const inputNombreEdit = document.querySelector('input[name="propietario_nombre_edit"]');
        const inputApellidoEdit = document.querySelector('input[name="propietario_apellido_edit"]');
        const inputPropietarioId = document.querySelector('input[name="propietario_id"]');
        
        if (inputNombreEdit) inputNombreEdit.value = nombre;
        if (inputApellidoEdit) inputApellidoEdit.value = apellido;
        if (inputPropietarioId) inputPropietarioId.value = id;
        
        // Mostrar los campos de edición con los valores del propietario seleccionado
        if (camposNombreEditable) {
            camposNombreEditable.style.display = 'block';
        }
        
        // Cargar los datos en los inputs de contacto
        const inputTelefono = infoResponsable.querySelector('input[name="propietario_telefono"]');
        const inputEmail = infoResponsable.querySelector('input[name="propietario_email"]');
        const textareaDireccion = infoResponsable.querySelector('textarea[name="propietario_direccion"]');
        
        if (inputTelefono) {
            inputTelefono.value = telefono || '';
            inputTelefono.style.display = 'block';
        }
        if (inputEmail) {
            inputEmail.value = email || '';
            inputEmail.style.display = 'block';
        }
        if (textareaDireccion) {
            textareaDireccion.value = direccion || '';
            textareaDireccion.style.display = 'block';
        }
        
        // Actualizar los spans visibles de contacto
        const spanTelefono = infoResponsable.querySelector('p:has(strong:contains("Teléfono")) .view-mode');
        const spanEmail = infoResponsable.querySelector('p:has(strong:contains("Correo")) .view-mode');
        const spanDireccion = infoResponsable.querySelector('p:has(strong:contains("Dirección")) .view-mode');
        
        // Alternativa más simple: buscar todos los spans view-mode y actualizar por posición
        const viewModeSpans = infoResponsable.querySelectorAll('.view-mode');
        if (viewModeSpans.length >= 4) {
            // [0] = nombre, [1] = teléfono, [2] = email, [3] = dirección
            viewModeSpans[1].textContent = telefono || 'No registrado';
            viewModeSpans[2].textContent = email || 'No registrado';
            viewModeSpans[3].textContent = direccion || 'No registrada';
        }
        
        // Mostrar separador y enlace para cambiar de responsable
        if (separadorCambiarResponsable) separadorCambiarResponsable.style.display = 'block';
        if (enlaceCambiarResponsable) enlaceCambiarResponsable.style.display = 'block';
    }

    // Función para mostrar campos de nuevo propietario
    function mostrarCamposNuevoPropietario() {
        propietarioSelector.style.display = 'none';
        camposNombrePropietario.style.display = 'block';
        
        // Vaciar los campos de nombre y apellido para nuevo propietario
        document.querySelector('input[name="propietario_nombre_new"]').value = '';
        document.querySelector('input[name="propietario_apellido_new"]').value = '';
        
        // Vaciar también los campos de contacto
        const inputTelefono = infoResponsable.querySelector('input[name="propietario_telefono"]');
        const inputEmail = infoResponsable.querySelector('input[name="propietario_email"]');
        const textareaDireccion = infoResponsable.querySelector('textarea[name="propietario_direccion"]');
        
        if (inputTelefono) {
            inputTelefono.value = '';
            inputTelefono.style.display = 'block';
        }
        if (inputEmail) {
            inputEmail.value = '';
            inputEmail.style.display = 'block';
        }
        if (textareaDireccion) {
            textareaDireccion.value = '';
            textareaDireccion.style.display = 'block';
        }
        
        propietarioSeleccionado = null;
    }

    // Manejar enlace "¿No está en la lista?" (dentro del selector)
    if (enlaceNuevoPropietario) {
        enlaceNuevoPropietario.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Enlace nuevo propietario clickeado');
            mostrarCamposNuevoPropietario();
        });
    }

    // Manejar enlace "Volver al listado"
    if (enlaceVoltearAlSelect) {
        enlaceVoltearAlSelect.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Enlace volver al buscar clickeado');
            
            // Volver a mostrar el selector y ocultar los campos de nombre/apellido
            propietarioSelector.style.display = 'block';
            camposNombrePropietario.style.display = 'none';
            
            // Limpiar los campos de nuevo propietario
            document.querySelector('input[name="propietario_nombre_new"]').value = '';
            document.querySelector('input[name="propietario_apellido_new"]').value = '';
            
            // Limpiar los resultados de búsqueda
            resultadosBusqueda.style.display = 'none';
            buscarPropietario.value = '';
            buscarPropietario.focus();
            
            propietarioSeleccionado = null;
        });
    }

    if (btnCancelarResponsable) {
        btnCancelarResponsable.addEventListener('click', function() {
            console.log('Botón cancelar responsable clickeado');
            
            // Restaurar datos originales
            if (datosOriginalesPropietario) {
                infoResponsable.querySelectorAll('input.edit-mode, textarea.edit-mode, select.edit-mode').forEach(el => {
                    if (el.name && datosOriginalesPropietario[el.name] !== undefined) {
                        el.value = datosOriginalesPropietario[el.name];
                        console.log('Restaurando:', el.name, '=', datosOriginalesPropietario[el.name]);
                    }
                });
            }
            
            // Volver a modo vista: mostrar spans y ocultar inputs
            infoResponsable.querySelectorAll('.view-mode').forEach(el => {
                el.style.display = 'inline';
            });
            
            if (camposNombreEditable) {
                camposNombreEditable.style.display = 'none';
                camposNombreEditable.classList.remove('show-edit-mode');
            }
            
            infoResponsable.querySelectorAll('input[name="propietario_telefono"], input[name="propietario_email"], textarea[name="propietario_direccion"]').forEach(el => {
                el.style.display = 'none';
            });
            
            propietarioSelector.style.display = 'none';
            camposNombrePropietario.style.display = 'none';
            resultadosBusqueda.style.display = 'none';
            if (separadorCambiarResponsable) separadorCambiarResponsable.style.display = 'none';
            if (enlaceCambiarResponsable) enlaceCambiarResponsable.style.display = 'none';
            
            // Ocultar botones de guardar/cancelar y mostrar botón de editar
            btnEditarResponsable.style.setProperty('display', 'inline-block', 'important');
            btnEditResponsableActions.style.setProperty('display', 'none', 'important');
            
            propietarioSeleccionado = null;
        });
    } else {
        console.error('btnCancelarResponsable no encontrado');
    }

    // Funciones de validación para teléfono y correo
    function validarTelefono(telefono) {
        if (!telefono || telefono.trim() === '') {
            return true; // Opcional
        }
        // No permitir espacios
        if (/\s/.test(telefono)) {
            return false;
        }
        // Eliminar puntos, guiones, paréntesis
        const telefonoLimpio = telefono.replace(/[\s.\-()]/g, '');
        
        // Debe ser un número válido:
        // 1. Con +56 seguido de exactamente 9 dígitos (número chileno con prefijo)
        // 2. O solo 9 dígitos (número chileno sin prefijo)
        const regexConPrefijo = /^\+56\d{9}$/;
        const regexSinPrefijo = /^\d{9}$/;
        
        return regexConPrefijo.test(telefonoLimpio) || regexSinPrefijo.test(telefonoLimpio);
    }

    function validarEmail(email) {
        // Si está vacío, es opcional
        if (!email || email.trim() === '') {
            return true;
        }
        // No permitir espacios
        if (/\s/.test(email)) {
            return false;
        }
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regexEmail.test(email);
    }

    function mostrarErrores() {
        const inputTelefono = infoResponsable.querySelector('input[name="propietario_telefono"]');
        const inputEmail = infoResponsable.querySelector('input[name="propietario_email"]');
        const errorTelefono = document.getElementById('errorTelefono');
        const errorEmail = document.getElementById('errorEmail');
        
        let hasErrors = false;

        // Validar teléfono
        if (inputTelefono && inputTelefono.value) {
            if (!validarTelefono(inputTelefono.value)) {
                if (errorTelefono) errorTelefono.style.display = 'block';
                inputTelefono.classList.add('is-invalid');
                hasErrors = true;
            } else {
                if (errorTelefono) errorTelefono.style.display = 'none';
                inputTelefono.classList.remove('is-invalid');
            }
        } else {
            if (errorTelefono) errorTelefono.style.display = 'none';
            if (inputTelefono) inputTelefono.classList.remove('is-invalid');
        }

        // Validar email
        if (inputEmail && inputEmail.value) {
            if (!validarEmail(inputEmail.value)) {
                if (errorEmail) errorEmail.style.display = 'block';
                inputEmail.classList.add('is-invalid');
                hasErrors = true;
            } else {
                if (errorEmail) errorEmail.style.display = 'none';
                inputEmail.classList.remove('is-invalid');
            }
        } else {
            if (errorEmail) errorEmail.style.display = 'none';
            if (inputEmail) inputEmail.classList.remove('is-invalid');
        }

        return hasErrors;
    }

    if (btnGuardarResponsable) {
        btnGuardarResponsable.addEventListener('click', function() {
            console.log('Botón guardar responsable clickeado');
            
            // Validar teléfono y correo antes de guardar
            if (mostrarErrores()) {
                alert('Por favor, verifica el formato de los campos resaltados');
                return;
            }

            const pacienteId = window.location.pathname.split('/').filter(Boolean).pop();
            const formData = new FormData();
            
            // Determinar si es un propietario existente o nuevo
            const nombreEdit = document.querySelector('input[name="propietario_nombre_edit"]');
            const apellidoEdit = document.querySelector('input[name="propietario_apellido_edit"]');
            const nombreNew = document.querySelector('input[name="propietario_nombre_new"]');
            const apellidoNew = document.querySelector('input[name="propietario_apellido_new"]');
            // Hay dos inputs con el mismo name (uno hidden vacío en la sección de nuevo propietario).
            // Tomamos el que tenga valor distinto de vacío, o el primero si ninguno tiene valor.
            const propietarioIdInputs = Array.from(document.querySelectorAll('input[name="propietario_id"]'));
            const propietarioIdInput = propietarioIdInputs.find(i => i.value && i.value.trim() !== '') || propietarioIdInputs[0] || null;
            let actualizarPropietario = false;
            let crearNuevoPropietario = false;

            // Reutilizar propietario actual sin obligar a rellenar nombre/apellido
            const puedeReutilizarActual = propietarioIdInput && propietarioIdInput.value && !propietarioSeleccionado;
            if (puedeReutilizarActual && datosOriginalesPropietario) {
                if (nombreEdit && !nombreEdit.value) {
                    nombreEdit.value = datosOriginalesPropietario['propietario_nombre_edit'] || '';
                }
                if (apellidoEdit && !apellidoEdit.value) {
                    apellidoEdit.value = datosOriginalesPropietario['propietario_apellido_edit'] || '';
                }
            }
            
            // Caso 1: Se seleccionó un propietario del buscador
            if (propietarioSeleccionado && propietarioSeleccionado.id) {
                console.log('Usando propietario del buscador:', propietarioSeleccionado.id);
                formData.append('propietario_id', propietarioSeleccionado.id);
                // Si seleccionó otro propietario y editó sus datos, marcar para actualizar
                actualizarPropietario = true;
                // Enviar los datos editados (nombre y apellido desde los inputs edit)
                if (nombreEdit && apellidoEdit) {
                    formData.append('propietario_nombre_edit', nombreEdit.value || '');
                    formData.append('propietario_apellido_edit', apellidoEdit.value || '');
                }
            } 
            // Caso 2: Se está creando un nuevo propietario
            else if (nombreNew && apellidoNew && nombreNew.value && apellidoNew.value) {
                console.log('Creando nuevo propietario');
                actualizarPropietario = true;
                crearNuevoPropietario = true;
                formData.append('propietario_nombre_edit', nombreNew.value);
                formData.append('propietario_apellido_edit', apellidoNew.value);
            }
            // Caso 3: Solo se editaron los datos de contacto del propietario actual
            else if (nombreEdit && apellidoEdit && (nombreEdit.value || apellidoEdit.value || puedeReutilizarActual)) {
                console.log('Editando propietario actual');
                actualizarPropietario = true;
                // SIEMPRE pasar el ID del propietario actual si existe
                if (propietarioIdInput && propietarioIdInput.value) {
                    formData.append('propietario_id', propietarioIdInput.value);
                    console.log('Usando propietario_id:', propietarioIdInput.value);
                } else if (propietarioIdOriginal) {
                    formData.append('propietario_id', propietarioIdOriginal);
                    console.log('Usando propietario_id (original):', propietarioIdOriginal);
                }
                formData.append('propietario_nombre_edit', nombreEdit.value || datosOriginalesPropietario['propietario_nombre_edit'] || '');
                formData.append('propietario_apellido_edit', apellidoEdit.value || datosOriginalesPropietario['propietario_apellido_edit'] || '');
            } else {
                alert('Por favor completa los datos del responsable');
                return;
            }
            
            // Agregar datos de contacto
            const inputTelefono = infoResponsable.querySelector('input[name="propietario_telefono"]');
            const inputEmail = infoResponsable.querySelector('input[name="propietario_email"]');
            const textareaDireccion = infoResponsable.querySelector('textarea[name="propietario_direccion"]');
            
            if (inputTelefono) formData.append('propietario_telefono', inputTelefono.value || '');
            if (inputEmail) formData.append('propietario_email', inputEmail.value || '');
            if (textareaDireccion) formData.append('propietario_direccion', textareaDireccion.value || '');

            // Indicar si se deben aplicar cambios al propietario actual
            formData.append('actualizar_propietario', actualizarPropietario ? 'true' : 'false');
            formData.append('crear_nuevo_propietario', crearNuevoPropietario ? 'true' : 'false');
            
            const url = `/pacientes/editar/${pacienteId}/`;
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
            
            console.log('=== Guardando datos de Responsable ===');
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
            .then(async response => {
                const data = await response.json().catch(() => ({ success: false, error: 'Error desconocido' }));
                if (!response.ok) {
                    throw new Error(data.error || `Error ${response.status}`);
                }
                return data;
            })
            .then(data => {
                console.log('Response:', data);
                if (data.success) {
                    alert('Datos del responsable guardados exitosamente');
                    location.reload();
                } else {
                    alert('Error al guardar: ' + (data.error || 'Error desconocido'));
                }
            })
            .catch(error => {
                console.error('Error completo:', error);
                // Verificar si es una advertencia de nombre duplicado
                if (error.message && error.message.includes('Ya existe un propietario con ese nombre')) {
                    if (confirm(error.message + '\n\n¿Desea crear este responsable de todas formas? Son personas diferentes.')) {
                        // Reenviar con flag de ignorar advertencia
                        formData.append('ignore_name_warning', 'true');
                        fetch(url, {
                            method: 'POST',
                            headers: {
                                'X-CSRFToken': csrfToken,
                            },
                            body: formData
                        })
                        .then(async response => {
                            const data = await response.json().catch(() => ({ success: false, error: 'Error desconocido' }));
                            if (!response.ok) {
                                throw new Error(data.error || `Error ${response.status}`);
                            }
                            return data;
                        })
                        .then(data => {
                            if (data.success) {
                                alert('Datos del responsable guardados exitosamente');
                                location.reload();
                            } else {
                                alert('Error al guardar: ' + (data.error || 'Error desconocido'));
                            }
                        })
                        .catch(err => {
                            alert('Error al guardar: ' + err.message);
                        });
                    }
                } else {
                    alert('Error al guardar los cambios: ' + error.message);
                }
            });
        });
    } else {
        console.error('btnGuardarResponsable no encontrado');
    }

    // ============ EDITAR ANTECEDENTES MÉDICOS ============
    const btnEditarAntecedentes = document.getElementById('btnEditarAntecedentes');
    const btnCancelarAntecedentes = document.getElementById('btnCancelarAntecedentes');
    const btnGuardarAntecedentes = document.getElementById('btnGuardarAntecedentes');
    const btnEditAntecedentesActions = document.getElementById('btnEditAntecedentesActions');
    const infoAntecedentes = document.getElementById('infoAntecedentes');

    let datosOriginalesAntecedentes = null;

    console.log('Antecedentes Edit Elements:', {
        btnEditarAntecedentes,
        btnCancelarAntecedentes,
        btnGuardarAntecedentes,
        btnEditAntecedentesActions,
        infoAntecedentes
    });

    if (btnEditarAntecedentes && btnEditAntecedentesActions && infoAntecedentes) {
        btnEditarAntecedentes.addEventListener('click', function() {
            console.log('Botón editar antecedentes clickeado');
            
            // Mostrar botones de guardar/cancelar
            btnEditarAntecedentes.style.setProperty('display', 'none', 'important');
            btnEditAntecedentesActions.style.setProperty('display', 'flex', 'important');
            
            // Ocultar todos los span.view-mode
            infoAntecedentes.querySelectorAll('.view-mode').forEach(el => {
                el.style.display = 'none';
            });
            
            // Mostrar todos los textarea.edit-mode
            infoAntecedentes.querySelectorAll('textarea.edit-mode').forEach(el => {
                el.style.setProperty('display', 'block', 'important');
            });
            
            // Agregar clase para activar el modo edición (CSS)
            infoAntecedentes.classList.add('edit-mode-active');
            
            // Guardar datos originales para cancelación
            datosOriginalesAntecedentes = {};
            infoAntecedentes.querySelectorAll('textarea.edit-mode').forEach(el => {
                if (el.name) {
                    datosOriginalesAntecedentes[el.name] = el.value;
                    console.log('Guardando dato original:', el.name, '=', el.value);
                }
            });
        });
    } else {
        console.error('Elementos de Antecedentes no encontrados:', {
            btnEditarAntecedentes: !!btnEditarAntecedentes,
            btnEditAntecedentesActions: !!btnEditAntecedentesActions,
            infoAntecedentes: !!infoAntecedentes
        });
    }

    if (btnCancelarAntecedentes) {
        btnCancelarAntecedentes.addEventListener('click', function() {
            console.log('Botón cancelar antecedentes clickeado');
            
            // Restaurar datos originales
            if (datosOriginalesAntecedentes) {
                infoAntecedentes.querySelectorAll('textarea.edit-mode').forEach(el => {
                    if (el.name && datosOriginalesAntecedentes[el.name] !== undefined) {
                        el.value = datosOriginalesAntecedentes[el.name];
                        console.log('Restaurando:', el.name, '=', datosOriginalesAntecedentes[el.name]);
                    }
                });
            }
            
            // Volver a modo vista: mostrar spans y ocultar textareas
            infoAntecedentes.querySelectorAll('.view-mode').forEach(el => {
                el.style.display = 'inline';
            });
            
            infoAntecedentes.querySelectorAll('textarea.edit-mode').forEach(el => {
                el.style.display = 'none';
            });
            
            // Remover clase de modo edición
            infoAntecedentes.classList.remove('edit-mode-active');
            
            // Ocultar botones de guardar/cancelar y mostrar botón de editar
            btnEditarAntecedentes.style.setProperty('display', 'inline-block', 'important');
            btnEditAntecedentesActions.style.setProperty('display', 'none', 'important');
        });
    } else {
        console.error('btnCancelarAntecedentes no encontrado');
    }

    if (btnGuardarAntecedentes) {
        btnGuardarAntecedentes.addEventListener('click', function() {
            console.log('Botón guardar antecedentes clickeado');
            
            const pacienteId = window.location.pathname.split('/').filter(Boolean).pop();
            const formData = new FormData();
            
            // Recopilar datos de antecedentes
            const alergias = infoAntecedentes.querySelector('textarea[name="alergias"]');
            const enfermedadesCronicas = infoAntecedentes.querySelector('textarea[name="enfermedades_cronicas"]');
            const medicamentosActuales = infoAntecedentes.querySelector('textarea[name="medicamentos_actuales"]');
            const cirugiaPrevia = infoAntecedentes.querySelector('textarea[name="cirugia_previa"]');
            
            if (alergias) formData.append('alergias', alergias.value || '');
            if (enfermedadesCronicas) formData.append('enfermedades_cronicas', enfermedadesCronicas.value || '');
            if (medicamentosActuales) formData.append('medicamentos_actuales', medicamentosActuales.value || '');
            if (cirugiaPrevia) formData.append('cirugia_previa', cirugiaPrevia.value || '');
            
            const url = `/pacientes/editar/${pacienteId}/`;
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
            
            console.log('=== Guardando Antecedentes Médicos ===');
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
            .then(async response => {
                const data = await response.json().catch(() => ({ success: false, error: 'Error desconocido' }));
                if (!response.ok) {
                    throw new Error(data.error || `Error ${response.status}`);
                }
                return data;
            })
            .then(data => {
                console.log('Response:', data);
                if (data.success) {
                    // Volver a modo vista antes de recargar
                    infoAntecedentes.querySelectorAll('.view-mode').forEach(el => {
                        el.style.display = 'inline';
                    });
                    infoAntecedentes.querySelectorAll('textarea.edit-mode').forEach(el => {
                        el.style.display = 'none';
                    });
                    infoAntecedentes.classList.remove('edit-mode-active');
                    btnEditarAntecedentes.style.setProperty('display', 'inline-block', 'important');
                    btnEditAntecedentesActions.style.setProperty('display', 'none', 'important');
                    
                    alert('Antecedentes médicos guardados exitosamente');
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
    } else {
        console.error('btnGuardarAntecedentes no encontrado');
    }
});