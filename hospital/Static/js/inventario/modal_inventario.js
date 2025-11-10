// Variables globales
let currentRow = null;
let formChanged = false;
let deleteConfirmed = false;
let allowClose = false; // Nueva variable para controlar el cierre

// ====== DATOS DE PRODUCTOS ======
const productData = {
    'Revolution Plus': {
        nombre_comercial: 'Revolution Plus',
        nombre_generico: 'Selamectina + Sarolaner',
        sku: 'REV-FEL-001',
        codigo_barra: '7501234567890',
        categoria: 'antiparasitario',
        presentacion: 'pipeta',
        especie: 'felino',
        peso_animal: '2.5 - 7.5 kg',
        principio_activo: 'Selamectina 30mg + Sarolaner 6mg',
        concentracion: '30mg/ml + 6mg/ml',
        indicaciones: 'Tratamiento y prevención de pulgas, garrapatas, ácaros del oído',
        via_administracion: 'topica',
        registro_sanitario: 'SAG-VET-2023-001234',
        lote: 'LOT2025A',
        fecha_fabricacion: '2025-01-15',
        caducidad: '2026-03-15',
        laboratorio: 'Zoetis',
        pais_origen: 'Estados Unidos',
        almacenamiento: 'Conservar a temperatura ambiente (15-25°C), protegido de la luz directa',
        precio_compra: '18500',
        precio_venta: '32500',
        estado_producto: 'disponible',
        stock_actual: '10',
        stock_minimo: '5',
        stock_maximo: '30',
        unidad_medida: 'unidades',
        contenido_neto: '0.75 ml',
        empaque: 'Blíster individual',
        efectos_adversos: 'Puede causar irritación leve en el sitio de aplicación',
        contraindicaciones: 'No usar en gatos menores de 8 semanas',
        precauciones: 'Evitar contacto con ojos y mucosas',
        ultimo_ingreso: '2025-11-03',
        ultimo_movimiento: '2025-11-05',
        tipo_movimiento: 'Salida',
        proveedor: 'vet_pharma',
        ubicacion: 'Estante A-3',
        responsable: 'Dr. Juan Pérez',
        factura: 'FAC-2025-11-001'
    },
    'Bravecto 40-56Kg': {
        nombre_comercial: 'Bravecto 40-56Kg',
        nombre_generico: 'Fluralaner',
        sku: 'BRV-CAN-001',
        codigo_barra: '7501234567891',
        categoria: 'antiparasitario',
        presentacion: 'comprimido',
        especie: 'canino',
        peso_animal: '40 - 56 kg',
        principio_activo: 'Fluralaner 1400mg',
        concentracion: '1400mg',
        indicaciones: 'Tratamiento y prevención de pulgas y garrapatas',
        via_administracion: 'oral',
        registro_sanitario: 'SAG-VET-2023-005678',
        lote: 'BRV2024C',
        fecha_fabricacion: '2024-10-01',
        caducidad: '2025-02-02',
        laboratorio: 'MSD Animal Health',
        pais_origen: 'Brasil',
        almacenamiento: 'Conservar a temperatura ambiente (15-30°C)',
        precio_compra: '22000',
        precio_venta: '28000',
        estado_producto: 'disponible',
        stock_actual: '3',
        stock_minimo: '5',
        stock_maximo: '20',
        unidad_medida: 'unidades',
        contenido_neto: '1 comprimido',
        empaque: 'Blíster individual',
        efectos_adversos: 'Vómitos, diarrea (poco frecuentes)',
        contraindicaciones: 'No usar en perros menores de 8 semanas',
        precauciones: 'Administrar con alimento',
        ultimo_ingreso: '2025-10-15',
        ultimo_movimiento: '2025-10-15',
        tipo_movimiento: 'Ingreso',
        proveedor: 'pet_supplies',
        ubicacion: 'Estante B-1',
        responsable: 'Dra. María López',
        factura: 'FAC-2025-10-045'
    }
};

