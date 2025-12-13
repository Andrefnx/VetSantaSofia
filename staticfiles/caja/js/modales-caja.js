/**
 * Sistema de Modales para Caja
 * Modales para: declarar insumos, editar cobro, confirmar pago
 */

// =============================================================================
// MODAL: Declarar Insumos Utilizados (cuando faltan datos para cálculo)
// =============================================================================

function abrirModalDeclararInsumo(insumoId, consultaId, tipo = 'consulta') {
    const modal = document.getElementById('modalDeclararInsumo');
    if (!modal) {
        crearModalDeclararInsumo();
    }
    
    // Cargar datos del insumo
    fetch(`/inventario/api/insumo/${insumoId}/`)
        .then(r => r.json())
        .then(insumo => {
            document.getElementById('insumoNombre').textContent = insumo.medicamento;
            document.getElementById('insumoId').value = insumoId;
            document.getElementById('origenTipo').value = tipo;
            document.getElementById('origenId').value = consultaId;
            
            // Mostrar qué datos faltan
            let datosFaltantes = [];
            if (!insumo.dosis_ml) datosFaltantes.push('Dosis ml/kg');
            if (!insumo.ml_contenedor) datosFaltantes.push('ML por contenedor');
            
            if (datosFaltantes.length > 0) {
                document.getElementById('datosFaltantes').innerHTML = `
                    <div class="alert alert-warning">
                        <strong>Faltan datos:</strong> ${datosFaltantes.join(', ')}
                    </div>
                `;
            }
            
            $('#modalDeclararInsumo').modal('show');
        });
}

function crearModalDeclararInsumo() {
    const modalHTML = `
        <div class="modal fade" id="modalDeclararInsumo" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Declarar Insumos Utilizados</h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <h6>Insumo: <strong id="insumoNombre"></strong></h6>
                        
                        <div id="datosFaltantes"></div>
                        
                        <form id="formDeclararInsumo">
                            <input type="hidden" id="insumoId" name="insumo_id">
                            <input type="hidden" id="origenTipo" name="origen_tipo">
                            <input type="hidden" id="origenId" name="origen_id">
                            
                            <div class="form-group">
                                <label>Cantidad de ítems utilizados</label>
                                <input type="number" class="form-control" id="cantidadManual" 
                                       name="cantidad" min="1" step="1" value="1" required>
                                <small class="form-text text-muted">
                                    ¿Cuántos frascos/envases se utilizaron?
                                </small>
                            </div>
                            
                            <div class="form-group">
                                <label>Dosis ml/kg (opcional)</label>
                                <input type="number" class="form-control" id="dosisManual" 
                                       name="dosis_ml_kg" step="0.01">
                            </div>
                            
                            <div class="form-group">
                                <label>ML por contenedor (opcional)</label>
                                <input type="number" class="form-control" id="mlContenedorManual" 
                                       name="ml_contenedor" step="0.01">
                            </div>
                            
                            <div class="form-group">
                                <label>Observaciones</label>
                                <textarea class="form-control" id="observaciones" 
                                          name="observaciones" rows="2"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">
                            Cancelar
                        </button>
                        <button type="button" class="btn btn-primary" onclick="confirmarDeclaracionInsumo()">
                            <i class="fas fa-check"></i> Confirmar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function confirmarDeclaracionInsumo() {
    const form = document.getElementById('formDeclararInsumo');
    const formData = new FormData(form);
    
    fetch('/clinica/api/confirmar-insumo/', {
        method: 'POST',
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            alert('Insumo registrado correctamente');
            $('#modalDeclararInsumo').modal('hide');
            location.reload();
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(err => {
        alert('Error al confirmar: ' + err);
    });
}


// =============================================================================
// MODAL: Editar Cobro Pendiente
// =============================================================================

function abrirModalEditarCobro(ventaId) {
    fetch(`/caja/api/venta/${ventaId}/`)
        .then(r => r.json())
        .then(venta => {
            cargarModalEditarCobro(venta);
            $('#modalEditarCobro').modal('show');
        });
}

function cargarModalEditarCobro(venta) {
    if (!document.getElementById('modalEditarCobro')) {
        crearModalEditarCobro();
    }
    
    document.getElementById('ventaIdEditar').value = venta.id;
    document.getElementById('numeroVentaEditar').textContent = venta.numero_venta;
    
    // Cargar detalles
    let detallesHTML = '';
    venta.detalles.forEach(detalle => {
        detallesHTML += `
            <tr>
                <td>${detalle.descripcion}</td>
                <td>
                    <input type="number" class="form-control form-control-sm" 
                           value="${detalle.cantidad}" 
                           onchange="modificarCantidad(${detalle.id}, this.value)"
                           min="0" step="0.01">
                </td>
                <td>$${detalle.precio_unitario}</td>
                <td>$${detalle.subtotal}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="eliminarDetalle(${detalle.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    document.getElementById('detallesVentaEditar').innerHTML = detallesHTML;
    document.getElementById('totalVentaEditar').textContent = venta.total;
}

