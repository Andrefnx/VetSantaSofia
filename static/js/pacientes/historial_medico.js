// Mostrar modal de detalle
document.querySelectorAll('.timeline-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
        const consulta = consultas[idx] || consultas[0];
        document.getElementById('detalleTemp').textContent = consulta.temp || '-';
        document.getElementById('detallePeso').textContent = consulta.peso || '-';
        document.getElementById('detalleFC').textContent = consulta.fc || '-';
        document.getElementById('detalleFR').textContent = consulta.fr || '-';
        document.getElementById('detalleOtros').textContent = consulta.otros || '-';
        document.getElementById('detalleTitulo').innerHTML = `<i class="bi bi-clipboard2-pulse"></i> ${consulta.titulo}`;
        document.getElementById('detalleContenido').innerHTML = `
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-person-badge"></i> Médico Tratante</div>
                    <p>${consulta.medico}</p>
                </div>
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-calendar-event"></i> Fecha</div>
                    <p>${consulta.fecha}</p>
                </div>
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-clipboard2-check"></i> Diagnóstico</div>
                    <p>${consulta.diagnostico}</p>
                </div>
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-capsule"></i> Tratamiento</div>
                    <p>${consulta.tratamiento}</p>
                </div>
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-file-earmark-medical"></i> Exámenes</div>
                    <ul style="padding-left:1.2em;">
                        ${consulta.examenes.map(exam => `
                            <li>
                                <a href="${exam.url}" target="_blank" class="vet-link-exam">
                                    <i class="bi bi-file-earmark-text"></i> ${exam.nombre}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-journal-text"></i> Notas</div>
                    <p>${consulta.notas}</p>
                </div>
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-lightbulb"></i> Recomendaciones</div>
                    <p>${consulta.recomendaciones}</p>
                </div>
            `;
        openVetModal('detalleConsultaModal');
    });
});

// Modal Nueva Consulta
document.getElementById('btnNuevaConsulta').onclick = async function () {
    openVetModal('nuevaConsultaModal');
    // Cargar inventario DESPUÉS de abrir el modal
    await cargarInventario();
};
document.getElementById('closeNuevaConsultaModal').onclick = function () {
    closeVetModal('nuevaConsultaModal');
};
document.getElementById('closeNuevaConsultaModal').onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") closeVetModal('nuevaConsultaModal');
};

// Abrir modal de agendar cita
document.getElementById('btnAgendarCitaModal').onclick = function () {
    openVetModal('agendarCitaModal');
};
document.getElementById('closeAgendarCitaModal').onclick = function () {
    closeVetModal('agendarCitaModal');
};
document.getElementById('closeAgendarCitaModal').onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") closeVetModal('agendarCitaModal');
};

// Guardar cita agendada en gris
document.getElementById('formAgendarCita').onsubmit = function (e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    // Formatea fecha y hora
    const fecha = data.fecha ? data.fecha.split('-').reverse().join('/') : '-';
    const hora = data.hora || '-';
    const tipo = {
        hospitalizacion: 'Hospitalización',
        consulta: 'Consulta general',
        control: 'Control',
        vacunacion: 'Vacunación'
    }[data.tipo] || '-';
    const nuevaCitaHTML = `
            <div class="timeline-item nueva-consulta-agendada">
                <div class="timeline-content">
                    <h3 class="event-title" style="color:#555;"><i class="bi bi-calendar-plus"></i> Cita Agendada</h3>
                    <p class="event-subtitle" style="color:#888;">
                        Tipo: ${tipo}<br>
                        Fecha: ${fecha} ${hora ? 'a las ' + hora : ''}
                    </p>
                    <p class="event-notes" style="color:#888;">
                        ${data.notas || ''}
                    </p>
                </div>
            </div>
        `;
    document.getElementById('nuevasConsultas').insertAdjacentHTML('beforeend', nuevaCitaHTML);
    closeVetModal('agendarCitaModal');
    form.reset();
};

// Guardar nueva consulta en historial (blanca)
document.getElementById('formNuevaConsulta').onsubmit = async function (e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    // ⭐ Recuperar datos exactamente como en el botón de debug
    const medico = document.getElementById('medicoTratante')?.textContent.trim() || '';
    const fecha = document.getElementById('fechaConsulta')?.textContent.trim() || '';
    
    // ⭐ Construir objeto de datos con los mismos nombres
    const data = {
        paciente_id: window.pacienteData.id,
        medico: medico,
        fecha: fecha,
        tipo_consulta: formData.get('tipo_consulta'),
        temperatura: formData.get('temperatura'),
        peso: formData.get('peso'),
        frecuencia_cardiaca: formData.get('frecuencia_cardiaca'),
        frecuencia_respiratoria: formData.get('frecuencia_respiratoria'),
        otros: formData.get('otros') || '',
        diagnostico: formData.get('diagnostico') || '',
        tratamiento: formData.get('tratamiento') || '',
        notas: formData.get('notas') || '',
        medicamentos: medicamentosSeleccionados
    };
    
    console.log('📤 Enviando consulta:', data);
    
    try {
        const response = await fetch(`/clinica/pacientes/${window.pacienteData.id}/consulta/crear/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Consulta guardada:', result);
            closeVetModal('nuevaConsultaModal');
            form.reset();
            medicamentosSeleccionados = [];
            location.reload();
        } else {
            console.error('❌ Error al guardar:', result.error);
            alert(`Error: ${result.error}`);
        }
        
    } catch (error) {
        console.error('❌ Error de red:', error);
        alert('Error al guardar la consulta. Por favor intente nuevamente.');
    }
};