// ====== UTILIDADES ======
function setCurrentDate() {
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('[id^="fechaIngreso"]').forEach(input => {
        if (input) input.value = today;
    });
}

function setCurrentRow(row) {
    currentRow = row;
}

function getCurrentRow() {
    return currentRow;
}

// ====== DETECTAR CAMBIOS EN FORMULARIOS ======
function trackFormChanges(formId) {
    const form = document.getElementById(formId);
    if (!form) return;
    
    formChanged = false;
    
    form.querySelectorAll('input, select, textarea').forEach(field => {
        field.addEventListener('input', () => {
            formChanged = true;
        });
        
        field.addEventListener('change', () => {
            formChanged = true;
        });
    });
}

// ====== MODAL EDITAR ======
function openEditModal() {
    if (!currentRow) return;
    
    const productName = currentRow.cells[0].textContent.trim();
    const data = productData[productName] || {};
    const form = document.getElementById('editForm');
    
    if (!form) return;
    
    // Resetear flags
    formChanged = false;
    allowClose = false;
    
    // Llenar todos los campos
    Object.keys(data).forEach(key => {
        const field = form[key];
        if (field) {
            field.value = data[key];
        }
    });
    
    if (!data.ultimo_ingreso) {
        setCurrentDate();
    }
    
    // Activar detección de cambios
    trackFormChanges('editForm');
    
    new bootstrap.Modal(document.getElementById('editModal')).show();
}

function saveEdit() {
    const form = document.getElementById('editForm');
    if (form && form.checkValidity()) {
        allowClose = true; // Permitir cierre
        formChanged = false;
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        alert('✅ Cambios guardados exitosamente');
    } else if (form) {
        form.reportValidity();
    }
}

function cancelEdit() {
    if (formChanged) {
        const confirmCancel = confirm('⚠️ Tienes cambios sin guardar.\n\n¿Estás seguro de que deseas cancelar?\n\nLos cambios se perderán.');
        
        if (confirmCancel) {
            allowClose = true; // Permitir cierre
            formChanged = false;
            bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
        }
    } else {
        allowClose = true; // Permitir cierre
        bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
    }
}

// ====== MODAL AGREGAR PRODUCTO ======
function openAddProductModal() {
    const form = document.getElementById('addProductForm');
    if (form) form.reset();
    
    formChanged = false;
    allowClose = false;
    setCurrentDate();
    trackFormChanges('addProductForm');
    
    new bootstrap.Modal(document.getElementById('addProductModal')).show();
}

function saveNewProduct() {
    const form = document.getElementById('addProductForm');
    if (form && form.checkValidity()) {
        allowClose = true;
        formChanged = false;
        bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
        alert('✅ Producto agregado exitosamente');
    } else if (form) {
        form.reportValidity();
    }
}

function cancelAddProduct() {
    if (formChanged) {
        const confirmCancel = confirm('⚠️ Tienes cambios sin guardar.\n\n¿Estás seguro de que deseas cancelar?\n\nLos cambios se perderán.');
        
        if (confirmCancel) {
            allowClose = true;
            formChanged = false;
            bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
        }
    } else {
        allowClose = true;
        bootstrap.Modal.getInstance(document.getElementById('addProductModal')).hide();
    }
}

// ====== MODAL AGREGAR STOCK ======
function openAddStockModal() {
    if (currentRow) {
        const productName = currentRow.cells[0].textContent;
        const stock = currentRow.cells[3].querySelector('.badge').textContent;
        
        document.getElementById('addStockProductName').textContent = productName;
        document.getElementById('currentStock').value = stock;
    }
    
    formChanged = false;
    allowClose = false;
    setCurrentDate();
    trackFormChanges('addStockForm');
    
    new bootstrap.Modal(document.getElementById('addStockModal')).show();
}

function saveAddStock() {
    const form = document.getElementById('addStockForm');
    if (form && form.checkValidity()) {
        allowClose = true;
        formChanged = false;
        bootstrap.Modal.getInstance(document.getElementById('addStockModal')).hide();
        alert('✅ Stock agregado exitosamente');
    } else if (form) {
        form.reportValidity();
    }
}