function crearModalEditarCobro() {
    const modalHTML = `
        <div class="modal fade" id="modalEditarCobro" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">
                            Editar Cobro: <span id="numeroVentaEditar"></span>
                        </h5>
                        <button type="button" class="close" data-dismiss="modal">
                            <span>&times;</span>
                        </button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="ventaIdEditar">
                        
                        <!-- Detalles actuales -->
                        <h6>Detalles del Cobro</h6>
                        <div class="table-responsive">
                            <table class="table table-sm">
                                <thead>
                                    <tr>
                                        <th>Descripción</th>
                                        <th width="100">Cantidad</th>
                                        <th width="100">Precio</th>
                                        <th width="100">Subtotal</th>
                                        <th width="50"></th>
                                    </tr>
                                </thead>
                                <tbody id="detallesVentaEditar">
                                </tbody>
                            </table>
                        </div>
                        
                        <hr>
                        
                        <!-- Agregar items -->
                        <h6>Agregar Item</h6>
                        <div class="row">
                            <div class="col-md-6">
                                <button class="btn btn-sm btn-primary" onclick="mostrarAgregarServicio()">
                                    <i class="fas fa-plus"></i> Agregar Servicio
                                </button>
                            </div>
                            <div class="col-md-6">
                                <button class="btn btn-sm btn-success" onclick="mostrarAgregarInsumo()">
                                    <i class="fas fa-plus"></i> Agregar Insumo
                                </button>
                            </div>
                        </div>
                        
                        <div id="formAgregarItem" class="mt-3" style="display: none;">
                            <!-- Se carga dinámicamente -->
                        </div>
                        
                        <hr>
                        
                        <!-- Descuento -->
                        <div class="row">
                            <div class="col-md-6">
                                <label>Descuento</label>
                                <input type="number" class="form-control" id="descuentoVenta" 
                                       placeholder="0.00" step="0.01" min="0">
                            </div>
                            <div class="col-md-6">
                                <label>Motivo del descuento</label>
                                <input type="text" class="form-control" id="motivoDescuento">
                            </div>
                        </div>
                        
                        <button class="btn btn-sm btn-warning mt-2" onclick="aplicarDescuento()">
                            Aplicar Descuento
                        </button>
                        
                        <hr>
                        
                        <!-- Total -->
                        <h4 class="text-right">
                            Total: $<span id="totalVentaEditar">0.00</span>
                        </h4>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-dismiss="modal">
                            Cerrar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function modificarCantidad(detalleId, nuevaCantidad) {
    fetch(`/caja/detalle/${detalleId}/modificar-cantidad/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({cantidad: nuevaCantidad})
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            document.getElementById('totalVentaEditar').textContent = data.total_venta;
        } else {
            alert('Error: ' + data.error);
        }
    });
}

function eliminarDetalle(detalleId) {
    if (!confirm('¿Eliminar este item?')) return;
    
    fetch(`/caja/detalle/${detalleId}/eliminar/`, {
        method: 'POST'
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            document.getElementById('totalVentaEditar').textContent = data.total_venta;
            // Recargar modal
            const ventaId = document.getElementById('ventaIdEditar').value;
            abrirModalEditarCobro(ventaId);
        } else {
            alert('Error: ' + data.error);
        }
    });
}

function aplicarDescuento() {
    const ventaId = document.getElementById('ventaIdEditar').value;
    const descuento = document.getElementById('descuentoVenta').value;
    const motivo = document.getElementById('motivoDescuento').value;
    
    fetch(`/caja/venta/${ventaId}/aplicar-descuento/`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({descuento, motivo})
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            document.getElementById('totalVentaEditar').textContent = data.total;
            alert('Descuento aplicado');
        } else {
            alert('Error: ' + data.error);
        }
    });
}


// =============================================================================
// UTILIDADES
// =============================================================================

function formatearPrecio(numero) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP'
    }).format(numero);
}

// Exportar funciones globalmente
window.abrirModalDeclararInsumo = abrirModalDeclararInsumo;
window.abrirModalEditarCobro = abrirModalEditarCobro;
window.modificarCantidad = modificarCantidad;
window.eliminarDetalle = eliminarDetalle;
window.aplicarDescuento = aplicarDescuento;
window.confirmarDeclaracionInsumo = confirmarDeclaracionInsumo;