// Modal detalle: cerrar y editar
document.getElementById('closeDetalleModal').onclick = function () {
    closeVetModal('detalleConsultaModal');
};
document.getElementById('closeDetalleModal').onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") closeVetModal('detalleConsultaModal');
};
document.getElementById('btnAgendarCita').onclick = function () {
    alert('Funcionalidad para agendar próxima cita');
};
document.getElementById('editarConsultaBtn').onclick = function () {
    alert('Funcionalidad para editar consulta');
};
window.onclick = function (event) {
    const modalDetalle = document.getElementById('detalleConsultaModal');
    const modalNueva = document.getElementById('nuevaConsultaModal');
    if (event.target === modalDetalle) closeVetModal('detalleConsultaModal');
    if (event.target === modalNueva) closeVetModal('nuevaConsultaModal');
}

// Cargar inventario para el selector de tratamiento
async function cargarInventario() {
    try {
        const response = await fetch('/inventario/api/productos/');
        const data = await response.json();
        
        console.log('📦 Respuesta API:', data);
        
        if (!data.success) {
            console.error('❌ Error del servidor:', data.error);
            return;
        }
        
        if (!Array.isArray(data.productos)) {
            console.error('❌ productos no es un array:', typeof data.productos);
            return;
        }
        
        console.log(`✅ ${data.productos.length} productos cargados`);
        
        // La función cargarInventarioFiltrado() de inventario_consulta.js se encarga del resto
        
    } catch (error) {
        console.error('❌ Error de red:', error);
    }
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

// ⭐ Función para ver el detalle de una consulta
function verDetalleConsulta(consultaId) {
    // Buscar la consulta por ID (puedes hacer fetch al backend o usar datos cargados)
    fetch(`/clinica/pacientes/${window.pacienteData.id}/consulta/${consultaId}/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const consulta = data.consulta;
                
                // Llenar el modal con los datos
                document.getElementById('detalleTemp').textContent = consulta.temperatura ? consulta.temperatura + '°C' : '-';
                document.getElementById('detallePeso').textContent = consulta.peso ? consulta.peso + ' kg' : '-';
                document.getElementById('detalleFC').textContent = consulta.frecuencia_cardiaca ? consulta.frecuencia_cardiaca + ' lpm' : '-';
                document.getElementById('detalleFR').textContent = consulta.frecuencia_respiratoria ? consulta.frecuencia_respiratoria + ' rpm' : '-';
                document.getElementById('detalleOtros').textContent = consulta.otros || '-';
                document.getElementById('detalleTitulo').innerHTML = `<i class="bi bi-clipboard2-pulse"></i> Consulta del ${consulta.fecha}`;
                document.getElementById('detalleContenido').innerHTML = `
                    <div class="detail-section">
                        <div class="detail-section-title"><i class="bi bi-person-badge"></i> Médico Tratante</div>
                        <p>${consulta.veterinario}</p>
                    </div>
                    <div class="detail-section">
                        <div class="detail-section-title"><i class="bi bi-calendar-event"></i> Fecha</div>
                        <p>${consulta.fecha}</p>
                    </div>
                    <div class="detail-section">
                        <div class="detail-section-title"><i class="bi bi-clipboard2-check"></i> Diagnóstico</div>
                        <p>${consulta.diagnostico || 'No especificado'}</p>
                    </div>
                    <div class="detail-section">
                        <div class="detail-section-title"><i class="bi bi-capsule"></i> Tratamiento</div>
                        <p>${consulta.tratamiento || 'No especificado'}</p>
                    </div>
                    <div class="detail-section">
                        <div class="detail-section-title"><i class="bi bi-journal-text"></i> Notas</div>
                        <p>${consulta.notas || 'Sin notas'}</p>
                    </div>
                `;
                
                openVetModal('detalleConsultaModal');
            }
        })
        .catch(error => {
            console.error('❌ Error al cargar consulta:', error);
            alert('Error al cargar la consulta');
        });
}

// Agregar insumo a la lista de utilizados
function agregarInsumo(e) {
    const btn = e.currentTarget;
    const id = btn.dataset.id;
    const nombre = btn.dataset.nombre;
    const dosisMl = parseFloat(btn.dataset.dosis) || 0;
    const pesoRef = parseFloat(btn.dataset.peso) || 1;
    
    const container = document.getElementById('insumosSeleccionados');
    if (!container) return;
    
    // Verificar si ya está agregado
    if (container.querySelector(`[data-insumo-id="${id}"]`)) {
        const existingTag = container.querySelector(`[data-insumo-id="${id}"]`);
        existingTag.style.animation = 'none';
        setTimeout(() => {
            existingTag.style.animation = 'pulse 0.5s ease';
        }, 10);
        return;
    }
    
    // Obtener el item completo del inventario
    const inventarioItem = btn.closest('.inventario-item');
    
    if (inventarioItem) {
        inventarioItem.classList.add('adding');
        setTimeout(() => {
            inventarioItem.style.display = 'none';
            inventarioItem.classList.remove('adding');
        }, 400);
    }
    
    // Obtener peso actual del paciente
    const pesoInput = document.getElementById('pesoConsulta');
    const pesoActual = parseFloat(pesoInput?.value) || 0;
    
    // Calcular dosis según el peso
    let dosisCalculada = 0;
    let dosisTexto = 'Peso no ingresado';
    
    if (pesoActual > 0 && dosisMl > 0 && pesoRef > 0) {
        dosisCalculada = (dosisMl * pesoActual) / pesoRef;
        dosisTexto = `${dosisCalculada.toFixed(2)} ml`;
    } else if (pesoActual > 0) {
        dosisTexto = 'Dosis no definida';
    }
    
    const tag = document.createElement('div');
    tag.className = 'insumo-tag';
    tag.dataset.insumoId = id;
    tag.innerHTML = `
        <div class="insumo-tag-info">
            <span class="insumo-tag-nombre">${nombre}</span>
            <span class="insumo-tag-dosis">Dosis: <strong>${dosisTexto}</strong></span>
        </div>
        <button type="button" class="insumo-tag-remove" title="Eliminar">×</button>
    `;
    
    // Event listener para el botón de eliminar
    tag.querySelector('.insumo-tag-remove').addEventListener('click', function() {
        tag.classList.add('removing');
        setTimeout(() => {
            tag.remove();
            // Volver a mostrar el item en el inventario
            if (inventarioItem) {
                inventarioItem.style.display = 'flex';
                inventarioItem.style.animation = 'fadeInInventory 0.3s ease';
            }
        }, 300);
    });
    
    container.appendChild(tag);
    
    // Scroll automático
    setTimeout(() => {
        tag.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
}

// Filtrar inventario por búsqueda
const searchInventario = document.getElementById('searchInventario');
if (searchInventario) {
    searchInventario.addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        document.querySelectorAll('.inventario-item').forEach(item => {
            const nombre = item.querySelector('.inventario-item-nombre')?.textContent.toLowerCase() || '';
            const id = item.dataset.productoId;
            const estaSeleccionado = document.querySelector(`#insumosSeleccionados [data-insumo-id="${id}"]`);
            
            // Solo mostrar si coincide con la búsqueda Y no está seleccionado
            if (nombre.includes(search) && !estaSeleccionado) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    });
}

