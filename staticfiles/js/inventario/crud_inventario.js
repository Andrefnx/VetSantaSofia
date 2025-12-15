/* ============================================================
   CONFIGURAR NIVELES DE STOCK
============================================================ */
function openConfigNivelesModal(btn) {
    // Buscar el TR de manera robusta (misma lógica que abrirModalProducto)
    let tr = btn.closest("tr");
    
    // Si no se encuentra con closest, intentar desde el botón padre
    if (!tr) {
        const manageWheel = btn.closest('.manage-wheel');
        if (manageWheel) {
            tr = manageWheel.closest('tr');
        }
    }
    
    // Si el botón tiene referencia al row original (del wheel clonado)
    if (!tr && btn.__originalRow) {
        tr = btn.__originalRow;
    }
    
    // Si aún no se encuentra, buscar el TR que contiene el manage-wheel
    if (!tr) {
        const allRows = document.querySelectorAll('tbody tr[data-id]');
        for (const row of allRows) {
            if (row.contains(btn) || row.querySelector('.manage-wheel') === btn.closest('.manage-wheel')) {
                tr = row;
                break;
            }
        }
    }
    
    if (!tr) {
        console.error('No se encontró la fila de la tabla para el botón');
        return;
    }

    const idInventario = tr.getAttribute("data-id");
    const nombreProducto = tr.querySelector("td:nth-child(1)")?.textContent.trim() || "Producto";
    
    // Obtener datos actuales del producto
    fetch(`/inventario/${idInventario}/detalle/`)
        .then(response => response.json())
        .then(data => {
            if (data.success && data.insumo) {
                // Poblar el modal con los datos actuales
                document.getElementById('idProductoNiveles').value = idInventario;
                document.getElementById('productoNombreNiveles').textContent = nombreProducto;
                document.getElementById('inputStockMinimo').value = data.insumo.stock_minimo || 10;
                document.getElementById('inputStockMedio').value = data.insumo.stock_medio || 20;
                
                // Abrir el modal
                const modal = document.getElementById('modalConfigNiveles');
                if (modal) {
                    modal.classList.remove('hide');
                    modal.classList.add('show');
                }
            } else {
                alert("Error al cargar datos del producto");
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error al cargar el producto: " + error.message);
        });
}

function guardarNivelesStock() {
    const idProducto = document.getElementById('idProductoNiveles').value;
    const stockMinimo = parseFloat(document.getElementById('inputStockMinimo').value);
    const stockMedio = parseFloat(document.getElementById('inputStockMedio').value);
    
    // Validación básica
    if (!stockMinimo || !stockMedio) {
        alert("Por favor, ingresa ambos valores");
        return;
    }
    
    if (stockMinimo >= stockMedio) {
        alert("El stock mínimo debe ser menor al stock medio");
        return;
    }
    
    // Enviar datos al servidor
    fetch(`/inventario/${idProducto}/actualizar-niveles/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            stock_minimo: stockMinimo,
            stock_medio: stockMedio
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Mostrar notificación de éxito
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #10b981;
                color: white;
                padding: 16px 24px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 999999;
                font-weight: 500;
                display: flex;
                align-items: center;
                gap: 10px;
            `;
            notification.innerHTML = '<i class="fas fa-check-circle"></i> Niveles de stock actualizados correctamente';
            document.body.appendChild(notification);
            
            setTimeout(() => {
                notification.style.transition = 'opacity 0.3s';
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }, 2500);
            
            closeVetModal('modalConfigNiveles');
            setTimeout(() => location.reload(), 600); // Recargar para ver cambios de color
        } else {
            alert("Error al guardar: " + (data.error || "Error desconocido"));
        }
    })
    .catch(error => {
        console.error("❌ Error:", error);
        alert("Error al guardar niveles: " + error.message);
    });
}

function closeVetModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        modal.classList.add('hide');
    }
}

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

