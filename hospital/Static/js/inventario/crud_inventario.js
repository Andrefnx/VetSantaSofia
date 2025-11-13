//---------NUEVO PRODUCTO---------
// Lista que guarda los rangos
let rangosDosis = [];

// Mostrar rangos tanto en vista como en edición
function renderRangosDosis() {
    const viewContainer = document.getElementById("pesoDosisList");
    const editContainer = document.getElementById("pesoDosisEditList");

    // Ordenar de menor a mayor por min
    rangosDosis.sort((a, b) => a.min - b.min);

    // Vista
    if (viewContainer) {
        if (rangosDosis.length === 0) {
            viewContainer.innerHTML = "-";
        } else {
            viewContainer.innerHTML = rangosDosis
                .map(r => `${r.min} – ${r.max} kg → ${r.dosis} ml`)
                .join("<br>");
        }
    }

    // Edición
    if (editContainer) {
        editContainer.innerHTML = "";
        rangosDosis.forEach((rango, index) => {
            const li = document.createElement("li");
            li.className = "list-group-item d-flex justify-content-between align-items-center";
            li.innerHTML = `
                <span>${rango.min}–${rango.max} kg → ${rango.dosis} ml</span>
                <button class="btn btn-danger btn-sm" onclick="eliminarRangoDosis(${index})">
                    <i class="bi bi-trash"></i>
                </button>
            `;
            editContainer.appendChild(li);
        });
    }
}

// Agregar rango
function agregarRangoDosis() {
    let min = parseFloat(document.getElementById("pesoMinTemp").value);
    let max = parseFloat(document.getElementById("pesoMaxTemp").value);
    let dosis = parseFloat(document.getElementById("dosisTemp").value);

    if (isNaN(min) || isNaN(max) || isNaN(dosis)) {
        alert("Completa todos los campos.");
        return;
    }
    if (min >= max) {
        alert("El peso mínimo debe ser menor que el máximo.");
        return;
    }

    rangosDosis.push({ min, max, dosis });
    renderRangosDosis();

    // limpiar inputs
    document.getElementById("pesoMinTemp").value = "";
    document.getElementById("pesoMaxTemp").value = "";
    document.getElementById("dosisTemp").value = "";
}

// Eliminar un rango
function eliminarRangoDosis(index) {
    rangosDosis.splice(index, 1);
    renderRangosDosis();
}

// Abre el modal de producto en modo "nuevo"
function abrirModalNuevoProducto() {
    // Limpia todos los campos
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
        proveedor: "",
        almacenamiento: "",
        precauciones: "",
        contraindicaciones: "",
        efectos_adversos: "",
        rangos_dosis: []
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
        precio_venta: tr.cells[2].textContent.trim(),
        stock_actual: tr.cells[3].textContent.replace(/\D/g, '').trim(),
        // Puedes mapear más campos según tus necesidades y el orden de las columnas
        rangos_dosis: [] // Aquí deberías mapear los rangos si los tienes en la tabla
    };
    openProductoModal(mode, data);
}

function openProductoModal(mode, data = {}) {
    const modal = document.getElementById("modalProducto");
    if (!modal) return;

    // cargar los rangos si vienen desde Django o JS
    rangosDosis = data.rangos_dosis ? [...data.rangos_dosis] : [];
    renderRangosDosis();

    // Cargar proveedores en el select integrado
    cargarProveedoresEnSelect();

    // Si hay proveedor en los datos, seleccionarlo
    if (data.proveedor) {
        const select = document.getElementById("selectProveedorIntegrado");
        if (select) select.value = data.proveedor;
    }

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

    // Guardar los rangos de dosis ordenados
    updated.rangos_dosis = [...rangosDosis].sort((a, b) => a.min - b.min);

    // ACTUALIZA LOS CAMPOS DE VISTA
    Object.keys(updated).forEach(key => {
        modal.querySelectorAll(`.field-view[data-field="${key}"]`)
            .forEach(el => el.textContent = updated[key] ?? "-");
    });

    // Cambia a modo vista con los datos actualizados
    openProductoModal("view", updated);
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
    return data;
}
//----------ELIMINAR---------
let productoAEliminar = null;

