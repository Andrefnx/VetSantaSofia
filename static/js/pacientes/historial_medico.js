// ⭐ SISTEMA UNIFICADO - TODO EN UN SOLO DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOMContentLoaded - Inicializando aplicación');

    // ===== SISTEMA DE TABS =====
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    const urlParams = new URLSearchParams(window.location.search);

    // Función para activar una tab
    function activateTab(tabName) {
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        const targetButton = document.querySelector(`[data-tab="${tabName}"]`);
        const targetContent = document.getElementById(tabName);
        
        if (targetButton && targetContent) {
            targetButton.classList.add('active');
            targetContent.classList.add('active');
        }
    }

    // Detectar hash o query tab en la URL para abrir tab específica
    setTimeout(() => {
        const tabParam = (urlParams.get('tab') || '').toLowerCase();
        const hash = (window.location.hash || '').substring(1).toLowerCase();
        const target = tabParam || hash;

        if (target) {
            console.log('🔗 Tab solicitada:', target);
            if (target === 'hospitalizaciones' || target === 'hosp') {
                activateTab('hosp');
            } else if (target === 'documentos' || target === 'docs') {
                activateTab('docs');
            } else if (target === 'historial') {
                activateTab('historial');
            }
        }
    }, 100);

    // Estilos y helpers para resaltar elementos cuando llegan via deep-link
    const helperStyle = document.createElement('style');
    helperStyle.textContent = `
        .jump-highlight {
            outline: 2px solid #2563eb;
            border-radius: 10px;
            animation: jumpPulse 1.6s ease-in-out 2;
        }
        @keyframes jumpPulse {
            0% { box-shadow: 0 0 0 0 rgba(37,99,235,0.35); }
            50% { box-shadow: 0 0 0 10px rgba(37,99,235,0); }
            100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
        }
    `;
    document.head.appendChild(helperStyle);

    function focusTimelineItemByCita(citaId) {
        if (!citaId) return null;
        const item = document.querySelector(`.timeline-item[data-cita-id="${citaId}"]`);
        if (item) {
            item.classList.add('jump-highlight');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => item.classList.remove('jump-highlight'), 2500);
        }
        return item;
    }

    function focusHospitalizacionCard(hospId) {
        if (!hospId) return null;
        const card = document.querySelector(`.hospitalizacion-card[data-hosp-id="${hospId}"]`);
        if (card) {
            card.classList.add('jump-highlight');
            card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => card.classList.remove('jump-highlight'), 2500);
        }
        return card;
    }

    function waitHospitalizacionesReady(callback, targetHospId = null) {
        let attempts = 0;
        const maxAttempts = 60;
        const timer = setInterval(() => {
            const managerReady = (typeof hospitalizacionesManager !== 'undefined');
            const hasData = managerReady && Array.isArray(hospitalizacionesManager.hospitalizaciones) && hospitalizacionesManager.hospitalizaciones.length > 0;
            const container = document.getElementById('hospitalizacionesContainer');
            const rendered = container && container.children.length > 0;
            const cardExists = targetHospId ? document.querySelector(`.hospitalizacion-card[data-hosp-id="${targetHospId}"]`) : null;

            if (cardExists || hasData || rendered) {
                clearInterval(timer);
                callback();
            } else if (attempts++ >= maxAttempts) {
                clearInterval(timer);
            }
        }, 150);
    }

    // Deep links: citas, consultas y hospitalizaciones
    const startCitaId = urlParams.get('start_cita');
    const citaDetalleId = urlParams.get('cita');
    const consultaDetalleId = urlParams.get('consulta_id') || urlParams.get('consulta');
    const registroHospId = urlParams.get('registro_hosp');
    const hospFocusId = urlParams.get('hosp_id');

    if (citaDetalleId) {
        setTimeout(() => focusTimelineItemByCita(citaDetalleId), 200);
    }

    if (startCitaId) {
        setTimeout(() => {
            const item = focusTimelineItemByCita(startCitaId);
            const startBtn = item ? item.querySelector('.timeline-btn') : null;
            if (startBtn && typeof iniciarCitaDesdeFicha === 'function') {
                iniciarCitaDesdeFicha(startCitaId, startBtn);
            }
        }, 300);
    }

    if (consultaDetalleId && typeof verDetalleConsulta === 'function') {
        setTimeout(() => verDetalleConsulta(consultaDetalleId), 350);
    }

    if (registroHospId) {
        activateTab('hosp');
        waitHospitalizacionesReady(() => {
            focusHospitalizacionCard(registroHospId);
            if (typeof hospitalizacionesManager !== 'undefined' && typeof hospitalizacionesManager.abrirModalRegistro === 'function') {
                hospitalizacionesManager.abrirModalRegistro(registroHospId);
            }
        }, registroHospId);
    } else if (hospFocusId) {
        activateTab('hosp');
        waitHospitalizacionesReady(() => focusHospitalizacionCard(hospFocusId), hospFocusId);
    }

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            activateTab(targetTab);
        });
    });

    // ===== ELEMENTOS DEL FILTRO =====
    const selectMonth = document.getElementById('selectMonth');
    const selectYear = document.getElementById('selectYear');
    const btnPrevMonth = document.getElementById('btnPrevMonth');
    const btnNextMonth = document.getElementById('btnNextMonth');
    const btnClearFilters = document.getElementById('btnClearFilters');
    const searchHistorial = document.getElementById('searchHistorial');
    const filterVeterinario = document.getElementById('filterVeterinario');

    console.log('🔍 Elementos encontrados:');
    console.log('  selectMonth:', !!selectMonth);
    console.log('  selectYear:', !!selectYear);
    console.log('  searchHistorial:', !!searchHistorial);
    console.log('  filterVeterinario:', !!filterVeterinario);
    
    // ⭐ DEBUG: Verificar opciones del select
    if (filterVeterinario) {
        console.log('📋 Opciones en filterVeterinario:');
        for (let i = 0; i < filterVeterinario.options.length; i++) {
            console.log(`  [${i}] value="${filterVeterinario.options[i].value}" text="${filterVeterinario.options[i].text}"`);
        }
    }

    let currentFilterMonth = '';
    let currentFilterYear = '';
    let currentFilterVeterinario = '';

    // ===== INICIALIZAR AÑOS =====
    function initializeYears() {
        if (!selectYear) return;
        const currentYear = new Date().getFullYear();
        const nextYear = currentYear + 1;
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

        for (let year = nextYear; year >= oldestYear; year--) {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            selectYear.appendChild(option);
        }
    }

    // ===== FUNCIONES DE FILTRADO =====
    function updateClearButton() {
        const hasFilters = (searchHistorial?.value || currentFilterMonth !== '' || currentFilterYear !== '' || currentFilterVeterinario !== '');
        if (btnClearFilters) {
            btnClearFilters.classList.toggle('show', hasFilters);
        }
    }

    function marcarPrimerosDelMes() {
        const timelineItems = document.querySelectorAll('.timeline-item:not(.empty-state):not(.no-results-message)');
        const monthsShown = new Set();

        timelineItems.forEach(item => {
            if (item.style.display === 'none') {
                item.classList.remove('first-of-month');
                return;
            }

            const fechaCompleta = item.querySelector('.timeline-item-date')?.textContent.trim();
            if (!fechaCompleta) return;

            const [fecha] = fechaCompleta.split(' ');
            const [dia, mes, año] = fecha.split('/');
            const monthYear = `${mes}-${año}`;

            const timelineDate = item.querySelector('.timeline-date');
            if (timelineDate) {
                const monthElement = timelineDate.querySelector('.month');
                const dayElement = timelineDate.querySelector('.day');

                if (monthElement && dayElement) {
                    const monthNames = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
                    monthElement.textContent = monthNames[parseInt(mes) - 1];
                    dayElement.textContent = año;
                }
            }

            if (!monthsShown.has(monthYear)) {
                item.classList.add('first-of-month');
                monthsShown.add(monthYear);
            } else {
                item.classList.remove('first-of-month');
            }
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
            const veterinarioId = String(item.dataset.veterinarioId || '');
            const tipo = item.dataset.tipo || '';

            const matchesSearch = 
                searchTerm === '' ||
                diagnostico.includes(searchTerm) ||
                tratamiento.includes(searchTerm) ||
                veterinario.includes(searchTerm) ||
                tipo.includes(searchTerm);

            const matchesVeterinario = 
                currentFilterVeterinario === '' || 
                veterinarioId === String(currentFilterVeterinario);

            let matchesDate = true;
            if (currentFilterMonth !== '' || currentFilterYear !== '') {
                const fechaCompleta = item.querySelector('.timeline-item-date')?.textContent.trim();
                if (fechaCompleta) {
                    const [fecha] = fechaCompleta.split(' ');
                    const [dia, mes, año] = fecha.split('/');
                    const itemMonth = parseInt(mes) - 1;
                    const itemYear = año;

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

            if (matchesSearch && matchesDate && matchesVeterinario) {
                item.style.display = 'flex';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        marcarPrimerosDelMes();

        const timeline = document.getElementById('timeline');
        if (!timeline) return;
        
        const emptyState = timeline.querySelector('.empty-state');
        let noResultsMsg = timeline.querySelector('.no-results-message');

        if (visibleCount === 0 && (searchTerm !== '' || currentFilterMonth !== '' || currentFilterYear !== '' || currentFilterVeterinario !== '') && timelineItems.length > 0) {
            if (emptyState) emptyState.style.display = 'none';
            if (!noResultsMsg) {
                noResultsMsg = document.createElement('div');
                noResultsMsg.className = 'no-results-message timeline-item';
                noResultsMsg.innerHTML = `<div class="timeline-content" style="text-align: center; padding: 2rem; color: #999;"><i class="bi bi-search" style="font-size: 3rem;"></i><p style="margin-top: 1rem;">No se encontraron coincidencias</p></div>`;
                timeline.appendChild(noResultsMsg);
            } else {
                noResultsMsg.style.display = 'flex';
            }
        } else {
            if (noResultsMsg) noResultsMsg.style.display = 'none';
            if (emptyState && searchTerm === '' && currentFilterMonth === '' && currentFilterYear === '' && currentFilterVeterinario === '') {
                emptyState.style.display = 'flex';
            }
        }
    }

    // ===== EVENT LISTENERS =====
    if (searchHistorial) {
        searchHistorial.addEventListener('input', filtrarHistorial);
    }

    if (filterVeterinario) {
        filterVeterinario.addEventListener('change', function() {
            currentFilterVeterinario = this.value;
            console.log('📋 Veterinario filtrado:', currentFilterVeterinario);
            console.log('📋 Nombre seleccionado:', this.options[this.selectedIndex].text);
            filtrarHistorial();
        });
    }

    if (selectMonth) {
        selectMonth.addEventListener('change', function() {
            currentFilterMonth = this.value;
            updateClearButton();
            filtrarHistorial();
        });
    }

    if (selectYear) {
        selectYear.addEventListener('change', function() {
            currentFilterYear = this.value;
            updateClearButton();
            filtrarHistorial();
        });
    }

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
            currentFilterMonth = month.toString();
            currentFilterYear = year.toString();
            updateClearButton();
            filtrarHistorial();
        });
    }

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
            currentFilterMonth = month.toString();
            currentFilterYear = year.toString();
            updateClearButton();
            filtrarHistorial();
        });
    }

    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', function() {
            selectMonth.value = '';
            selectYear.value = '';
            searchHistorial.value = '';
            currentFilterMonth = '';
            currentFilterYear = '';
            currentFilterVeterinario = '';
            updateClearButton();
            filtrarHistorial();
        });
    }

    // Inicializar
    initializeYears();
    marcarPrimerosDelMes();
});