/* ============================================================
   CREAR PRODUCTO
============================================================ */
function abrirModalNuevoProducto() {
    const data = {
        nombre_comercial: "",
        marca: "",
        categoria: "",
        sku: "",
        tipo: "",
        formato: "",
        codigo_barra: "",
        presentacion: "",
        especie: "",
        descripcion: "",
        unidad_medida: "",
        precio_venta: "",
        stock_actual: "",
        stock_minimo: "",
        stock_maximo: "",
        almacenamiento: "",
        precauciones: "",
        contraindicaciones: "",
        efectos_adversos: "",
        
        // Dosis líquidos
        dosis_ml: "",
        ml_contenedor: "",
        
        // Dosis pastillas
        cantidad_pastillas: "",
        
        // Dosis pipetas
        unidades_pipeta: "",
        
        // Peso
        peso_kg: "",
        tiene_rango_peso: false,
        peso_min_kg: "",
        peso_max_kg: "",
    };

    openProductoModal("nuevo", data);
}

/* ============================================================
   FUNCIÓN AUXILIAR PARA NORMALIZAR NÚMEROS
============================================================ */
function normalizarNumero(valor) {
    if (!valor && valor !== 0) return '';
    return valor.toString().replace(',', '.');
}

function parseNumeroSeguro(valor) {
    if (!valor && valor !== 0) return '';
    const normalizado = valor.toString().replace(',', '.');
    const numero = parseFloat(normalizado);
    return isNaN(numero) ? '' : numero;
}

