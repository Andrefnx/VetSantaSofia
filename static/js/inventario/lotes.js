// Datos de lotes
const productBatches = {
    'Revolution Plus': [
        {
            lote: 'LOT2025A',
            cantidad: '5 unidades',
            caducidad: '15/03/2026',
            caducidadClass: 'text-success',
            ingreso: '03/11/2025',
            ubicacion: 'Estante A-3',
            precioCompra: '$18.500',
            proveedor: 'Vet Pharma'
        },
        {
            lote: 'LOT2024B',
            cantidad: '5 unidades',
            caducidad: '20/12/2025',
            caducidadClass: 'text-warning',
            ingreso: '15/08/2025',
            ubicacion: 'Estante A-2',
            precioCompra: '$17.800',
            proveedor: 'Vet Pharma'
        }
    ],
    'Bravecto 40-56Kg': [
        {
            lote: 'BRV2024C',
            cantidad: '3 unidades',
            caducidad: '02/02/2025',
            caducidadClass: 'text-danger',
            ingreso: '15/10/2025',
            ubicacion: 'Estante B-1',
            precioCompra: '$22.000',
            proveedor: 'Pet Supplies'
        }
    ]
};

function openBatchesModal(productName) {
    const batches = productBatches[productName] || [];
    document.getElementById('batchProductName').textContent = productName;
    
    const batchListHTML = batches.map((batch, index) => `
        <div class="batch-item position-relative" id="batch-${index}">
            <button class="btn btn-sm btn-link position-absolute top-0 end-0 edit-batch-btn" 
                    onclick="toggleEditBatch('${productName}', ${index})" 
                    data-index="${index}">
                <i class="bi bi-pencil"></i>
            </button>
            
            <div class="batch-view" id="batch-view-${index}">
                <div class="batch-info">
                    <span class="batch-label">Lote:</span>
                    <span class="batch-value fw-bold">${batch.lote}</span>
                </div>
                <div class="batch-info">
                    <span class="batch-label">Cantidad:</span>
                    <span class="batch-value">${batch.cantidad}</span>
                </div>
                <div class="batch-info">
                    <span class="batch-label">Caducidad:</span>
                    <span class="batch-value ${batch.caducidadClass}">${batch.caducidad}</span>
                </div>
                <div class="batch-info">
                    <span class="batch-label">Ingreso:</span>
                    <span class="batch-value">${batch.ingreso}</span>
                </div>
                <div class="batch-info">
                    <span class="batch-label">Precio Compra:</span>
                    <span class="batch-value">${batch.precioCompra}</span>
                </div>
                <div class="batch-info">
                    <span class="batch-label">Ubicación:</span>
                    <span class="batch-value">${batch.ubicacion}</span>
                </div>
                <div class="batch-info">
                    <span class="batch-label">Proveedor:</span>
                    <span class="batch-value">${batch.proveedor}</span>
                </div>
            </div>
            
            <div class="batch-edit d-none" id="batch-edit-${index}">
                <div class="batch-info">
                    <span class="batch-label">Lote:</span>
                    <input type="text" class="form-control form-control-sm" value="${batch.lote}" id="edit-lote-${index}">
                </div>
                <div class="batch-info">
                    <span class="batch-label">Cantidad:</span>
                    <input type="text" class="form-control form-control-sm" value="${batch.cantidad}" id="edit-cantidad-${index}">
                </div>
                <div class="batch-info">
                    <span class="batch-label">Caducidad:</span>
                    <input type="date" class="form-control form-control-sm" value="${convertToDateInput(batch.caducidad)}" id="edit-caducidad-${index}">
                </div>
                <div class="batch-info">
                    <span class="batch-label">Ingreso:</span>
                    <input type="text" class="form-control form-control-sm" value="${batch.ingreso}" disabled>
                </div>
                <div class="batch-info">
                    <span class="batch-label">Precio Compra:</span>
                    <input type="text" class="form-control form-control-sm" value="${batch.precioCompra}" disabled>
                </div>
                <div class="batch-info">
                    <span class="batch-label">Ubicación:</span>
                    <input type="text" class="form-control form-control-sm" value="${batch.ubicacion}" id="edit-ubicacion-${index}">
                </div>
                <div class="batch-info">
                    <span class="batch-label">Proveedor:</span>
                    <input type="text" class="form-control form-control-sm" value="${batch.proveedor}" id="edit-proveedor-${index}">
                </div>
                <div class="d-flex gap-2 mt-2">
                    <button class="btn btn-sm btn-danger" onclick="deleteBatch('${productName}', ${index})">
                        <i class="bi bi-trash"></i> Eliminar
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="cancelEditBatch(${index})">
                        <i class="bi bi-x-circle"></i> Cancelar
                    </button>
                </div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('batchList').innerHTML = batchListHTML || 
        '<p class="text-muted text-center py-4">No hay lotes disponibles</p>';
    
    const modal = bootstrap.Modal.getOrCreateInstance(document.getElementById('batchesModal'));
    modal.show();
}

function convertToDateInput(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
}

function convertFromDateInput(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
}

function toggleEditBatch(productName, index) {
    const viewDiv = document.getElementById(`batch-view-${index}`);
    const editDiv = document.getElementById(`batch-edit-${index}`);
    const editBtn = document.querySelector(`#batch-${index} .edit-batch-btn`);
    
    if (viewDiv.classList.contains('d-none')) {
        // Guardar cambios
        saveBatchChanges(productName, index);
    } else {
        // Activar modo edición
        viewDiv.classList.add('d-none');
        editDiv.classList.remove('d-none');
        editBtn.innerHTML = '<i class="bi bi-save"></i>';
    }
}

function saveBatchChanges(productName, index) {
    const batch = productBatches[productName][index];
    
    // Obtener valores editados
    batch.lote = document.getElementById(`edit-lote-${index}`).value;
    batch.cantidad = document.getElementById(`edit-cantidad-${index}`).value;
    batch.caducidad = convertFromDateInput(document.getElementById(`edit-caducidad-${index}`).value);
    batch.ubicacion = document.getElementById(`edit-ubicacion-${index}`).value;
    batch.proveedor = document.getElementById(`edit-proveedor-${index}`).value;
    
    // Actualizar clase de caducidad
    const caducidadDate = new Date(document.getElementById(`edit-caducidad-${index}`).value);
    const today = new Date();
    const diffDays = Math.floor((caducidadDate - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 60) {
        batch.caducidadClass = 'text-danger';
    } else if (diffDays < 180) {
        batch.caducidadClass = 'text-warning';
    } else {
        batch.caducidadClass = 'text-success';
    }
    
    // Recargar el modal
    openBatchesModal(productName);
}

function cancelEditBatch(index) {
    const viewDiv = document.getElementById(`batch-view-${index}`);
    const editDiv = document.getElementById(`batch-edit-${index}`);
    const editBtn = document.querySelector(`#batch-${index} .edit-batch-btn`);
    
    viewDiv.classList.remove('d-none');
    editDiv.classList.add('d-none');
    editBtn.innerHTML = '<i class="bi bi-pencil"></i>';
}

function deleteBatch(productName, index) {
    if (confirm('¿Está seguro de que desea eliminar este lote?')) {
        productBatches[productName].splice(index, 1);
        openBatchesModal(productName);
    }
}

function exportBatches() {
    alert('Exportando lotes...');
}