// Cargar inventario al abrir el modal
document.getElementById('btnNuevaConsulta')?.addEventListener('click', () => {
    cargarInventario();
});

// ⭐ BOTÓN TEMPORAL PARA DEBUG - Recuperar datos del formulario Y GUARDAR
document.getElementById('btnRecuperarDatos')?.addEventListener('click', async function() {
    const form = document.getElementById('formNuevaConsulta');
    const formData = new FormData(form);
    
    // Recuperar datos exactamente como en el botón de debug
    const medico = document.getElementById('medicoTratante')?.textContent.trim() || '';
    const fecha = document.getElementById('fechaConsulta')?.textContent.trim() || '';
    
    const data = {
        paciente_id: window.pacienteData.id,
        medico: medico,
        fecha: fecha,
        tipo_consulta: formData.get('tipo_consulta'),  // ⭐ AGREGAR ESTA LÍNEA
        temperatura: formData.get('temperatura'),
        peso: formData.get('peso'),
        frecuencia_cardiaca: formData.get('frecuencia_cardiaca'),
        frecuencia_respiratoria: formData.get('frecuencia_respiratoria'),
        otros: formData.get('otros') || '',
        diagnostico: formData.get('diagnostico') || '',
        tratamiento: formData.get('tratamiento') || '',
        notas: formData.get('notas') || '',
        medicamentos: medicamentosSeleccionados
    };
    
    console.log('🔍 ===== RECUPERACIÓN DE DATOS DEL FORMULARIO =====');
    console.log('medico:', medico);
    console.log('fecha:', fecha);
    console.log('tipo_consulta:', formData.get('tipo_consulta'));
    console.log('temperatura:', formData.get('temperatura'));
    console.log('peso:', formData.get('peso'));
    console.log('frecuencia_cardiaca:', formData.get('frecuencia_cardiaca'));
    console.log('frecuencia_respiratoria:', formData.get('frecuencia_respiratoria'));
    console.log('otros:', formData.get('otros'));
    console.log('diagnostico:', formData.get('diagnostico'));
    console.log('tratamiento:', formData.get('tratamiento'));
    console.log('notas:', formData.get('notas'));
    console.log('medicamentos_seleccionados:', medicamentosSeleccionados);
    console.log('📤 Objeto data completo:', data);  // ⭐ Ver el objeto completo
    console.log('🔍 ===== FIN DE RECUPERACIÓN =====');
    
    // ⭐ GUARDAR EN BASE DE DATOS
    console.log('📤 Enviando a la base de datos...');
    
    try {
        const response = await fetch(`/clinica/pacientes/${window.pacienteData.id}/consulta/crear/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Consulta guardada exitosamente:', result);
            alert('✅ Datos recuperados y guardados. ID: ' + result.consulta_id + '\nRevisa la consola (F12)');
            
            // Cerrar modal y recargar
            closeVetModal('nuevaConsultaModal');
            form.reset();
            medicamentosSeleccionados = [];
            location.reload();
        } else {
            console.error('❌ Error al guardar:', result.error);
            alert('❌ Error al guardar: ' + result.error);
        }
        
    } catch (error) {
        console.error('❌ Error de red:', error);
        alert('❌ Error de red al guardar');
    }
});