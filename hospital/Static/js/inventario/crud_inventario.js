/* ============================================================
   CREAR PRODUCTO
============================================================ */
function abrirModalNuevoProducto() {
    const data = {
        nombre_comercial: "",
        categoria: "",
        sku: "",
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
   VER / EDITAR PRODUCTO (MODIFICADO - CARGAR TODOS LOS CAMPOS)
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
   ABRIR MODAL PRINCIPAL (MODIFICADO - INCLUIR TODOS LOS CAMPOS)
============================================================ */
function openProductoModal(mode, data = {}) {
    const modal = document.getElementById("modalProducto");
    if (!modal) return;

    // --- Dosis vista ---
    const dosisView = modal.querySelector('[data-field="dosis_formula_view"]');
    if (dosisView) {
        dosisView.textContent =
            data.dosis_ml && data.peso_kg
                ? `${data.dosis_ml} ml cada ${data.peso_kg} kg`
                : "-";
    }

    // --- Guardar datos originales ---
    if (mode === "edit") {
        productoDatosOriginales = { ...data };
    }

    // --- Título del modal ---
    document.getElementById("modalProductoTitulo").textContent =
        mode === "edit"
            ? "Editar Producto"
            : mode === "nuevo"
            ? "Nuevo Producto"
            : "Detalles del Producto";

    // --- Botones ---
    document
        .getElementById("btnGuardarProductoModal")
        .classList.toggle("d-none", mode === "view");

    document
        .getElementById("btnEditarProducto")
        .classList.toggle("d-none", mode !== "view");

    document
        .getElementById("btnEliminarProducto")
        .classList.toggle("d-none", mode === "nuevo");

    // --- Mostrar / ocultar campos ---
    modal.querySelectorAll(".field-view").forEach((f) => {
        f.classList.toggle("d-none", mode !== "view");
    });

    modal.querySelectorAll(".field-edit").forEach((f) => {
        f.classList.toggle("d-none", mode === "view");
    });

    // --- Rellenar campos ---
    Object.keys(data).forEach((key) => {
        // Para los elementos de vista
        modal.querySelectorAll(`.field-view[data-field="${key}"]`).forEach((el) => {
            el.textContent = data[key] ?? "-";
        });
        
        // Para los elementos de edición
        modal.querySelectorAll(`.field-edit[data-field="${key}"]`).forEach((el) => {
            // Normalizar valores numéricos
            if (['dosis_ml', 'peso_kg', 'precio_venta', 'ml_contenedor', 'stock_actual'].includes(key)) {
                el.value = normalizarNumero(data[key] ?? "");
            } else if (el.tagName === 'SELECT') {
                el.value = data[key] ?? "";
            } else if (el.tagName === 'TEXTAREA') {
                el.value = data[key] ?? "";
            } else {
                el.value = data[key] ?? "";
            }
        });
    });

    // --- Guardar ID ---
    if (data.idInventario) modal.dataset.idinventario = data.idInventario;
    else delete modal.dataset.idinventario;

    modal.classList.add("show");
    modal.classList.remove("hide");
}

/* ============================================================
   CAMBIAR A MODO EDICIÓN
============================================================ */
function switchToEditModeProducto() {
    const modal = document.getElementById("modalProducto");
    const data = getProductoModalData();
    
    // Asegurar que se preserve el ID
    if (modal.dataset.idinventario) {
        data.idInventario = modal.dataset.idinventario;
    }
    
    openProductoModal("edit", data);
}

/* ============================================================
   GUARDAR PRODUCTO (MODIFICADO - INCLUIR TODOS LOS CAMPOS)
============================================================ */
function guardarProductoEditado() {
    const modal = document.getElementById("modalProducto");
    const inputs = modal.querySelectorAll(".field-edit");

    const updated = {};

    // --- Recoger campos ---
    inputs.forEach((input) => {
        if (input.dataset.field) {
            const field = input.dataset.field;
            let value;
            
            // Para textarea y select
            if (input.tagName === 'TEXTAREA' || input.tagName === 'SELECT') {
                value = input.value.trim();
            } else {
                value = input.value.trim();
            }
            
            // Normalizar campos numéricos
            if (['dosis_ml', 'peso_kg', 'precio_venta', 'stock_actual', 'ml_contenedor'].includes(field)) {
                updated[field] = normalizarNumero(value);
            } else {
                updated[field] = value;
            }
        }
    });

    // --- Dosis ---
    const dosis = leerDosisDesdeModal();
    updated.dosis_ml = normalizarNumero(dosis.dosis_ml || "");
    updated.peso_kg = normalizarNumero(dosis.peso_kg || "");

    // --- ML Contenedor ---
    const mlContenedor = modal.querySelector('[data-field="ml_contenedor"]')?.value || "";
    updated.ml_contenedor = normalizarNumero(mlContenedor);

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

    console.log("DEBUG - Datos a enviar:", updated);

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
                closeVetModal("modalProducto");
                location.reload();
            } else {
                alert("Error al guardar: " + (resp.error || "Error desconocido"));
            }
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Error al guardar el producto");
        });
}

/* ============================================================
   OBTENER DATOS DEL MODAL
============================================================ */
function getProductoModalData() {
    const modal = document.getElementById("modalProducto");
    const data = {};

    // Obtener ID si existe
    if (modal.dataset.idinventario) {
        data.idInventario = modal.dataset.idinventario;
    }

    // Obtener todos los campos editables
    modal.querySelectorAll(".field-edit").forEach((input) => {
        if (input.dataset.field) {
            const field = input.dataset.field;
            
            // Para textarea
            if (input.tagName === 'TEXTAREA') {
                data[field] = input.value.trim();
            }
            // Para select
            else if (input.tagName === 'SELECT') {
                data[field] = input.value;
            }
            // Para inputs numéricos
            else if (['dosis_ml', 'peso_kg', 'precio_venta', 'stock_actual', 'ml_contenedor'].includes(field)) {
                data[field] = normalizarNumero(input.value);
            }
            // Para inputs de texto
            else {
                data[field] = input.value.trim();
            }
        }
    });

    // Obtener campos de vista también
    modal.querySelectorAll(".field-view").forEach((el) => {
        if (el.dataset.field && !data[el.dataset.field]) {
            data[el.dataset.field] = el.textContent.trim();
        }
    });

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