function abrirModalEliminarProducto(btn) {
    // Si viene de la tabla, busca el <tr>
    let tr = btn.closest('tr');
    let nombre = '';
    if (tr) {
        nombre = tr.cells[0].textContent.trim();
        productoAEliminar = tr;
    } else {
        // Si viene del modal de producto, busca el nombre en el modal
        const nombreField = document.querySelector('#modalProducto [data-field="nombre_comercial"]');
        nombre = nombreField ? nombreField.textContent.trim() : '';
        productoAEliminar = null; // O puedes guardar un id si tienes
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
    // Si hay un <tr> directo (desde la tabla), elimínalo
    if (productoAEliminar) {
        productoAEliminar.remove();
    } else if (window.nombreProductoActual) {
        // Si viene desde el modal, busca la fila por el nombre comercial
        const filas = document.querySelectorAll('table tbody tr');
        for (let tr of filas) {
            if (tr.cells[0] && tr.cells[0].textContent.trim() === window.nombreProductoActual) {
                tr.remove();
                break;
            }
        }
    }
    closeVetModal('modalEliminarProducto');
    closeVetModal('modalProducto');
    if (window.Swal && Swal.fire) {
        Swal.fire("Eliminado", "El producto ha sido eliminado.", "success");
    } else {
        alert("El producto ha sido eliminado.");
    }
}

//--------MODIFICAR STOCK--------
let stockActualTemp = 0;
let stockOriginal = 0;

// Modifica openModificarStockModal para guardar stock original
function openModificarStockModal(stockInicial = 0) {
    stockActualTemp = parseInt(stockInicial) || 0;
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
    // Aquí puedes actualizar el stock en la tabla o enviar al backend
    closeVetModal('modalModificarStock');
    // Ejemplo: alert("Nuevo stock: " + stockActualTemp);
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
let proveedoresBase = [
    "Vet Pharma",
    "Pet Supplies"
];
// ===============================
// Cargar proveedores en la lista
// ===============================
function cargarProveedoresEnSelect() {
    const select = document.getElementById("selectProveedorIntegrado");
    // Guarda la selección actual
    const selected = select.value;
    // Limpia y agrega las opciones especiales
    select.innerHTML = `
     
        <option value="">Selecciona...</option>
    `;
    proveedoresBase.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p;
        opt.textContent = p;
        select.appendChild(opt);
    });
    // Opción para agregar nuevo proveedor
    const optNuevo = document.createElement("option");
    optNuevo.value = "__nuevo__";
    optNuevo.textContent = "+ Agregar nuevo proveedor...";
    select.appendChild(optNuevo);

    // Restaura la selección si aplica
    if (selected) select.value = selected;
}

function onProveedorIntegradoChange() {
    const select = document.getElementById("selectProveedorIntegrado");
    const value = select.value;
    const nuevoWrapper = document.getElementById("nuevoProveedorWrapper");

    if (value === "__buscar__") {
        mostrarInputBusquedaProveedor();
        // Vuelve a "Selecciona..." para evitar quedarse en la opción de búsqueda
        setTimeout(() => { select.value = ""; }, 100);
        nuevoWrapper.classList.add("d-none");
    } else if (value === "__nuevo__") {
        nuevoWrapper.classList.remove("d-none");
        document.getElementById("inputNuevoProveedor").focus();
    } else {
        nuevoWrapper.classList.add("d-none");
    }
}

function mostrarInputBusquedaProveedor() {
    // Evita duplicados
    if (document.getElementById('inputBuscarProveedorFlotante')) return;
    const select = document.getElementById('selectProveedorIntegrado');
    const rect = select.getBoundingClientRect();
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'inputBuscarProveedorFlotante';
    input.className = 'form-control mb-1';
    input.placeholder = 'Buscar proveedor...';
    input.style.position = 'absolute';
    input.style.left = 0;
    input.style.top = 0;
    input.style.width = '100%';
    input.style.zIndex = 2000;

    // Filtrar mientras escribe
    input.oninput = function() {
        filtrarOpcionesProveedor(input.value);
    };
    // Al salir, eliminar input y restaurar opciones
    input.onblur = function() {
        setTimeout(() => {
            input.remove();
            filtrarOpcionesProveedor(""); // Restablece todas las opciones
        }, 200);
    };

    select.parentNode.appendChild(input);
    input.focus();
}

function filtrarOpcionesProveedor(filtro) {
    const select = document.getElementById("selectProveedorIntegrado");
    filtro = (filtro || "").toLowerCase();
    for (let opt of select.options) {
        // No filtrar las opciones especiales
        if (opt.value === "__buscar__" || opt.value === "" || opt.value === "__nuevo__") {
            opt.hidden = false;
            continue;
        }
        opt.hidden = !opt.textContent.toLowerCase().includes(filtro);
    }
}

// ===============================
// Agregar nuevo proveedor
// ===============================
function agregarNuevoProveedorIntegrado() {
    const input = document.getElementById("inputNuevoProveedor");
    const nombre = input.value.trim();
    if (!nombre) return;
    if (!proveedoresBase.includes(nombre)) {
        proveedoresBase.push(nombre);
    }
    cargarProveedoresEnSelect();
    // Selecciona automáticamente el nuevo proveedor
    const select = document.getElementById("selectProveedorIntegrado");
    select.value = nombre;
    input.value = "";
    document.getElementById("nuevoProveedorWrapper").classList.add("d-none");
}
