//---------NUEVO PRODUCTO---------

// Abre el modal de producto en modo "nuevo"
function abrirModalNuevoProducto() {
    // NO uses tr aquí, porque no hay fila seleccionada
    const data = {
        nombre_comercial: "",
        categoria: "",
        sku: "",
        codigo_barra: "",
        presentacion: "",
        especie: "",
        descripcion: "",
        unidad_medida: "",
        precio_compra: "",
        precio_venta: "",
        margen: "",
        stock_actual: "",
        stock_minimo: "",
        stock_maximo: "",
        almacenamiento: "",
        precauciones: "",
        contraindicaciones: "",
        efectos_adversos: ""
        // dosis_ml, peso_kg, ml, rangos_dosis eliminados
    };
    openProductoModal("nuevo", data);
}

//----------EDITA/VER---------
function abrirModalProducto(btn, mode) {
    const tr = btn.closest('tr');
    if (!tr) return;

    // Mapea los datos de la fila a los campos del modal
    const data = {
        nombre_comercial: tr.cells[0].textContent.trim(),
        especie: tr.cells[1].textContent.trim(),
        precio_venta: tr.cells[2].textContent.replace(/[^0-9.,]/g, '').trim(),
        stock_actual: tr.cells[3].textContent.replace(/\D/g, '').trim()
        // dosis_ml, peso_kg, ml, rangos_dosis eliminados
    };
    if (tr.hasAttribute('data-id')) {
        data.idInventario = tr.getAttribute('data-id');
    }
    openProductoModal(mode, data);
}

function openProductoModal(mode, data = {}) {
    const modal = document.getElementById("modalProducto");
    if (!modal) return;

    // Guardar datos originales solo en modo edit
    if (mode === "edit") {
        if (!data || Object.keys(data).length === 0) {
            data = getProductoModalData();
        }
        productoDatosOriginales = { ...data };
    }

    // Cambiar título según acción
    let titulo = "Detalles del Producto";
    if (mode === "edit") titulo = "Editar Producto";
    if (mode === "nuevo") titulo = "Nuevo Producto";
    document.getElementById("modalProductoTitulo").textContent = titulo;

    // Mostrar/ocultar botones
    document.getElementById("btnGuardarProducto").classList.toggle("d-none", mode === "view");
    document.getElementById("btnEditarProducto").classList.toggle("d-none", mode !== "view");
    document.getElementById("btnEliminarProducto").classList.toggle("d-none", mode === "nuevo");

    // Mostrar modo ver / editar
    const viewFields = modal.querySelectorAll(".field-view");
    const editFields = modal.querySelectorAll(".field-edit");
    viewFields.forEach(f => f.classList.toggle("d-none", mode !== "view"));
    editFields.forEach(f => f.classList.toggle("d-none", mode === "view"));

    // Rellenar datos
    Object.keys(data).forEach(key => {
        modal.querySelectorAll(`.field-view[data-field="${key}"]`)
            .forEach(el => el.textContent = data[key] ?? "-");
        modal.querySelectorAll(`.field-edit[data-field="${key}"]`)
            .forEach(el => el.value = data[key] ?? "");
    });

    // Guarda el idInventario como atributo en el modal para referencia
    if (data.idInventario) {
        modal.dataset.idinventario = data.idInventario;
    } else {
        delete modal.dataset.idinventario;
    }

    modal.classList.remove("hide");
    modal.classList.add("show");
}

function switchToEditModeProducto() {
    openProductoModal("edit", getProductoModalData());
}

