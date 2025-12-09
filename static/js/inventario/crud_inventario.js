/* ============================================================
   CREAR PRODUCTO
============================================================ */
function abrirModalNuevoProducto() {
    const data = {
        nombre_comercial: "",
        categoria: "",
        sku: "",
        tipo: "",
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
        ml_contenedor: "",
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
   VER / EDITAR PRODUCTO (CORREGIDO)
============================================================ */
function abrirModalProducto(btn, mode) {
    const tr = btn.closest("tr");
    if (!tr) {
        console.error('No se encontró la fila de la tabla');
        return;
    }

    const idInventario = tr.getAttribute("data-id");
    console.log('📦 Cargando producto ID:', idInventario);

    // ⭐ URL CORREGIDA
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
            
            // ⭐ La API devuelve {success: true, insumo: {...}}
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
   ABRIR MODAL PRINCIPAL (CORREGIDO)
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
    
    // ⭐ MAPEO CORRECTO: ahora 'data' ya es el objeto 'insumo'
    const mappedData = {
        idInventario: data.idInventario,
        nombre_comercial: data.medicamento || data.nombre_comercial || "",
        sku: data.sku || "",
        tipo: data.tipo || "",
        descripcion: data.descripcion || "",
        especie: data.especie || "",
        precio_venta: data.precio_venta || "",
        stock_actual: data.stock_actual || 0,
        dosis_ml: data.dosis_ml || "",
        peso_kg: data.peso_kg || "",
        ml_contenedor: data.ml_contenedor || "",
        precauciones: data.precauciones || "",
        contraindicaciones: data.contraindicaciones || "",
        efectos_adversos: data.efectos_adversos || "",
        fecha_creacion_formatted: data.fecha_creacion_formatted || "",
        ultimo_ingreso_formatted: data.ultimo_ingreso_formatted || "",
        ultimo_movimiento_formatted: data.ultimo_movimiento_formatted || "",
        tipo_ultimo_movimiento_display: data.tipo_ultimo_movimiento_display || "",
        usuario_ultimo_movimiento: data.usuario_ultimo_movimiento || ""
    };
    
    console.log('🗺️ Datos mapeados:', mappedData);
    
    // ⭐ CAMPOS DE VISTA ESPECIALES PARA DOSIS
    // Dosis fórmula (combinada)
    const dosisFormulaView = modal.querySelector('[data-field="dosis_formula_view"]');
    if (dosisFormulaView) {
        if (mappedData.dosis_ml && mappedData.peso_kg) {
            dosisFormulaView.textContent = `${mappedData.dosis_ml} ml cada ${mappedData.peso_kg} kg`;
            console.log('✅ dosis_formula_view:', `${mappedData.dosis_ml} ml cada ${mappedData.peso_kg} kg`);
        } else {
            dosisFormulaView.textContent = "-";
            console.log('⚠️ dosis_formula_view: -');
        }
    }

    // ML Contenedor vista
    const mlContenedorView = modal.querySelector('[data-field="ml_contenedor_view"]');
    if (mlContenedorView) {
        if (mappedData.ml_contenedor) {
            mlContenedorView.textContent = `${mappedData.ml_contenedor} ml`;
            console.log('✅ ml_contenedor_view:', `${mappedData.ml_contenedor} ml`);
        } else {
            mlContenedorView.textContent = "-";
            console.log('⚠️ ml_contenedor_view: -');
        }
    }

    if (mode === "edit" || mode === "view") {
        modal.dataset.originalData = JSON.stringify(mappedData);
    }

    const titulo = document.getElementById("modalProductoTitulo");
    if (titulo) {
        titulo.textContent = mode === "nuevo" ? "Nuevo Producto" : mode === "edit" ? "Editar Producto" : "Detalles del Producto";
    }

    const btnGuardar = document.getElementById("btnGuardarProductoModal");
    const btnEditar = document.getElementById("btnEditarProducto");
    const btnEliminar = document.getElementById("btnEliminarProducto");
    
    if (btnGuardar) btnGuardar.classList.toggle("d-none", mode === "view");
    if (btnEditar) btnEditar.classList.toggle("d-none", mode !== "view");
    if (btnEliminar) btnEliminar.classList.toggle("d-none", mode === "nuevo");

    modal.querySelectorAll(".field-view").forEach((f) => {
        if (!f.classList.contains('field-readonly')) {
            f.classList.toggle("d-none", mode === "edit" || mode === "nuevo");
        }
    });

    modal.querySelectorAll(".field-edit").forEach((f) => {
        f.classList.toggle("d-none", mode === "view");
    });

    // Rellenar todos los campos normales
    Object.keys(mappedData).forEach((key) => {
        const value = mappedData[key];
        
        // Campos de vista (no readonly y no los especiales)
        if (key !== 'dosis_ml' && key !== 'peso_kg' && key !== 'ml_contenedor') {
            const viewEl = modal.querySelector(`.field-view[data-field="${key}"]`);
            if (viewEl && !viewEl.classList.contains('field-readonly')) {
                viewEl.textContent = value || "-";
                console.log(`✅ Vista ${key}:`, value);
            }
        }

        // Campos editables
        const editEl = modal.querySelector(`.field-edit[data-field="${key}"], .field-edit [data-field="${key}"]`);
        if (editEl) {
            if (editEl.tagName === "SELECT") {
                editEl.value = value || "";
            } else {
                editEl.value = value || "";
            }
            console.log(`✅ Edit ${key}:`, value);
        }
    });
    
    // ⭐ ASEGURAR INPUTS DE DOSIS (en los inputs de edición)
    const dosisMlInput = modal.querySelector('input[data-field="dosis_ml"]');
    const pesoKgInput = modal.querySelector('input[data-field="peso_kg"]');
    const mlContenedorInput = modal.querySelector('input[data-field="ml_contenedor"]');
    
    if (dosisMlInput) {
        dosisMlInput.value = mappedData.dosis_ml || "";
        console.log("✅ dosis_ml input:", dosisMlInput.value);
    }
    if (pesoKgInput) {
        pesoKgInput.value = mappedData.peso_kg || "";
        console.log("✅ peso_kg input:", pesoKgInput.value);
    }
    if (mlContenedorInput) {
        mlContenedorInput.value = mappedData.ml_contenedor || "";
        console.log("✅ ml_contenedor input:", mlContenedorInput.value);
    }
    
    // ⭐ Campos de solo lectura (metadata)
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
            console.log(`✅ Readonly ${key}:`, mappedData[key]);
        }
    });

    if (mappedData.idInventario) {
        modal.dataset.idinventario = mappedData.idInventario;
        console.log("✅ ID guardado en modal:", mappedData.idInventario);
    } else {
        delete modal.dataset.idinventario;
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

    if (data.idInventario) {
        modal.dataset.idinventario = data.idInventario;
    }

    // Ocultar campos de vista (excepto readonly)
    modal.querySelectorAll(".field-view").forEach((f) => {
        if (!f.classList.contains('field-readonly')) {
            f.classList.add("d-none");
        }
    });

    // Mostrar campos de edición
    modal.querySelectorAll(".field-edit").forEach((f) => {
        f.classList.remove("d-none");
    });

    // ⭐ RELLENAR TODOS LOS CAMPOS EDITABLES
    Object.keys(data).forEach((key) => {
        const value = data[key] || '';
        
        // Buscar input/select/textarea directo
        let element = modal.querySelector(`input[data-field="${key}"], select[data-field="${key}"], textarea[data-field="${key}"]`);
        
        if (element) {
            if (element.tagName === "SELECT") {
                element.value = value;
            } else {
                element.value = value;
            }
            console.log(`✅ Rellenado ${key}:`, value);
            return;
        }
        
        // Buscar dentro de .field-edit
        const fieldEditDiv = modal.querySelector(`.field-edit[data-field="${key}"]`);
        if (fieldEditDiv) {
            const input = fieldEditDiv.querySelector('input, select, textarea');
            if (input) {
                if (input.tagName === "SELECT") {
                    input.value = value;
                } else {
                    input.value = value;
                }
                console.log(`✅ Rellenado ${key} en div:`, value);
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
    
    console.log('✅ Modo edición activado');
}

/* ============================================================
   GUARDAR PRODUCTO (CORREGIDO CON BÚSQUEDA MEJORADA)
============================================================ */
function guardarProducto() {
    const modal = document.getElementById('modalProducto');
    const currentProductId = modal.dataset.idinventario;
    
    console.log('💾 Intentando guardar producto ID:', currentProductId);
    
    // ⭐ FUNCIÓN MEJORADA PARA OBTENER DATOS
    const getData = (field) => {
        // 1. Buscar input/select/textarea directo con data-field
        let element = modal.querySelector(`input[data-field="${field}"], select[data-field="${field}"], textarea[data-field="${field}"]`);
        
        if (element) {
            console.log(`✅ Encontrado ${field}:`, element.value);
            return element.value;
        }
        
        // 2. Buscar dentro de .field-edit (para campos con input-group)
        const fieldEditDiv = modal.querySelector(`.field-edit[data-field="${field}"]`);
        if (fieldEditDiv) {
            const input = fieldEditDiv.querySelector('input, select, textarea');
            if (input) {
                console.log(`✅ Encontrado ${field} en div:`, input.value);
                return input.value;
            }
        }
        
        // 3. Buscar por ID como último recurso
        element = document.getElementById(field);
        if (element) {
            console.log(`✅ Encontrado ${field} por ID:`, element.value);
            return element.value;
        }
        
        console.log(`⚠️ No encontrado: ${field}`);
        return '';
    };
    
    const data = {
        nombre_comercial: getData('nombre_comercial'),
        sku: getData('sku'),
        tipo: getData('tipo'),
        descripcion: getData('descripcion'),
        especie: getData('especie'),
        precio_venta: getData('precio_venta'),
        stock_actual: getData('stock_actual'),
        dosis_ml: getData('dosis_ml') || null,
        peso_kg: getData('peso_kg') || null,
        ml_contenedor: getData('ml_contenedor') || null,
        precauciones: getData('precauciones'),
        contraindicaciones: getData('contraindicaciones'),
        efectos_adversos: getData('efectos_adversos')
    };
    
    console.log('📤 Datos completos a enviar:', data);

    // Validación básica
    if (!data.nombre_comercial) {
        alert('El nombre comercial es obligatorio');
        return;
    }

    // ⭐ URL CORREGIDA
    const url = currentProductId 
        ? `/inventario/${currentProductId}/editar/`
        : '/inventario/crear/';
    
    console.log('🌐 URL:', url);

    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('📡 Response status:', response.status);
        return response.json();
    })
    .then(result => {
        console.log('📊 Resultado:', result);
        
        if (result.success) {
            alert(result.message);
            location.reload();
        } else {
            alert('Error: ' + result.error);
        }
    })
    .catch(error => {
        console.error('❌ Error completo:', error);
        alert('Error al guardar el producto: ' + error.message);
    });
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

    // ⭐ URL CORREGIDA
    fetch(`/inventario/${productoAEliminarId}/eliminar/`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            'X-CSRFToken': getCookie('csrftoken')
        },
    })
        .then((r) => r.json())
        .then((resp) => {
            if (resp.success) location.reload();
            else alert('Error: ' + (resp.error || 'No se pudo eliminar'));
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al eliminar el producto');
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
