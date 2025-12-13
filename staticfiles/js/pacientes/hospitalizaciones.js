// ============================================
// GESTIÓN DE HOSPITALIZACIONES
// ============================================

const hospitalizacionesManager = {
    pacienteId: null,
    hospitalizaciones: [],
    serviciosCirugia: [],
    insumosCatalogo: [],
    veterinariosCatalogo: [],

    normalizarServiciosCirugia(servicios = []) {
        return (servicios || []).map(s => ({
            id: s.idServicio ?? s.id ?? s.pk ?? s.id_servicio ?? s.servicio_id ?? s.value ?? null,
            nombre: s.nombre ?? s.titulo ?? s.label ?? '',
            duracion: s.duracion ?? s.duracion_minutos ?? s.duracionMinutos ?? '',
            descripcion: s.descripcion ?? s.descripcion_servicio ?? s.descripcionServicio ?? s.desc_servicio ?? s.detalle_servicio ?? s.detalle ?? s.descripcion_corta ?? s.descripcion_larga ?? s.description ?? ''
        })).filter(s => s.nombre);
    },

    init(pacienteId) {
        this.pacienteId = pacienteId;
        this.cargarHospitalizaciones();
        this.cargarServiciosCirugia();
        this.cargarInsumos();
        this.cargarVeterinarios();
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

        // Filtros de hospitalización
        this.setupFiltrosHospitalizacion();

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

        // ✅ Formulario de cirugía (event delegation - funciona aunque el select se agregue dinámicamente)
        const formCirugia = document.getElementById('formCirugia');
        if (formCirugia) {
            formCirugia.addEventListener('change', (e) => {
                const target = e.target;
                if (!target || target.id !== 'servicioCirugia') return;

                const selectServicio = target;
                const opt = selectServicio.selectedOptions?.[0];
                if (!opt) return;

                const duracionInput = document.getElementById('duracionCirugia');
                const descripcionInput = formCirugia.querySelector('textarea[name="descripcion"]');

                if (duracionInput) duracionInput.value = opt.dataset.duracion || '';
                if (descripcionInput) descripcionInput.value = opt.dataset.descripcion || '';
            });

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

        // Buscador de insumos
        const buscarInsumos = document.getElementById('buscarInsumosCirugia');
        if (buscarInsumos) {
            buscarInsumos.addEventListener('input', (e) => {
                this.renderInsumosSelect(e.target.value);
            });
        }

        // Buscador de equipo/veterinarios
        const buscarEquipo = document.getElementById('buscarEquipoCirugia');
        if (buscarEquipo) {
            buscarEquipo.addEventListener('input', (e) => {
                this.renderEquipoSelect(e.target.value);
            });
        }
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
            // ✅ Traer TODOS los servicios (sin filtro en el backend)
            const response = await fetch('/clinica/api/servicios/');
            const data = await response.json();

            console.log('API servicios raw[0]:', data?.servicios?.[0]);

            if (data.success) {
                // ✅ Filtrar en JS (case-insensitive, acepta "Cirugía", "cirugia", "CIRUGIA")
                const serviciosCirugia = (data.servicios || []).filter(s => {
                    const cat = (s.categoria || '').toLowerCase();
                    return cat.includes('cirug') || cat.includes('quirur');
                });

                this.serviciosCirugia = this.normalizarServiciosCirugia(serviciosCirugia);
                console.log(`✅ Servicios de cirugía filtrados: ${this.serviciosCirugia.length}`, this.serviciosCirugia);

                const selectServicio = document.getElementById('servicioCirugia');
                if (selectServicio) {
                    selectServicio.innerHTML = '<option value="">Seleccione servicio (cirugía)</option>';

                    this.serviciosCirugia.forEach(s => {
                        const opt = document.createElement('option');

                        if (s.id == null || s.id === '' || s.id === undefined) {
                            console.warn('Servicio sin ID desde API:', s);
                            opt.value = '';
                            opt.disabled = true;
                            opt.textContent = `${s.nombre} (SIN ID en API)`;
                        } else {
                            opt.value = String(s.id);
                            opt.textContent = s.nombre;
                        }

                        opt.dataset.duracion = s.duracion ?? '';
                        opt.dataset.descripcion = s.descripcion ?? '';

                        selectServicio.appendChild(opt);
                    });

                    selectServicio.dispatchEvent(new Event('change'));
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
                console.log(`📦 Insumos cargados: ${this.insumosCatalogo.length}`);
                // Verificar cuántos tienen peso_kg
                const conPeso = this.insumosCatalogo.filter(i => i.peso_kg && parseFloat(i.peso_kg) > 0);
                console.log(`⚖️  Insumos con peso_kg: ${conPeso.length}`, conPeso.slice(0, 3));
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

    async cargarVeterinarios() {
        try {
            const response = await fetch('/clinica/api/veterinarios/');
            const data = await response.json();
            if (data.success) {
                this.veterinariosCatalogo = data.veterinarios || [];
                const buscador = document.getElementById('buscarEquipoCirugia');
                this.renderEquipoSelect(buscador ? buscador.value : '');
                this.renderEquipoSeleccionado();
            } else {
                console.error('API veterinarios error:', data.error);
            }
        } catch (err) {
            console.error('Error cargando veterinarios', err);
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

        // Filtro de especie: solo aplicar si el insumo tiene especie específica (perro/gato)
        const especieInsumo = insumo.especie ? String(insumo.especie).toLowerCase().trim() : '';
        
        // Si especie está vacía o es 'todos', disponible para todos
        if (!especieInsumo || especieInsumo === '' || especieInsumo === 'todos') {
            // Sin restricción de especie
        } else if (especiePac && especieInsumo !== especiePac) {
            // Advertencia: medicamento de otra especie pero se permite (veterinario decide)
            console.warn(`⚠️ ${insumo.nombre} es para ${especieInsumo}, paciente es ${especiePac}`);
        }

        // Filtro de peso: solo para pipetas con rango estricto
        if (!pesoPac) return true;

        const min = insumo.peso_min_kg ? parseFloat(insumo.peso_min_kg) : null;
        const max = insumo.peso_max_kg ? parseFloat(insumo.peso_max_kg) : null;
        if (insumo.tiene_rango_peso && min !== null && max !== null) {
            return pesoPac >= min && pesoPac <= max;
        }

        // Para otros medicamentos con peso_kg: mostrar todos (el cálculo ajusta la dosis)
        return true;
    },

    renderInsumosSelect(filtro = '') {
        const insumosContainer = document.getElementById('insumosCirugia');
        if (!insumosContainer) return;

        const hidden = document.getElementById('insumosCirugiaHidden');
        const seleccionados = hidden ? hidden.value.split(',').filter(Boolean) : [];
        const termino = (filtro || '').trim().toLowerCase();
        const catalogoFiltrado = (!termino ? this.insumosCatalogo : this.insumosCatalogo.filter(i => `${i.nombre} ${i.sku || ''}`.toLowerCase().includes(termino)))
            .filter(i => this.insumoCompatible(i));

        if (!catalogoFiltrado.length) {
            insumosContainer.innerHTML = '<div class="empty-list-message">No se encontraron insumos</div>';
            return;
        }

        let contadorDosis = 0;
        insumosContainer.innerHTML = catalogoFiltrado
            .map(i => {
                const isSelected = seleccionados.includes(String(i.id));
                const tipo = i.tipo || 'N/A';
                const dosis = this.calcularDosis(i);
                if (dosis) contadorDosis++;
                const dosisText = dosis ? ` - <strong style="color:#16a34a;">${dosis}</strong>` : '';
                return `<div class="selectable-item ${isSelected ? 'selected' : ''}">
                    <span class="selectable-item-text">${i.nombre} <span class="selectable-item-subtext">(${tipo}${dosisText})</span></span>
                    <button type="button" onclick="hospitalizacionesManager.${isSelected ? 'removerInsumo' : 'agregarInsumo'}('${i.id}')" class="${isSelected ? 'btn-remove-inline' : 'btn-add'}" title="${isSelected ? 'Eliminar' : 'Agregar'}">
                        ${isSelected ? '−' : '+'}
                    </button>
                </div>`;
            }).join('');
        
        console.log(`💊 Renderizados: ${catalogoFiltrado.length} insumos, ${contadorDosis} con dosis calculada`);

        this.renderInsumosSeleccionados();
    },

    calcularDosis(insumo) {
        const pesoPac = this.getPacientePeso();
        if (!pesoPac) return '';

        const ref = insumo.peso_kg ? parseFloat(insumo.peso_kg) : null;
        if (!ref || ref === 0) return '';
        
        const factor = pesoPac / ref;

        // Log temporal para debug
        if (insumo.nombre && insumo.nombre.includes('Amoxicilina')) {
            console.log(`🔍 ${insumo.nombre}:`, {
                peso_kg: insumo.peso_kg,
                ref,
                pesoPac,
                factor,
                dosis_ml: insumo.dosis_ml,
                cantidad_pastillas: insumo.cantidad_pastillas
            });
        }

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
        const hidden = document.getElementById('insumosCirugiaHidden');
        if (!container || !hidden) return;

        const ids = hidden.value.split(',').filter(Boolean);
        if (!ids.length) {
            container.innerHTML = '<small class="chips-empty">Sin insumos seleccionados.</small>';
            return;
        }

        // Agrupar IDs repetidos y contar
        const idCounts = {};
        ids.forEach(id => {
            idCounts[id] = (idCounts[id] || 0) + 1;
        });

        const chips = Object.entries(idCounts).map(([id, count]) => {
            const ins = this.insumosCatalogo.find(i => String(i.id) === String(id));
            if (!ins) return '';
            const dosis = this.calcularDosis(ins);
            const tipo = ins.tipo || 'N/A';
            const dosisTxt = dosis ? ` | ${dosis}` : '';
            const countTxt = count > 1 ? ` <strong>(x${count})</strong>` : '';
            return `<div class="chip">
                <span>${ins.nombre} | ${tipo}${dosisTxt}${countTxt}</span>
                <button type="button" onclick="hospitalizacionesManager.removerInsumo('${id}')" class="chip-remove-btn" title="Eliminar">
                    ×
                </button>
            </div>`;
        }).filter(Boolean);

        container.innerHTML = chips.join('');
    },

    agregarInsumo(insumoId) {
        const hidden = document.getElementById('insumosCirugiaHidden');
        if (!hidden) return;

        const ids = hidden.value.split(',').filter(Boolean);
        if (!ids.includes(String(insumoId))) {
            ids.push(String(insumoId));
            hidden.value = ids.join(',');
        }

        const buscador = document.getElementById('buscarInsumosCirugia');
        this.renderInsumosSelect(buscador ? buscador.value : '');
    },

    removerInsumo(insumoId) {
        const hidden = document.getElementById('insumosCirugiaHidden');
        if (!hidden) return;

        const ids = hidden.value.split(',').filter(Boolean);
        hidden.value = ids.filter(id => id !== String(insumoId)).join(',');

        const buscador = document.getElementById('buscarInsumosCirugia');
        this.renderInsumosSelect(buscador ? buscador.value : '');
    },

    renderEquipoSelect(filtro = '') {
        const equipoContainer = document.getElementById('equipoCirugia');
        if (!equipoContainer) return;

        const hidden = document.getElementById('equipoCirugiaHidden');
        const seleccionados = hidden ? hidden.value.split(',').filter(Boolean) : [];
        const termino = (filtro || '').trim().toLowerCase();
        const catalogoFiltrado = !termino
            ? this.veterinariosCatalogo
            : this.veterinariosCatalogo.filter(v => v.nombre.toLowerCase().includes(termino));

        if (!catalogoFiltrado.length) {
            equipoContainer.innerHTML = '<div class="empty-list-message">No se encontraron veterinarios</div>';
            return;
        }

        equipoContainer.innerHTML = catalogoFiltrado
            .map(v => {
                const isSelected = seleccionados.includes(String(v.id));
                return `<div class="selectable-item ${isSelected ? 'selected' : ''}">
                    <span class="selectable-item-text">${v.nombre}${v.especialidad ? ' <span class="selectable-item-subtext">(' + v.especialidad + ')</span>' : ''}</span>
                    <button type="button" onclick="hospitalizacionesManager.${isSelected ? 'removerVeterinario' : 'agregarVeterinario'}('${v.id}')" class="${isSelected ? 'btn-remove-inline' : 'btn-add'}" title="${isSelected ? 'Eliminar' : 'Agregar'}">
                        ${isSelected ? '−' : '+'}
                    </button>
                </div>`;
            }).join('');

        this.renderEquipoSeleccionado();
    },

    renderEquipoSeleccionado() {
        const container = document.getElementById('equipoSeleccionadoCirugia');
        const hidden = document.getElementById('equipoCirugiaHidden');
        if (!container || !hidden) return;

        const ids = hidden.value.split(',').filter(Boolean);
        if (!ids.length) {
            container.innerHTML = '<small class="chips-empty">Sin veterinarios seleccionados.</small>';
            return;
        }

        // Agrupar IDs repetidos y contar
        const idCounts = {};
        ids.forEach(id => {
            idCounts[id] = (idCounts[id] || 0) + 1;
        });

        const chips = Object.entries(idCounts).map(([id, count]) => {
            const vet = this.veterinariosCatalogo.find(v => String(v.id) === String(id));
            if (!vet) return '';
            const countTxt = count > 1 ? ` <strong>(x${count})</strong>` : '';
            return `<div class="chip">
                <span>${vet.nombre}${countTxt}</span>
                <button type="button" onclick="hospitalizacionesManager.removerVeterinario('${id}')" class="chip-remove-btn" title="Eliminar">
                    ×
                </button>
            </div>`;
        }).filter(Boolean);

        container.innerHTML = chips.join('');
    },

    agregarVeterinario(vetId) {
        const hidden = document.getElementById('equipoCirugiaHidden');
        if (!hidden) return;

        const ids = hidden.value.split(',').filter(Boolean);
        if (!ids.includes(String(vetId))) {
            ids.push(String(vetId));
            hidden.value = ids.join(',');
        }

        const buscador = document.getElementById('buscarEquipoCirugia');
        this.renderEquipoSelect(buscador ? buscador.value : '');
    },

    removerVeterinario(vetId) {
        const hidden = document.getElementById('equipoCirugiaHidden');
        if (!hidden) return;

        const ids = hidden.value.split(',').filter(Boolean);
        hidden.value = ids.filter(id => id !== String(vetId)).join(',');

        const buscador = document.getElementById('buscarEquipoCirugia');
        this.renderEquipoSelect(buscador ? buscador.value : '');
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
            <div class="hospitalizacion-card" data-hosp-id="${hosp.id}" style="padding:6px 10px; margin-bottom:6px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:${!hosp.tiene_alta ? '6px' : '0'};">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <span style="font-size:12px; color:#6b7280;"><i class="bi bi-calendar"></i> ${hosp.fecha_ingreso}</span>
                        <span style="font-size:13px; font-weight:600; color:#111;">${hosp.motivo}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span class="hosp-estado estado-${(hosp.estado || 'activa').toLowerCase()}" style="font-size:11px; padding:2px 6px;">
                            <i class="bi bi-circle-fill"></i> ${hosp.estado || 'N/A'}
                        </span>
                        ${window.userRol !== 'recepcion' ? `
                        <button class="btn-expandir" onclick="hospitalizacionesManager.verDetalles(${hosp.id})" title="Ver detalles" style="padding:4px 8px; font-size:13px;">
                            <i class="bi bi-eye"></i>
                        </button>
                        ` : ''}
                    </div>
                </div>
                
                ${!hosp.tiene_alta ? `
                    <div style="display:flex; gap:4px; flex-wrap:wrap;">
                        <button onclick="hospitalizacionesManager.abrirModalCirugia(${hosp.id})" style="padding:4px 10px; font-size:12px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; color:#374151; cursor:pointer;">
                            <i class="bi bi-tools"></i> ${hosp.tiene_cirugia ? 'Agregar/otra Cirugía' : 'Agregar Cirugía'}
                        </button>
                        <button onclick="hospitalizacionesManager.abrirModalRegistro(${hosp.id})" style="padding:4px 10px; font-size:12px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; color:#374151; cursor:pointer;">
                            <i class="bi bi-plus-circle"></i> Registro Diario
                        </button>
                        <button onclick="hospitalizacionesManager.abrirModalAlta(${hosp.id})" style="padding:4px 10px; font-size:12px; background:#f3f4f6; border:1px solid #e5e7eb; border-radius:6px; color:#374151; cursor:pointer;">
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
            // Verificar rol: recepcion no puede ver detalles
            if (window.userRol === 'recepcion') {
                alert('No tienes permisos para ver detalles de hospitalizaciones');
                return;
            }
            
            const response = await fetch(`/clinica/pacientes/${this.pacienteId}/hospitalizacion/${hospId}/detalle/`);
            const data = await response.json();

            if (data.success) {
                const hosp = data.hospitalizacion;
                const pesoPaciente = (window.pacienteData && window.pacienteData.peso) ? parseFloat(window.pacienteData.peso) : null;
                
                // COLUMNA IZQUIERDA: Información General
                const detallesIzquierda = document.getElementById('detallesIzquierda');
                let htmlIzquierda = `
                    <div style="padding:8px 0; margin-bottom:12px; border-bottom:2px solid #e5e7eb; font-size:13px; color:#374151;">
                        <strong style="font-weight:600; color:#111;">${hosp.estado}</strong> | 
                        <span>${hosp.fecha_ingreso}</span> | 
                        <span>${hosp.motivo}</span> | 
                        <span>${hosp.veterinario}</span>
                    </div>
                    
                    <div style="padding:10px 0; margin-bottom:10px; border-bottom:1px solid #e5e7eb;">
                        <h6 style="margin:0 0 8px 0; font-size:14px; font-weight:600; color:#111;"><i class="bi bi-journal-text" style="font-size:13px;"></i> Diagnóstico</h6>
                        <div style="font-size:13px; color:#374151; line-height:1.5; margin-bottom:8px;">
                            ${hosp.diagnostico || '<em style="color:#9ca3af;">Sin diagnóstico</em>'}
                        </div>
                        ${hosp.observaciones ? `
                            <div style="margin-top:8px;">
                                <div style="font-size:12px; font-weight:600; color:#6b7280; margin-bottom:4px;">Observaciones</div>
                                <div style="font-size:13px; color:#374151; line-height:1.5;">${hosp.observaciones}</div>
                            </div>
                        ` : ''}
                    </div>
                `;
                
                // Cirugías (lista)
                if (hosp.cirugias && hosp.cirugias.length) {
                    // Función para calcular dosis en cirugías
                    const calcularDosisDetalle = (ins) => {
                        if (!pesoPaciente || !ins) return '';
                        const pesoRef = parseFloat(ins.peso_kg || 0);
                        if (!pesoRef || pesoRef === 0) return '';
                        const factor = pesoPaciente / pesoRef;
                        if (ins.dosis_ml) {
                            const ml = (parseFloat(ins.dosis_ml) * factor).toFixed(2);
                            return ` - ${ml} ml`;
                        }
                        if (ins.cantidad_pastillas) {
                            const tabs = (parseFloat(ins.cantidad_pastillas) * factor).toFixed(2);
                            return ` - ${tabs} pastillas`;
                        }
                        if (ins.unidades_pipeta) {
                            const pip = (parseFloat(ins.unidades_pipeta) * factor).toFixed(2);
                            return ` - ${pip} pipetas`;
                        }
                        return '';
                    };
                    
                    htmlIzquierda += `
                        <div style="padding:10px 0; margin-bottom:10px; border-bottom:1px solid #e5e7eb;">
                            <h6 style="margin:0 0 10px 0; font-size:14px; font-weight:600; color:#111;"><i class="bi bi-tools" style="font-size:13px;"></i> Cirugías</h6>
                            ${hosp.cirugias.map((c, idx) => `
                                <div style=\"margin-bottom:8px; padding-bottom:8px; ${idx < hosp.cirugias.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}\">
                                    <div onclick=\"this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'; this.querySelector('.toggle-icon').classList.toggle('bi-chevron-down'); this.querySelector('.toggle-icon').classList.toggle('bi-chevron-right');\" style=\"display:flex; justify-content:space-between; align-items:center; cursor:pointer; padding:4px 0;\">
                                        <div style=\"display:flex; align-items:center; gap:8px;\">
                                            <i class=\"bi bi-chevron-right toggle-icon\" style=\"font-size:10px; color:#6b7280;\"></i>
                                            <strong style=\"font-size:13px; color:#111;\">${c.tipo}</strong>
                                            <span style=\"font-size:12px; color:#6b7280;\">${c.fecha}</span>
                                            ${c.complicaciones ? `<span style=\"font-size:12px; color:#dc2626;\"><i class=\"bi bi-exclamation-triangle\"></i> Complicaciones</span>` : ''}
                                        </div>
                                    </div>
                                    <div style=\"display:none; padding:8px 0 0 18px; font-size:13px; color:#374151;\">
                                        <div style=\"margin-bottom:6px; line-height:1.5;\">${c.descripcion}</div>
                                        <div style=\"display:flex; gap:12px; margin-bottom:4px; font-size:12px; color:#6b7280;\">
                                            <div><i class=\"bi bi-person-badge\"></i> ${c.veterinario}</div>
                                            <div><i class=\"bi bi-check-circle\"></i> ${c.resultado}</div>
                                        </div>
                                        ${c.complicaciones ? `<div style=\"font-size:12px; color:#dc2626; margin:6px 0;\"><strong>Complicaciones:</strong> ${c.complicaciones}</div>` : ''}
                                        ${c.insumos && c.insumos.length ? `<div style=\"margin-top:8px;\"><div style=\"font-size:12px; font-weight:600; color:#6b7280; margin-bottom:4px;\">Insumos utilizados:</div><div style=\"display:flex; flex-wrap:wrap; gap:4px;\">${c.insumos.map(ins => `<span style=\\\"border:1px solid #e5e7eb; color:#374151; padding:2px 6px; border-radius:3px; font-size:12px;\\\">${ins.nombre}<strong style=\\\"color:#16a34a;\\\">${calcularDosisDetalle(ins)}</strong></span>`).join('')}</div></div>` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }
                
                // Preparar funciones para insumos (antes de usarlas en cirugías)
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

                // Insumos totales después de cirugías
                const insumosHosp = hosp.insumos || [];
                const insumosCirugias = (hosp.cirugias || []).flatMap(c => c.insumos || []);
                const insumosReg = (hosp.registros_diarios || []).flatMap(r => r.insumos || []);
                const todosInsumos = [...insumosHosp, ...insumosCirugias, ...insumosReg];

                if (todosInsumos.length) {
                    // Agrupar por ID
                    const idCounts = {};
                    const uniqueInsumos = [];
                    todosInsumos.forEach(ins => {
                        const key = ins.idInventario || ins.id;
                        if (!idCounts[key]) {
                            idCounts[key] = 1;
                            uniqueInsumos.push(ins);
                        } else {
                            idCounts[key]++;
                        }
                    });
                    
                    htmlIzquierda += `
                        <div style="padding:10px 0; margin-bottom:10px; border-bottom:1px solid #e5e7eb;">
                            <h6 style="margin:0 0 8px 0; font-size:14px; font-weight:600; color:#111;"><i class="bi bi-box-seam" style="font-size:13px;"></i> Insumos utilizados</h6>
                            ${uniqueInsumos.map(ins => {
                                const dosis = renderDosis(ins);
                                const count = idCounts[ins.idInventario || ins.id];
                                return `<div style="padding:4px 0; border-bottom:1px solid #f9fafb; font-size:12px; color:#374151;">
                                    <strong style="color:#111;">${ins.nombre || 'Insumo'}</strong>${dosis ? ` | <span style="color:#16a34a;">${dosis}</span>` : ''}${count > 1 ? ` | <span style="color:#6b7280;">(x${count})</span>` : ''}
                                </div>`;
                            }).join('')}
                        </div>
                    `;
                }

                // Alta médica si existe
                if (hosp.alta) {
                    htmlIzquierda += `
                        <div style="padding:10px 0; border-bottom:1px solid #e5e7eb;">
                            <h6 style="margin:0 0 8px 0; font-size:14px; font-weight:600; color:#111;"><i class="bi bi-check-circle" style="font-size:13px;"></i> Alta médica</h6>
                            <div style="font-size:13px; color:#374151; line-height:1.8;">
                                <div style="margin-bottom:6px;"><span style="color:#6b7280;">Fecha:</span> <strong>${hosp.alta.fecha}</strong></div>
                                <div style="margin:8px 0;">
                                    <div style="font-size:12px; font-weight:600; color:#6b7280; margin-bottom:4px;">Diagnóstico final:</div>
                                    <div style="font-size:13px;">${hosp.alta.diagnostico_final}</div>
                                </div>
                                <div style="margin:8px 0;">
                                    <div style="font-size:12px; font-weight:600; color:#6b7280; margin-bottom:4px;">Tratamiento post-alta:</div>
                                    <div style="font-size:13px;">${hosp.alta.tratamiento_post}</div>
                                </div>
                                <div style="margin:8px 0;">
                                    <div style="font-size:12px; font-weight:600; color:#6b7280; margin-bottom:4px;">Recomendaciones:</div>
                                    <div style="font-size:13px;">${hosp.alta.recomendaciones}</div>
                                </div>
                                ${hosp.alta.proxima_revision ? `<div style="margin-top:8px; padding:4px 0; font-size:12px;"><i class="bi bi-calendar-check"></i> Próxima revisión: <strong>${hosp.alta.proxima_revision}</strong></div>` : ''}
                            </div>
                        </div>
                    `;
                }
                
                detallesIzquierda.innerHTML = htmlIzquierda;

                // COLUMNA DERECHA: Registros Diarios
                const registrosDiariosContainer = document.getElementById('registrosDiariosContainer');
                if (hosp.registros_diarios && hosp.registros_diarios.length > 0) {
                    const htmlRegistros = hosp.registros_diarios.map((reg, idx) => `
                        <div style="padding:6px 0; border-bottom:1px solid #f3f4f6; margin-bottom:6px; font-size:12px;">
                            <div style="color:#111; margin-bottom:3px;"><i class="bi bi-calendar-day"></i> <strong>${reg.fecha}</strong> | <i class="bi bi-person-badge"></i> ${reg.veterinario || 'N/A'}</div>
                            <div style="color:#374151; margin-bottom:3px;"><i class="bi bi-thermometer-half"></i> ${reg.temperatura}°C | <i class="bi bi-clipboard-pulse"></i> ${reg.peso} kg | <i class="bi bi-heart-pulse"></i> ${reg.frecuencia_cardiaca || 'N/A'} | <i class="bi bi-lungs"></i> ${reg.frecuencia_respiratoria || 'N/A'}</div>
                            ${reg.observaciones ? `<div style=\"color:#6b7280;\"><i class=\"bi bi-chat-left-text\"></i> ${reg.observaciones}</div>` : ''}
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

        // ⚠️ asegúrate que tu <select> tenga name="servicio_cirugia"
        const servicioId = formData.get('servicio_cirugia');

        // ✅ CORREGIDO: ahora el normalizador usa s.id (no s.idServicio)
        const servicio = this.serviciosCirugia.find(s => String(s.id) === String(servicioId));
        const tipoCirugia = servicio ? servicio.nombre : '';
        const duracion = servicio ? (servicio.duracion || '') : (formData.get('duracion_minutos') || '');

        if (!servicioId) {
            alert('❌ El servicio seleccionado no tiene ID. Revisa la API /clinica/api/servicios/ (debe incluir id).');
            return;
        }

        // Insumos seleccionados (usamos el hidden para evitar errores si el contenedor no es un <select>)
        const insumosHidden = document.getElementById('insumosCirugiaHidden');
        const insumosSeleccionados = insumosHidden ? insumosHidden.value.split(',').filter(Boolean) : [];

        // Equipo seleccionado
        const equipoHidden = document.getElementById('equipoCirugiaHidden');
        const equipoSeleccionado = equipoHidden ? equipoHidden.value.split(',').filter(Boolean) : [];

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
                    equipo: equipoSeleccionado,
                })
            });

            const data = await response.json();
            if (data.success) {
                alert('Cirugía registrada');
                const modal = document.getElementById('cirugiaModal');
                modal.classList.remove('show');
                modal.classList.add('hide');
                
                // Limpiar formulario completamente
                form.reset();
                
                // Limpiar insumos seleccionados
                const insumosHidden = document.getElementById('insumosCirugiaHidden');
                if (insumosHidden) insumosHidden.value = '';
                
                // Limpiar equipo seleccionado
                const equipoHidden = document.getElementById('equipoCirugiaHidden');
                if (equipoHidden) equipoHidden.value = '';
                
                // Re-renderizar listas vacías
                this.renderInsumosSelect('');
                this.renderInsumosSeleccionados();
                this.renderEquipoSelect('');
                this.renderEquipoSeleccionado();
                
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

    setupFiltrosHospitalizacion() {
        // Popular años en el selector
        const selectYear = document.getElementById('selectHospYear');
        if (selectYear) {
            const currentYear = new Date().getFullYear();
            for (let year = currentYear; year >= currentYear - 10; year--) {
                const option = document.createElement('option');
                option.value = year;
                option.textContent = year;
                selectYear.appendChild(option);
            }
        }

        // Buscador
        const searchInput = document.getElementById('searchHospitalizacion');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filtrarHospitalizaciones());
        }

        // Checkboxes de estado
        document.getElementById('filterHospActiva')?.addEventListener('change', () => this.filtrarHospitalizaciones());
        document.getElementById('filterHospAlta')?.addEventListener('change', () => this.filtrarHospitalizaciones());

        // Selectores de fecha
        document.getElementById('selectHospMonth')?.addEventListener('change', () => this.filtrarHospitalizaciones());
        document.getElementById('selectHospYear')?.addEventListener('change', () => this.filtrarHospitalizaciones());

        // Botones de navegación de mes
        document.getElementById('btnHospPrevMonth')?.addEventListener('click', () => this.cambiarMesHosp(-1));
        document.getElementById('btnHospNextMonth')?.addEventListener('click', () => this.cambiarMesHosp(1));

        // Limpiar filtros
        document.getElementById('btnClearHospFilters')?.addEventListener('click', () => this.limpiarFiltrosHosp());
    },

    cambiarMesHosp(delta) {
        const selectMonth = document.getElementById('selectHospMonth');
        const selectYear = document.getElementById('selectHospYear');
        
        if (!selectMonth || !selectYear) return;

        let mes = parseInt(selectMonth.value) || (new Date().getMonth() + 1);
        let anio = parseInt(selectYear.value) || new Date().getFullYear();

        mes += delta;
        if (mes < 1) {
            mes = 12;
            anio--;
        } else if (mes > 12) {
            mes = 1;
            anio++;
        }

        selectMonth.value = mes;
        selectYear.value = anio;
        this.filtrarHospitalizaciones();
    },

    limpiarFiltrosHosp() {
        document.getElementById('searchHospitalizacion').value = '';
        document.getElementById('selectHospMonth').value = '';
        document.getElementById('selectHospYear').value = '';
        document.getElementById('filterHospActiva').checked = true;
        document.getElementById('filterHospAlta').checked = true;
        this.filtrarHospitalizaciones();
    },

    filtrarHospitalizaciones() {
        const search = document.getElementById('searchHospitalizacion')?.value.toLowerCase() || '';
        const mes = document.getElementById('selectHospMonth')?.value;
        const anio = document.getElementById('selectHospYear')?.value;
        const mostrarActiva = document.getElementById('filterHospActiva')?.checked;
        const mostrarAlta = document.getElementById('filterHospAlta')?.checked;

        const cards = document.querySelectorAll('.hospitalizacion-card');
        cards.forEach(card => {
            const hospId = card.dataset.hospId;
            const hosp = this.hospitalizaciones.find(h => h.id == hospId);
            
            if (!hosp) {
                card.style.display = 'none';
                return;
            }

            let visible = true;

            // Filtro de búsqueda
            if (search) {
                const motivo = hosp.motivo?.toLowerCase() || '';
                const diagnostico = hosp.diagnostico?.toLowerCase() || '';
                if (!motivo.includes(search) && !diagnostico.includes(search)) {
                    visible = false;
                }
            }

            // Filtro de estado (solo ocultar si ambos están desmarcados o el estado no coincide)
            const estado = hosp.estado?.toLowerCase();
            if (!mostrarActiva && !mostrarAlta) {
                visible = false;
            } else if (mostrarActiva && !mostrarAlta && estado !== 'activa') {
                visible = false;
            } else if (!mostrarActiva && mostrarAlta && estado !== 'alta') {
                visible = false;
            }

            // Filtro de fecha (formato dd/mm/yyyy HH:MM)
            if (mes !== '' || anio !== '') {
                const fechaStr = hosp.fecha_ingreso.split(' ')[0]; // Obtener solo la parte de fecha dd/mm/yyyy
                const [day, month, year] = fechaStr.split('/').map(Number);
                if (mes !== '' && month !== parseInt(mes)) visible = false;
                if (anio !== '' && year !== parseInt(anio)) visible = false;
            }

            card.style.display = visible ? 'block' : 'none';
        });
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

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
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