function cancelAddStock() {
    if (formChanged) {
        const confirmCancel = confirm('⚠️ Tienes cambios sin guardar.\n\n¿Estás seguro de que deseas cancelar?\n\nLos cambios se perderán.');
        
        if (confirmCancel) {
            allowClose = true;
            formChanged = false;
            bootstrap.Modal.getInstance(document.getElementById('addStockModal')).hide();
        }
    } else {
        allowClose = true;
        bootstrap.Modal.getInstance(document.getElementById('addStockModal')).hide();
    }
}

// ====== MODAL DETALLES ======
function openDetailsModal() {
    if (!currentRow) return;
    
    const productName = currentRow.cells[0].textContent.trim();
    const data = productData[productName];
    
    if (!data) return;
    
    // Datos para visualización
    const displayData = {
        ...data,
        categoria: data.categoria === 'antiparasitario' ? 'Antiparasitario Externo' : data.categoria,
        presentacion: data.presentacion.charAt(0).toUpperCase() + data.presentacion.slice(1),
        especie: data.especie.charAt(0).toUpperCase() + data.especie.slice(1),
        via_administracion: data.via_administracion === 'topica' ? 'Tópica (spot-on)' : data.via_administracion.charAt(0).toUpperCase() + data.via_administracion.slice(1),
        fecha_fabricacion: formatDate(data.fecha_fabricacion),
        caducidad: formatDate(data.caducidad),
        ultimo_ingreso: formatDate(data.ultimo_ingreso),
        ultimo_movimiento: formatDate(data.ultimo_movimiento),
        precio_compra: formatPrice(data.precio_compra),
        precio_venta: formatPrice(data.precio_venta),
        margen: calculateMargin(data.precio_compra, data.precio_venta),
        estado_producto: 'Disponible',
        stock_actual: `${data.stock_actual} unidades`,
        stock_minimo: `${data.stock_minimo} unidades`,
        stock_maximo: `${data.stock_maximo} unidades`,
        unidad_medida: 'Unidades',
        estado: 'Vigente',
        proveedor: getProveedorName(data.proveedor)
    };
    
    // Llenar campos
    Object.keys(displayData).forEach(key => {
        const element = document.getElementById(`detail_${key}`);
        if (element) {
            element.textContent = displayData[key];
        }
    });
    
    new bootstrap.Modal(document.getElementById('detailsModal')).show();
}

// ====== MODAL ELIMINAR ======
function openDeleteModal() {
    if (!currentRow) return;
    
    deleteConfirmed = false;
    allowClose = false;
    const productName = currentRow.cells[0].textContent.trim();
    document.getElementById('deleteProductName').textContent = productName;
    
    new bootstrap.Modal(document.getElementById('deleteModal')).show();
}

function confirmDelete() {
    if (currentRow) {
        allowClose = true;
        deleteConfirmed = true;
        currentRow.remove();
        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
        alert('✅ Producto eliminado exitosamente');
        currentRow = null;
    }
}

function cancelDelete() {
    const confirmCancel = confirm('⚠️ ¿Estás seguro de que deseas cancelar la eliminación?\n\nEl producto NO será eliminado.');
    
    if (confirmCancel) {
        allowClose = true;
        deleteConfirmed = false;
        bootstrap.Modal.getInstance(document.getElementById('deleteModal')).hide();
    }
}

