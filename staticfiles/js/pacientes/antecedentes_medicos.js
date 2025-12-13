document.addEventListener('DOMContentLoaded', function() {
    // ⭐ EDITAR ANTECEDENTES MÉDICOS CRÍTICOS (FICHA PRINCIPAL)
    const btnEditarAntecedentes = document.getElementById('btnEditarAntecedentes');
    const btnEditAntecedentesActions = document.getElementById('btnEditAntecedentesActions');
    const btnCancelarAntecedentes = document.getElementById('btnCancelarAntecedentes');
    const btnGuardarAntecedentes = document.getElementById('btnGuardarAntecedentes');
    const infoAntecedentes = document.getElementById('infoAntecedentes');

    let originalAntecedentes = {};

    if (btnEditarAntecedentes && infoAntecedentes) {
        // Toggle modo edición
        btnEditarAntecedentes.addEventListener('click', function() {
            console.log('📝 Entrando en modo edición de antecedentes');
            
            // Guardar datos originales
            const antecedentesInputs = infoAntecedentes.querySelectorAll('textarea.edit-mode');
            antecedentesInputs.forEach(input => {
                originalAntecedentes[input.name] = input.value;
            });

            // Agregar clase de modo edición
            infoAntecedentes.classList.add('edit-mode-active');

            // Mostrar/ocultar elementos
            infoAntecedentes.querySelectorAll('.view-mode').forEach(el => el.style.display = 'none');
            infoAntecedentes.querySelectorAll('textarea.edit-mode').forEach(el => el.style.display = 'block');
            
            btnEditarAntecedentes.style.display = 'none';
            btnEditAntecedentesActions.style.display = 'flex';
        });

        // Cancelar edición
        if (btnCancelarAntecedentes) {
            btnCancelarAntecedentes.addEventListener('click', function() {
                console.log('❌ Cancelando edición de antecedentes');
                
                // Restaurar valores originales
                const antecedentesInputs = infoAntecedentes.querySelectorAll('textarea.edit-mode');
                antecedentesInputs.forEach(input => {
                    input.value = originalAntecedentes[input.name] || '';
                });

                // Remover clase de modo edición
                infoAntecedentes.classList.remove('edit-mode-active');

                // Mostrar/ocultar elementos
                infoAntecedentes.querySelectorAll('.view-mode').forEach(el => el.style.display = 'inline');
                infoAntecedentes.querySelectorAll('textarea.edit-mode').forEach(el => el.style.display = 'none');
                
                btnEditarAntecedentes.style.display = 'block';
                btnEditAntecedentesActions.style.display = 'none';
            });
        }

        // Guardar antecedentes
        if (btnGuardarAntecedentes) {
            btnGuardarAntecedentes.addEventListener('click', function() {
                console.log('💾 Guardando antecedentes');
                
                const pacienteId = window.pacienteData.id;
                
                const data = {
                    alergias: infoAntecedentes.querySelector('textarea[name="alergias"]').value || '',
                    enfermedades_cronicas: infoAntecedentes.querySelector('textarea[name="enfermedades_cronicas"]').value || '',
                    medicamentos_actuales: infoAntecedentes.querySelector('textarea[name="medicamentos_actuales"]').value || '',
                    cirugia_previa: infoAntecedentes.querySelector('textarea[name="cirugia_previa"]').value || '',
                };

                console.log('📤 Datos a guardar:', data);

                fetch(`/clinica/pacientes/${pacienteId}/antecedentes/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken')
                    },
                    body: JSON.stringify(data)
                })
                .then(response => response.json())
                .then(result => {
                    if (result.success) {
                        console.log('✅ Antecedentes guardados:', result);
                        
                        // Actualizar vista con nuevos valores
                        const viewSpans = infoAntecedentes.querySelectorAll('.view-mode');
                        viewSpans[0].textContent = data.alergias || 'No registradas';
                        viewSpans[1].textContent = data.enfermedades_cronicas || 'No registradas';
                        viewSpans[2].textContent = data.medicamentos_actuales || 'Ninguno';
                        viewSpans[3].textContent = data.cirugia_previa || 'Ninguna registrada';
                        
                        // Remover clase de modo edición
                        infoAntecedentes.classList.remove('edit-mode-active');

                        // Volver a modo vista
                        infoAntecedentes.querySelectorAll('.view-mode').forEach(el => el.style.display = 'inline');
                        infoAntecedentes.querySelectorAll('textarea.edit-mode').forEach(el => el.style.display = 'none');
                        
                        btnEditarAntecedentes.style.display = 'block';
                        btnEditAntecedentesActions.style.display = 'none';
                        
                        // También actualizar en el modal si está abierto
                        actualizarAntecedentesModal(data);
                        
                        alert('✅ Antecedentes actualizados exitosamente');
                    } else {
                        alert('❌ Error: ' + (result.error || 'Error desconocido'));
                    }
                })
                .catch(error => {
                    console.error('❌ Error:', error);
                    alert('Error al guardar los antecedentes');
                });
            });
        }
    } else {
        console.warn('⚠️ Elementos de antecedentes no encontrados en ficha principal');
    }

    // ⭐ ANTECEDENTES EN MODAL DE NUEVA CONSULTA
    const btnEditarAntecedentesModal = document.getElementById('btnEditarAntecedentesModal');
    const btnCancelarAntecedentesModal = document.getElementById('btnCancelarAntecedentesModal');
    const btnGuardarAntecedentesModal = document.getElementById('btnGuardarAntecedentesModal');
    const antecedentesAlerta = document.getElementById('antecedentesAlerta');
    const antecedentesEdicionModal = document.getElementById('antecedentesEdicionModal');

    // Cargar y mostrar antecedentes cuando se abre el modal
    window.cargarAntecedentesEnModal = function() {
        const pacienteId = window.pacienteData.id;
        
        fetch(`/clinica/pacientes/${pacienteId}/data/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Los datos están incompletos desde data/, necesitamos obtenerlos de otro lado
                    // Vamos a cargar desde la ficha actual
                    const infoAntecedentes = document.getElementById('infoAntecedentes');
                    if (infoAntecedentes) {
                        const alergias = infoAntecedentes.querySelector('textarea[name="alergias"]').value;
                        const enfermedades = infoAntecedentes.querySelector('textarea[name="enfermedades_cronicas"]').value;
                        const medicamentos = infoAntecedentes.querySelector('textarea[name="medicamentos_actuales"]').value;
                        const cirugias = infoAntecedentes.querySelector('textarea[name="cirugia_previa"]').value;
                        
                        mostrarAntecedentesModal({
                            alergias: alergias,
                            enfermedades_cronicas: enfermedades,
                            medicamentos_actuales: medicamentos,
                            cirugia_previa: cirugias
                        });
                    }
                }
            })
            .catch(error => console.error('Error cargando antecedentes:', error));
    };

    // Mostrar antecedentes en el modal
    window.mostrarAntecedentesModal = function(antecedentes) {
        const contenido = document.getElementById('antecedentesContenido');
        if (!contenido) return;

        let html = '';
        
        if (antecedentes.alergias && antecedentes.alergias !== 'None' && antecedentes.alergias.trim()) {
            html += `<div><strong>Alergias:</strong> ${antecedentes.alergias}</div>`;
        }
        if (antecedentes.enfermedades_cronicas && antecedentes.enfermedades_cronicas !== 'None' && antecedentes.enfermedades_cronicas.trim()) {
            html += `<div><strong>Enfermedades Crónicas:</strong> ${antecedentes.enfermedades_cronicas}</div>`;
        }
        if (antecedentes.medicamentos_actuales && antecedentes.medicamentos_actuales !== 'None' && antecedentes.medicamentos_actuales.trim()) {
            html += `<div><strong>Medicamentos Actuales:</strong> ${antecedentes.medicamentos_actuales}</div>`;
        }
        if (antecedentes.cirugia_previa && antecedentes.cirugia_previa !== 'None' && antecedentes.cirugia_previa.trim()) {
            html += `<div><strong>Cirugías Previas:</strong> ${antecedentes.cirugia_previa}</div>`;
        }

        // Si no hay datos, mostrar texto vacío
        if (!html) {
            html = '<span style="color: #999; font-style: italic;">Sin antecedentes registrados</span>';
        }
        
        contenido.innerHTML = html;

        // Cargar en textareas de edición
        document.getElementById('antecedentesAlergias').value = (antecedentes.alergias && antecedentes.alergias !== 'None') ? antecedentes.alergias : '';
        document.getElementById('antecedentesEnfermedades').value = (antecedentes.enfermedades_cronicas && antecedentes.enfermedades_cronicas !== 'None') ? antecedentes.enfermedades_cronicas : '';
        document.getElementById('antecedenteMedicamentos').value = (antecedentes.medicamentos_actuales && antecedentes.medicamentos_actuales !== 'None') ? antecedentes.medicamentos_actuales : '';
        document.getElementById('antecedenteCirugias').value = (antecedentes.cirugia_previa && antecedentes.cirugia_previa !== 'None') ? antecedentes.cirugia_previa : '';
    };

    // Actualizar antecedentes en modal cuando se guardan desde ficha
    window.actualizarAntecedentesModal = function(datos) {
        mostrarAntecedentesModal(datos);
    };

    // Editar antecedentes en el modal
    if (btnEditarAntecedentesModal) {
        btnEditarAntecedentesModal.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('📝 Abriendo edición de antecedentes en modal');
            
            const antecedentesVista = document.getElementById('antecedentesVista');
            const antecedentesEdicionModal = document.getElementById('antecedentesEdicionModal');
            
            if (antecedentesVista) antecedentesVista.style.display = 'none';
            if (antecedentesEdicionModal) antecedentesEdicionModal.style.display = 'block';
        });
    }

    // Cancelar edición en modal
    if (btnCancelarAntecedentesModal) {
        btnCancelarAntecedentesModal.addEventListener('click', function() {
            console.log('❌ Cancelando edición en modal');
            
            const antecedentesVista = document.getElementById('antecedentesVista');
            const antecedentesEdicionModal = document.getElementById('antecedentesEdicionModal');
            
            if (antecedentesVista) antecedentesVista.style.display = 'block';
            if (antecedentesEdicionModal) antecedentesEdicionModal.style.display = 'none';
        });
    }

    // Guardar antecedentes desde modal
    if (btnGuardarAntecedentesModal) {
        btnGuardarAntecedentesModal.addEventListener('click', function() {
            console.log('💾 Guardando antecedentes desde modal');
            
            const pacienteId = window.pacienteData.id;
            const data = {
                alergias: document.getElementById('antecedentesAlergias').value || '',
                enfermedades_cronicas: document.getElementById('antecedentesEnfermedades').value || '',
                medicamentos_actuales: document.getElementById('antecedenteMedicamentos').value || '',
                cirugia_previa: document.getElementById('antecedenteCirugias').value || '',
            };

            fetch(`/clinica/pacientes/${pacienteId}/antecedentes/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    console.log('✅ Antecedentes guardados desde modal:', result);
                    
                    // Actualizar vista
                    mostrarAntecedentesModal(data);
                    
                    const antecedentesVista = document.getElementById('antecedentesVista');
                    const antecedentesEdicionModal = document.getElementById('antecedentesEdicionModal');
                    
                    if (antecedentesVista) antecedentesVista.style.display = 'block';
                    if (antecedentesEdicionModal) antecedentesEdicionModal.style.display = 'none';
                    
                    // También actualizar en ficha principal si está visible
                    const infoAntecedentes = document.getElementById('infoAntecedentes');
                    if (infoAntecedentes) {
                        const viewSpans = infoAntecedentes.querySelectorAll('.view-mode');
                        viewSpans[0].textContent = data.alergias || 'No registradas';
                        viewSpans[1].textContent = data.enfermedades_cronicas || 'No registradas';
                        viewSpans[2].textContent = data.medicamentos_actuales || 'Ninguno';
                        viewSpans[3].textContent = data.cirugia_previa || 'Ninguna registrada';
                    }
                    
                    alert('✅ Antecedentes actualizados exitosamente');
                } else {
                    alert('❌ Error: ' + (result.error || 'Error desconocido'));
                }
            })
            .catch(error => {
                console.error('❌ Error:', error);
                alert('Error al guardar los antecedentes');
            });
        });
    }

    // Función auxiliar para obtener CSRF token
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
