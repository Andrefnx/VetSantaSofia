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
            
            // Mostrar el selector de propietario manualmente
            const propietarioSelector = document.getElementById('propietarioSelector');
            if (propietarioSelector) {
                propietarioSelector.style.display = 'block';
            }
            
            // Agregar evento al selector de propietario
            const selectPropietario = document.querySelector('select[name="propietario_id"]');
            if (selectPropietario) {
                selectPropietario.addEventListener('change', cargarDatosPropietario);
            }
            
            // Agregar evento al botón de nuevo propietario
            const btnNuevoPropietario = document.getElementById('btnNuevoPropietario');
            if (btnNuevoPropietario) {
                btnNuevoPropietario.addEventListener('click', activarModoNuevoPropietario);
            }
        });
    }
    
    // Función para cargar datos del propietario seleccionado
    function cargarDatosPropietario(event) {
        const propietarioId = event.target.value;
        const camposNombre = document.getElementById('camposNombrePropietario');
        
        if (!propietarioId) {
            if (camposNombre) camposNombre.style.display = 'none';
            return;
        }
        
        // Mostrar campos de nombre cuando se selecciona un propietario
        if (camposNombre) camposNombre.style.display = 'block';
        
        fetch(`/hospital/propietarios/${propietarioId}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const prop = data.propietario;
                    
                    // Actualizar campos editables
                    const inputNombre = document.querySelector('input[name="propietario_nombre_edit"]');
                    const inputApellido = document.querySelector('input[name="propietario_apellido_edit"]');
                    const inputTelefono = document.querySelector('input[name="propietario_telefono"]');
                    const inputEmail = document.querySelector('input[name="propietario_email"]');
                    const textareaDireccion = document.querySelector('textarea[name="propietario_direccion"]');
                    
                    if (inputNombre) inputNombre.value = prop.nombre || '';
                    if (inputApellido) inputApellido.value = prop.apellido || '';
                    if (inputTelefono) inputTelefono.value = prop.telefono || '';
                    if (inputEmail) inputEmail.value = prop.email || '';
                    if (textareaDireccion) textareaDireccion.value = prop.direccion || '';
                }
            })
            .catch(error => console.error('Error al cargar propietario:', error));
    }
    
    // Función para activar modo de nuevo propietario
    function activarModoNuevoPropietario() {
        const propietarioSelector = document.getElementById('propietarioSelector');
        const inputNuevoPropietario = document.getElementById('inputNuevoPropietario');
        const inputTelefono = document.querySelector('input[name="propietario_telefono"]');
        const inputEmail = document.querySelector('input[name="propietario_email"]');
        const textareaDireccion = document.querySelector('textarea[name="propietario_direccion"]');
        
        // Ocultar el selector y mostrar input para nuevo nombre
        propietarioSelector.style.display = 'none';
        inputNuevoPropietario.style.display = 'block';
        
        // Limpiar todos los campos
        inputNuevoPropietario.value = '';
        if (inputTelefono) inputTelefono.value = '';
        if (inputEmail) inputEmail.value = '';
        if (textareaDireccion) textareaDireccion.value = '';
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
            
            if (propietarioSelector) {
                propietarioSelector.style.display = 'none';
            }
            if (inputNuevoPropietario) {
                inputNuevoPropietario.style.display = 'none';
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
            
            // Agregar el nombre del nuevo propietario si está visible
            const inputNuevoPropietario = document.getElementById('inputNuevoPropietario');
            if (inputNuevoPropietario && inputNuevoPropietario.style.display !== 'none') {
                formData.append('propietario_nombre', inputNuevoPropietario.value);
                // Eliminar el propietario_id para que cree uno nuevo
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