// ====== FUNCIONES AUXILIARES ======
function formatDate(dateStr) {
    if (!dateStr) return '-';
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function formatPrice(price) {
    if (!price) return '-';
    return '$' + parseInt(price).toLocaleString('es-CL');
}

function calculateMargin(compra, venta) {
    if (!compra || !venta) return '-';
    const margin = ((parseInt(venta) - parseInt(compra)) / parseInt(compra) * 100).toFixed(1);
    return `${margin}%`;
}

function getProveedorName(code) {
    const proveedores = {
        'vet_pharma': 'Vet Pharma S.A.',
        'pet_supplies': 'Pet Supplies',
        'zoetis': 'Zoetis Chile',
        'bayer': 'Bayer Animal Health',
        'merial': 'Merial'
    };
    return proveedores[code] || code;
}

// ====== PREVENIR CIERRE ACCIDENTAL ======
document.addEventListener('DOMContentLoaded', () => {
    // Modal Editar
    const editModal = document.getElementById('editModal');
    if (editModal) {
        editModal.addEventListener('hide.bs.modal', (e) => {
            if (!allowClose && formChanged) {
                e.preventDefault();
                e.stopPropagation();
                
                const confirmCancel = confirm('⚠️ Tienes cambios sin guardar.\n\n¿Estás seguro de que deseas cerrar?\n\nLos cambios se perderán.');
                
                if (confirmCancel) {
                    allowClose = true;
                    formChanged = false;
                    bootstrap.Modal.getInstance(editModal).hide();
                }
            }
        });
        
        editModal.addEventListener('show.bs.modal', () => {
            formChanged = false;
            allowClose = false;
        });
        
        editModal.addEventListener('hidden.bs.modal', () => {
            allowClose = false;
            formChanged = false;
        });
    }
    
    // Modal Agregar Producto
    const addProductModal = document.getElementById('addProductModal');
    if (addProductModal) {
        addProductModal.addEventListener('hide.bs.modal', (e) => {
            if (!allowClose && formChanged) {
                e.preventDefault();
                e.stopPropagation();
                
                const confirmCancel = confirm('⚠️ Tienes cambios sin guardar.\n\n¿Estás seguro de que deseas cerrar?\n\nLos cambios se perderán.');
                
                if (confirmCancel) {
                    allowClose = true;
                    formChanged = false;
                    bootstrap.Modal.getInstance(addProductModal).hide();
                }
            }
        });
        
        addProductModal.addEventListener('show.bs.modal', () => {
            formChanged = false;
            allowClose = false;
        });
        
        addProductModal.addEventListener('hidden.bs.modal', () => {
            allowClose = false;
            formChanged = false;
        });
    }
    
    // Modal Agregar Stock
    const addStockModal = document.getElementById('addStockModal');
    if (addStockModal) {
        addStockModal.addEventListener('hide.bs.modal', (e) => {
            if (!allowClose && formChanged) {
                e.preventDefault();
                e.stopPropagation();
                
                const confirmCancel = confirm('⚠️ Tienes cambios sin guardar.\n\n¿Estás seguro de que deseas cerrar?\n\nLos cambios se perderán.');
                
                if (confirmCancel) {
                    allowClose = true;
                    formChanged = false;
                    bootstrap.Modal.getInstance(addStockModal).hide();
                }
            }
        });
        
        addStockModal.addEventListener('show.bs.modal', () => {
            formChanged = false;
            allowClose = false;
        });
        
        addStockModal.addEventListener('hidden.bs.modal', () => {
            allowClose = false;
            formChanged = false;
        });
    }
    
    // Modal Eliminar
    const deleteModal = document.getElementById('deleteModal');
    if (deleteModal) {
        deleteModal.addEventListener('hide.bs.modal', (e) => {
            if (!allowClose && !deleteConfirmed) {
                e.preventDefault();
                e.stopPropagation();
                
                const confirmCancel = confirm('⚠️ ¿Estás seguro de que deseas cancelar la eliminación?\n\nEl producto NO será eliminado.');
                
                if (confirmCancel) {
                    allowClose = true;
                    deleteConfirmed = false;
                    bootstrap.Modal.getInstance(deleteModal).hide();
                }
            }
        });
        
        deleteModal.addEventListener('show.bs.modal', () => {
            deleteConfirmed = false;
            allowClose = false;
        });
        
        deleteModal.addEventListener('hidden.bs.modal', () => {
            allowClose = false;
            deleteConfirmed = false;
        });
    }
});