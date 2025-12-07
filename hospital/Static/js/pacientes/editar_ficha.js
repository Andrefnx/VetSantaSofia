document.addEventListener('DOMContentLoaded', function() {
    const btnEditarFicha = document.getElementById('btnEditarFicha');
    const btnEditActions = document.getElementById('btnEditActions');
    const btnCancelar = document.getElementById('btnCancelar');
    const btnGuardar = document.getElementById('btnGuardar');
    
    const viewElements = document.querySelectorAll('.view-mode');
    const editElements = document.querySelectorAll('.edit-mode');
    
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
            
            btnEditarFicha.style.display = 'none';
            btnEditActions.style.display = 'flex';
            
            viewElements.forEach(el => el.style.display = 'none');
            editElements.forEach(el => el.style.display = 'block');
        });
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
            
            btnEditarFicha.style.display = 'block';
            btnEditActions.style.display = 'none';
            
            viewElements.forEach(el => el.style.display = 'inline');
            editElements.forEach(el => el.style.display = 'none');
        });
    }

    // Guardar cambios
    if (btnGuardar) {
        btnGuardar.addEventListener('click', function() {
            const formData = new FormData();
            
            editElements.forEach(el => {
                if (el.name) {
                    formData.append(el.name, el.value || '');
                    console.log(`${el.name}: ${el.value}`);
                }
            });

            // Obtener el ID del paciente desde la URL
            const pathParts = window.location.pathname.split('/').filter(Boolean);
            const pacienteId = pathParts[pathParts.length - 1];
            
            const url = `/hospital/pacientes/editar/${pacienteId}/ajax/`;
            console.log('URL:', url);
            console.log('CSRF Token:', getCookie('csrftoken'));
            
            fetch(url, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken')
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