/* ============================================================
   VER / EDITAR PRODUCTO
============================================================ */
function abrirModalProducto(btn, mode) {
    // Buscar el TR de manera robusta
    let tr = btn.closest("tr");
    
    // Si no se encuentra con closest, intentar desde el botón padre
    if (!tr) {
        const manageWheel = btn.closest('.manage-wheel');
        if (manageWheel) {
            tr = manageWheel.closest('tr');
        }
    }
    
    // Si el botón tiene referencia al row original (del wheel clonado)
    if (!tr && btn.__originalRow) {
        tr = btn.__originalRow;
    }
    
    // Si aún no se encuentra, buscar el TR que contiene el manage-wheel
    if (!tr) {
        const allRows = document.querySelectorAll('tbody tr[data-id]');
        for (const row of allRows) {
            if (row.contains(btn) || row.querySelector('.manage-wheel') === btn.closest('.manage-wheel')) {
                tr = row;
                break;
            }
        }
    }
    
    if (!tr) {
        console.error('❌ No se encontró la fila de la tabla para el botón:', btn);
        console.error('❌ Este error no debería ocurrir. Verifica gestion_wheel.js');
        return;
    }

    const idInventario = tr.getAttribute("data-id");
    console.log('📦 Cargando producto ID:', idInventario);

    fetch(`/inventario/${idInventario}/detalle/`)
        .then(response => {
            console.log('📡 Response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('📊 Datos recibidos:', data);
            
            if (data.success && data.insumo) {
                openProductoModal(mode, data.insumo);
            } else {
                alert("No se encontraron datos del producto");
            }
        })
        .catch(error => {
            console.error("❌ Error completo:", error);
            alert("Error al cargar el producto: " + error.message);
        });
}

/* ============================================================
   ABRIR MODAL PRINCIPAL
============================================================ */
function openProductoModal(mode, data = {}) {
    console.log('🔧 Abriendo modal en modo:', mode);
    console.log('📋 Datos recibidos:', data);
    
    const modalId = 'modalProducto';
    const modal = document.getElementById(modalId);
    
    if (!modal) {
        console.error("❌ No se encuentra el modal:", modalId);
        return;
    }
    
    // Mapear datos
    const mappedData = {
        idInventario: data.idInventario,
        nombre_comercial: data.medicamento || data.nombre_comercial || "",
        marca: data.marca || "",
        sku: data.sku || "",
        tipo: data.tipo || "",
        formato: data.formato || "",
        descripcion: data.descripcion || "",
        especie: data.especie || "",
        precio_venta: data.precio_venta || "",
        stock_actual: data.stock_actual || 0,
        
        // Dosis líquidos
        dosis_ml: data.dosis_ml || "",
        ml_contenedor: data.ml_contenedor || "",
        
        // Dosis pastillas
        cantidad_pastillas: data.cantidad_pastillas || "",
        
        // Dosis pipetas
        unidades_pipeta: data.unidades_pipeta || "",
        
        // Peso
        peso_kg: data.peso_kg || "",
        tiene_rango_peso: data.tiene_rango_peso || false,
        peso_min_kg: data.peso_min_kg || "",
        peso_max_kg: data.peso_max_kg || "",
        
        precauciones: data.precauciones || "",
        contraindicaciones: data.contraindicaciones || "",
        efectos_adversos: data.efectos_adversos || "",
        
        fecha_creacion_formatted: data.fecha_creacion_formatted || "",
        ultimo_ingreso_formatted: data.ultimo_ingreso_formatted || "",
        ultimo_movimiento_formatted: data.ultimo_movimiento_formatted || "",
        tipo_ultimo_movimiento_display: data.tipo_ultimo_movimiento_display || "",
        usuario_ultimo_movimiento: data.usuario_ultimo_movimiento || "",
        
        dosis_display: data.dosis_display || "-",
        categoria: data.categoria || "",
        codigo_barra: data.codigo_barra || "",
        presentacion: data.presentacion || "",
        unidad_medida: data.unidad_medida || "",
        almacenamiento: data.almacenamiento || "",
        stock_minimo: data.stock_minimo || "",
        stock_maximo: data.stock_maximo || "",
        precio_compra: data.precio_compra || "",
        stock: data.stock || "",
        proveedor: data.proveedor || "",
        especie: data.especie || "todos",
    };
    
    console.log('🗺️ Datos mapeados:', mappedData);
    
    // ⭐ ACTUALIZAR VISTA DE DOSIS (usando la función del dosis_calculator.js)
    const dosisFormulaView = modal.querySelector('[data-field="dosis_formula_view"]');
    if (dosisFormulaView) {
        dosisFormulaView.textContent = mappedData.dosis_display;
        console.log('✅ dosis_formula_view:', mappedData.dosis_display);
    }

    // ML Contenedor vista (solo para líquidos)
    const mlContenedorView = modal.querySelector('[data-field="ml_contenedor_view"]');
    if (mlContenedorView) {
        if (mappedData.formato === 'liquido' || mappedData.formato === 'inyectable') {
            if (mappedData.ml_contenedor) {
                mlContenedorView.textContent = `${mappedData.ml_contenedor} ml`;
            } else {
                mlContenedorView.textContent = "-";
            }
        } else {
            mlContenedorView.textContent = "N/A";
        }
    }

    if (mode === "edit" || mode === "view") {
        modal.dataset.originalData = JSON.stringify(mappedData);
    }

    // Títulos y botones
    const titulo = document.getElementById("modalProductoTitulo");
    if (titulo) {
        titulo.textContent = mode === "nuevo" ? "Nuevo Producto" : mode === "edit" ? "Editar Producto" : "Detalles del Producto";
    }

    // ⭐ CONFIGURAR BOTONES SEGÚN MODO
    const btnEditar = document.getElementById("btnEditarProducto");
    const btnGuardar = document.getElementById("btnGuardarProductoModal");
    
    if (mode === "view") {
        // Modo vista: sin botones de acción
        if (btnEditar) btnEditar.style.setProperty("display", "none", "important");
        if (btnGuardar) btnGuardar.style.setProperty("display", "none", "important");
    } else if (mode === "edit" || mode === "nuevo") {
        // Modo edición/creación: mostrar solo botón guardar
        if (btnEditar) btnEditar.style.setProperty("display", "none", "important");
        if (btnGuardar) btnGuardar.style.setProperty("display", "inline-flex", "important");
    }

    // Mostrar/ocultar campos según modo
    modal.querySelectorAll(".field-view").forEach((f) => {
        if (!f.classList.contains('field-readonly')) {
            f.classList.toggle("d-none", mode === "edit" || mode === "nuevo");
        }
    });

    modal.querySelectorAll(".field-edit").forEach((f) => {
        f.classList.toggle("d-none", mode === "view");
    });

    // Rellenar campos normales
    Object.keys(mappedData).forEach((key) => {
        const value = mappedData[key];
        
        // Campos de vista
        if (!['dosis_ml', 'peso_kg', 'ml_contenedor', 'cantidad_pastillas', 'unidades_pipeta', 
              'peso_min_kg', 'peso_max_kg', 'tiene_rango_peso'].includes(key)) {
            const viewEl = modal.querySelector(`.field-view[data-field="${key}"]`);
            if (viewEl && !viewEl.classList.contains('field-readonly')) {
                viewEl.textContent = value || "-";
            }
        }

        // Campos editables
        const editEl = modal.querySelector(`input[data-field="${key}"], select[data-field="${key}"], textarea[data-field="${key}"]`);
        if (editEl) {
            if (editEl.type === 'checkbox') {
                editEl.checked = Boolean(value);
            } else if (editEl.tagName === "SELECT") {
                editEl.value = value || "";
            } else {
                editEl.value = value || "";
            }
        }
        
        // También buscar dentro de .field-edit
        const fieldEditDiv = modal.querySelector(`.field-edit[data-field="${key}"]`);
        if (fieldEditDiv) {
            const input = fieldEditDiv.querySelector('input, select, textarea');
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = Boolean(value);
                } else if (input.tagName === "SELECT") {
                    input.value = value || "";
                } else {
                    input.value = value || "";
                }
            }
        }
    });
    
    // Campos de solo lectura (metadata)
    const camposSoloLectura = [
        'fecha_creacion_formatted',
        'ultimo_ingreso_formatted',
        'ultimo_movimiento_formatted',
        'tipo_ultimo_movimiento_display',
        'usuario_ultimo_movimiento'
    ];
    
    camposSoloLectura.forEach(key => {
        const readonlyEl = modal.querySelector(`.field-readonly[data-field="${key}"]`);
        if (readonlyEl) {
            readonlyEl.textContent = mappedData[key] || "-";
        }
    });

    // Guardar ID
    if (mappedData.idInventario) {
        modal.dataset.idinventario = mappedData.idInventario;
    } else {
        delete modal.dataset.idinventario;
    }
    
    // ⭐ Inicializar eventos de formato (dosis_calculator.js)
    if (typeof inicializarEventosFormato === 'function') {
        inicializarEventosFormato(modal);
    }
    
    // ⭐ Actualizar campos de dosis según formato actual
    if (mappedData.formato && typeof actualizarCamposDosis === 'function') {
        actualizarCamposDosis(mappedData.formato, modal);
    }

    console.log('🎉 Abriendo modal...');
    openVetModal(modalId);
}

