/* ============================================================
   CREAR PRODUCTO
============================================================ */
function abrirModalNuevoProducto() {
    const data = {
        nombre_comercial: "",
        categoria: "",
        sku: "",  // ⭐ AGREGAR
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
        dosis_ml: "",
        peso_kg: "",
    };

    openProductoModal("nuevo", data);
}

/* ============================================================
   FUNCIÓN AUXILIAR PARA NORMALIZAR NÚMEROS
============================================================ */
function normalizarNumero(valor) {
    if (!valor && valor !== 0) return '';
    // Convierte comas a puntos y asegura formato decimal válido
    return valor.toString().replace(',', '.');
}

function parseNumeroSeguro(valor) {
    if (!valor && valor !== 0) return '';
    const normalizado = valor.toString().replace(',', '.');
    const numero = parseFloat(normalizado);
    return isNaN(numero) ? '' : numero;
}

/* ============================================================
   VER / EDITAR PRODUCTO (CORREGIDO)
============================================================ */
function abrirModalProducto(btn, mode) {
    const tr = btn.closest("tr");
    if (!tr) return;

    const idInventario = tr.getAttribute("data-id");

    // Hacer petición para obtener todos los datos del producto
    fetch(`/hospital/inventario/detalle/${idInventario}/`)
        .then(response => response.json())
        .then(resp => {
            if (resp.success) {
                openProductoModal(mode, resp.insumo);
            } else {
                alert("Error al cargar datos: " + (resp.error || "Error desconocido"));
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error al cargar el producto");
        });
}

/* ============================================================
   ABRIR MODAL PRINCIPAL (CORREGIDO)
============================================================ */
function openProductoModal(mode, data = {}) {
    const modalId = 'modalProducto';
    const modal = document.getElementById(modalId);
    
    if (!modal) {
        console.error('Modal no encontrado:', modalId);
        return;
    }
    
    // --- Dosis vista ---
    const dosisView = modal.querySelector('[data-field="dosis_formula_view"]');
    if (dosisView) {
        dosisView.textContent =
            data.dosis_ml && data.peso_kg
                ? `${data.dosis_ml} ml cada ${data.peso_kg} kg`
                : "-";
    }

    // --- ML Contenedor vista ---
    const mlContenedorView = modal.querySelector('.field-view[data-field="ml_contenedor"]');
    if (mlContenedorView) {
        mlContenedorView.textContent =
            data.ml_contenedor != null ? data.ml_contenedor + " ml" : "-";
    }

    // --- Guardar datos originales ---
    if (mode === "edit") {
        window.productoDatosOriginales = { ...data };
    }

    // --- Título del modal ---
    const titulo = document.getElementById("modalProductoTitulo");
    if (titulo) {
        titulo.textContent =
            mode === "edit"
                ? "Editar Producto"
                : mode === "nuevo"
                    ? "Nuevo Producto"
                    : "Detalles del Producto";
    }

    // --- Botones ---
    const btnGuardar = document.getElementById("btnGuardarProductoModal");
    const btnEditar = document.getElementById("btnEditarProducto");
    const btnEliminar = document.getElementById("btnEliminarProducto");
    
    if (btnGuardar) btnGuardar.classList.toggle("d-none", mode === "view");
    if (btnEditar) btnEditar.classList.toggle("d-none", mode !== "view");
    if (btnEliminar) btnEliminar.classList.toggle("d-none", mode === "nuevo");

    // --- Mostrar / ocultar campos (sin afectar field-readonly) ---
    modal.querySelectorAll(".field-view").forEach((f) => {
        // No ocultar si tiene la clase field-readonly
        if (!f.classList.contains('field-readonly')) {
            f.classList.toggle("d-none", mode !== "view");
        }
    });

    modal.querySelectorAll(".field-edit").forEach((f) => {
        f.classList.toggle("d-none", mode === "view");
    });

    // --- Rellenar campos ---
    Object.keys(data).forEach((key) => {
        // Para los elementos de vista
        modal.querySelectorAll(`.field-view[data-field="${key}"]`).forEach((el) => {
            if (key === "ml_contenedor") {
                el.textContent = data[key] != null ? data[key] + " ml" : "-";
            } else {
                el.textContent = (data[key] !== null && data[key] !== undefined) ? data[key] : "(sin registro)";
            }
        });

        // Para los elementos de edición
        modal.querySelectorAll(`.field-edit[data-field="${key}"]`).forEach((el) => {
            // Para ml_contenedor, dosis_ml, peso_kg
            if (key === "ml_contenedor" || key === "dosis_ml" || key === "peso_kg") {
                el.value = data[key] != null ? data[key] : "";
            }
            // Otros campos numéricos
            else if (['precio_venta', 'stock_actual'].includes(key)) {
                el.value = normalizarNumero(data[key] ?? "");
            }
            // Select
            else if (el.tagName === 'SELECT') {
                el.value = data[key] ?? "";
            }
            // Textarea
            else if (el.tagName === 'TEXTAREA') {
                el.value = data[key] ?? "";
            }
            // Input text
            else {
                el.value = data[key] ?? "";
            }
        });
    });
    
    // ⭐ RELLENAR campos de solo lectura (field-readonly)
    const camposSoloLectura = [
        'fecha_creacion_formatted',
        'ultimo_ingreso_formatted',
        'ultimo_movimiento_formatted',
        'tipo_ultimo_movimiento_display',
        'usuario_ultimo_movimiento'
    ];
    
    camposSoloLectura.forEach(key => {
        modal.querySelectorAll(`[data-field="${key}"]`).forEach((el) => {
            el.textContent = (data[key] !== null && data[key] !== undefined && data[key] !== '') ? data[key] : "-";
        });
    });

    // --- Guardar ID ---
    if (data.idInventario) {
        modal.dataset.idinventario = data.idInventario;
    } else {
        delete modal.dataset.idinventario;
    }

    // ⭐ MOSTRAR MODAL CORRECTAMENTE
    openVetModal(modalId);
}

/* ============================================================
   CAMBIAR A MODO EDICIÓN
============================================================ */
function switchToEditModeProducto() {
    const modal = document.getElementById('modalProducto'); // ⭐ CORREGIDO
    const data = getProductoModalData();

    // Asegurar que se preserve el ID
    if (modal.dataset.idinventario) {
        data.idInventario = modal.dataset.idinventario;
    }

    openProductoModal("edit", data);
}

/* ============================================================
   GENERAR LOG DE DATOS DEL PRODUCTO
============================================================ */
function generarLogProducto() {
    const modal = document.getElementById('modalProducto');
    
    // Obtener todos los valores priorizando elementos visibles O de solo lectura
    const obtenerValor = (field) => {
        // Buscar todos los elementos con este data-field
        const elementos = modal.querySelectorAll(`[data-field="${field}"]`);
        
        if (elementos.length === 0) {
            console.warn(`⚠️ Campo no encontrado: ${field}`);
            return '(no encontrado)';
        }
        
        // Campos de solo lectura (fechas, movimientos) - tomar el primero aunque esté oculto
        const camposSoloLectura = [
            'fecha_creacion_formatted',
            'ultimo_ingreso_formatted', 
            'ultimo_movimiento_formatted',
            'tipo_ultimo_movimiento_display',
            'usuario_ultimo_movimiento',
            'dosis_formula_view'
        ];
        
        let elementoSeleccionado = null;
        
        if (camposSoloLectura.includes(field)) {
            // Para campos de solo lectura, tomar el primero (campo de vista)
            elementoSeleccionado = elementos[0];
        } else {
            // Para campos editables, priorizar el visible
            elementos.forEach(el => {
                if (!el.classList.contains('d-none')) {
                    elementoSeleccionado = el;
                }
            });
            elementoSeleccionado = elementoSeleccionado || elementos[0];
        }
        
        let valor;
        
        // Si es un SELECT en modo edición
        if (elementoSeleccionado.tagName === 'SELECT' && !elementoSeleccionado.classList.contains('d-none')) {
            const selectedOption = elementoSeleccionado.options[elementoSeleccionado.selectedIndex];
            valor = selectedOption ? selectedOption.text.trim() : elementoSeleccionado.value;
        }
        // Si es un INPUT o TEXTAREA en modo edición
        else if ((elementoSeleccionado.tagName === 'INPUT' || elementoSeleccionado.tagName === 'TEXTAREA') && 
                 !elementoSeleccionado.classList.contains('d-none')) {
            valor = elementoSeleccionado.value || '';
        }
        // Si es elemento de vista (span, div, etc.)
        else {
            valor = elementoSeleccionado.textContent || '';
        }
        
        // Limpiar y validar
        valor = valor ? valor.trim() : '';
        
        // Filtrar valores que deben considerarse como vacíos
        const valoresVacios = ['', '-', 'Selecciona...', 'selecciona...', '(vacío)', null, undefined];
        
        // Verificar si el valor está en la lista de valores vacíos
        if (valoresVacios.includes(valor) || !valor) {
            return '(sin registro)';
        }
        
        return valor;
    };

    // DEBUG: Listar todos los elementos con data-field y su visibilidad
    console.log("🔍 DEBUG: Elementos encontrados en el modal:");
    modal.querySelectorAll('[data-field]').forEach(el => {
        const visible = !el.classList.contains('d-none');
        const valor = (el.textContent || el.value || '').trim();
        console.log(`  - data-field="${el.dataset.field}" [${visible ? 'VISIBLE' : 'OCULTO'}]: "${valor.substring(0, 50)}"`);
    });

    // Construir el log
    const log = `
═══════════════════════════════════════════════════════════
              RESUMEN COMPLETO DEL PRODUCTO
═══════════════════════════════════════════════════════════

1. IDENTIFICACIÓN GENERAL
   ─────────────────────────────────────────────────────────
   Nombre Comercial: ${obtenerValor('nombre_comercial')}
   SKU: ${obtenerValor('sku')}  // ⭐ AGREGAR
   Tipo: ${obtenerValor('tipo')}
   Descripción: ${obtenerValor('descripcion')}
   Especie: ${obtenerValor('especie')}

2. INFORMACIÓN COMERCIAL
   ─────────────────────────────────────────────────────────
   Precio Venta: $${obtenerValor('precio_venta')}

3. INVENTARIO
   ─────────────────────────────────────────────────────────
   Stock Actual: ${obtenerValor('stock_actual')}
   Fecha de Registro: ${obtenerValor('fecha_creacion_formatted')}
   Último Ingreso: ${obtenerValor('ultimo_ingreso_formatted')}
   Último Movimiento: ${obtenerValor('ultimo_movimiento_formatted')}
   Tipo de Movimiento: ${obtenerValor('tipo_ultimo_movimiento_display')}
   Modificado por: ${obtenerValor('usuario_ultimo_movimiento')}

4. DOSIS
   ─────────────────────────────────────────────────────────
   Dosis Recomendada: ${obtenerValor('dosis_formula_view')}
   Dosis: ${obtenerValor('dosis_ml')} ml
   Frecuencia por peso: cada ${obtenerValor('peso_kg')} kg
   ML en contenedor: ${obtenerValor('ml_contenedor')} ml

5. PRECAUCIONES Y OTROS
   ─────────────────────────────────────────────────────────
   Precauciones: ${obtenerValor('precauciones')}
   Contraindicaciones: ${obtenerValor('contraindicaciones')}
   Efectos Adversos: ${obtenerValor('efectos_adversos')}

═══════════════════════════════════════════════════════════
`;

    console.log(log);
    return log;
}

/* ============================================================
   GUARDAR PRODUCTO (MODIFICADO - CON LOG)
============================================================ */
function guardarProductoEditado() {
    const modal = document.getElementById("modalProducto");
    const inputs = modal.querySelectorAll(".field-edit");

    const updated = {};

    // --- Recoger campos ---
    inputs.forEach((input) => {
        if (input.dataset.field) {
            const field = input.dataset.field;
            
            // ⚠️ SKIP dosis_ml, peso_kg y ml_contenedor aquí porque los manejamos después
            if (['dosis_ml', 'peso_kg', 'ml_contenedor'].includes(field)) {
                return;
            }
            
            let value;

            // Para textarea y select
            if (input.tagName === 'TEXTAREA' || input.tagName === 'SELECT') {
                value = input.value.trim();
            } else {
                value = input.value.trim();
            }

            // Normalizar campos numéricos
            if (['precio_venta', 'stock_actual'].includes(field)) {
                updated[field] = normalizarNumero(value);
            } else {
                updated[field] = value;  // ⭐ Esto incluirá SKU automáticamente
            }
        }
    });

    // --- Dosis y ML Contenedor (CORREGIDO CON DEBUG) ---
    console.log("\n🔍 DEBUG: Buscando campos de dosis y ml_contenedor...");
    
    // Intentar con varios selectores posibles
    let dosisMlInput = modal.querySelector('.field-edit[data-field="dosis_ml"]');
    if (!dosisMlInput) {
        dosisMlInput = modal.querySelector('input[data-field="dosis_ml"]');
    }
    if (!dosisMlInput) {
        dosisMlInput = modal.querySelector('[data-field="dosis_ml"]');
    }
    console.log("  - Input dosis_ml encontrado:", dosisMlInput);
    console.log("  - Valor:", dosisMlInput ? dosisMlInput.value : "NO ENCONTRADO");
    console.log("  - Es visible:", dosisMlInput ? !dosisMlInput.classList.contains('d-none') : "N/A");

    let pesoKgInput = modal.querySelector('.field-edit[data-field="peso_kg"]');
    if (!pesoKgInput) {
        pesoKgInput = modal.querySelector('input[data-field="peso_kg"]');
    }
    if (!pesoKgInput) {
        pesoKgInput = modal.querySelector('[data-field="peso_kg"]');
    }
    console.log("  - Input peso_kg encontrado:", pesoKgInput);
    console.log("  - Valor:", pesoKgInput ? pesoKgInput.value : "NO ENCONTRADO");
    console.log("  - Es visible:", pesoKgInput ? !pesoKgInput.classList.contains('d-none') : "N/A");

    let mlContenedorInput = modal.querySelector('.field-edit[data-field="ml_contenedor"]');
    if (!mlContenedorInput) {
        mlContenedorInput = modal.querySelector('input[data-field="ml_contenedor"]');
    }
    if (!mlContenedorInput) {
        mlContenedorInput = modal.querySelector('[data-field="ml_contenedor"]');
    }
    console.log("  - Input ml_contenedor encontrado:", mlContenedorInput);
    console.log("  - Valor:", mlContenedorInput ? mlContenedorInput.value : "NO ENCONTRADO");
    console.log("  - Es visible:", mlContenedorInput ? !mlContenedorInput.classList.contains('d-none') : "N/A");

    // ⭐ CORREGIDO: Verificar que el input existe, está visible Y tiene valor
    if (dosisMlInput && !dosisMlInput.classList.contains('d-none') && dosisMlInput.value && dosisMlInput.value.trim() !== '') {
        updated.dosis_ml = normalizarNumero(dosisMlInput.value);
        console.log('✅ dosis_ml capturado:', updated.dosis_ml);
    } else {
        updated.dosis_ml = null;
        console.log('⚠️ dosis_ml vacío o no visible');
    }

    if (pesoKgInput && !pesoKgInput.classList.contains('d-none') && pesoKgInput.value && pesoKgInput.value.trim() !== '') {
        updated.peso_kg = normalizarNumero(pesoKgInput.value);
        console.log('✅ peso_kg capturado:', updated.peso_kg);
    } else {
        updated.peso_kg = null;
        console.log('⚠️ peso_kg vacío o no visible');
    }

    if (mlContenedorInput && !mlContenedorInput.classList.contains('d-none') && mlContenedorInput.value && mlContenedorInput.value.trim() !== '') {
        updated.ml_contenedor = normalizarNumero(mlContenedorInput.value);
        console.log('✅ ml_contenedor capturado:', updated.ml_contenedor);
    } else {
        updated.ml_contenedor = null;
        console.log('⚠️ ml_contenedor vacío o no visible');
    }

    // --- ID ---
    if (modal.dataset.idinventario) {
        updated.idInventario = modal.dataset.idinventario;
    }

    // --- Asegurar campo medicamento ---
    if (updated.nombre_comercial && !updated.medicamento) {
        updated.medicamento = updated.nombre_comercial;
    }

    // --- Validación ---
    if (!updated.nombre_comercial || !updated.especie) {
        alert("Debes completar Nombre Comercial y Especie.");
        return;
    }

    // *** GENERAR LOG ANTES DE GUARDAR ***
    console.log("═══════════════════════════════════════════════════════════");
    console.log("         🔍 LOG DE EDICIÓN DE PRODUCTO");
    console.log("═══════════════════════════════════════════════════════════");
    const logCompleto = generarLogProducto();
    console.log("\n📦 Datos que se enviarán al servidor:");
    console.log(JSON.stringify(updated, null, 2));
    console.log("═══════════════════════════════════════════════════════════\n");

    // --- Rutas ---
    const url = updated.idInventario
        ? `/hospital/inventario/editar/${updated.idInventario}/`
        : `/hospital/inventario/crear/`;

    fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
    })
        .then((r) => r.json())
        .then((resp) => {
            if (resp.success) {
                console.log("✅ Producto guardado exitosamente");
                
                // Debug de respuesta del servidor
                if (resp.debug) {
                    console.log("🔍 Datos guardados en el servidor:");
                    console.log("  - dosis_ml:", resp.debug.dosis_ml);
                    console.log("  - peso_kg:", resp.debug.peso_kg);
                    console.log("  - ml_contenedor:", resp.debug.ml_contenedor);
                    console.log("  - usuario:", resp.debug.usuario);
                }

                // Esperar 2 segundos para revisar el log antes de recargar
                setTimeout(() => {
                    closeVetModal("modalProducto");
                    location.reload();
                }, 2000);

            } else {
                console.error("❌ Error al guardar:", resp.error);
                alert("Error al guardar: " + (resp.error || "Error desconocido"));
            }
        })
        .catch(error => {
            console.error("❌ Error de red:", error);
            alert("Error al guardar el producto");
        });
}

