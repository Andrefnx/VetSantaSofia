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
    const tr = btn.closest("tr");
    if (!tr) {
        console.error('No se encontró la fila de la tabla');
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
        
        dosis_display: data.dosis_display || "-"
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
        // Modo vista: mostrar botón editar
        if (btnEditar) btnEditar.classList.remove("d-none");
        if (btnGuardar) btnGuardar.classList.add("d-none");
    } else if (mode === "edit" || mode === "nuevo") {
        // Modo edición: mostrar botón guardar
        if (btnEditar) btnEditar.classList.add("d-none");
        if (btnGuardar) btnGuardar.classList.remove("d-none");
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
function guardarProducto() {
    const modal = document.getElementById('modalProducto');
    const currentProductId = modal.dataset.idinventario;
    
    console.log('💾 Intentando guardar producto ID:', currentProductId);
    
    // Función para obtener datos
    const getData = (field) => {
        let element = modal.querySelector(`input[data-field="${field}"], select[data-field="${field}"], textarea[data-field="${field}"]`);
        
        if (element) {
            if (element.type === 'checkbox') {
                return element.checked;
            }
            return element.value;
        }
        
        const fieldEditDiv = modal.querySelector(`.field-edit[data-field="${field}"]`);
        if (fieldEditDiv) {
            const input = fieldEditDiv.querySelector('input, select, textarea');
            if (input) {
                if (input.type === 'checkbox') {
                    return input.checked;
                }
                return input.value;
            }
        }
        
        return '';
    };
    
    const data = {
        nombre_comercial: getData('nombre_comercial'),
        marca: getData('marca'),
        sku: getData('sku'),
        tipo: getData('tipo'),
        formato: getData('formato'),
        descripcion: getData('descripcion'),
        especie: getData('especie'),
        precio_venta: getData('precio_venta'),
        stock_actual: getData('stock_actual'),
        
        // Dosis líquidos
        dosis_ml: getData('dosis_ml') || null,
        ml_contenedor: getData('ml_contenedor') || null,
        
        // Dosis pastillas
        cantidad_pastillas: getData('cantidad_pastillas') || null,
        
        // Dosis pipetas
        unidades_pipeta: getData('unidades_pipeta') || null,
        
        // Peso
        peso_kg: getData('peso_kg') || null,
        tiene_rango_peso: getData('tiene_rango_peso'),
        peso_min_kg: getData('peso_min_kg') || null,
        peso_max_kg: getData('peso_max_kg') || null,
        
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
    
    // ⭐ Validar dosis según formato
    if (data.formato && typeof validarDatosDosis === 'function') {
        const validacion = validarDatosDosis(data.formato, data);
        if (!validacion.valido) {
            alert('Errores en la dosis:\n' + validacion.errores.join('\n'));
            return;
        }
    }

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
        console.log('📊 Resultado completo:', result);
        
        if (result.success) {
            alert(result.message);
            
            if (currentProductId) {
                // Actualizar datos en el modal
                const updatedData = {
                    ...data,
                    idInventario: currentProductId
                };
                
                if (result.debug) {
                    updatedData.ultimo_ingreso_formatted = result.debug.ultimo_ingreso;
                    updatedData.ultimo_movimiento_formatted = result.debug.ultimo_movimiento;
                    updatedData.tipo_ultimo_movimiento_display = result.debug.tipo_movimiento_display;
                    updatedData.usuario_ultimo_movimiento = result.debug.usuario;
                    updatedData.dosis_display = result.debug.dosis_display;
                }
                
                modal.dataset.originalData = JSON.stringify(updatedData);
                
                // Actualizar campos de vista
                Object.keys(updatedData).forEach(key => {
                    const value = updatedData[key];
                    
                    if (!['dosis_ml', 'peso_kg', 'ml_contenedor', 'cantidad_pastillas', 
                          'unidades_pipeta', 'peso_min_kg', 'peso_max_kg', 'tiene_rango_peso'].includes(key)) {
                        const viewEl = modal.querySelector(`.field-view[data-field="${key}"]`);
                        if (viewEl && !viewEl.classList.contains('field-readonly')) {
                            viewEl.textContent = value || "-";
                        }
                    }
                });
                
                // Actualizar dosis display
                const dosisFormulaView = modal.querySelector('[data-field="dosis_formula_view"]');
                if (dosisFormulaView && updatedData.dosis_display) {
                    dosisFormulaView.textContent = updatedData.dosis_display;
                }
                
                // Actualizar metadata
                if (result.debug) {
                    const metadataFields = {
                        'ultimo_ingreso_formatted': result.debug.ultimo_ingreso,
                        'ultimo_movimiento_formatted': result.debug.ultimo_movimiento,
                        'tipo_ultimo_movimiento_display': result.debug.tipo_movimiento_display,
                        'usuario_ultimo_movimiento': result.debug.usuario
                    };
                    
                    Object.entries(metadataFields).forEach(([key, value]) => {
                        const el = modal.querySelector(`.field-readonly[data-field="${key}"]`);
                        if (el) {
                            el.textContent = value || '-';
                        }
                    });
                }
                
                // Cambiar a modo vista
                switchToViewModeProducto();
                
                // Actualizar tabla
                actualizarFilaTabla(currentProductId, updatedData);
                
            } else {
                location.reload();
            }
            
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