/* ============================================================
   CAMBIAR A MODO EDICIÓN
============================================================ */
function switchToEditModeProducto() {
    const modal = document.getElementById('modalProducto');
    const data = JSON.parse(modal.dataset.originalData || '{}');
    
    console.log('✏️ Cambiando a modo edición con datos:', data);

    if (data.idInventario) {
        modal.dataset.idinventario = data.idInventario;
    }

    // Ocultar campos de vista
    modal.querySelectorAll(".field-view").forEach((f) => {
        if (!f.classList.contains('field-readonly')) {
            f.classList.add("d-none");
        }
    });

    // Mostrar campos de edición
    modal.querySelectorAll(".field-edit").forEach((f) => {
        f.classList.remove("d-none");
    });

    // Rellenar campos editables
    Object.keys(data).forEach((key) => {
        const value = data[key];
        
        // Buscar input directo
        let element = modal.querySelector(`input[data-field="${key}"], select[data-field="${key}"], textarea[data-field="${key}"]`);
        
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = Boolean(value);
            } else if (element.tagName === "SELECT") {
                element.value = value || "";
            } else {
                element.value = value || "";
            }
            return;
        }
        
        // Buscar dentro de .field-edit
        const fieldEditDiv = modal.querySelector(`.field-edit[data-field="${key}"]`);
        if (fieldEditDiv) {
            const input = fieldEditDiv.querySelector('input, select, textarea');
            if (input) {
                if (input.type === 'checkbox') {
                    input.checked = Boolean(value);
                } else if (input.tagName === "SELECT") {
                    input.value = value || "";
                } else {
                    input.value = value || "";
                }
            }
        }
    });

    // Cambiar botones
    const btnGuardar = document.getElementById("btnGuardarProductoModal");
    const btnEditar = document.getElementById("btnEditarProducto");

    if (btnGuardar) btnGuardar.classList.remove("d-none");
    if (btnEditar) btnEditar.classList.add("d-none");
    
    // Cambiar título
    const titulo = document.getElementById("modalProductoTitulo");
    if (titulo) {
        titulo.textContent = "Editar Producto";
    }
    
    // ⭐ Actualizar campos de dosis según formato
    if (data.formato && typeof actualizarCamposDosis === 'function') {
        actualizarCamposDosis(data.formato, modal);
    }
    
    console.log('✅ Modo edición activado');
}