function guardarProductoEditado() {
    const modal = document.getElementById("modalProducto");
    const inputs = modal.querySelectorAll(".field-edit");
    let updated = {};

    inputs.forEach(input => {
        updated[input.dataset.field] = input.value;
    });

    // Elimina dosis_ml y peso_kg
    delete updated.dosis_ml;
    delete updated.peso_kg;

    // Mapeo para compatibilidad backend
    if (updated.nombre_comercial && !updated.medicamento) {
        updated.medicamento = updated.nombre_comercial;
    }

    // Asegúrate de incluir el idInventario si está en el modal (por ejemplo, como atributo en el modal)
    if (!updated.idInventario && modal.dataset.idinventario) {
        updated.idInventario = modal.dataset.idinventario;
    }

    // VALIDACIÓN: nombre y especie obligatorios
    if (
        !updated.nombre_comercial ||
        !updated.especie
    ) {
        alert("Debes completar Nombre Comercial y Especie antes de guardar.");
        return;
    }

    // Si es edición, enviar AJAX a editar
    if (updated.idInventario) {
        fetch(`/hospital/inventario/editar/${updated.idInventario}/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        }).then(r => r.json()).then(resp => {
            if (resp.success) location.reload();
        });
    } else {
        // Si es nuevo, enviar AJAX a crear
        fetch('/hospital/inventario/crear/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updated)
        }).then(r => r.json()).then(resp => {
            if (resp.success) location.reload();
        });
    }
}

function getProductoModalData() {
    const modal = document.getElementById("modalProducto");
    let data = {};
    modal.querySelectorAll(".field-edit").forEach(input => {
        data[input.dataset.field] = input.value;
    });
    modal.querySelectorAll(".field-view").forEach(p => {
        if (!data[p.dataset.field]) data[p.dataset.field] = p.textContent;
    });
    // Elimina dosis_ml y peso_kg si existen
    delete data.dosis_ml;
    delete data.peso_kg;
    return data;
}
//----------ELIMINAR---------
let productoAEliminarId = null;

function abrirModalEliminarProducto(btn) {
    let tr = btn.closest('tr');
    let nombre = '';
    if (tr) {
        nombre = tr.cells[0].textContent.trim();
        productoAEliminarId = tr.getAttribute('data-id');
    } else {
        // Si viene del modal, busca el id en el modal
        const modal = document.getElementById('modalProducto');
        productoAEliminarId = modal.dataset.idinventario || null;
        const nombreField = modal.querySelector('[data-field="nombre_comercial"]');
        nombre = nombreField ? nombreField.textContent.trim() : '';
    }
    document.getElementById('eliminarProductoMensaje').textContent =
        `¿Estás seguro que deseas eliminar el producto "${nombre}"?`;
    openVetModal('modalEliminarProducto');
}

// Cierre del modal de eliminar con advertencia
function closeEliminarProductoModal() {
    if (window.Swal && Swal.fire) {
        Swal.fire({
            title: "¿Cerrar sin eliminar?",
            text: "Si cierras, el producto no se eliminará.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Entendido",
            cancelButtonText: "Cancelar",
            reverseButtons: true
        }).then((result) => {
            if (result.isConfirmed) {
                closeVetModal('modalEliminarProducto');
            }
            // Si cancela, no hace nada y permanece en el modal
        });
    } else {
        if (confirm("Si cierras, el producto no se eliminará. ¿Deseas continuar?")) {
            closeVetModal('modalEliminarProducto');
        }
    }
}

// Confirmación antes de eliminar
document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('btnConfirmarEliminarProducto').onclick = function () {
        if (window.Swal && Swal.fire) {
            Swal.fire({
                title: "¿Eliminar producto?",
                text: "¿Estás segura/o de eliminar este producto?",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Sí, eliminar",
                cancelButtonText: "Cancelar",
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    eliminarProductoConfirmado();
                }
                // Si cancela, permanece en el modal
            });
        } else {
            if (confirm("¿Estás segura/o de eliminar este producto?")) {
                eliminarProductoConfirmado();
            }
        }
    };

    // Botón cancelar (si existe)
    var btnCancelar = document.getElementById('btnCancelarEliminarProducto');
    if (btnCancelar) {
        btnCancelar.onclick = function () {
            closeEliminarProductoModal();
        };
    }
});

function eliminarProductoConfirmado() {
    if (!productoAEliminarId) return;
    fetch(`/hospital/inventario/eliminar/${productoAEliminarId}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json()).then(resp => {
        if (resp.success) location.reload();
    });
}

//--------MODIFICAR STOCK--------
let stockActualTemp = 0;
let stockOriginal = 0;
let productoIdStock = null; // NUEVO: para guardar el id del producto a modificar stock

// Modifica openModificarStockModal para guardar stock original y el id del producto
function openModificarStockModal(btn) {
    // btn: botón dentro de la fila de la tabla
    let tr = btn.closest('tr');
    if (!tr) return;
    productoIdStock = tr.getAttribute('data-id');
    stockActualTemp = parseInt(tr.cells[3].textContent.replace(/\D/g, '')) || 0;
    stockOriginal = stockActualTemp; // Guardar stock original
    document.getElementById('stockActualValor').textContent = stockActualTemp;
    document.getElementById('inputStockOperacion').value = '';
    openVetModal('modalModificarStock');
}

// Detectar cambios en stock
function hayCambiosStock() {
    return stockActualTemp !== stockOriginal;
}

// Intercepta el cierre del modal de stock
function closeModificarStockModal() {
    if (hayCambiosStock()) {
        if (window.Swal && Swal.fire) {
            Swal.fire({
                title: "¿Cerrar sin guardar?",
                text: "Si cierras, los cambios de stock no se guardarán.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Entendido",
                cancelButtonText: "Cancelar",
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    closeVetModal('modalModificarStock');
                }
            });
        } else {
            if (confirm("Si cierras, los cambios de stock no se guardarán. ¿Deseas continuar?")) {
                closeVetModal('modalModificarStock');
            }
        }
    } else {
        closeVetModal('modalModificarStock');
    }
}

