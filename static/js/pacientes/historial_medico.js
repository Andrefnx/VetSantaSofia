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
        // ⭐ LIMPIAR FORMULARIO al abrir nueva consulta
        if (typeof window.limpiarFormularioConsulta === 'function') {
            window.limpiarFormularioConsulta();
        }
        
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
        // ⭐ LIMPIAR FORMULARIO al cerrar modal
        if (typeof window.limpiarFormularioConsulta === 'function') {
            window.limpiarFormularioConsulta();
        }
        closeVetModal('nuevaConsultaModal');
    };

    closeNuevaConsultaModal.onkeydown = function (e) {
        if (e.key === "Enter" || e.key === " ") {
            // ⭐ LIMPIAR FORMULARIO al cerrar modal
            if (typeof window.limpiarFormularioConsulta === 'function') {
                window.limpiarFormularioConsulta();
            }
            closeVetModal('nuevaConsultaModal');
        }
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
    // Variable para controlar si es finalización o borrador
    let esFinalizacion = false;
    
    // Botón Guardar Borrador
    const btnGuardarBorrador = document.getElementById('btnGuardarBorrador');
    if (btnGuardarBorrador) {
        btnGuardarBorrador.onclick = function() {
            esFinalizacion = false;
            guardarConsulta(btnGuardarBorrador);
        };
    }
    
    // Botón Finalizar Consulta
    const btnFinalizarConsulta = document.getElementById('btnFinalizarConsulta');
    if (btnFinalizarConsulta) {
        btnFinalizarConsulta.onclick = function() {
            // Verificar si ya está deshabilitado
            if (btnFinalizarConsulta.disabled) {
                alert('⚠️ Esta consulta ya fue finalizada\n\nSe ha creado un cobro pendiente en caja.');
                return;
            }
            
            // Mostrar advertencia
            const confirmacion = confirm(
                '⚠️ ATENCIÓN: Finalizar Consulta\n\n' +
                'Esta acción cerrará la consulta y enviará el cobro pendiente a caja.\n\n' +
                'Una vez finalizada, la consulta quedará registrada.\n\n' +
                '¿Desea continuar?'
            );
            
            if (confirmacion) {
                esFinalizacion = true;
                guardarConsulta(btnFinalizarConsulta);
            }
        };
    }
    
    // Función para actualizar estado de botones según consulta
    window.actualizarEstadoBotonesConsulta = function(consultaData) {
        const btnFinalizar = document.getElementById('btnFinalizarConsulta');
        const btnGuardarBorrador = document.getElementById('btnGuardarBorrador');
        const estadoTexto = document.getElementById('estadoConsultaTexto');
        
        if (!btnFinalizar || !estadoTexto) return;
        
        if (consultaData && consultaData.insumos_descontados) {
            // ⭐ CONSULTA YA FINALIZADA - BLOQUEAR EDICIÓN
            btnFinalizar.disabled = true;
            btnFinalizar.style.opacity = '0.5';
            btnFinalizar.style.cursor = 'not-allowed';
            btnFinalizar.title = 'Esta consulta ya fue finalizada';
            
            // También bloquear botón de guardar borrador
            if (btnGuardarBorrador) {
                btnGuardarBorrador.disabled = true;
                btnGuardarBorrador.style.opacity = '0.5';
                btnGuardarBorrador.style.cursor = 'not-allowed';
                btnGuardarBorrador.title = 'No se puede modificar una consulta finalizada';
            }
            
            estadoTexto.innerHTML = '<i class="bi bi-lock-fill text-success"></i> Consulta finalizada - No se puede modificar';
            estadoTexto.className = 'text-success fw-bold';
            
            // ⭐ BLOQUEAR TODOS LOS CAMPOS DEL FORMULARIO
            bloquearFormularioConsulta();
        } else {
            // Consulta en borrador - permitir edición
            btnFinalizar.disabled = false;
            btnFinalizar.style.opacity = '1';
            btnFinalizar.style.cursor = 'pointer';
            btnFinalizar.title = 'Finalizar y descontar insumos del inventario';
            
            if (btnGuardarBorrador) {
                btnGuardarBorrador.disabled = false;
                btnGuardarBorrador.style.opacity = '1';
                btnGuardarBorrador.style.cursor = 'pointer';
                btnGuardarBorrador.title = 'Guardar sin descontar insumos';
            }
            
            estadoTexto.innerHTML = '<i class="bi bi-info-circle text-muted"></i> Borrador - Sin descuento de insumos';
            estadoTexto.className = 'text-muted';
            
            // Desbloquear campos
            desbloquearFormularioConsulta();
        }
    };
    
    // ⭐ FUNCIÓN PARA BLOQUEAR FORMULARIO DE CONSULTA CONFIRMADA
    function bloquearFormularioConsulta() {
        const formulario = document.querySelector('#modalConsulta form');
        if (!formulario) return;
        
        // Bloquear todos los inputs, selects y textareas
        formulario.querySelectorAll('input, select, textarea').forEach(campo => {
            campo.disabled = true;
            campo.style.opacity = '0.6';
            campo.style.cursor = 'not-allowed';
        });
        
        // Bloquear botones de agregar medicamentos
        const botonesAgregar = formulario.querySelectorAll('button[onclick*="agregarMedicamento"]');
        botonesAgregar.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
        });
        
        console.log('🔒 Formulario bloqueado - Consulta confirmada');
    }
    
    // ⭐ FUNCIÓN PARA DESBLOQUEAR FORMULARIO
    function desbloquearFormularioConsulta() {
        const formulario = document.querySelector('#modalConsulta form');
        if (!formulario) return;
        
        // Desbloquear todos los campos
        formulario.querySelectorAll('input, select, textarea').forEach(campo => {
            campo.disabled = false;
            campo.style.opacity = '1';
            campo.style.cursor = '';
        });
        
        // Desbloquear botones de agregar medicamentos
        const botonesAgregar = formulario.querySelectorAll('button[onclick*="agregarMedicamento"]');
        botonesAgregar.forEach(btn => {
            btn.disabled = false;
            btn.style.opacity = '1';
            btn.style.cursor = 'pointer';
        });
        
        console.log('🔓 Formulario desbloqueado - Consulta en borrador');
    }
    
    // Inicializar estado al abrir modal (por defecto: nueva consulta)
    window.actualizarEstadoBotonesConsulta(null);
    
    // ⭐ FUNCIÓN PARA LIMPIAR FORMULARIO COMPLETO
    function limpiarFormularioConsulta() {
        const form = document.getElementById('formNuevaConsulta');
        if (!form) return;
        
        // Resetear formulario
        form.reset();
        
        // Limpiar medicamentos
        if (typeof window.medicamentosSeleccionados !== 'undefined') {
            window.medicamentosSeleccionados = [];
        }
        if (typeof actualizarMedicamentosSeleccionados === 'function') {
            actualizarMedicamentosSeleccionados();
        }
        
        // ⭐ LIMPIAR MODO EDICIÓN
        delete form.dataset.modoEdicion;
        delete form.dataset.consultaId;
        delete form.dataset.citaId;
        
        // ⭐ RESTAURAR TÍTULO DEL MODAL
        const modalTitle = document.querySelector('#nuevaConsultaModal .modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="bi bi-clipboard2-plus"></i> Nueva Consulta';
        }
        
        // Desbloquear campos
        desbloquearFormularioConsulta();
        
        // Resetear estado de botones
        window.actualizarEstadoBotonesConsulta(null);
        
        console.log('🧹 Formulario limpiado completamente');
    }
    
    // Exportar función para uso global
    window.limpiarFormularioConsulta = limpiarFormularioConsulta;
    
    // ⭐ FUNCIÓN PARA ACTUALIZAR TIMELINE CUANDO SE FINALIZA UNA CONSULTA
    function actualizarTimelineConsultaFinalizada(consultaId) {
        console.log(`🔄 Actualizando timeline para consulta finalizada ${consultaId}`);
        
        // Buscar el elemento de la consulta en el timeline
        const consultaItems = document.querySelectorAll('.timeline-item[data-diagnostico]');
        
        for (const item of consultaItems) {
            // Intentar encontrar el elemento que contiene el botón de editar
            const botonEditar = item.querySelector(`button[onclick*="editarConsulta('${consultaId}')"]`);
            
            if (botonEditar) {
                console.log('✅ Encontrado elemento a actualizar');
                
                // 1. QUITAR BADGE "BORRADOR"
                const badge = item.querySelector('.badge.bg-warning');
                if (badge) {
                    badge.remove();
                    console.log('✅ Badge "Borrador" eliminado');
                }
                
                // 2. CAMBIAR BOTÓN "EDITAR" POR "VER DETALLE"
                botonEditar.onclick = null;
                botonEditar.setAttribute('onclick', `verDetalleConsulta('${consultaId}')`);
                botonEditar.className = 'timeline-btn timeline-item-btn'; // Remover btn-warning
                botonEditar.innerHTML = '<i class="bi bi-eye"></i> Ver detalle';
                console.log('✅ Botón actualizado a "Ver detalle"');
                
                // 3. AÑADIR EFECTO VISUAL DE ACTUALIZACIÓN
                item.style.backgroundColor = '#d4edda'; // Verde suave
                setTimeout(() => {
                    item.style.transition = 'background-color 1s';
                    item.style.backgroundColor = '';
                }, 100);
                
                console.log('✅ Timeline actualizado exitosamente');
                break;
            }
        }
    }
    
    // Función unificada para guardar
    async function guardarConsulta(botonActivador) {
    const form = formNuevaConsulta;
    
    // ✅ VALIDACIÓN CENTRALIZADA: verificar si el formulario ya fue enviado
    if (window.ValidadorInsumos && window.ValidadorInsumos.formularioYaEnviado(form)) {
        window.ValidadorInsumos.mostrarAlerta('Esta consulta ya está siendo procesada.', 'ya_procesando');
        return;
    }
    
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
        cita_id: form.dataset.citaId || null,
        finalizar: esFinalizacion  // ⭐ Nuevo parámetro
    };
    
    // ⭐ DETECTAR MODO EDICIÓN
    const modoEdicion = form.dataset.modoEdicion === 'true';
    const consultaId = form.dataset.consultaId;
    
    if (modoEdicion) {
        console.log(`📝 Actualizando consulta ${consultaId} (${esFinalizacion ? 'FINALIZACIÓN' : 'BORRADOR'}):`, data);
    } else {
        console.log(`📤 Creando nueva consulta (${esFinalizacion ? 'FINALIZACIÓN' : 'BORRADOR'}):`, data);
    }
    
    // ✅ BLOQUEAR BOTÓN durante procesamiento
    if (window.ValidadorInsumos && botonActivador) {
        window.ValidadorInsumos.bloquearBoton(botonActivador);
        window.ValidadorInsumos.marcarFormularioEnviado(form);
    }
    
    try {
        // ⭐ DETERMINAR URL Y MÉTODO SEGÚN MODO
        let url, method;
        if (modoEdicion && consultaId) {
            // Modo edición: UPDATE
            url = `/clinica/consultas/${consultaId}/actualizar/`;
            method = 'PUT';
            data.consulta_id = consultaId;  // Agregar ID a los datos
        } else {
            // Modo creación: CREATE
            url = `/clinica/pacientes/${window.pacienteData.id}/consulta/crear/`;
            method = 'POST';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ Consulta guardada (${esFinalizacion ? 'FINALIZADA' : 'BORRADOR'}):`, result);
            
            // ✅ DESBLOQUEAR BOTÓN con éxito
            if (window.ValidadorInsumos && botonActivador) {
                window.ValidadorInsumos.desbloquearBoton(botonActivador, true);
            }
            
            // Mostrar mensaje apropiado
            if (esFinalizacion) {
                alert('✅ Consulta finalizada exitosamente\n\nLos insumos han sido descontados del inventario.');
            } else {
                alert('✅ Borrador guardado\n\nLa consulta se guardó sin descontar insumos.');
            }
            
            // ⭐ SI SE FINALIZÓ UNA CONSULTA EN MODO EDICIÓN, ACTUALIZAR EL TIMELINE
            if (modoEdicion && esFinalizacion && consultaId) {
                actualizarTimelineConsultaFinalizada(consultaId);
            }
            
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
            limpiarFormularioConsulta();
            
            // Recargar datos sin refresh completo (opcional: solo refrescar si es necesario)
            setTimeout(() => {
                location.reload();
            }, 500);
        } else {
            console.error('❌ Error al guardar:', result.error);
            
            // ✅ DESBLOQUEAR BOTÓN y resetear formulario en caso de error
            if (window.ValidadorInsumos) {
                if (botonActivador) window.ValidadorInsumos.desbloquearBoton(botonActivador, false);
                window.ValidadorInsumos.resetearFormulario(form);
            }
            
            // ⭐ MOSTRAR MENSAJE ESPECÍFICO SEGÚN EL TIPO DE ERROR
            if (result.error === 'stock_insuficiente') {
                // Error de stock insuficiente
                const mensaje = result.message || result.detalles || 'Stock insuficiente para completar esta operación';
                alert(mensaje);
            } else {
                // Otro tipo de error
                alert(`Error: ${result.error}`);
            }
        }
        
    } catch (error) {
        console.error('❌ Error de red:', error);
        
        // ✅ DESBLOQUEAR BOTÓN y resetear formulario en caso de error de red
        if (window.ValidadorInsumos) {
            if (botonActivador) window.ValidadorInsumos.desbloquearBoton(botonActivador, false);
            window.ValidadorInsumos.resetearFormulario(form);
        }
        
        alert('Error al guardar la consulta. Por favor intente nuevamente.');
    }
    }
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
                
                // ⭐ Badge de estado de insumos mejorado
                let estadoInsumosHTML = '';
                if (c.insumos_descontados) {
                    estadoInsumosHTML = `<div class="alert alert-success" style="margin-top: 10px; padding: 8px 12px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                        <i class="bi bi-check-circle-fill"></i>
                        <span><strong>✓ Medicamentos e insumos registrados en inventario</strong></span>
                    </div>`;
                } else if (c.medicamentos && c.medicamentos.length > 0) {
                    estadoInsumosHTML = `<div class="alert alert-warning" style="margin-top: 10px; padding: 8px 12px; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                        <i class="bi bi-exclamation-triangle-fill"></i>
                        <span><strong>⚠ Pendiente: Registrar uso de insumos en inventario</strong></span>
                    </div>`;
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
                                ${estadoInsumosHTML}
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

// ===== EDITAR CONSULTA (BORRADOR) =====
/**
 * Abre el modal de consulta en modo edición para consultas en borrador
 * @param {number} consultaId - ID de la consulta a editar
 */
window.editarConsulta = async function(consultaId) {
    console.log(`📝 Editando consulta ${consultaId}`);
    
    if (!consultaId || consultaId === 'undefined' || consultaId === '') {
        console.error('Error: consultaId no es válido', consultaId);
        alert('Error: No se puede obtener el ID de la consulta');
        return;
    }
    
    // Verificar que pacienteData esté disponible
    if (!window.pacienteData || !window.pacienteData.id) {
        console.error('Error: window.pacienteData no está disponible');
        alert('Error: No se pueden cargar los datos del paciente. Por favor, recarga la página.');
        return;
    }
    
    const pacienteId = window.pacienteData.id;
    
    try {
        // Obtener datos de la consulta
        const response = await fetch(`/clinica/pacientes/${pacienteId}/consulta/${consultaId}/detalle/`);
        const data = await response.json();
        
        if (!data.success) {
            alert('Error al cargar la consulta');
            return;
        }
        
        const consulta = data.consulta;
        console.log('📥 Consulta cargada:', consulta);
        
        // Verificar que sea un borrador editable
        if (consulta.insumos_descontados) {
            alert('⚠️ Esta consulta ya fue finalizada y no se puede editar.\n\nLos insumos ya fueron descontados del inventario.');
            return;
        }
        
        // ⭐ ABRIR MODAL PRIMERO (para mejor UX)
        openVetModal('nuevaConsultaModal');
        
        // ⭐ CAMBIAR TÍTULO DEL MODAL
        const modalTitle = document.querySelector('#nuevaConsultaModal .modal-title');
        if (modalTitle) {
            modalTitle.innerHTML = '<i class="bi bi-pencil-square"></i> Editar Consulta (Borrador)';
        }
        
        // ⭐ CARGAR INVENTARIO (en paralelo, no bloquea)
        if (typeof cargarInventario === 'function') {
            cargarInventario().catch(e => console.warn('⚠️ Error al cargar inventario:', e));
        }
        
        // ⭐ CARGAR DATOS EN EL FORMULARIO
        const form = document.getElementById('formNuevaConsulta');
        if (!form) {
            console.error('No se encontró el formulario');
            return;
        }
        
        // Cargar signos vitales
        if (consulta.temperatura && consulta.temperatura !== '-') {
            const tempInput = form.querySelector('[name="temperatura"]');
            if (tempInput) tempInput.value = consulta.temperatura.replace('°C', '').trim();
        }
        
        if (consulta.peso && consulta.peso !== '-') {
            const pesoInput = form.querySelector('[name="peso"]');
            if (pesoInput) pesoInput.value = consulta.peso.replace('kg', '').trim();
        }
        
        if (consulta.frecuencia_cardiaca && consulta.frecuencia_cardiaca !== '-') {
            const fcInput = form.querySelector('[name="frecuencia_cardiaca"]');
            if (fcInput) fcInput.value = consulta.frecuencia_cardiaca.replace('lpm', '').trim();
        }
        
        if (consulta.frecuencia_respiratoria && consulta.frecuencia_respiratoria !== '-') {
            const frInput = form.querySelector('[name="frecuencia_respiratoria"]');
            if (frInput) frInput.value = consulta.frecuencia_respiratoria.replace('rpm', '').trim();
        }
        
        // Cargar campos de texto
        const otrosTextarea = form.querySelector('[name="otros"]');
        if (otrosTextarea && consulta.otros && consulta.otros !== '-') {
            otrosTextarea.value = consulta.otros;
        }
        
        const diagnosticoTextarea = form.querySelector('[name="diagnostico"]');
        if (diagnosticoTextarea) {
            diagnosticoTextarea.value = consulta.diagnostico || '';
        }
        
        const tratamientoTextarea = form.querySelector('[name="tratamiento"]');
        if (tratamientoTextarea && consulta.tratamiento && consulta.tratamiento !== '-') {
            tratamientoTextarea.value = consulta.tratamiento;
        }
        
        const notasTextarea = form.querySelector('[name="notas"]');
        if (notasTextarea && consulta.notas && consulta.notas !== '-') {
            notasTextarea.value = consulta.notas;
        }
        
        // ⭐ CARGAR SERVICIOS (si existen)
        if (consulta.servicios && consulta.servicios.length > 0) {
            console.log(`🔧 Cargando ${consulta.servicios.length} servicios:`, consulta.servicios);
            
            // Esperar a que los servicios estén cargados
            if (window.serviciosPromise) {
                window.serviciosPromise.then(() => {
                    // Limpiar servicios seleccionados
                    if (typeof window.serviciosSeleccionadosArray !== 'undefined') {
                        window.serviciosSeleccionadosArray = [];
                    }
                    
                    // Agregar cada servicio
                    consulta.servicios.forEach(servicio => {
                        if (typeof window.serviciosSeleccionadosArray !== 'undefined') {
                            window.serviciosSeleccionadosArray.push({
                                id: servicio.id,
                                nombre: servicio.nombre
                            });
                        }
                        console.log(`  ✅ Servicio: ${servicio.nombre} (ID: ${servicio.id})`);
                    });
                    
                    // Actualizar input hidden con IDs
                    const serviciosIdsInput = form.querySelector('[name="servicios_ids"]');
                    if (serviciosIdsInput) {
                        serviciosIdsInput.value = consulta.servicios.map(s => s.id).join(',');
                        console.log(`✅ servicios_ids actualizado: ${serviciosIdsInput.value}`);
                    }
                    
                    // Actualizar UI de servicios si existe la función
                    if (typeof actualizarServiciosSeleccionados === 'function') {
                        actualizarServiciosSeleccionados();
                        console.log('✅ UI de servicios actualizada');
                    }
                }).catch(e => console.warn('⚠️ Error al cargar servicios:', e));
            } else {
                console.warn('⚠️ serviciosPromise no está disponible');
            }
        } else {
            console.log('ℹ️ No hay servicios para cargar');
        }
        
        // ⭐ CARGAR MEDICAMENTOS (si existen)
        if (consulta.medicamentos && consulta.medicamentos.length > 0) {
            console.log(`💊 Cargando ${consulta.medicamentos.length} medicamentos:`, consulta.medicamentos);
            
            // Asegurar que medicamentosSeleccionados está definido
            if (typeof window.medicamentosSeleccionados !== 'undefined') {
                window.medicamentosSeleccionados.length = 0; // Limpiar array existente
                consulta.medicamentos.forEach(med => {
                    const medicamento = {
                        id: med.inventario_id || med.id || null,
                        nombre: med.nombre,
                        dosis: med.dosis || ''
                    };
                    // ⭐ Agregar peso_paciente si existe
                    if (med.peso_paciente) {
                        medicamento.peso_paciente = parseFloat(med.peso_paciente);
                    }
                    window.medicamentosSeleccionados.push(medicamento);
                    console.log(`  ✅ Agregado: ${medicamento.nombre} (ID: ${medicamento.id}, Peso: ${medicamento.peso_paciente || 'N/A'})`);
                });
                
                console.log(`💊 medicamentosSeleccionados final:`, window.medicamentosSeleccionados);
            }
            
            // Actualizar la UI de medicamentos si la función existe
            if (typeof actualizarMedicamentosSeleccionados === 'function') {
                try {
                    actualizarMedicamentosSeleccionados();
                    console.log('✅ UI de medicamentos actualizada');
                } catch (e) {
                    console.error('❌ Error al actualizar lista de medicamentos:', e);
                }
            } else {
                console.warn('⚠️ actualizarMedicamentosSeleccionados no está disponible');
            }
        } else {
            console.log('ℹ️ No hay medicamentos para cargar');
        }
        
        // ⭐ MARCAR CONSULTA COMO MODO EDICIÓN
        form.dataset.modoEdicion = 'true';
        form.dataset.consultaId = consultaId;
        
        // ⭐ ACTUALIZAR ESTADO DE BOTONES
        window.actualizarEstadoBotonesConsulta({
            insumos_descontados: false
        });
        
        console.log('✅ Modal de edición preparado');
        
    } catch (error) {
        console.error('❌ Error al cargar consulta:', error);
        console.error('Stack trace:', error.stack);
        // No mostrar alert para no interrumpir si el modal ya se abrió
    }
};

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

// ===== FUNCIÓN PARA CONFIRMAR CONSULTA =====
/**
 * Confirma una consulta guardada como borrador, descontando insumos del inventario
 * @param {number} consultaId - ID de la consulta a confirmar
 */
window.confirmConsulta = async function(consultaId) {
    console.log(`🔵 Iniciando confirmación de consulta ${consultaId}`);
    
    // Validar ID
    if (!consultaId) {
        alert('❌ Error: ID de consulta inválido');
        return;
    }
    
    // Mostrar confirmación con advertencia
    const confirmacion = confirm(
        '⚠️ ATENCIÓN: Confirmar Consulta\n\n' +
        'Esta acción validará stock disponible y creará un cobro pendiente.\n\n' +
        '• Se verificará que hay stock suficiente\n' +
        '• El descuento ocurrirá al confirmar el pago en caja\n' +
        '• La consulta quedará marcada como finalizada\n\n' +
        '¿Desea continuar con la confirmación?'
    );
    
    if (!confirmacion) {
        console.log('⚠️ Confirmación cancelada por el usuario');
        return;
    }
    
    // Buscar el botón de confirmación para esta consulta
    const botonConfirmar = document.querySelector(`[data-consulta-id="${consultaId}"]`);
    
    // Bloquear botón durante procesamiento
    if (botonConfirmar && window.ValidadorInsumos) {
        window.ValidadorInsumos.bloquearBoton(botonConfirmar);
    } else if (botonConfirmar) {
        botonConfirmar.disabled = true;
        botonConfirmar.textContent = 'Procesando...';
    }
    
    try {
        console.log(`📤 Enviando solicitud de confirmación...`);
        
        const response = await fetch(`/clinica/consultas/${consultaId}/confirmar/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const result = await response.json();
        
        console.log('📥 Respuesta recibida:', result);
        
        if (result.success) {
            // ✅ ÉXITO - SOLO MOSTRAR SI BACKEND CONFIRMA
            console.log('✅ Consulta confirmada exitosamente');
            console.log('📊 Estado insumos_descontados:', result.consulta?.insumos_descontados);
            
            // Verificar si realmente se descontaron los insumos
            if (result.consulta && result.consulta.insumos_descontados) {
                // ✅ Insumos descontados confirmados por backend
                console.log('✅ Backend confirmó descuento de insumos');
                
                // Desbloquear botón con estado de éxito
                if (botonConfirmar && window.ValidadorInsumos) {
                    window.ValidadorInsumos.desbloquearBoton(botonConfirmar, true);
                }
                
                // Mostrar mensaje de éxito SOLO si el backend confirma
                const mensajeExito = result.message || '✅ Consulta confirmada exitosamente\n\n✓ Insumos descontados del inventario correctamente';
                alert(mensajeExito);
                
                // Actualizar visualmente el estado
                actualizarEstadoConsultaVisual(consultaId, true);
                
                // Deshabilitar permanentemente el botón
                if (botonConfirmar) {
                    setTimeout(() => {
                        botonConfirmar.disabled = true;
                        botonConfirmar.style.opacity = '0.5';
                        botonConfirmar.style.cursor = 'not-allowed';
                        botonConfirmar.innerHTML = '<i class="bi bi-check-circle"></i> Confirmada';
                        botonConfirmar.title = 'Esta consulta ya fue confirmada';
                    }, 2000);
                }
                
                // Recargar timeline para reflejar cambios
                setTimeout(() => {
                    location.reload();
                }, 2500);
            } else {
                // ⚠️ Backend respondió success pero no confirmó descuento
                console.warn('⚠️ Backend respondió success pero insumos_descontados no es true');
                alert('⚠️ Operación completada pero estado inconsistente.\n\nPor favor, recargue la página.');
                location.reload();
            }
            
        } else {
            // ❌ ERROR
            console.error('❌ Error al confirmar:', result);
            
            // Desbloquear botón
            if (botonConfirmar && window.ValidadorInsumos) {
                window.ValidadorInsumos.desbloquearBoton(botonConfirmar, false);
            } else if (botonConfirmar) {
                botonConfirmar.disabled = false;
                botonConfirmar.textContent = 'Confirmar';
            }
            
            // Manejar diferentes tipos de error
            if (result.error === 'ya_confirmada') {
                // Consulta ya confirmada
                alert(result.message || '🔒 Esta consulta ya fue confirmada previamente.');
                actualizarEstadoConsultaVisual(consultaId, true);
                if (botonConfirmar) {
                    botonConfirmar.disabled = true;
                    botonConfirmar.style.opacity = '0.5';
                    botonConfirmar.innerHTML = '<i class="bi bi-check-circle"></i> Confirmada';
                }
            } else if (result.error === 'stock_insuficiente') {
                // Stock insuficiente
                alert(result.message || '⚠️ Stock insuficiente\n\nNo hay suficientes insumos en inventario para confirmar esta consulta.');
            } else {
                // Otro error
                alert(result.message || '❌ Error al confirmar la consulta\n\nPor favor, intente nuevamente.');
            }
        }
        
    } catch (error) {
        console.error('❌ Error de red:', error);
        
        // Desbloquear botón
        if (botonConfirmar && window.ValidadorInsumos) {
            window.ValidadorInsumos.desbloquearBoton(botonConfirmar, false);
        } else if (botonConfirmar) {
            botonConfirmar.disabled = false;
            botonConfirmar.textContent = 'Confirmar';
        }
        
        alert('❌ Error de conexión\n\nNo se pudo conectar con el servidor. Por favor, verifique su conexión e intente nuevamente.');
    }
};