/* ============================================================
   CAMBIAR A MODO VISTA
============================================================ */
function switchToViewModeProducto() {
    const modal = document.getElementById('modalProducto');
    
    console.log('👁️ Cambiando a modo vista');
    
    // Ocultar campos de edición
    modal.querySelectorAll(".field-edit").forEach((f) => {
        f.classList.add("d-none");
    });

    // Mostrar campos de vista
    modal.querySelectorAll(".field-view").forEach((f) => {
        if (!f.classList.contains('field-readonly')) {
            f.classList.remove("d-none");
        }
    });
    
    // ⭐ CAMBIAR BOTONES
    const btnGuardar = document.getElementById("btnGuardarProductoModal");
    const btnEditar = document.getElementById("btnEditarProducto");

    if (btnGuardar) btnGuardar.classList.add("d-none");
    if (btnEditar) btnEditar.classList.remove("d-none");
}

/* ============================================================
   GUARDAR PRODUCTO
============================================================ */
async function guardarProducto() {
    console.log('💾 Intentando guardar producto...');
    
    const modal = document.getElementById('modalProducto');
    const idInventario = modal?.dataset?.idinventario;
    
    // ⭐ URL CORREGIDA - Según tus rutas en urls.py
    const url = idInventario 
        ? `/inventario/${idInventario}/editar/` 
        : '/inventario/crear/';
    
    console.log('💾 Modo:', idInventario ? 'Editar' : 'Crear');
    console.log('🆔 ID:', idInventario);
    
    // Función para buscar campos por data-field o ID
    const getFieldValue = (fieldName, defaultValue = '') => {
        let element = document.getElementById(fieldName);
        
        if (!element) {
            element = modal.querySelector(`input[data-field="${fieldName}"], select[data-field="${fieldName}"], textarea[data-field="${fieldName}"]`);
        }
        
        if (!element) {
            const fieldEdit = modal.querySelector(`.field-edit[data-field="${fieldName}"]`);
            if (fieldEdit) {
                element = fieldEdit.querySelector('input, select, textarea');
            }
        }
        
        if (!element) {
            const camposOpcionales = ['precio_compra', 'stock_minimo', 'stock_maximo', 'proveedor', 
                                     'categoria', 'codigo_barra', 'presentacion', 'unidad_medida', 
                                     'almacenamiento', 'precauciones', 'contraindicaciones', 'efectos_adversos'];
            
            if (!camposOpcionales.includes(fieldName)) {
                console.warn(`⚠️ Campo no encontrado: ${fieldName}`);
            }
            return defaultValue;
        }
        
        return element.value?.trim() || defaultValue;
    };
    
    const getNumberValue = (fieldName, defaultValue = null) => {
        const value = getFieldValue(fieldName);
        if (!value && value !== 0) return defaultValue;
        const num = parseFloat(value);
        return isNaN(num) ? defaultValue : num;
    };
    
    const getIntValue = (fieldName, defaultValue = null) => {
        const value = getFieldValue(fieldName);
        if (!value && value !== 0) return defaultValue;
        const num = parseInt(value);
        return isNaN(num) ? defaultValue : num;
    };
    
    const getCheckboxValue = (fieldName) => {
        let element = document.getElementById(fieldName);
        
        if (!element) {
            element = modal.querySelector(`input[data-field="${fieldName}"][type="checkbox"]`);
        }
        
        if (!element) {
            const fieldEdit = modal.querySelector(`.field-edit[data-field="${fieldName}"]`);
            if (fieldEdit) {
                element = fieldEdit.querySelector('input[type="checkbox"]');
            }
        }
        
        return element ? element.checked : false;
    };
    
    // Recopilar datos
    const formData = {
        medicamento: getFieldValue('nombre_comercial'),
        nombre_comercial: getFieldValue('nombre_comercial'),
        marca: getFieldValue('marca'),
        sku: getFieldValue('sku'),
        tipo: getFieldValue('tipo'),
        formato: getFieldValue('formato'),
        descripcion: getFieldValue('descripcion'),
        especie: getFieldValue('especie', 'todos'),
        precio_venta: getNumberValue('precio_venta', 0),
        stock_actual: getIntValue('stock_actual', 0),
        peso_kg: getNumberValue('peso_kg'),
        tiene_rango_peso: getCheckboxValue('tiene_rango_peso'),
        peso_min_kg: getNumberValue('peso_min_kg'),
        peso_max_kg: getNumberValue('peso_max_kg'),
    };
    
    // Campos opcionales
    const camposOpcionales = {
        precio_compra: getNumberValue('precio_compra'),
        stock_minimo: getIntValue('stock_minimo'),
        stock_maximo: getIntValue('stock_maximo'),
        proveedor: getFieldValue('proveedor'),
        categoria: getFieldValue('categoria'),
        codigo_barra: getFieldValue('codigo_barra'),
        presentacion: getFieldValue('presentacion'),
        unidad_medida: getFieldValue('unidad_medida'),
        almacenamiento: getFieldValue('almacenamiento'),
        precauciones: getFieldValue('precauciones'),
        contraindicaciones: getFieldValue('contraindicaciones'),
        efectos_adversos: getFieldValue('efectos_adversos'),
    };
    
    Object.keys(camposOpcionales).forEach(key => {
        if (camposOpcionales[key] !== null && camposOpcionales[key] !== '') {
            formData[key] = camposOpcionales[key];
        }
    });
    
    // Campos según formato
    const formato = formData.formato?.toLowerCase() || '';
    console.log('📦 Formato detectado:', formato);
    
    if (formato === 'liquido' || formato === 'inyectable') {
        formData.dosis_ml = getNumberValue('dosis_ml');
        formData.ml_contenedor = getNumberValue('ml_contenedor');
        console.log('💧 Dosis líquido:', formData.dosis_ml, 'ml');
    } else if (formato === 'pastilla' || formato === 'comprimido' || formato === 'tableta') {
        formData.cantidad_pastillas = getIntValue('cantidad_pastillas');
        console.log('💊 Cantidad pastillas:', formData.cantidad_pastillas);
    } else if (formato === 'pipeta') {
        formData.unidades_pipeta = getIntValue('unidades_pipeta');
        console.log('💉 Unidades pipeta:', formData.unidades_pipeta);
    } else if (formato === 'polvo' || formato === 'crema' || formato === 'gel') {
        formData.dosis_ml = getNumberValue('dosis_ml');
        console.log('🧪 Dosis:', formData.dosis_ml, 'gr');
    }
    
    console.log('📤 Datos completos a enviar:', formData);
    
    // Validación
    if (!formData.nombre_comercial) {
        alert('⚠️ El nombre del medicamento es obligatorio');
        return;
    }
    
    if (!formData.formato) {
        alert('⚠️ Debe seleccionar un formato');
        return;
    }
    
    console.log('🌐 URL:', url);
    
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(formData)
        });
        
        console.log('📡 Response status:', response.status);
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            const textResponse = await response.text();
            console.error('❌ Respuesta no es JSON:', textResponse.substring(0, 500));
            throw new Error('La URL no devuelve JSON. Verifica la ruta en Django.');
        }
        
        const result = await response.json();
        console.log('📊 Resultado:', result);
        
        if (result.success) {
            alert('✅ Producto guardado correctamente');
            closeVetModal('modalProducto');
            location.reload();
        } else {
            alert(`❌ Error: ${result.error || 'No se pudo guardar'}`);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
        alert(`Error: ${error.message}`);
    }
}

