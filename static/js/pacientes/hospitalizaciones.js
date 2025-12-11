// ============================================
// GESTIÓN DE HOSPITALIZACIONES
// ============================================

const hospitalizacionesManager = {
    pacienteId: null,
    hospitalizaciones: [],
    serviciosCirugia: [],
    insumosCatalogo: [],

    init(pacienteId) {
        this.pacienteId = pacienteId;
        this.cargarHospitalizaciones();
        this.cargarServiciosCirugia();
        this.cargarInsumos();
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
                
                // Si el botón está deshabilitado, mostrar alerta
                if (btnNuevaHosp.disabled) {
                    const hospActiva = this.hospitalizaciones.find(h => h.estado.toLowerCase() === 'activa');
                    if (hospActiva) {
                        alert(`⚠️ No se puede crear una nueva hospitalización.\n\nEl paciente ya tiene una hospitalización activa desde ${hospActiva.fecha_ingreso}.\n\nMotivo: ${hospActiva.motivo}`);
                    }
                    return;
                }
                
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
            // Hook change for servicio select to autocompletar duración
            const selectServicio = document.getElementById('servicioCirugia');
            const duracionInput = document.getElementById('duracionCirugia');
            if (selectServicio && duracionInput) {
                selectServicio.addEventListener('change', () => {
                    const servicioId = selectServicio.value;
                    const servicio = this.serviciosCirugia.find(s => String(s.idServicio) === String(servicioId));
                    if (servicio) {
                        duracionInput.value = servicio.duracion || '';
                    } else {
                        duracionInput.value = '';
                    }
                });
            }
            // Render insumos al abrir
            const insumosSelect = document.getElementById('insumosCirugia');
            if (insumosSelect) {
                insumosSelect.addEventListener('focus', () => {
                    const buscador = document.getElementById('buscarInsumosCirugia');
                    this.renderInsumosSelect(buscador ? buscador.value : '');
                });
                insumosSelect.addEventListener('change', () => {
                    this.renderInsumosSeleccionados();
                });
            }

            // Buscador de insumos
            const buscadorInsumos = document.getElementById('buscarInsumosCirugia');
            if (buscadorInsumos) {
                buscadorInsumos.addEventListener('input', (e) => {
                    this.renderInsumosSelect(e.target.value);
                });
            }

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
                this.actualizarEstadoBtnNuevaHosp();
            }
        } catch (error) {
            console.error('Error cargando hospitalizaciones:', error);
        }
    },

    async cargarServiciosCirugia() {
        try {
            const response = await fetch('/clinica/api/servicios/?categoria=cirugia');
            const data = await response.json();
            if (data.success) {
                this.serviciosCirugia = data.servicios || [];
                const selectServicio = document.getElementById('servicioCirugia');
                if (selectServicio) {
                    selectServicio.innerHTML = '<option value="">Seleccione servicio (categoría: cirugía)</option>' +
                        this.serviciosCirugia.map(s => `<option value="${s.idServicio}" data-duracion="${s.duracion || ''}">${s.nombre}</option>`).join('');
                }
            }
        } catch (err) {
            console.error('Error cargando servicios de cirugía', err);
        }
    },
    async cargarInsumos() {
        try {
            const response = await fetch('/clinica/api/insumos/');
            const data = await response.json();
            if (data.success) {
                this.insumosCatalogo = data.insumos || [];
                const buscador = document.getElementById('buscarInsumosCirugia');
                this.renderInsumosSelect(buscador ? buscador.value : '');
                this.renderInsumosSeleccionados();
            } else {
                console.error('API insumos error:', data.error);
            }
        } catch (err) {
            console.error('Error cargando insumos', err);
        }
    },

    getPacientePeso() {
        return (window.pacienteData && window.pacienteData.peso) ? parseFloat(window.pacienteData.peso) : null;
    },

    getPacienteEspecie() {
        return (window.pacienteData && window.pacienteData.especie) ? String(window.pacienteData.especie).toLowerCase() : '';
    },

    insumoCompatible(insumo) {
        const especiePac = this.getPacienteEspecie();
        const pesoPac = this.getPacientePeso();

        if (insumo.especie && especiePac && String(insumo.especie).toLowerCase() !== especiePac) {
            return false;
        }

        if (!pesoPac) return true; // sin peso, mostrar todos

        const min = insumo.peso_min_kg ? parseFloat(insumo.peso_min_kg) : null;
        const max = insumo.peso_max_kg ? parseFloat(insumo.peso_max_kg) : null;
        if (insumo.tiene_rango_peso && min !== null && max !== null) {
            return pesoPac >= min && pesoPac <= max;
        }

        const ref = insumo.peso_kg ? parseFloat(insumo.peso_kg) : null;
        if (ref && ref > 0) {
            const lower = ref * 0.5;
            const upper = ref * 1.5;
            return pesoPac >= lower && pesoPac <= upper;
        }

        return true;
    },

    renderInsumosSelect(filtro = '') {
        const insumosSelect = document.getElementById('insumosCirugia');
        if (!insumosSelect) return;

        const seleccionados = Array.from(insumosSelect.selectedOptions).map(opt => opt.value);
        const termino = (filtro || '').trim().toLowerCase();
        const catalogoFiltrado = (!termino ? this.insumosCatalogo : this.insumosCatalogo.filter(i => `${i.nombre} ${i.sku || ''}`.toLowerCase().includes(termino)))
            .filter(i => this.insumoCompatible(i));

        if (!catalogoFiltrado.length) {
            insumosSelect.innerHTML = '<option value="">No se encontraron insumos</option>';
            return;
        }

        insumosSelect.innerHTML = catalogoFiltrado
            .map(i => `<option value="${i.id}" data-formato="${i.formato || ''}" data-dosis="${i.dosis_ml || ''}" data-peso="${i.peso_kg || ''}"${seleccionados.includes(String(i.id)) ? ' selected' : ''}>${i.nombre}${i.sku ? ' (' + i.sku + ')' : ''}</option>`)
            .join('');

        this.renderInsumosSeleccionados();
    },

    calcularDosis(insumo) {
        const pesoPac = this.getPacientePeso();
        if (!pesoPac) return '';

        const ref = insumo.peso_kg ? parseFloat(insumo.peso_kg) : null;
        if (!ref || ref === 0) return '';
        const factor = pesoPac / ref;

        if (insumo.dosis_ml) {
            const ml = (parseFloat(insumo.dosis_ml) * factor).toFixed(2);
            return `${ml} ml`;
        }
        if (insumo.cantidad_pastillas) {
            const tabs = (parseFloat(insumo.cantidad_pastillas) * factor).toFixed(2);
            return `${tabs} pastillas`;
        }
        if (insumo.unidades_pipeta) {
            const pip = (parseFloat(insumo.unidades_pipeta) * factor).toFixed(2);
            return `${pip} pipetas`;
        }
        return '';
    },

    renderInsumosSeleccionados() {
        const container = document.getElementById('insumosSeleccionadosCirugia');
        const select = document.getElementById('insumosCirugia');
        if (!container || !select) return;

        const ids = Array.from(select.selectedOptions).map(opt => opt.value);
        if (!ids.length) {
            container.innerHTML = '<small style="color:#6b7280;">Sin insumos seleccionados.</small>';
            return;
        }

        const chips = ids.map(id => {
            const ins = this.insumosCatalogo.find(i => String(i.id) === String(id));
            if (!ins) return '';
            const dosis = this.calcularDosis(ins);
            const tipo = ins.tipo || 'N/A';
            const dosisTxt = dosis ? ` | ${dosis}` : '';
            return `<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; padding:6px 8px; border:1px solid #e5e7eb; border-radius:6px; background:#fff; font-size:13px;">
                <span>${ins.nombre} | ${tipo}${dosisTxt}</span>
                <button type="button" onclick="hospitalizacionesManager.removerInsumo('${id}')" style="background:#9ca3af; border:none; color:#fff; cursor:pointer; font-size:10px; padding:0; line-height:1; width:16px; height:16px; display:flex; align-items:center; justify-content:center; border-radius:50%;" title="Eliminar">
                    ×
                </button>
            </div>`;
        }).filter(Boolean);

        container.innerHTML = chips.join('');
    },

    removerInsumo(insumoId) {
        const select = document.getElementById('insumosCirugia');
        if (!select) return;

        Array.from(select.options).forEach(opt => {
            if (opt.value === String(insumoId)) {
                opt.selected = false;
            }
        });

        this.renderInsumosSeleccionados();
    },

    actualizarEstadoBtnNuevaHosp() {
        const btnNuevaHosp = document.getElementById('btnNuevaHospitalizacion');
        if (!btnNuevaHosp) return;

        const hospActiva = this.hospitalizaciones.find(h => h.estado.toLowerCase() === 'activa');
        
        if (hospActiva) {
            btnNuevaHosp.disabled = true;
            btnNuevaHosp.title = `⚠️ No se puede crear una nueva hospitalización. Ya hay una activa desde ${hospActiva.fecha_ingreso}`;
            btnNuevaHosp.style.opacity = '0.5';
            btnNuevaHosp.style.cursor = 'not-allowed';
        } else {
            btnNuevaHosp.disabled = false;
            btnNuevaHosp.title = 'Crear nueva hospitalización';
            btnNuevaHosp.style.opacity = '1';
            btnNuevaHosp.style.cursor = 'pointer';
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
                const pesoPaciente = (window.pacienteData && window.pacienteData.peso) ? parseFloat(window.pacienteData.peso) : null;
                
                // COLUMNA IZQUIERDA: Información General
                const detallesIzquierda = document.getElementById('detallesIzquierda');
                let htmlIzquierda = `
                    <div style="background-color: #f8f9fb; padding: 12px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e5e7eb;">
                        <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <h5 style="margin: 0; font-size: 16px; color: #2d2f33;"><i class="bi bi-info-circle"></i> Información</h5>
                            <span style="background-color: ${hosp.estado.toLowerCase() === 'activa' ? '#e5f4ed' : '#f4e8e8'}; color: ${hosp.estado.toLowerCase() === 'activa' ? '#1b7f4f' : '#8a4b4b'}; padding: 4px 10px; border-radius: 999px; font-size: 12px;">${hosp.estado}</span>
                        </div>
                        <p style="margin: 0 0 4px 0; color: #444;"><strong>Fecha ingreso:</strong> ${hosp.fecha_ingreso}</p>
                        <p style="margin: 0 0 4px 0; color: #444;"><strong>Motivo:</strong> ${hosp.motivo}</p>
                    </div>
                    
                    <div style="background-color: #f8f9fb; padding: 12px; border-radius: 6px; margin-bottom: 12px; border: 1px solid #e5e7eb;">
                        <h5 style="margin: 0 0 8px 0; font-size: 16px; color: #2d2f33;"><i class="bi bi-journal-text"></i> Diagnóstico y observaciones</h5>
                        <div style="background-color: white; padding: 10px; border-radius: 4px; border: 1px solid #e5e7eb; margin-bottom: 8px;">
                            <small style="display:block; color: #666; margin-bottom: 4px;">Diagnóstico</small>
                            <div style="color: #2d2f33; line-height: 1.4;">${hosp.diagnostico || '<em>Sin diagnóstico</em>'}</div>
                        </div>
                        <div style="background-color: white; padding: 10px; border-radius: 4px; border: 1px solid #e5e7eb; margin-bottom: 8px;">
                            <small style="display:block; color: #666; margin-bottom: 4px;">Observaciones</small>
                            <div style="color: #2d2f33; line-height: 1.4;">${hosp.observaciones || '<em>Sin observaciones</em>'}</div>
                        </div>
                        <p style="margin: 0; color: #555;"><strong>Veterinario a cargo:</strong> ${hosp.veterinario}</p>
                        ${hosp.insumos && hosp.insumos.length ? `
                            <div style="margin-top: 10px;">
                                <small style="display:block; color: #666; margin-bottom: 4px;"><i class="bi bi-box-seam"></i> Implementos utilizados</small>
                                <div style="display:flex; flex-wrap: wrap; gap: 6px;">
                                    ${hosp.insumos.map(ins => `<span style=\"background:#f3f4f6; color:#2d2f33; padding:4px 8px; border-radius:999px; font-size:12px; border:1px solid #e5e7eb;\">${ins.nombre}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
                
                // Cirugías (lista)
                if (hosp.cirugias && hosp.cirugias.length) {
                    htmlIzquierda += `
                        <div style="background-color: #fdfaf3; padding: 12px; border-radius: 6px; border: 1px solid #f0e6ce; margin-bottom: 12px;">
                            <h5 style="margin: 0 0 6px 0; font-size: 15px; color: #2d2f33;"><i class="bi bi-tools"></i> Cirugías</h5>
                            ${hosp.cirugias.map(c => `
                                <div style=\"padding:8px 0; border-bottom:1px solid #eee;\">
                                    <p style=\"margin:0 0 4px 0; color:#444;\"><strong>Tipo:</strong> ${c.tipo}</p>
                                    <p style=\"margin:0 0 4px 0; color:#444;\"><strong>Fecha:</strong> ${c.fecha}</p>
                                    <p style=\"margin:0 0 4px 0; color:#444;\"><strong>Cirujano:</strong> ${c.veterinario}</p>
                                    <p style=\"margin:0 0 4px 0; color:#444;\"><strong>Resultado:</strong> ${c.resultado}</p>
                                    <p style=\"margin:0 0 4px 0; color:#444;\"><strong>Descripción:</strong> ${c.descripcion}</p>
                                    ${c.complicaciones ? `<p style=\"margin:4px 0 0 0; color:#8a4b4b;\"><strong>Complicaciones:</strong> ${c.complicaciones}</p>` : ''}
                                    ${c.insumos && c.insumos.length ? `<div style=\"margin-top:6px; display:flex; flex-wrap:wrap; gap:6px;\">${c.insumos.map(ins => `<span style=\\\"background:#f3f4f6; color:#2d2f33; padding:4px 8px; border-radius:999px; font-size:12px; border:1px solid #e5e7eb;\\\">${ins.nombre}</span>`).join('')}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                
                // Alta médica si existe
                if (hosp.alta) {
                    htmlIzquierda += `
                        <div style="background-color: #f6fbf6; padding: 12px; border-radius: 6px; border: 1px solid #dce9dc;">
                            <h5 style="margin: 0 0 6px 0; font-size: 15px; color: #2d2f33;"><i class="bi bi-check-circle"></i> Alta médica</h5>
                            <p style="margin: 0 0 4px 0; color: #444;"><strong>Fecha:</strong> ${hosp.alta.fecha}</p>
                            <p style="margin: 0 0 4px 0; color: #444;"><strong>Diagnóstico final:</strong> ${hosp.alta.diagnostico_final}</p>
                            <p style="margin: 0 0 4px 0; color: #444;"><strong>Tratamiento post-alta:</strong> ${hosp.alta.tratamiento_post}</p>
                            <p style="margin: 0; color: #444;"><strong>Recomendaciones:</strong> ${hosp.alta.recomendaciones}</p>
                            ${hosp.alta.proxima_revision ? `<p style="margin: 6px 0 0 0; color: #444;"><strong>Próxima revisión:</strong> ${hosp.alta.proxima_revision}</p>` : ''}
                        </div>
                    `;
                }
                
                detallesIzquierda.innerHTML = htmlIzquierda;
                
                // COLUMNA DERECHA: Insumos + Registros
                const insumosContainer = document.getElementById('insumosHospitalizacionContainer');
                if (insumosContainer) {
                    const insumosHosp = hosp.insumos || [];
                    const insumosCirugias = (hosp.cirugias || []).flatMap(c => c.insumos || []);
                    const insumosReg = (hosp.registros_diarios || []).flatMap(r => r.insumos || []);
                    const todosInsumos = [...insumosHosp, ...insumosCirugias, ...insumosReg];

                    const renderDosis = (ins) => {
                        if (!pesoPaciente || !ins) return ins.formato ? ins.formato : '';
                        const pesoRef = parseFloat(ins.peso_kg || 0);
                        if (!pesoRef || pesoRef === 0) return '';
                        const factor = pesoPaciente / pesoRef;
                        if (ins.dosis_ml) {
                            const ml = (parseFloat(ins.dosis_ml) * factor).toFixed(2);
                            return `${ml} ml (peso ${pesoPaciente} kg)`;
                        }
                        if (ins.cantidad_pastillas) {
                            const tabs = (parseFloat(ins.cantidad_pastillas) * factor).toFixed(2);
                            return `${tabs} pastillas (peso ${pesoPaciente} kg)`;
                        }
                        if (ins.unidades_pipeta) {
                            const pip = (parseFloat(ins.unidades_pipeta) * factor).toFixed(2);
                            return `${pip} pipetas (peso ${pesoPaciente} kg)`;
                        }
                        return '';
                    };

                    const renderChip = (ins) => {
                        const dosis = renderDosis(ins);
                        return `<div style="padding:8px 10px; border:1px solid #e5e7eb; border-radius:6px; background:#fff; display:flex; flex-direction:column; gap:4px;">
                            <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
                                <span style="font-weight:600; color:#1f2937;">${ins.nombre || 'Insumo'}</span>
                                ${ins.codigo ? `<span style=\"font-size:11px; color:#6b7280;\">${ins.codigo}</span>` : ''}
                            </div>
                            ${dosis ? `<span style="font-size:12px; color:#374151;">Dosis sugerida: ${dosis}</span>` : ''}
                        </div>`;
                    };

                    if (todosInsumos.length) {
                        insumosContainer.innerHTML = `
                            <h5 style="margin:0 0 8px 0; font-size:15px; color:#1f2937;"><i class="bi bi-box-seam"></i> Insumos utilizados</h5>
                            <div style="display:grid; grid-template-columns:repeat(auto-fill,minmax(180px,1fr)); gap:10px;">
                                ${todosInsumos.map(renderChip).join('')}
                            </div>
                        `;
                    } else {
                        insumosContainer.innerHTML = '';
                    }
                }

                // COLUMNA DERECHA: Registros Diarios
                const registrosDiariosContainer = document.getElementById('registrosDiariosContainer');
                if (hosp.registros_diarios && hosp.registros_diarios.length > 0) {
                    const htmlRegistros = hosp.registros_diarios.map(reg => `
                        <div style="padding: 10px 12px; margin-bottom: 8px; border-bottom: 1px solid #e5e7eb;">
                            <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                                <strong style="color: #2d2f33; font-size: 13px;">${reg.fecha}</strong>
                                <span style="font-size: 12px; color: #4b5563; background-color: #f3f4f6; padding: 4px 8px; border-radius: 999px;">
                                    Dr. ${reg.veterinario || 'N/A'}
                                </span>
                            </div>
                            <div style="display:flex; flex-wrap: wrap; gap: 12px; margin-top: 8px; color: #2d2f33; font-size: 13px;">
                                <span><strong>Temperatura:</strong> ${reg.temperatura}°C</span>
                                <span><strong>Peso:</strong> ${reg.peso} kg</span>
                                <span><strong>FC:</strong> ${reg.frecuencia_cardiaca || 'N/A'} lpm</span>
                                <span><strong>FR:</strong> ${reg.frecuencia_respiratoria || 'N/A'} rpm</span>
                            </div>
                            ${reg.observaciones ? `<div style=\"margin-top:6px; color:#4b5563; font-size:12.5px;\"><strong style=\"color:#2d2f33;\">Obs:</strong> ${reg.observaciones}</div>` : ''}
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
                alert('✅ Hospitalización creada exitosamente');
                this.cerrarModalNuevaHosp();
                this.cargarHospitalizaciones();
            } else {
                // Mostrar error específico
                alert('❌ Error al crear hospitalización:\n\n' + data.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('❌ Error al crear hospitalización. Por favor intenta de nuevo.');
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

        const servicioId = formData.get('servicio_cirugia');
        const servicio = this.serviciosCirugia.find(s => String(s.idServicio) === String(servicioId));
        const tipoCirugia = servicio ? servicio.nombre : '';
        const duracion = servicio ? servicio.duracion : formData.get('duracion_minutos');

        // Insumos seleccionados
        const insumosSelect = document.getElementById('insumosCirugia');
        let insumosSeleccionados = [];
        if (insumosSelect) {
            insumosSeleccionados = Array.from(insumosSelect.selectedOptions).map(o => o.value).filter(Boolean);
        }

        try {
            const response = await fetch(`/clinica/hospitalizacion/${hospId}/cirugia/crear/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken')
                },
                body: JSON.stringify({
                    servicio_id: servicioId,
                    tipo_cirugia: tipoCirugia,
                    descripcion: formData.get('descripcion'),
                    duracion_minutos: duracion,
                    anestesiologo: formData.get('anestesiologo'),
                    tipo_anestesia: formData.get('tipo_anestesia'),
                    complicaciones: formData.get('complicaciones'),
                    resultado: formData.get('resultado'),
                    medicamentos: insumosSeleccionados,
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