// ===== MODAL NUEVA CONSULTA (fuera del DOMContentLoaded) =====
// Modal Nueva Consulta (si el botón existe)
const btnNuevaConsulta = document.getElementById('btnNuevaConsulta');
if (btnNuevaConsulta) {
    btnNuevaConsulta.onclick = async function () {
        openVetModal('nuevaConsultaModal');
        await cargarInventario();
        // Cargar antecedentes médicos en el modal
        if (typeof cargarAntecedentesEnModal === 'function') {
            cargarAntecedentesEnModal();
        }
    };
}

const closeNuevaConsultaModal = document.getElementById('closeNuevaConsultaModal');
if (closeNuevaConsultaModal) {
    closeNuevaConsultaModal.onclick = function () {
        closeVetModal('nuevaConsultaModal');
    };

    closeNuevaConsultaModal.onkeydown = function (e) {
        if (e.key === "Enter" || e.key === " ") closeVetModal('nuevaConsultaModal');
    };
}

// Abrir modal de agendar cita (si el botón existe)
const btnAgendarCitaModal = document.getElementById('btnAgendarCitaModal');
if (btnAgendarCitaModal) {
    btnAgendarCitaModal.onclick = function () {
        openVetModal('agendarCitaModal');
    };
}

const closeAgendarCitaModal = document.getElementById('closeAgendarCitaModal');
if (closeAgendarCitaModal) {
    closeAgendarCitaModal.onclick = function () {
        closeVetModal('agendarCitaModal');
    };

    closeAgendarCitaModal.onkeydown = function (e) {
        if (e.key === "Enter" || e.key === " ") closeVetModal('agendarCitaModal');
    };
}