function cambiarStock(delta) {
    stockActualTemp = Math.max(0, stockActualTemp + delta);
    document.getElementById('stockActualValor').textContent = stockActualTemp;
}

function sumarStockInput() {
    const input = document.getElementById('inputStockOperacion');
    let valor = parseInt(input.value) || 0;
    if (valor > 0) {
        stockActualTemp += valor;
        document.getElementById('stockActualValor').textContent = stockActualTemp;
        input.value = '';
    }
}

function restarStockInput() {
    const input = document.getElementById('inputStockOperacion');
    let valor = parseInt(input.value) || 0;
    if (valor > 0) {
        stockActualTemp = Math.max(0, stockActualTemp - valor);
        document.getElementById('stockActualValor').textContent = stockActualTemp;
        input.value = '';
    }
}

function guardarStock() {
    if (!productoIdStock) return;
    fetch(`/hospital/inventario/modificar_stock/${productoIdStock}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stock_actual: stockActualTemp })
    }).then(r => r.json()).then(resp => {
        if (resp.success) location.reload();
    });
}

// Variables para detectar cambios
let productoDatosOriginales = null;

// Función para comparar si hubo cambios en edición
function hayCambiosProducto() {
    if (!productoDatosOriginales) return false;
    const modal = document.getElementById("modalProducto");
    let actual = {};
    modal.querySelectorAll(".field-edit").forEach(input => {
        actual[input.dataset.field] = input.value;
    });
    // Elimina dosis_ml y peso_kg si existen
    delete actual.dosis_ml;
    delete actual.peso_kg;
    return Object.keys(productoDatosOriginales).some(
        key => (productoDatosOriginales[key] ?? "") !== (actual[key] ?? "")
    );
}

// Intercepta el cierre del modal de edición
function closeProductoModal() {
    if (hayCambiosProducto()) {
        if (window.Swal && Swal.fire) {
            Swal.fire({
                title: "¿Cerrar sin guardar?",
                text: "Si cierras, los cambios no se guardarán.",
                icon: "warning",
                showCancelButton: true,
                confirmButtonText: "Entendido",
                cancelButtonText: "Cancelar",
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    closeVetModal('modalProducto');
                }
            });
        } else {
            if (confirm("Si cierras, los cambios no se guardarán. ¿Deseas continuar?")) {
                closeVetModal('modalProducto');
            }
        }
    } else {
        closeVetModal('modalProducto');
    }
}
