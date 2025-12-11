// ============================================
// GESTIÓN DE HOSPITALIZACIONES
// ============================================

const hospitalizacionesManager = {
    pacienteId: null,
    hospitalizaciones: [],

    init(pacienteId) {
        this.pacienteId = pacienteId;
        this.cargarHospitalizaciones();
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Botón para crear nueva hospitalización
        const btnNuevaHosp = document.getElementById('btnNuevaHospitalizacion');
        if (btnNuevaHosp) {
            console.log('✅ Botón encontrado:', btnNuevaHosp);
            btnNuevaHosp.addEventListener('click', (e) => {
                console.log('🔵 Click en hospitalización');
                e.preventDefault();
                this.abrirModalNuevaHosp();
            });
        } else {
            console.warn('⚠️ Botón btnNuevaHospitalizacion no encontrado');
        }

        // Botón para cerrar modal de nueva hospitalización
        const closeModalBtn = document.getElementById('closeHospitalizacionModal');
        if (closeModalBtn) {
            closeModalBtn.addEventListener('click', () => {
                console.log('🔵 Click para cerrar modal');
                this.cerrarModalNuevaHosp();
            });
        }

        // Formulario de nueva hospitalización
        const formNuevaHosp = document.getElementById('formNuevaHospitalizacion');
        if (formNuevaHosp) {
            formNuevaHosp.addEventListener('submit', (e) => {
                console.log('🔵 Submit formulario hospitalización');
                this.crearHospitalizacion(e);
            });
        }

        // Formulario de cirugía
        const formCirugia = document.getElementById('formCirugia');
        if (formCirugia) {
            formCirugia.addEventListener('submit', (e) => {
                console.log('🔵 Submit formulario cirugía');
                this.guardarCirugia(e);
            });
        }

        // Formulario de registro diario
        const formRegistro = document.getElementById('formRegistroDiario');
        if (formRegistro) {
            formRegistro.addEventListener('submit', (e) => {
                console.log('🔵 Submit formulario registro');
                this.guardarRegistro(e);
            });
        }

        // Formulario de alta médica
        const formAlta = document.getElementById('formAltaMedica');
        if (formAlta) {
            formAlta.addEventListener('submit', (e) => {
                console.log('🔵 Submit formulario alta');
                this.guardarAlta(e);
            });
        }

        // Botones de cerrar modales
        const closeBtns = document.querySelectorAll('.close-modal');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.vet-modal-overlay');
                if (modal) {
                    modal.classList.remove('show');
                    modal.classList.add('hide');
                }
            });
        });
    },

    async cargarHospitalizaciones() {
        try {
            const response = await fetch(`/clinica/pacientes/${this.pacienteId}/hospitalizaciones/`);
            const data = await response.json();

            if (data.success) {
                this.hospitalizaciones = data.hospitalizaciones;
                this.renderizarHospitalizaciones();
                this.actualizarIndicadorHospitalizacion();
            }
        } catch (error) {
            console.error('Error cargando hospitalizaciones:', error);
        }
    },

    actualizarIndicadorHospitalizacion() {
        const indicador = document.getElementById('indicadorHospitalizacion');
        const detalles = document.getElementById('detallesHospitalizacion');
        const debugIndicador = document.getElementById('debugIndicador');
        
        console.log('🔵 actualizarIndicadorHospitalizacion() llamado');
        console.log('📋 Hospitalizaciones:', this.hospitalizaciones);
        
        // Ocultar debug
        if (debugIndicador) {
            debugIndicador.style.display = 'none';
        }
        
        if (!indicador) {
            console.warn('⚠️ Elemento indicadorHospitalizacion no encontrado');
            return;
        }
        if (!detalles) {
            console.warn('⚠️ Elemento detallesHospitalizacion no encontrado');
            return;
        }
        
        // Buscar hospitalización activa (comparar en minúsculas)
        const hospActiva = this.hospitalizaciones.find(h => h.estado.toLowerCase() === 'activa');
        
        console.log('🏥 Hospitalización activa encontrada:', hospActiva);
        
        if (hospActiva) {
            // Mostrar indicador
            indicador.style.display = 'block';
            detalles.textContent = `Ingresado: ${hospActiva.fecha_ingreso} - Motivo: ${hospActiva.motivo}`;
            console.log('✅ Indicador mostrado');
        } else {
            // Ocultar indicador
            indicador.style.display = 'none';
            console.log('❌ No hay hospitalización activa - Indicador ocultado');
        }
    },

    renderizarHospitalizaciones() {
        const container = document.getElementById('hospitalizacionesContainer');
        if (!container) {
            console.error('❌ Container hospitalizacionesContainer no encontrado');
            return;
        }

        console.log('📋 Renderizando', this.hospitalizaciones.length, 'hospitalizaciones');

        if (this.hospitalizaciones.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="bi bi-hospital"></i>
                    <p>No hay hospitalizaciones registradas</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.hospitalizaciones.map(hosp => `
            <div class="hospitalizacion-card" data-hosp-id="${hosp.id}">
                <div class="hosp-header">
                    <div class="hosp-info">
                        <span class="hosp-fecha"><i class="bi bi-calendar"></i> ${hosp.fecha_ingreso}</span>
                        <span class="hosp-motivo"><strong>${hosp.motivo}</strong></span>
                        <span class="hosp-estado estado-${(hosp.estado || 'activa').toLowerCase()}">
                            <i class="bi bi-circle-fill"></i> ${hosp.estado || 'N/A'}
                        </span>
                    </div>
                    <button class="btn-expandir" onclick="hospitalizacionesManager.verDetalles(${hosp.id})" title="Ver detalles">
                        <i class="bi bi-eye"></i>
                    </button>
                </div>
                
                ${!hosp.tiene_alta ? `
                    <div class="hosp-acciones">
                        ${!hosp.tiene_cirugia ? `
                            <button class="btn-accion btn-cirugia" onclick="hospitalizacionesManager.abrirModalCirugia(${hosp.id})">
                                <i class="bi bi-tools"></i> Agregar Cirugía
                            </button>
                        ` : ''}
                        <button class="btn-accion btn-registro" onclick="hospitalizacionesManager.abrirModalRegistro(${hosp.id})">
                            <i class="bi bi-plus-circle"></i> Registro Diario
                        </button>
                        <button class="btn-accion btn-alta" onclick="hospitalizacionesManager.abrirModalAlta(${hosp.id})">
                            <i class="bi bi-check-circle"></i> Dar de Alta
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        console.log('✅ Hospitalizaciones renderizadas exitosamente');
    },

    async verDetalles(hospId) {
        try {
            const response = await fetch(`/clinica/pacientes/${this.pacienteId}/hospitalizacion/${hospId}/detalle/`);
            const data = await response.json();

            if (data.success) {
                const hosp = data.hospitalizacion;
                
                // COLUMNA IZQUIERDA: Información General
                const detallesIzquierda = document.getElementById('detallesIzquierda');
                let htmlIzquierda = `
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h5 style="margin-top: 0; color: #333;"><i class="bi bi-info-circle"></i> Información de Hospitalización</h5>
                        <p><strong>Fecha Ingreso:</strong> ${hosp.fecha_ingreso}</p>
                        <p><strong>Motivo:</strong> ${hosp.motivo}</p>
                        <p><strong>Estado:</strong> <span style="background-color: ${hosp.estado.toLowerCase() === 'activa' ? '#90EE90' : '#FFB6C6'}; padding: 4px 8px; border-radius: 4px;">${hosp.estado}</span></p>
                    </div>
                    
                    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                        <h5 style="margin-top: 0; color: #333;"><i class="bi bi-file-text"></i> Diagnóstico y Observaciones</h5>
                        <p><strong>Diagnóstico:</strong></p>
                        <p style="background-color: white; padding: 10px; border-radius: 4px; border-left: 3px solid #4CAF50;">${hosp.diagnostico}</p>
                        <p><strong>Observaciones:</strong></p>
                        <p style="background-color: white; padding: 10px; border-radius: 4px; border-left: 3px solid #2196F3;">${hosp.observaciones || '<em>Sin observaciones</em>'}</p>
                        <p><strong>Veterinario a cargo:</strong> ${hosp.veterinario}</p>
                    </div>
                `;
                
                // Cirugía si existe
                if (hosp.cirugia) {
                    htmlIzquierda += `
                        <div style="background-color: #fff8dc; padding: 15px; border-radius: 8px; border-left: 4px solid #ffa500;">
                            <h5 style="margin-top: 0; color: #333;"><i class="bi bi-tools"></i> Cirugía Realizada</h5>
                            <p><strong>Tipo:</strong> ${hosp.cirugia.tipo}</p>
                            <p><strong>Fecha:</strong> ${hosp.cirugia.fecha}</p>
                            <p><strong>Cirujano:</strong> ${hosp.cirugia.veterinario}</p>
                            <p><strong>Resultado:</strong> <span style="color: #4CAF50; font-weight: bold;">${hosp.cirugia.resultado}</span></p>
                            <p><strong>Descripción:</strong> ${hosp.cirugia.descripcion}</p>
                            ${hosp.cirugia.complicaciones ? `<p><strong style="color: #ff6b6b;">Complicaciones:</strong> ${hosp.cirugia.complicaciones}</p>` : ''}
                        </div>
                    `;
                }
                
                // Alta médica si existe
                if (hosp.alta) {
                    htmlIzquierda += `
                        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; border-left: 4px solid #4CAF50;">
                            <h5 style="margin-top: 0; color: #2e7d32;"><i class="bi bi-check-circle"></i> Alta Médica</h5>
                            <p><strong>Fecha:</strong> ${hosp.alta.fecha}</p>
                            <p><strong>Diagnóstico Final:</strong> ${hosp.alta.diagnostico_final}</p>
                            <p><strong>Tratamiento Post-Alta:</strong> ${hosp.alta.tratamiento_post}</p>
                            <p><strong>Recomendaciones:</strong> ${hosp.alta.recomendaciones}</p>
                            ${hosp.alta.proxima_revision ? `<p><strong>Próxima Revisión:</strong> ${hosp.alta.proxima_revision}</p>` : ''}
                        </div>
                    `;
                }
                
                detallesIzquierda.innerHTML = htmlIzquierda;
                
                // COLUMNA DERECHA: Registros Diarios
                const registrosDiariosContainer = document.getElementById('registrosDiariosContainer');
                if (hosp.registros_diarios && hosp.registros_diarios.length > 0) {
                    const htmlRegistros = hosp.registros_diarios.map(reg => `
                        <div style="background-color: #f5f5f5; padding: 12px; border-radius: 8px; margin-bottom: 12px; border-left: 4px solid #2196F3;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                <strong style="color: #1976d2;">${reg.fecha}</strong>
                                <span style="font-size: 12px; color: #666; background-color: #e3f2fd; padding: 4px 8px; border-radius: 4px;">
                                    Dr. ${reg.veterinario || 'N/A'}
                                </span>
                            </div>
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 8px;">
                                <div style="background-color: white; padding: 8px; border-radius: 4px;">
                                    <small style="color: #666;">Temperatura</small>
                                    <p style="margin: 4px 0; font-weight: bold; color: #d32f2f;">${reg.temperatura}°C</p>
                                </div>
                                <div style="background-color: white; padding: 8px; border-radius: 4px;">
                                    <small style="color: #666;">Peso</small>
                                    <p style="margin: 4px 0; font-weight: bold; color: #1976d2;">${reg.peso} kg</p>
                                </div>
                                <div style="background-color: white; padding: 8px; border-radius: 4px;">
                                    <small style="color: #666;">FC</small>
                                    <p style="margin: 4px 0; font-weight: bold;">${reg.frecuencia_cardiaca || 'N/A'} lpm</p>
                                </div>
                                <div style="background-color: white; padding: 8px; border-radius: 4px;">
                                    <small style="color: #666;">FR</small>
                                    <p style="margin: 4px 0; font-weight: bold;">${reg.frecuencia_respiratoria || 'N/A'} rpm</p>
                                </div>
                            </div>
                            ${reg.observaciones ? `<p style="margin: 8px 0; padding: 8px; background-color: white; border-radius: 4px; font-size: 13px; color: #555;"><strong>Obs:</strong> ${reg.observaciones}</p>` : ''}
                        </div>
                    `).join('');
                    
                    registrosDiariosContainer.innerHTML = htmlRegistros;
                } else {
                    registrosDiariosContainer.innerHTML = '<p style="color: #999; text-align: center;"><em>No hay registros diarios aún</em></p>';
                }
                
                // Abrir el modal
                const modal = document.getElementById('detallesHospitalizacionModal');
                modal.classList.remove('hide');
                modal.classList.add('show');
            }
        } catch (error) {
            console.error('Error cargando detalles:', error);
        }
    },

    abrirModalNuevaHosp() {
        const modal = document.getElementById('nuevaHospitalizacionModal');
        if (modal) {
            console.log('🟢 Abriendo modal nueva hospitalización');
            modal.classList.remove('hide');
            modal.classList.add('show');
        }
    },

    cerrarModalNuevaHosp() {
        const modal = document.getElementById('nuevaHospitalizacionModal');
        if (modal) {
            console.log('🟢 Cerrando modal nueva hospitalización');
            modal.classList.remove('show');
            modal.classList.add('hide');
        }
        const form = document.getElementById('formNuevaHospitalizacion');
        if (form) form.reset();
    },

    async crearHospitalizacion(e) {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        try {
            const response = await fetch(`/clinica/pacientes/${this.pacienteId}/hospitalizacion/crear/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                body: JSON.stringify({
                    motivo: formData.get('motivo'),
                    diagnostico: formData.get('diagnostico'),
                    observaciones: formData.get('observaciones')
                })
            });

            const data = await response.json();

            if (data.success) {
                alert('Hospitalización creada exitosamente');
                this.cerrarModalNuevaHosp();
                this.cargarHospitalizaciones();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al crear hospitalización');
        }
    },

    abrirModalCirugia(hospId) {
        const modal = document.getElementById('cirugiaModal');
        if (modal) {
            modal.dataset.hospId = hospId;
            modal.classList.remove('hide');
            modal.classList.add('show');
        }
    },

    abrirModalRegistro(hospId) {
        const modal = document.getElementById('registroDiarioModal');
        if (modal) {
            modal.dataset.hospId = hospId;
            modal.classList.remove('hide');
            modal.classList.add('show');
        }
    },

    abrirModalAlta(hospId) {
        const modal = document.getElementById('altaMedicaModal');
        if (modal) {
            modal.dataset.hospId = hospId;
            modal.classList.remove('hide');
            modal.classList.add('show');
        }
    },

    async guardarCirugia(e) {
        e.preventDefault();
        const form = e.target;
        const hospId = document.getElementById('cirugiaModal').dataset.hospId;
        const formData = new FormData(form);

        try {
            const response = await fetch(`/clinica/hospitalizacion/${hospId}/cirugia/crear/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                body: JSON.stringify({
                    tipo_cirugia: formData.get('tipo_cirugia'),
                    descripcion: formData.get('descripcion'),
                    duracion_minutos: formData.get('duracion_minutos'),
                    anestesiologo: formData.get('anestesiologo'),
                    tipo_anestesia: formData.get('tipo_anestesia'),
                    complicaciones: formData.get('complicaciones'),
                    resultado: formData.get('resultado')
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('Cirugía registrada');
                const modal = document.getElementById('cirugiaModal');
                modal.classList.remove('show');
                modal.classList.add('hide');
                form.reset();
                this.cargarHospitalizaciones();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar cirugía');
        }
    },

    async guardarRegistro(e) {
        e.preventDefault();
        const form = e.target;
        const hospId = document.getElementById('registroDiarioModal').dataset.hospId;
        const formData = new FormData(form);

        try {
            const response = await fetch(`/clinica/hospitalizacion/${hospId}/registro/crear/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                body: JSON.stringify({
                    temperatura: formData.get('temperatura'),
                    peso: formData.get('peso'),
                    frecuencia_cardiaca: formData.get('frecuencia_cardiaca'),
                    frecuencia_respiratoria: formData.get('frecuencia_respiratoria'),
                    observaciones: formData.get('observaciones')
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('Registro guardado');
                const modal = document.getElementById('registroDiarioModal');
                modal.classList.remove('show');
                modal.classList.add('hide');
                form.reset();
                this.cargarHospitalizaciones();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al guardar registro');
        }
    },

    async guardarAlta(e) {
        e.preventDefault();
        const form = e.target;
        const hospId = document.getElementById('altaMedicaModal').dataset.hospId;
        const formData = new FormData(form);

        try {
            const response = await fetch(`/clinica/hospitalizacion/${hospId}/alta/crear/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                body: JSON.stringify({
                    diagnostico_final: formData.get('diagnostico_final'),
                    tratamiento_post_alta: formData.get('tratamiento_post_alta'),
                    recomendaciones: formData.get('recomendaciones'),
                    proxima_revision: formData.get('proxima_revision')
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('Alta médica completada');
                const modal = document.getElementById('altaMedicaModal');
                modal.classList.remove('show');
                modal.classList.add('hide');
                form.reset();
                this.cargarHospitalizaciones();
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error al completar alta');
        }
    },

    getCookie(name) {
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
};

// Inicializar cuando el DOM esté listo
console.log('🟢 hospitalizaciones.js cargado');

// Esperar a que el DOM esté listo y pacienteData esté disponible
document.addEventListener('DOMContentLoaded', function() {
    console.log('🟢 DOM listo');
    
    // Obtener el ID del paciente del template
    const pacienteIdElement = document.querySelector('meta[data-paciente-id]');
    const pacienteId = pacienteIdElement ? pacienteIdElement.getAttribute('data-paciente-id') : null;
    
    if (!pacienteId) {
        console.error('❌ No se encontró pacienteId');
        return;
    }
    
    console.log('🟢 pacienteId encontrado:', pacienteId);
    
    // Cargar datos del paciente y luego inicializar
    fetch(`/clinica/pacientes/${pacienteId}/data/`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.pacienteData = data.paciente;
                console.log('✅ [API] window.pacienteData cargado:', window.pacienteData);
                console.log('🟢 Inicializando hospitalizacionesManager con ID:', window.pacienteData.id);
                hospitalizacionesManager.init(window.pacienteData.id);
            } else {
                console.error('❌ Error en API:', data.error);
                window.pacienteData = { id: pacienteId };
            }
        })
        .catch(error => {
            console.error('❌ Error al cargar datos del paciente:', error);
            window.pacienteData = { id: pacienteId };
        });
});
