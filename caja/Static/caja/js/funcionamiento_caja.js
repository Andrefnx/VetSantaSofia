let cart = [];
let selectedPaymentMethods = new Set();
let cashOpen = true;
let currentCategory = 'all';
let ventaEnProcesoId = null;  // Guardar el ID de la venta en proceso cargada

function switchCategory(element, category) {
    document.querySelectorAll('.product-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    element.classList.add('active');
    currentCategory = category;
    filterProducts();
}

function filterProducts() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const items = document.querySelectorAll('.product-list-item');

    items.forEach(item => {
        const name = item.querySelector('.info h6').textContent.toLowerCase();
        const category = item.getAttribute('data-category');
        const matchesSearch = name.includes(searchTerm);
        const matchesCategory = currentCategory === 'all' || category === currentCategory;

        if (matchesSearch && matchesCategory) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
}

function addToCart(name, price, tipo, id) {
    if (!cashOpen) {
        alert('La caja está cerrada. Por favor, abre la caja para realizar ventas.');
        return;
    }

    const existingItem = cart.find(item => item.name === name && item.tipo === tipo && item.id === id);

    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({ name, price, quantity: 1, tipo: tipo, id: id });
    }

    updateCart();
}

function updateCart() {
    const cartItemsDiv = document.getElementById('cartItems');
    const cartTotalDiv = document.getElementById('cartTotal');

    if (cart.length === 0) {
        cartItemsDiv.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart"></i>
                    <h6>Carrito vacío</h6>
                    <p>Agrega productos desde la lista</p>
                </div>
            `;
        cartTotalDiv.style.display = 'none';
        return;
    }

    cartItemsDiv.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="cart-item-info">
                    <h6>${item.name}</h6>
                    <p>$${item.price.toLocaleString()} c/u</p>
                </div>
                <div class="cart-item-controls">
                    <button class="qty-btn" onclick="decreaseQty(${index})">-</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn" onclick="increaseQty(${index})">+</button>
                </div>
                <div class="cart-item-price">$${(item.price * item.quantity).toLocaleString()}</div>
                <button class="cart-remove" onclick="removeFromCart(${index})">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');

    // Total con IVA incluido
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // Descomponer: subtotal = total / 1.19, iva = total - subtotal
    const subtotal = Math.round(total / 1.19);
    const iva = total - subtotal;

    document.getElementById('subtotal').textContent = '$' + subtotal.toLocaleString();
    document.getElementById('iva').textContent = '$' + iva.toLocaleString();
    document.getElementById('total').textContent = '$' + total.toLocaleString();

    cartTotalDiv.style.display = 'block';
    calcularPagos();
}

function increaseQty(index) {
    cart[index].quantity++;
    updateCart();
}

function decreaseQty(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity--;
    } else {
        cart.splice(index, 1);
    }
    updateCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function clearCart() {
    cart = [];
    ventaEnProcesoId = null;  // Limpiar ID de venta en proceso
    document.getElementById('clienteInput').value = '';

    selectedPaymentMethods.clear();
    document.querySelectorAll('.payment-method-compact').forEach(btn => {
        btn.classList.remove('active');
    });

    document.querySelectorAll('.payment-amount-input').forEach(input => {
        input.disabled = true;
        input.value = '';
    });

    document.getElementById('paymentSummary').style.display = 'none';
    updateCart();
}

function togglePaymentMethod(element, method) {
    const input = document.getElementById(method + 'Amount');

    if (selectedPaymentMethods.has(method)) {
        selectedPaymentMethods.delete(method);
        element.classList.remove('active');
        input.disabled = true;
        input.value = '';
    } else {
        selectedPaymentMethods.add(method);
        element.classList.add('active');
        input.disabled = false;
        input.focus();
    }

    calcularPagos();
}

function calcularPagos() {
    if (cart.length === 0) return;

    // Total con IVA ya incluido
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let totalRecibido = 0;

    selectedPaymentMethods.forEach(method => {
        const input = document.getElementById(method + 'Amount');
        const value = parseFloat(input.value) || 0;
        totalRecibido += value;
    });

    const diferencia = totalRecibido - total;

    if (selectedPaymentMethods.size > 0) {
        document.getElementById('paymentSummary').style.display = 'block';
        document.getElementById('totalRecibido').textContent = '$' + totalRecibido.toLocaleString();
        document.getElementById('totalAPagar').textContent = '$' + total.toLocaleString();

        const diferenciaElement = document.getElementById('diferencia');
        const diferenciaLabel = document.getElementById('diferenciaLabel');

        if (diferencia > 0) {
            diferenciaElement.textContent = '$' + diferencia.toLocaleString();
            diferenciaLabel.textContent = 'Vuelto:';
            diferenciaElement.classList.remove('negative', 'exact');
            diferenciaElement.classList.add('positive');
        } else if (diferencia < 0) {
            diferenciaElement.textContent = '-$' + Math.abs(diferencia).toLocaleString();
            diferenciaLabel.textContent = 'Falta:';
            diferenciaElement.classList.remove('positive', 'exact');
            diferenciaElement.classList.add('negative');
        } else {
            diferenciaElement.textContent = '$0';
            diferenciaLabel.textContent = 'Exacto:';
            diferenciaElement.classList.remove('positive', 'negative');
            diferenciaElement.classList.add('exact');
        }
    } else {
        document.getElementById('paymentSummary').style.display = 'none';
    }
}

async function procesarVentaDirecto() {
    if (cart.length === 0) {
        alert('El carrito está vacío');
        return;
    }

    // Cliente es opcional
    const cliente = document.getElementById('clienteInput').value;

    if (selectedPaymentMethods.size === 0) {
        alert('Por favor, selecciona al menos un método de pago');
        return;
    }

    // Total con IVA ya incluido
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    let totalRecibido = 0;
    let metodoPagoMap = {
        'efectivo': 0,
        'debito': 0,
        'credito': 0,
        'transferencia': 0
    };

    selectedPaymentMethods.forEach(method => {
        const input = document.getElementById(method + 'Amount');
        const value = parseFloat(input.value) || 0;
        totalRecibido += value;
        
        if (value > 0) {
            metodoPagoMap[method] = value;
        }
    });

    const diferencia = totalRecibido - total;

    if (diferencia < 0) {
        alert(`Falta dinero: $${Math.abs(diferencia).toLocaleString()}`);
        return;
    }

    // Determinar el método de pago principal
    let metodoPagoPrincipal = 'efectivo';
    if (selectedPaymentMethods.size === 1) {
        metodoPagoPrincipal = Array.from(selectedPaymentMethods)[0];
    } else if (selectedPaymentMethods.size > 1) {
        metodoPagoPrincipal = 'mixto';
    }

    try {
        let response, result;
        
        // ⭐ SI HAY UNA VENTA EN PROCESO (cobro pendiente), usar endpoint de confirmar pago
        if (ventaEnProcesoId) {
            console.log(`🔵 Confirmando pago de venta pendiente ID: ${ventaEnProcesoId}`);
            
            const url = `/caja/api/cobro/${ventaEnProcesoId}/confirmar-pago/`;
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify({
                    metodo_pago: metodoPagoPrincipal
                })
            });
            
            result = await response.json();
            
            // Limpiar ventaEnProcesoId después de procesar
            ventaEnProcesoId = null;
        } else {
            // ⭐ VENTA LIBRE DIRECTA - crear nueva venta
            console.log('🟢 Procesando venta libre directa');
            
            const ventaData = {
                items: cart.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    tipo: item.tipo,
                    id: item.id
                })),
                cliente: cliente || 'Cliente General',
                metodo_pago: metodoPagoPrincipal,
                detalles_pago: metodoPagoMap,
                total: total
            };

            response = await fetch(window.CAJA_URLS.procesarVenta, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(ventaData)
            });
            
            result = await response.json();
        }

        if (result.success) {
            // Mostrar mensaje de éxito
            let mensaje = `¡Venta procesada exitosamente!\n\nVenta N°: ${result.numero_venta}\nTotal: $${total.toLocaleString()}`;
            
            if (diferencia > 0) {
                mensaje += `\nVuelto: $${diferencia.toLocaleString()}`;
            }
            
            alert(mensaje);

            // Abrir boleta en nueva ventana/pestaña
            if (result.venta_id) {
                const boletaUrl = `/caja/boleta/${result.venta_id}/`;
                window.open(boletaUrl, '_blank');
            }

            // Limpiar carrito
            clearCart();

            // Actualizar contador de pagos pendientes
            await actualizarBadgePagosPendientes();
        } else {
            alert(`❌ Error al procesar la venta: ${result.error || 'Error desconocido'}`);
        }

    } catch (error) {
        console.error('Error al procesar venta:', error);
        alert('Error al procesar la venta. Por favor, intente nuevamente.');
    }
}

function toggleCashRegister() {
    if (cashOpen) {
        const cerrarModal = new bootstrap.Modal(document.getElementById('cerrarCajaModal'));
        cerrarModal.show();
    } else {
        const abrirModal = new bootstrap.Modal(document.getElementById('abrirCajaModal'));
        abrirModal.show();
    }
}

function openCashRegister() {
    cashOpen = true;

    const btn = document.getElementById('cashStatusBtn');
    btn.classList.remove('closed');
    btn.classList.add('open');

    document.getElementById('cashStatusLabel').textContent = 'Caja Abierta';

    const card = document.getElementById('cashStatusCard');
    card.classList.remove('closed');
    card.querySelector('h5').innerHTML = '<i class="fas fa-cash-register"></i> Caja Abierta';

    bootstrap.Modal.getInstance(document.getElementById('abrirCajaModal')).hide();

    alert('Caja abierta exitosamente');
}

function closeCashRegister() {
    cashOpen = false;

    const btn = document.getElementById('cashStatusBtn');
    btn.classList.remove('open');
    btn.classList.add('closed');

    document.getElementById('cashStatusLabel').textContent = 'Caja Cerrada';
    document.getElementById('cashAmount').textContent = '$0';

    const card = document.getElementById('cashStatusCard');
    card.classList.add('closed');
    card.querySelector('h5').innerHTML = '<i class="fas fa-lock"></i> Caja Cerrada';
    card.querySelector('.amount').textContent = '$0';

    bootstrap.Modal.getInstance(document.getElementById('cerrarCajaModal')).hide();

    clearCart();

    alert('Caja cerrada. Se ha generado el reporte de cierre.');
}

document.addEventListener('DOMContentLoaded', function () {
    if (!cashOpen) {
        const btn = document.getElementById('cashStatusBtn');
        btn.classList.remove('open');
        btn.classList.add('closed');
        document.getElementById('cashStatusLabel').textContent = 'Caja Cerrada';
        document.getElementById('cashAmount').textContent = '$0';
    }

    // Recuperar ventas huérfanas en estado 'en_proceso' al cargar
    recuperarVentasEnProceso();

    // Cargar contador de pagos pendientes al iniciar
    cargarContadorPagosPendientes();
});

/**
 * Detecta cuando se va a cerrar o recargar la página
 * Si hay una venta en proceso, la devuelve automáticamente a pendiente
 */
window.addEventListener('beforeunload', function (e) {
    if (ventaEnProcesoId && cart.length > 0) {
        // Usar fetch con keepalive para garantizar que se envíe antes de cerrar
        const url = window.CAJA_URLS.devolverAPendiente.replace('{id}', ventaEnProcesoId);
        
        const borradorData = {
            items: cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                tipo: item.tipo,
                id: item.id
            }))
        };
        
        // Usar fetch con keepalive para garantizar envío incluso al cerrar
        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            },
            body: JSON.stringify(borradorData),
            keepalive: true  // Crucial: permite que la petición se complete aunque se cierre la página
        }).catch(err => console.error('Error al devolver venta:', err));
        
        // Nota: No se puede usar async/await aquí porque beforeunload debe ser síncrono
    }
});

/**
 * Recupera ventas que quedaron en estado 'en_proceso' (huérfanas)
 * Esto puede pasar si el usuario recargó la página o cerró el navegador
 */
async function recuperarVentasEnProceso() {
    try {
        const response = await fetch('/caja/api/recuperar-ventas-proceso/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });
        
        const result = await response.json();
        
        if (result.success && result.ventas_recuperadas > 0) {
            console.log(`✅ ${result.ventas_recuperadas} venta(s) devuelta(s) a pendiente`);
        }
    } catch (error) {
        console.error('Error al recuperar ventas en proceso:', error);
    }
}

// =========== FUNCIONES PARA PAGOS PENDIENTES ===========

/**
 * Helper para obtener el CSRF token
 */
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

/**
 * Actualiza el badge con el número de pagos pendientes
 * Si no se proporciona cantidad, la recarga desde la API
 */
async function actualizarBadgePagosPendientes(cantidad) {
    const badge = document.getElementById('badgePagosPendientes');

    // Si no se proporciona cantidad, recargar desde la API
    if (cantidad === undefined) {
        try {
            const response = await fetch(window.CAJA_URLS.apiCobrosPendientes);
            const data = await response.json();
            if (data.success) {
                cantidad = data.total_cobros;
            } else {
                console.error('Error al obtener contador de pagos pendientes');
                return;
            }
        } catch (error) {
            console.error('Error al cargar contador:', error);
            return;
        }
    }

    console.log('Actualizando badge con cantidad:', cantidad);
    if (badge) {
        badge.textContent = cantidad;
        badge.style.display = cantidad > 0 ? 'block' : 'none';
        console.log('Badge actualizado - display:', badge.style.display);
    } else {
        console.error('Badge no encontrado!');
    }
}

/**
 * Carga el contador de pagos pendientes (sin abrir el modal)
 */
async function cargarContadorPagosPendientes() {
    try {
        console.log('Cargando contador de pagos pendientes...');
        const response = await fetch(window.CAJA_URLS.apiCobrosPendientes);
        const data = await response.json();
        console.log('Respuesta del API:', data);
        if (data.success) {
            console.log('Total de cobros:', data.total_cobros);
            actualizarBadgePagosPendientes(data.total_cobros);
        } else {
            console.error('API retornó success=false');
        }
    } catch (error) {
        console.error('Error al cargar contador de pagos pendientes:', error);
    }
}

/**
 * Abre el modal de pagos pendientes y carga los datos desde el API
 */
function abrirModalPagosPendientes() {
    const modal = document.getElementById('pagosPendientesModal');
    modal.classList.remove('hide');
    modal.classList.add('show');
    cargarPagosPendientes();
}

/**
 * Cierra el modal de pagos pendientes
 */
function cerrarModalPagosPendientes() {
    const modal = document.getElementById('pagosPendientesModal');
    modal.classList.remove('show');
    modal.classList.add('hide');
}

/**
 * Guarda el carrito actual como borrador (devuelve a estado 'pendiente')
 * Si el carrito fue cargado desde un pago pendiente, lo devuelve a la lista
 * Si es un carrito nuevo, lo crea como venta pendiente
 */
async function guardarBorrador() {
    if (cart.length === 0) {
        alert('El carrito está vacío');
        return;
    }

    if (!confirm('¿Guardar como borrador?\n\nEl carrito se guardará en Pagos Pendientes.')) {
        return;
    }

    try {
        // Si hay una venta en proceso cargada, devolverla a pendiente
        if (ventaEnProcesoId) {
            const url = window.CAJA_URLS.devolverAPendiente.replace('{id}', ventaEnProcesoId);
            
            // Enviar los items actuales del carrito para actualizar la venta
            const borradorData = {
                items: cart.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    tipo: item.tipo,
                    id: item.id
                }))
            };
            
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(borradorData)
            });

            const result = await response.json();

            if (result.success) {
                alert(`✅ ${result.message}`);
                clearCart();
                await actualizarBadgePagosPendientes();
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        } else {
            // Si es un carrito nuevo, crear venta pendiente
            const cliente = document.getElementById('clienteInput').value;
            
            const borradorData = {
                items: cart.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    tipo: item.tipo,
                    id: item.id
                })),
                cliente: cliente || 'Cliente General'
            };

            const response = await fetch(window.CAJA_URLS.guardarBorrador, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCookie('csrftoken')
                },
                body: JSON.stringify(borradorData)
            });

            const result = await response.json();

            if (result.success) {
                alert(`✅ ${result.message}\n\nPodrás completar el pago desde "Pagos Pendientes".`);
                clearCart();
                await actualizarBadgePagosPendientes();
            } else {
                alert(`❌ Error: ${result.error}`);
            }
        }
    } catch (error) {
        console.error('Error al guardar borrador:', error);
        alert('Error al guardar el borrador: ' + error.message);
    }
}

/**
 * Carga la lista de pagos pendientes desde el API
 */
async function cargarPagosPendientes() {
    const loadingDiv = document.getElementById('pagosPendientesLoading');
    const contentDiv = document.getElementById('pagosPendientesContent');
    const errorDiv = document.getElementById('pagosPendientesError');
    const noPagosDiv = document.getElementById('noPagosPendientes');

    // Mostrar loading
    loadingDiv.style.display = 'block';
    contentDiv.style.display = 'none';
    errorDiv.style.display = 'none';

    try {
        const response = await fetch(window.CAJA_URLS.apiCobrosPendientes);

        if (!response.ok) {
            throw new Error('Error al cargar los pagos pendientes');
        }

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.error || 'Error desconocido');
        }

        // Ocultar loading
        loadingDiv.style.display = 'none';

        if (data.cobros.length === 0) {
            // No hay pagos pendientes
            contentDiv.style.display = 'block';
            noPagosDiv.style.display = 'block';
            document.querySelector('#pagosPendientesContent .table-responsive').style.display = 'none';
            actualizarBadgePagosPendientes(0);
        } else {
            // Mostrar tabla con pagos
            contentDiv.style.display = 'block';
            noPagosDiv.style.display = 'none';
            document.querySelector('#pagosPendientesContent .table-responsive').style.display = 'block';
            renderizarPagosPendientes(data.cobros);
            actualizarBadgePagosPendientes(data.cobros.length);
        }

    } catch (error) {
        console.error('Error al cargar pagos pendientes:', error);
        loadingDiv.style.display = 'none';
        errorDiv.style.display = 'block';
        document.getElementById('pagosPendientesErrorMsg').textContent = error.message;
    }
}

/**
 * Renderiza la lista de pagos pendientes en la tabla
 */
function renderizarPagosPendientes(cobros) {
    const tbody = document.getElementById('pagosPendientesList');

    tbody.innerHTML = cobros.map(cobro => {
        // Filtrar servicios e insumos
        const servicios = cobro.detalles.filter(d => d.tipo === 'servicio');
        const insumos = cobro.detalles.filter(d => d.tipo === 'insumo');

        // Construir lista de items
        const listaServicios = servicios.length > 0
            ? servicios.map(s => `${s.descripcion} (x${s.cantidad})`).join('<br>')
            : '-';
        const listaInsumos = insumos.length > 0
            ? insumos.map(i => `${i.descripcion} (x${i.cantidad})`).join('<br>')
            : '-';

        // Origen como texto plano
        let origenTexto = cobro.tipo_origen_display || 'Manual';

        return `
                <tr>
                    <td><strong>${cobro.numero_venta}</strong></td>
                    <td>${origenTexto}</td>
                    <td>${cobro.paciente || '-'}</td>
                    <td style="font-size: 0.85rem;">${listaServicios}</td>
                    <td style="font-size: 0.85rem;">${listaInsumos}</td>
                    <td><strong style="color: #10b981;">$${cobro.total.toLocaleString()}</strong></td>
                    <td style="font-size: 0.85rem;">${cobro.fecha_creacion}</td>
                    <td style="white-space: nowrap;">
                        <button class="btn btn-sm btn-primary" onclick="cargarPagoPendiente(${cobro.id})" style="margin-right: 5px; display: inline-block;">
                            <i class="fas fa-download"></i> Cargar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="eliminarCobroPendiente(${cobro.id}, '${cobro.numero_venta}')" title="Cancelar cobro" style="display: inline-block;">
                            <i class="fas fa-times"></i>
                        </button>
                    </td>
                </tr>
            `;
    }).join('');
}

/**
 * Elimina/cancela un cobro pendiente
 */
async function eliminarCobroPendiente(ventaId, numeroVenta) {
    if (!confirm(`¿Está seguro de cancelar el cobro ${numeroVenta}?\n\nEsta acción no se puede deshacer.`)) {
        return;
    }

    try {
        const url = window.CAJA_URLS.eliminarCobro.replace('{id}', ventaId);
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const result = await response.json();

        if (result.success) {
            alert(`✅ ${result.message}`);
            // Recargar la lista de cobros pendientes
            cargarPagosPendientes();
        } else {
            alert(`❌ Error: ${result.error}`);
        }

    } catch (error) {
        console.error('Error al eliminar cobro pendiente:', error);
        alert('Error al eliminar el cobro pendiente: ' + error.message);
    }
}

/**
 * Carga un pago pendiente en el carrito de caja
 */
async function cargarPagoPendiente(ventaId) {
    try {
        // 1. Primero obtener los datos de la venta ANTES de cambiar el estado
        const response = await fetch(window.CAJA_URLS.apiCobrosPendientes);
        const data = await response.json();

        if (!data.success) {
            throw new Error('Error al obtener los detalles de la venta');
        }

        const venta = data.cobros.find(c => c.id === ventaId);

        if (!venta) {
            throw new Error('Venta no encontrada');
        }

        // 2. Ahora sí, marcar como "en proceso" para sacarlo de la lista
        const url = window.CAJA_URLS.marcarEnProceso.replace('{id}', ventaId);
        const marcarResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken')
            }
        });

        const marcarData = await marcarResponse.json();
        if (!marcarData.success) {
            throw new Error(marcarData.error || 'Error al marcar como en proceso');
        }

        // Limpiar el carrito actual
        cart = [];
        ventaEnProcesoId = ventaId;  // Guardar el ID de la venta en proceso

        // Agregar cada detalle al carrito
        venta.detalles.forEach(detalle => {
            cart.push({
                id: detalle.tipo === 'servicio' ? detalle.servicio_id : detalle.insumo_id,
                name: detalle.descripcion,
                price: detalle.precio_unitario,
                quantity: detalle.cantidad,
                tipo: detalle.tipo
            });
        });

        // Actualizar UI del carrito
        updateCart();

        // Actualizar contador de pagos pendientes (debe disminuir en 1)
        await actualizarBadgePagosPendientes();

        // Cerrar el modal
        cerrarModalPagosPendientes();

        // Mostrar mensaje de éxito
        alert(`Pago pendiente ${venta.numero_venta} cargado exitosamente.\nTotal: $${venta.total.toLocaleString()}`);

        // Si hay paciente, establecerlo (opcional)
        if (venta.paciente) {
            document.getElementById('clienteInput').value = venta.paciente;
        }

    } catch (error) {
        console.error('Error al cargar pago pendiente:', error);
        alert('Error al cargar el pago pendiente: ' + error.message);
    }
}