/* ============================================================
   ACTUALIZAR FILA EN LA TABLA
============================================================ */
function actualizarFilaTabla(insumoId, data) {
    const fila = document.querySelector(`tr[data-id="${insumoId}"]`);
    if (!fila) return;
    
    console.log('🔄 Actualizando fila de la tabla para ID:', insumoId);
    
    if (fila.cells[0]) fila.cells[0].textContent = data.nombre_comercial;
    if (fila.cells[1]) fila.cells[1].textContent = data.especie || '-';
    if (fila.cells[2]) {
        const precio = parseFloat(data.precio_venta) || 0;
        fila.cells[2].textContent = `$${precio.toLocaleString('es-CL')}`;
    }
    if (fila.cells[3]) {
        const stockBadge = fila.cells[3].querySelector('.vet-badge');
        if (stockBadge) stockBadge.textContent = data.stock_actual || 0;
    }
    if (fila.cells[4] && data.ultimo_movimiento_formatted) {
        fila.cells[4].textContent = data.ultimo_movimiento_formatted;
    }
    if (fila.cells[5] && data.tipo_ultimo_movimiento_display) {
        fila.cells[5].textContent = data.tipo_ultimo_movimiento_display;
    }
    
    console.log('✅ Fila actualizada');
}

/* ============================================================
   ELIMINAR PRODUCTO
============================================================ */
function abrirModalEliminarProducto(btn) {
    // Buscar el TR de manera más robusta
    let tr = btn.closest("tr");
    
    if (!tr) {
        const manageWheel = btn.closest('.manage-wheel');
        if (manageWheel) {
            tr = manageWheel.closest('tr');
        }
    }
    
    if (!tr) {
        const allRows = document.querySelectorAll('tbody tr[data-id]');
        for (const row of allRows) {
            if (row.contains(btn) || row.querySelector('.manage-wheel') === btn.closest('.manage-wheel')) {
                tr = row;
                break;
            }
        }
    }
    
    const modal = document.getElementById("modalProducto");

    productoAEliminarId = tr
        ? tr.getAttribute("data-id")
        : modal.dataset.idinventario;

    const nombre = tr
        ? tr.cells[0].textContent.trim()
        : modal.querySelector('[data-field="nombre_comercial"]')?.textContent.trim() || 'este producto';

    document.getElementById("eliminarProductoMensaje").textContent =
        `¿Seguro que deseas eliminar "${nombre}"?`;

    openVetModal("modalEliminarProducto");
}