/**
 * Actualiza el estado visual de una consulta en el timeline
 * @param {number} consultaId - ID de la consulta
 * @param {boolean} confirmada - Si la consulta está confirmada
 */
function actualizarEstadoConsultaVisual(consultaId, confirmada) {
    console.log(`🎨 Actualizando estado visual de consulta ${consultaId}`);
    
    // Buscar el elemento de la consulta en el timeline (múltiples formas)
    let consultaElement = document.querySelector(`.timeline-item[data-consulta-id="${consultaId}"]`);
    
    // Si no se encuentra con data-consulta-id, buscar por botón
    if (!consultaElement) {
        const consultaItems = document.querySelectorAll('.timeline-item[data-diagnostico]');
        for (const item of consultaItems) {
            const botonEditar = item.querySelector(`button[onclick*="editarConsulta('${consultaId}')"]`);
            const botonVer = item.querySelector(`button[onclick*="verDetalleConsulta('${consultaId}')"]`);
            if (botonEditar || botonVer) {
                consultaElement = item;
                break;
            }
        }
    }
    
    if (!consultaElement) {
        console.warn(`⚠️ No se encontró elemento visual para consulta ${consultaId}`);
        return;
    }
    
    if (confirmada) {
        console.log('🔄 Actualizando consulta a estado FINALIZADA');
        
        // 1. QUITAR BADGE "BORRADOR" si existe
        const badgeBorrador = consultaElement.querySelector('.badge.bg-warning');
        if (badgeBorrador) {
            badgeBorrador.remove();
            console.log('✅ Badge "Borrador" eliminado');
        }
        
        // 2. BUSCAR Y ACTUALIZAR BOTÓN
        const botonEditar = consultaElement.querySelector(`button[onclick*="editarConsulta('${consultaId}')"]`);
        if (botonEditar) {
            // Cambiar de "Editar" a "Ver detalle"
            botonEditar.onclick = null;
            botonEditar.setAttribute('onclick', `verDetalleConsulta('${consultaId}')`);
            botonEditar.className = 'timeline-btn timeline-item-btn'; // Remover btn-warning
            botonEditar.innerHTML = '<i class="bi bi-eye"></i> Ver detalle';
            console.log('✅ Botón actualizado a "Ver detalle"');
        }
        
        // 3. AGREGAR EFECTO VISUAL
        consultaElement.style.backgroundColor = '#d4edda'; // Verde suave
        setTimeout(() => {
            consultaElement.style.transition = 'background-color 1s';
            consultaElement.style.backgroundColor = '';
        }, 100);
        
        // Actualizar clase del elemento
        consultaElement.classList.add('consulta-confirmada');
    }
    
    console.log('✅ Estado visual actualizado completamente');
}