/* ============================================================
   OBTENER DATOS DEL MODAL
============================================================ */
function getProductoModalData() {
    const modal = document.getElementById('modalProducto');
    
    // Función mejorada para obtener valor de campo visible
    const getVisibleValue = (fieldName) => {
        const elementos = modal.querySelectorAll(`[data-field="${fieldName}"]`);
        
        for (let elem of elementos) {
            // Verificar si el elemento es visible
            const isVisible = elem.offsetParent !== null;
            
            // Obtener el valor según el tipo de elemento
            let value = '';
            if (elem.tagName === 'INPUT' || elem.tagName === 'TEXTAREA' || elem.tagName === 'SELECT') {
                value = elem.value;
            } else {
                value = elem.textContent.trim();
            }
            
            // Si es visible y tiene valor, retornarlo
            if (isVisible && value !== '' && value !== '-') {
                return value;
            }
        }
        
        return '';
    };
    
    // ⭐ NUEVA: Función para obtener valor de campos de solo lectura (siempre del primer elemento)
    const getReadonlyValue = (fieldName) => {
        const elem = modal.querySelector(`[data-field="${fieldName}"]`);
        if (!elem) return '';
        
        const value = elem.textContent.trim();
        return (value && value !== '-') ? value : '';
    };
    
    // Función para obtener valor numérico limpio
    const getNumericValue = (fieldName) => {
        const valor = getVisibleValue(fieldName);
        if (!valor || valor === '' || valor === '-') return '';
        // Limpiar el valor pero mantener puntos decimales
        return valor.toString().replace(/[^\d.]/g, '');
    };

    const data = {
        nombre_comercial: getVisibleValue('nombre_comercial'),
        sku: getVisibleValue('sku'),
        tipo: getVisibleValue('tipo'),
        descripcion: getVisibleValue('descripcion'),
        especie: getVisibleValue('especie'),
        precio_venta: getNumericValue('precio_venta'),
        stock_actual: getNumericValue('stock_actual'),
        dosis_ml: getNumericValue('dosis_ml'),
        peso_kg: getNumericValue('peso_kg'),
        ml_contenedor: getNumericValue('ml_contenedor'),
        precauciones: getVisibleValue('precauciones'),
        contraindicaciones: getVisibleValue('contraindicaciones'),
        efectos_adversos: getVisibleValue('efectos_adversos'),
        
        // ⭐ AGREGAR: Campos de solo lectura (fechas y trazabilidad)
        fecha_creacion_formatted: getReadonlyValue('fecha_creacion_formatted'),
        ultimo_ingreso_formatted: getReadonlyValue('ultimo_ingreso_formatted'),
        ultimo_movimiento_formatted: getReadonlyValue('ultimo_movimiento_formatted'),
        tipo_ultimo_movimiento_display: getReadonlyValue('tipo_ultimo_movimiento_display'),
        usuario_ultimo_movimiento: getReadonlyValue('usuario_ultimo_movimiento'),
    };
    
    // ⭐ AGREGAR: Preservar el ID del inventario si existe
    if (modal.dataset.idinventario) {
        data.idInventario = modal.dataset.idinventario;
    }
    
    return data;
}

