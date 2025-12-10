// ⭐ SISTEMA DE TABS
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remover clase active de todos los botones y contenidos
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Agregar clase active al botón clickeado
            this.classList.add('active');
            
            // Mostrar el contenido correspondiente
            const targetContent = document.getElementById(targetTab);
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
});

// Modal Nueva Consulta
document.getElementById('btnNuevaConsulta').onclick = async function () {
    openVetModal('nuevaConsultaModal');
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

// Guardar nueva consulta
document.getElementById('formNuevaConsulta').onsubmit = async function (e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const data = {
        paciente_id: window.pacienteData.id,
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

// Modal detalle
document.getElementById('closeDetalleModal').onclick = function () {
    closeVetModal('detalleConsultaModal');
};

document.getElementById('closeDetalleModal').onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") closeVetModal('detalleConsultaModal');
};

document.getElementById('btnAgendarCita').onclick = function () {
    closeVetModal('detalleConsultaModal');
    openVetModal('agendarCitaModal');
};

window.onclick = function (event) {
    const modalDetalle = document.getElementById('detalleConsultaModal');
    const modalNueva = document.getElementById('nuevaConsultaModal');
    const modalCita = document.getElementById('agendarCitaModal');
    if (event.target === modalDetalle) closeVetModal('detalleConsultaModal');
    if (event.target === modalNueva) closeVetModal('nuevaConsultaModal');
    if (event.target === modalCita) closeVetModal('agendarCitaModal');
}

// Cargar inventario
async function cargarInventario() {
    try {
        const response = await fetch('/inventario/api/productos/');
        const data = await response.json();
        
        console.log('📦 Inventario cargado:', data);
        
        if (!data.success) {
            console.error('❌ Error del servidor:', data.error);
            return;
        }
        
        if (!Array.isArray(data.productos)) {
            console.error('❌ productos no es un array');
            return;
        }
        
        console.log(`✅ ${data.productos.length} productos disponibles`);
        
    } catch (error) {
        console.error('❌ Error de red:', error);
    }
}

// Obtener CSRF token
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

// Ver detalle de consulta
function verDetalleConsulta(consultaId) {
    const pacienteId = window.pacienteData.id;
    
    fetch(`/clinica/pacientes/${pacienteId}/consulta/${consultaId}/detalle/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const c = data.consulta;
                
                document.getElementById('detalleTitulo').innerHTML = 
                    `<i class="bi bi-clipboard2-pulse"></i> ${c.tipo_consulta} - ${c.fecha}`;
                
                let datosVitales = [];
                if (c.temperatura !== '-') datosVitales.push(`<div class="detalle-dato-item"><i class="bi bi-thermometer-half"></i> Temp: <strong>${c.temperatura}°C</strong></div>`);
                if (c.peso !== '-') datosVitales.push(`<div class="detalle-dato-item"><i class="bi bi-heart-pulse"></i> Peso: <strong>${c.peso} kg</strong></div>`);
                if (c.frecuencia_cardiaca !== '-') datosVitales.push(`<div class="detalle-dato-item"><i class="bi bi-heart"></i> FC: <strong>${c.frecuencia_cardiaca} lpm</strong></div>`);
                if (c.frecuencia_respiratoria !== '-') datosVitales.push(`<div class="detalle-dato-item"><i class="bi bi-lungs"></i> FR: <strong>${c.frecuencia_respiratoria} rpm</strong></div>`);
                
                let medicamentosHTML = '';
                if (c.medicamentos && c.medicamentos.length > 0) {
                    medicamentosHTML = `<div class="detalle-medicamentos">
                        <p class="detalle-medicamentos-title"><i class="bi bi-capsule"></i> <strong>Medicamentos utilizados:</strong></p>
                        <ul class="detalle-medicamentos-list">`;
                    medicamentosHTML += c.medicamentos.map(med => {
                        let texto = med.nombre;
                        if (med.dosis) {
                            texto += ` - <em>${med.dosis}</em>`;
                        }
                        return `<li>${texto}</li>`;
                    }).join('');
                    medicamentosHTML += '</ul></div>';
                }
                
                document.getElementById('detalleContenido').innerHTML = `
                    <div class="detalle-modal-grid">
                        <div class="detalle-sidebar">
                            <div class="detalle-veterinario">
                                <div class="detalle-veterinario-label">
                                    <i class="bi bi-person-badge"></i> Veterinario
                                </div>
                                <div class="detalle-veterinario-nombre">
                                    ${c.veterinario}
                                </div>
                            </div>
                            
                            ${datosVitales.length > 0 ? `
                                <div>
                                    <div class="detalle-datos-vitales-label">
                                        <i class="bi bi-clipboard2-pulse"></i> Datos Vitales
                                    </div>
                                    <div class="detalle-datos-vitales-content">
                                        ${datosVitales.join('')}
                                    </div>
                                    ${c.otros !== '-' ? `<div class="detalle-dato-otros"><strong>Otros:</strong> ${c.otros}</div>` : ''}
                                </div>
                            ` : ''}
                        </div>
                        
                        <div>
                            <div class="detail-section">
                                <div class="detail-section-title"><i class="bi bi-clipboard2-check"></i> Diagnóstico</div>
                                <p>${c.diagnostico}</p>
                            </div>
                            <div class="detail-section">
                                <div class="detail-section-title"><i class="bi bi-capsule"></i> Tratamiento</div>
                                <p>${c.tratamiento}</p>
                                ${medicamentosHTML}
                            </div>
                            <div class="detail-section">
                                <div class="detail-section-title"><i class="bi bi-journal-text"></i> Notas</div>
                                <p>${c.notas}</p>
                            </div>
                        </div>
                    </div>
                `;
                
                openVetModal('detalleConsultaModal');
            }
        })
        .catch(error => console.error('Error:', error));
}

// Filtrar inventario
const searchInventario = document.getElementById('searchInventario');
if (searchInventario) {
    searchInventario.addEventListener('input', (e) => {
        const search = e.target.value.toLowerCase();
        document.querySelectorAll('.inventario-item').forEach(item => {
            const nombre = item.querySelector('.inventario-item-nombre')?.textContent.toLowerCase() || '';
            const id = item.dataset.productoId;
            const estaSeleccionado = document.querySelector(`#insumosSeleccionados [data-insumo-id="${id}"]`);
            
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

// ⭐ FILTRO DE BÚSQUEDA EN HISTORIAL
const searchHistorial = document.getElementById('searchHistorial');
const btnCalendarToggle = document.getElementById('btnCalendarToggle');
const calendarDropdown = document.getElementById('calendarDropdown');
const selectMonth = document.getElementById('selectMonth');
const selectYear = document.getElementById('selectYear');
const btnPrevMonth = document.getElementById('btnPrevMonth');
const btnNextMonth = document.getElementById('btnNextMonth');
const btnCalendarClear = document.getElementById('btnCalendarClear');
const btnCalendarApply = document.getElementById('btnCalendarApply');
const selectedDateText = document.getElementById('selectedDateText');

let currentFilterMonth = '';
let currentFilterYear = '';
// Inicializar años disponibles dinámicamente
function initializeYears() {
    const currentYear = new Date().getFullYear();
    
    // Obtener el año más antiguo del historial
    const timelineItems = document.querySelectorAll('.timeline-item:not(.empty-state)');
    let oldestYear = currentYear;
    
    timelineItems.forEach(item => {
        const fechaCompleta = item.querySelector('.timeline-item-date')?.textContent.trim();
        if (fechaCompleta) {
            const [fecha] = fechaCompleta.split(' ');
            const [dia, mes, año] = fecha.split('/');
            const itemYear = parseInt(año);
            if (itemYear < oldestYear) {
                oldestYear = itemYear;
            }
        }
    });
    
    // Crear opciones desde el año actual hasta el más antiguo
    for (let year = currentYear; year >= oldestYear; year--) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        selectYear.appendChild(option);
    }
}

// Toggle calendario
if (btnCalendarToggle) {
    btnCalendarToggle.addEventListener('click', function(e) {
        e.stopPropagation();
        calendarDropdown.classList.toggle('show');
        this.classList.toggle('active');
    });
}

// Cerrar calendario al hacer click fuera
document.addEventListener('click', function(e) {
    if (!e.target.closest('.historial-date-filter')) {
        calendarDropdown?.classList.remove('show');
        btnCalendarToggle?.classList.remove('active');
    }
});

// Navegación mes anterior
if (btnPrevMonth) {
    btnPrevMonth.addEventListener('click', function() {
        let month = selectMonth.value ? parseInt(selectMonth.value) : new Date().getMonth();
        let year = selectYear.value ? parseInt(selectYear.value) : new Date().getFullYear();
        
        month--;
        if (month < 0) {
            month = 11;
            year--;
        }
        
        selectMonth.value = month;
        selectYear.value = year;
    });
}

// Navegación mes siguiente
if (btnNextMonth) {
    btnNextMonth.addEventListener('click', function() {
        let month = selectMonth.value ? parseInt(selectMonth.value) : new Date().getMonth();
        let year = selectYear.value ? parseInt(selectYear.value) : new Date().getFullYear();
        
        month++;
        if (month > 11) {
            month = 0;
            year++;
        }
        
        selectMonth.value = month;
        selectYear.value = year;
    });
}

// Limpiar filtro
if (btnCalendarClear) {
    btnCalendarClear.addEventListener('click', function() {
        selectMonth.value = '';
        selectYear.value = '';
        currentFilterMonth = '';
        currentFilterYear = '';
        selectedDateText.textContent = 'Filtrar por fecha';
        btnCalendarToggle.classList.remove('active');
        calendarDropdown.classList.remove('show');
        filtrarHistorial();
    });
}

// Aplicar filtro
if (btnCalendarApply) {
    btnCalendarApply.addEventListener('click', function() {
        currentFilterMonth = selectMonth.value;
        currentFilterYear = selectYear.value;
        
        // Actualizar texto del botón
        let text = 'Filtrar por fecha';
        if (currentFilterMonth !== '' || currentFilterYear !== '') {
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                              'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            
            if (currentFilterMonth !== '' && currentFilterYear !== '') {
                text = `${monthNames[parseInt(currentFilterMonth)]} ${currentFilterYear}`;
            } else if (currentFilterMonth !== '') {
                text = monthNames[parseInt(currentFilterMonth)];
            } else if (currentFilterYear !== '') {
                text = currentFilterYear;
            }
        }
        
        selectedDateText.textContent = text;
        calendarDropdown.classList.remove('show');
        btnCalendarToggle.classList.remove('active');
        filtrarHistorial();
    });
}

function filtrarHistorial() {
    const searchTerm = searchHistorial?.value.toLowerCase().trim() || '';
    const timelineItems = document.querySelectorAll('.timeline-item:not(.empty-state):not(.no-results-message)');
    
    let visibleCount = 0;
    
    timelineItems.forEach(item => {
        const diagnostico = item.dataset.diagnostico || '';
        const tratamiento = item.dataset.tratamiento || '';
        const veterinario = item.dataset.veterinario || '';
        const tipo = item.dataset.tipo || '';
        
        // Filtro de búsqueda de texto
        const matchesSearch = 
            searchTerm === '' ||
            diagnostico.includes(searchTerm) ||
            tratamiento.includes(searchTerm) ||
            veterinario.includes(searchTerm) ||
            tipo.includes(searchTerm);
        
        // Filtro de fecha
        let matchesDate = true;
        if (currentFilterMonth !== '' || currentFilterYear !== '') {
            const fechaCompleta = item.querySelector('.timeline-item-date')?.textContent.trim();
            if (fechaCompleta) {
                // Formato: "dd/mm/yyyy HH:MM"
                const [fecha] = fechaCompleta.split(' ');
                const [dia, mes, año] = fecha.split('/');
                
                const itemMonth = parseInt(mes) - 1; // 0-indexed
                const itemYear = año;
                
                matchesDate = true;
                if (currentFilterMonth !== '') {
                    matchesDate = matchesDate && (itemMonth === parseInt(currentFilterMonth));
                }
                if (currentFilterYear !== '') {
                    matchesDate = matchesDate && (itemYear === currentFilterYear);
                }
            } else {
                matchesDate = false;
            }
        }
        
        if (matchesSearch && matchesDate) {
            item.style.display = 'grid';
            visibleCount++;
        } else {
            item.style.display = 'none';
        }
    });
    
    // Manejar mensaje de no resultados
    const timeline = document.getElementById('timeline');
    const emptyState = timeline.querySelector('.empty-state');
    let noResultsMsg = timeline.querySelector('.no-results-message');
    
    if (visibleCount === 0 && (searchTerm !== '' || currentFilterMonth !== '' || currentFilterYear !== '') && timelineItems.length > 0) {
        if (emptyState) {
            emptyState.style.display = 'none';
        }
        
        if (!noResultsMsg) {
            noResultsMsg = document.createElement('div');
            noResultsMsg.className = 'no-results-message timeline-item';
            noResultsMsg.innerHTML = `
                <div class="timeline-content" style="text-align: center; padding: 2rem; color: #999;">
                    <i class="bi bi-search" style="font-size: 3rem;"></i>
                    <p style="margin-top: 1rem;">No se encontraron coincidencias</p>
                </div>
            `;
            timeline.appendChild(noResultsMsg);
        } else {
            noResultsMsg.style.display = 'grid';
        }
    } else {
        if (noResultsMsg) {
            noResultsMsg.style.display = 'none';
        }
        
        if (emptyState && searchTerm === '' && currentFilterMonth === '' && currentFilterYear === '') {
            emptyState.style.display = 'grid';
        }
    }
}

if (searchHistorial) {
    searchHistorial.addEventListener('input', filtrarHistorial);
}

// Inicializar
initializeYears();