function eliminarProductoConfirmado() {
    if (!productoAEliminarId) {
        console.error('No hay producto seleccionado para eliminar');
        return;
    }

    console.log('Eliminando producto ID:', productoAEliminarId);
    
    fetch(`/inventario/${productoAEliminarId}/eliminar/`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            'X-CSRFToken': getCookie('csrftoken')
        },
    })
    .then(response => {
        console.log('Response status:', response.status);
        return response.json();
    })
    .then(data => {
        console.log('Response data:', data);
        
        if (data.success) {
            // Mostrar mensaje de éxito
            alert(data.message || 'Producto eliminado exitosamente');
            
            // Cerrar modal
            closeEliminarProductoModal();
            
            // Recargar página para actualizar la tabla
            location.reload();
        } else {
            // Mostrar error específico
            alert('Error: ' + (data.error || 'No se pudo eliminar el producto'));
            closeEliminarProductoModal();
        }
    })
    .catch(error => {
        console.error('Error en la petición:', error);
        alert('Error de conexión al intentar eliminar el producto');
        closeEliminarProductoModal();
    });
}

/* ============================================================
   MODIFICAR STOCK
============================================================ */
let stockActualTemp = 0;
let stockOriginal = 0;
let productoIdStock = null;

function openModificarStockModal(btn) {
    // Buscar el TR de manera más robusta
    let tr = btn.closest("tr");
    
    if (!tr) {
        const manageWheel = btn.closest('.manage-wheel');
        if (manageWheel) {
            tr = manageWheel.closest('tr');
        }
    }
    
    if (!tr) {
        const allRows = document.querySelectorAll('tbody tr[data-id]');
        for (const row of allRows) {
            if (row.contains(btn) || row.querySelector('.manage-wheel') === btn.closest('.manage-wheel')) {
                tr = row;
                break;
            }
        }
    }
    
    if (!tr) {
        console.error('❌ No se encontró la fila para modificar stock');
        console.error('❌ Este error no debería ocurrir. Verifica gestion_wheel.js');
        return;
    }

    productoIdStock = tr.getAttribute("data-id");
    stockActualTemp = parseInt(tr.cells[3].textContent.replace(/\D/g, "")) || 0;
    stockOriginal = stockActualTemp;

    document.getElementById("stockActualValor").textContent = stockActualTemp;
    document.getElementById("inputStockOperacion").value = "";

    openVetModal("modalModificarStock");
}