/* ============================================================
   LEER DOSIS (MODIFICADO)
============================================================ */
function leerDosisDesdeModal() {
    const modal = document.getElementById("modalProducto");

    return {
        dosis_ml: normalizarNumero(modal.querySelector('[data-field="dosis_ml"]')?.value || ""),
        peso_kg: normalizarNumero(modal.querySelector('[data-field="peso_kg"]')?.value || ""),
    };
}

/* ============================================================
   ELIMINAR PRODUCTO
============================================================ */
let productoAEliminarId = null;

function abrirModalEliminarProducto(btn) {
    const tr = btn.closest("tr");
    const modal = document.getElementById("modalProducto");

    productoAEliminarId = tr
        ? tr.getAttribute("data-id")
        : modal.dataset.idinventario;

    const nombre = tr
        ? tr.cells[0].textContent.trim()
        : modal.querySelector('[data-field="nombre_comercial"]').textContent.trim();

    document.getElementById("eliminarProductoMensaje").textContent =
        `¿Seguro que deseas eliminar "${nombre}"?`;

    openVetModal("modalEliminarProducto");
}

function eliminarProductoConfirmado() {
    if (!productoAEliminarId) return;

    fetch(`/hospital/inventario/eliminar/${productoAEliminarId}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
    })
        .then((r) => r.json())
        .then((resp) => {
            if (resp.success) location.reload();
        });
}

/* ============================================================
   MODIFICAR STOCK
============================================================ */
let stockActualTemp = 0;
let stockOriginal = 0;
let productoIdStock = null;

function openModificarStockModal(btn) {
    let tr = btn.closest("tr");
    if (!tr) return;

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

// Guardar el nuevo stock en el backend
function guardarStock() {
    if (!productoIdStock) return;

    fetch(`/hospital/inventario/modificar_stock/${productoIdStock}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_actual: stockActualTemp }),
    })
        .then((r) => r.json())
        .then((resp) => {
            if (resp.success) location.reload();
        });
}

/* ============================================================
   CERRAR MODAL ELIMINAR PRODUCTO (AGREGAR FUNCIÓN FALTANTE)
============================================================ */
function closeEliminarProductoModal() {
    closeVetModal('modalEliminarProducto');
}