// Guardar nueva consulta (si el formulario existe)
const formNuevaConsulta = document.getElementById('formNuevaConsulta');
if (formNuevaConsulta) {
    formNuevaConsulta.onsubmit = async function (e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    
    const data = {
        paciente_id: window.pacienteData.id,
        tipo_consulta: formData.get('tipo_consulta'),
        servicios_ids: formData.get('servicios_ids'),
        temperatura: formData.get('temperatura'),
        peso: formData.get('peso'),
        frecuencia_cardiaca: formData.get('frecuencia_cardiaca'),
        frecuencia_respiratoria: formData.get('frecuencia_respiratoria'),
        otros: formData.get('otros') || '',
        diagnostico: formData.get('diagnostico') || '',
        tratamiento: formData.get('tratamiento') || '',
        notas: formData.get('notas') || '',
        medicamentos: medicamentosSeleccionados,
        cita_id: form.dataset.citaId || null
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
            
            // Si la consulta fue creada desde una cita, eliminar la cita del timeline
            const citaId = form.dataset.citaId;
            if (citaId) {
                console.log('🗑️ Eliminando cita ID', citaId, 'del timeline');
                const citaElement = document.querySelector(`.timeline-item[data-cita-id="${citaId}"]`);
                if (citaElement) {
                    citaElement.style.opacity = '0.5';
                    citaElement.style.pointerEvents = 'none';
                    // Fade out y remover elemento
                    setTimeout(() => {
                        citaElement.remove();
                        console.log('✅ Cita removida del DOM');
                    }, 300);
                }
                // Limpiar el dataset
                delete form.dataset.citaId;
            }
            
            closeVetModal('nuevaConsultaModal');
            form.reset();
            medicamentosSeleccionados = [];
            
            // Recargar datos sin refresh completo (opcional: solo refrescar si es necesario)
            setTimeout(() => {
                location.reload();
            }, 500);
        } else {
            console.error('❌ Error al guardar:', result.error);
            alert(`Error: ${result.error}`);
        }
        
    } catch (error) {
        console.error('❌ Error de red:', error);
        alert('Error al guardar la consulta. Por favor intente nuevamente.');
    }
    };
}

