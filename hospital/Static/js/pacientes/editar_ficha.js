document.addEventListener('DOMContentLoaded', function() {
    const btnEditarFicha = document.getElementById('btnEditarFicha');
    const btnEditActions = document.getElementById('btnEditActions');
    const btnCancelar = document.getElementById('btnCancelar');
    const btnGuardar = document.getElementById('btnGuardar');
    
    const viewElements = document.querySelectorAll('.view-mode');
    const editElements = document.querySelectorAll('input.edit-mode, textarea.edit-mode, select.edit-mode');

    
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

    // Activar modo edición
    if (btnEditarFicha) {
        btnEditarFicha.addEventListener('click', function() {
            saveOriginalData();
            
            btnEditarFicha.style.setProperty('display', 'none', 'important');
            btnEditActions.style.display = 'flex';
            
            viewElements.forEach(el => el.style.display = 'none');
            editElements.forEach(el => el.style.display = 'block');
            
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
                if (el.value !== undefined) {
                    formData.append(el.name, el.value);
                }
            });
            
            // Agregar campos del propietario
            const inputNombre = document.querySelector('input[name="propietario_nombre_edit"]');
            const inputApellido = document.querySelector('input[name="propietario_apellido_edit"]');
            const inputId = document.querySelector('input[name="propietario_id"]');
            
            if (inputNombre) formData.append('propietario_nombre_edit', inputNombre.value);
            if (inputApellido) formData.append('propietario_apellido_edit', inputApellido.value);
            if (inputId && inputId.value) {
                formData.append('propietario_id', inputId.value);
            } else {
                // Si no hay ID, es un nuevo propietario
                formData.delete('propietario_id');
            }
            
            const url = `/hospital/pacientes/${pacienteId}/editar/`;
            const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
            
            console.log('Datos guardados:', Object.fromEntries(formData));
            console.log('URL:', url);
            console.log('CSRF Token:', csrfToken);
            
            fetch(url, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': csrfToken,
                },
                body: formData
            })
            .then(response => {
                console.log('Status:', response.status);
                console.log('Status Text:', response.statusText);
                
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