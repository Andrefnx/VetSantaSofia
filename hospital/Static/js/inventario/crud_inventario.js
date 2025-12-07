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
   VER / EDITAR PRODUCTO (MODIFICADO)
============================================================ */
function abrirModalProducto(btn, mode) {
    const tr = btn.closest("tr");
    if (!tr) return;

    const data = {
        idInventario: tr.getAttribute("data-id"),
        nombre_comercial: tr.cells[0].textContent.trim(),
        especie: tr.cells[1].textContent.trim(),
        precio_venta: normalizarNumero(tr.cells[2].textContent.replace(/[^0-9.,]/g, "").trim()),
        stock_actual: tr.cells[3].textContent.replace(/\D/g, ""),
        dosis_ml: normalizarNumero(tr.getAttribute("data-dosis-ml") || ""),
        peso_kg: normalizarNumero(tr.getAttribute("data-peso-kg") || ""),
    };

    openProductoModal(mode, data);
}

/* ============================================================
   ABRIR MODAL PRINCIPAL (MODIFICADO)
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

    // --- Botones corregidos ---
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

    // --- Rellenar campos (MODIFICADO para normalizar números) ---
    Object.keys(data).forEach((key) => {
        modal.querySelectorAll(`.field-view[data-field="${key}"]`).forEach((el) => {
            el.textContent = data[key] ?? "-";
        });
        modal.querySelectorAll(`.field-edit[data-field="${key}"]`).forEach((el) => {
            // Normalizar valores numéricos
            if (['dosis_ml', 'peso_kg', 'precio_venta', 'margen'].includes(key)) {
                el.value = normalizarNumero(data[key] ?? "");
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
    openProductoModal("edit", getProductoModalData());
}

/* ============================================================
   GUARDAR PRODUCTO (MODIFICADO)
============================================================ */
function guardarProductoEditado() {
    const modal = document.getElementById("modalProducto");
    const inputs = modal.querySelectorAll(".field-edit");

    const updated = {};

    // --- Recoger campos ---
    inputs.forEach((input) => {
        if (input.dataset.field && typeof input.value === "string") {
            const field = input.dataset.field;
            const value = input.value.trim();
            
            // Normalizar campos numéricos
            if (['dosis_ml', 'peso_kg', 'precio_venta', 'margen', 'stock_actual', 'stock_minimo', 'stock_maximo'].includes(field)) {
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

    // --- Rutas (CORREGIDAS) ---
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

    modal.querySelectorAll(".field-edit").forEach((input) => {
        if (input.dataset.field && typeof input.value === "string") {
            data[input.dataset.field] = input.value.trim();
        }
    });

    modal.querySelectorAll(".field-view").forEach((p) => {
        if (p.dataset.field && !data[p.dataset.field] && typeof p.textContent === "string") {
            data[p.dataset.field] = p.textContent.trim();
        }
    });

    // --- Asegura que el idInventario esté presente ---
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