// Modal detalle
// Los eventos se configuran al final del archivo

window.onclick = function (event) {
    const modalDetalle = document.getElementById('detalleConsultaModal');
    const modalNueva = document.getElementById('nuevaConsultaModal');
    const modalCita = document.getElementById('agendarCitaModal');
    
    // Cerrar si haces click en el overlay (fondo gris)
    if (event.target.classList.contains('vet-modal-overlay')) {
        if (event.target === modalDetalle) closeVetModal('detalleConsultaModal');
        if (event.target === modalNueva) closeVetModal('nuevaConsultaModal');
        if (event.target === modalCita) closeVetModal('agendarCitaModal');
    }
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
        
        // ✅ CRITICAL: Render the inventory in the modal
        if (typeof mostrarInventario === 'function') {
            mostrarInventario(data.productos);
            console.log('✅ Inventario renderizado en el modal');
        } else {
            console.error('❌ mostrarInventario() no está disponible');
        }
        
        // ✅ CRITICAL: Initialize weight field
        if (typeof inicializarPesoConsulta === 'function') {
            inicializarPesoConsulta();
            console.log('✅ Peso inicializado');
        } else {
            console.warn('⚠️ inicializarPesoConsulta() no está disponible');
        }
        
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
    if (!consultaId || consultaId === 'undefined' || consultaId === '') {
        console.error('Error: consultaId no es válido', consultaId);
        alert('Error: No se puede obtener el ID de la consulta');
        return;
    }
    
    // Esperar a que window.pacienteData esté disponible
    function procederConDetalle() {
        if (!window.pacienteData || !window.pacienteData.id) {
            console.error('Error: window.pacienteData no está disponible', window.pacienteData);
            alert('Error: No se puede obtener los datos del paciente. Por favor, recarga la página.');
            return;
        }
        
        const pacienteId = window.pacienteData.id;
        
        fetch(`/clinica/pacientes/${pacienteId}/consulta/${consultaId}/detalle/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    const c = data.consulta;
                    
                    document.getElementById('detalleTitulo').innerHTML = 
                        `<i class="bi bi-clipboard2-pulse"></i> ${c.tipo_consulta || 'Consulta'} - ${c.fecha}`;
                    
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
    
    // Si window.pacienteData ya está disponible, proceder inmediatamente
    if (window.pacienteData && window.pacienteData.id) {
        procederConDetalle();
    } else {
        // Si no, esperar a que se cargue
        let intentos = 0;
        const intervalo = setInterval(() => {
            intentos++;
            if (window.pacienteData && window.pacienteData.id) {
                clearInterval(intervalo);
                procederConDetalle();
            } else if (intentos > 50) { // Máximo 5 segundos
                clearInterval(intervalo);
                console.error('Error: window.pacienteData no se cargó');
                alert('Error: No se pueden cargar los datos del paciente');
            }
        }, 100);
    }
}

// ===== INICIAR CITA DESDE FICHA =====
// Función para abrir modal de consulta con datos precargados de una cita
window.iniciarCitaDesdeFicha = async function(citaId, buttonElement) {
    console.log('🔵 iniciarCitaDesdeFicha llamado con citaId:', citaId);
    
    // Obtener el elemento timeline-item que contiene esta cita
    const timelineItem = buttonElement.closest('.timeline-item');
    if (!timelineItem) {
        console.error('❌ No se encontró el elemento timeline-item');
        return;
    }
    
    // Extraer datos de la cita desde los atributos data
    const citaData = {
        id: timelineItem.dataset.citaId || citaId,
        servicio: timelineItem.dataset.servicio || '',
        veterinario: timelineItem.dataset.veterinario || '',
        fecha: timelineItem.dataset.fecha || '',
        hora: timelineItem.dataset.hora || '',
    };
    
    console.log('📋 Datos de la cita extraídos:', citaData);
    
    // Abrir el modal de nueva consulta
    openVetModal('nuevaConsultaModal');
    
    // Precargar datos en el formulario
    // 1. Precargar fecha (ya viene en formato d/m/Y)
    const fechaConsulta = document.getElementById('fechaConsulta');
    if (fechaConsulta) {
        fechaConsulta.textContent = citaData.fecha;
        console.log('✅ Fecha precargada:', citaData.fecha);
    }
    
    // 2. Precargar veterinario
    const medicoTratante = document.getElementById('medicoTratante');
    if (medicoTratante) {
        medicoTratante.textContent = citaData.veterinario;
        console.log('✅ Veterinario precargado:', citaData.veterinario);
    }
    
    // 3. Precargar servicio esperando a que serviciosPromise esté disponible
    if (citaData.servicio) {
        try {
            console.log('⏳ Esperando a que los servicios se carguen... Buscando:', citaData.servicio);
            
            // Esperar a que los servicios estén cargados
            if (typeof window.serviciosPromise !== 'undefined' && window.serviciosPromise) {
                await window.serviciosPromise;
                console.log('✅ Promesa de servicios resuelta');
            } else {
                console.warn('⚠️ window.serviciosPromise no está disponible');
            }
            
            // Ahora intentar buscar el servicio en todosLosServicios
            if (typeof window.todosLosServicios !== 'undefined' && Array.isArray(window.todosLosServicios) && window.todosLosServicios.length > 0) {
                console.log('📚 Servicios disponibles:', window.todosLosServicios.length);
                
                // Buscar el servicio por nombre (búsqueda flexible)
                const servicioEncontrado = window.todosLosServicios.find(s => 
                    s.nombre.toLowerCase().trim() === citaData.servicio.toLowerCase().trim()
                );
                
                if (servicioEncontrado) {
                    console.log('📌 Servicio encontrado:', servicioEncontrado);
                    // Usar la función global agregarServicio para agregarlo
                    if (typeof agregarServicio === 'function') {
                        agregarServicio(servicioEncontrado.idServicio, servicioEncontrado.nombre);
                        console.log('✅ Servicio precargado:', servicioEncontrado.nombre);
                    } else {
                        console.warn('⚠️ agregarServicio no está disponible');
                    }
                } else {
                    console.warn('⚠️ Servicio no encontrado en la lista:', citaData.servicio);
                    console.log('Servicios disponibles:', window.todosLosServicios.map(s => s.nombre).join(', '));
                }
            } else {
                console.warn('⚠️ window.todosLosServicios no disponible o vacío:', window.todosLosServicios);
            }
        } catch (err) {
            console.error('❌ Error esperando servicios:', err);
        }
    }
    
    // 4. Guardar el ID de la cita en el formulario para después usarlo
    const formNuevaConsulta = document.getElementById('formNuevaConsulta');
    if (formNuevaConsulta) {
        formNuevaConsulta.dataset.citaId = citaId;
        console.log('✅ Cita ID almacenado en dataset:', citaId);
    }
    
    // 5. Cargar el inventario (esperar a que termine)
    try {
        console.log('⏳ Cargando inventario...');
        if (typeof cargarInventario === 'function') {
            const inventarioResult = await cargarInventario();
            console.log('✅ Inventario cargado:', inventarioResult);
        } else {
            console.warn('⚠️ cargarInventario no está disponible');
        }
    } catch (err) {
        console.error('❌ Error cargando inventario:', err);
    }
    
    // 6. Cargar antecedentes
    try {
        if (typeof cargarAntecedentesEnModal === 'function') {
            cargarAntecedentesEnModal();
            console.log('✅ Antecedentes cargados');
        }
    } catch (err) {
        console.error('⚠️ Error cargando antecedentes:', err);
    }
};

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

// ===== CONFIGURAR CIERRE DEL MODAL =====
(function() {
    console.log('🔧 Configurando eventos del modal de detalle...');
    
    const closeBtn = document.getElementById('closeDetalleModal');
    const modalDetalle = document.getElementById('detalleConsultaModal');
    
    if (!closeBtn) {
        console.error('❌ closeDetalleModal no encontrado en el DOM');
        return;
    }
    
    if (!modalDetalle) {
        console.error('❌ detalleConsultaModal no encontrado en el DOM');
        return;
    }
    
    console.log('✅ Elementos del modal encontrados');
    
    // Función para cerrar el modal
    function cerrarModal() {
        console.log('🔴 Cerrando modal detalleConsultaModal');
        modalDetalle.classList.add('hide');
    }
    
    // Click en la X
    closeBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('✅ Cierre por click en X');
        cerrarModal();
    });
    
    // Click en el overlay (fondo gris)
    modalDetalle.addEventListener('click', function(e) {
        if (e.target === this) {
            console.log('✅ Cierre por click en overlay');
            cerrarModal();
        }
    });
    
    // Tecla Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && !modalDetalle.classList.contains('hide')) {
            console.log('✅ Cierre por Escape');
            cerrarModal();
        }
    });
    
    console.log('✅ Eventos del modal configurados correctamente');
})();