// Sumar la cantidad ingresada al stock temporal
function sumarStockInput() {
    const input = document.getElementById("inputStockOperacion");
    let cantidad = parseInt(input.value, 10) || 0;
    stockActualTemp += cantidad;
    document.getElementById("stockActualValor").textContent = stockActualTemp;
    input.value = "";
}

// Restar la cantidad ingresada al stock temporal
function restarStockInput() {
    const input = document.getElementById("inputStockOperacion");
    let cantidad = parseInt(input.value, 10) || 0;
    stockActualTemp -= cantidad;
    if (stockActualTemp < 0) stockActualTemp = 0;
    document.getElementById("stockActualValor").textContent = stockActualTemp;
    input.value = "";
}

// ⭐ GUARDAR STOCK (CORREGIDO)
function guardarStock() {
    if (!productoIdStock) return;

    // ⭐ URL CORREGIDA
    fetch(`/inventario/${productoIdStock}/modificar-stock/`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({ stock_actual: stockActualTemp }),
    })
    .then(response => response.json())
    .then(result => {
        if (result.success) {
            console.log('📦 Stock actualizado:', result.debug);
            
            if (result.debug) {
                if (result.debug.tipo_movimiento_display) {
                    const tipoMovElement = document.getElementById('tipo_movimiento');
                    if (tipoMovElement) {
                        tipoMovElement.textContent = result.debug.tipo_movimiento_display;
                    }
                }
                
                if (result.debug.ultimo_movimiento) {
                    const fechaMovElement = document.getElementById('ultimo_movimiento');
                    if (fechaMovElement) {
                        fechaMovElement.textContent = result.debug.ultimo_movimiento;
                    }
                }
                
                if (result.debug.usuario) {
                    const usuarioElement = document.getElementById('usuario_ultimo_movimiento');
                    if (usuarioElement) {
                        usuarioElement.textContent = result.debug.usuario;
                    }
                }

                if (result.debug.tipo_movimiento_display) {
                    const tableCells = document.querySelectorAll('.tipo-movimiento-cell');
                    tableCells.forEach(cell => {
                        if (cell.dataset.id === productoIdStock) {
                            cell.textContent = result.debug.tipo_movimiento_display;
                        }
                    });
                }
            }
            
            alert(result.message);
            closeVetModal('modalModificarStock');
            location.reload();
        } else {
            alert('Error: ' + result.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al actualizar el stock');
    });
}

/* ============================================================
   CERRAR MODAL ELIMINAR PRODUCTO
============================================================ */
function closeEliminarProductoModal() {
    closeVetModal('modalEliminarProducto');
}

/* ============================================================
   FUNCIÓN PARA OBTENER CSRF TOKEN
============================================================ */
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
