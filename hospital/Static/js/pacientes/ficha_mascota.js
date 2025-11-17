// JavaScript para la página de ficha de mascota

// Función para abrir el modal de editar mascota
function openEditarMascotaModal() {
    document.getElementById('modalEditarMascota').classList.remove('hide');
    document.getElementById('modalEditarMascota').classList.add('show');
}

// Función para cerrar el modal de editar mascota
function closeEditarMascotaModal() {
    document.getElementById('modalEditarMascota').classList.add('hide');
    document.getElementById('modalEditarMascota').classList.remove('show');
}

// Event listener para el botón "Editar Ficha"
document.getElementById('btnEditarFicha').addEventListener('click', function() {
    // Obtener el ID de la mascota desde la URL
    const urlParts = window.location.pathname.split('/');
    const mascotaId = urlParts[urlParts.length - 2]; // Asumiendo que el ID está en la penúltima parte

    // Fetch para obtener los datos de la mascota
    fetch(`/hospital/pacientes/${mascotaId}/data/`)
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                alert('Error al cargar los datos del paciente: ' + data.error);
            } else {
                // Llenar los campos del modal con los datos obtenidos
                document.getElementById('edit-nombre').value = data.nombreMascota || '';
                document.getElementById('edit-especie').value = data.animal_mascota || '';
                document.getElementById('edit-raza').value = data.raza_mascota || '';
                document.getElementById('edit-edad').value = data.edad || '';
                document.getElementById('edit-sexo').value = data.sexo || '';
                document.getElementById('edit-peso').value = data.peso || '';
                document.getElementById('edit-chip').value = data.chip || '';

                // Datos del cliente
                document.getElementById('edit-rutCliente').value = data.idCliente.rutCliente || '';
                document.getElementById('edit-dvCliente').value = data.idCliente.dvCliente || '';
                document.getElementById('edit-nombreCliente').value = data.idCliente.nombreCliente || '';
                document.getElementById('edit-telCliente').value = data.idCliente.telCliente || '';
                document.getElementById('edit-emailCliente').value = data.idCliente.emailCliente || '';
                document.getElementById('edit-direccion').value = data.idCliente.direccion || '';

                // Abrir el modal
                openEditarMascotaModal();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al cargar los datos del paciente');
        });
});

// Función para guardar los cambios de la mascota
function guardarEditarMascota() {
    const urlParts = window.location.pathname.split('/');
    const mascotaId = urlParts[urlParts.length - 2];

    // Recopilar los datos del formulario
    const data = {
        nombre: document.getElementById('edit-nombre').value,
        especie: document.getElementById('edit-especie').value,
        raza: document.getElementById('edit-raza').value,
        edad: document.getElementById('edit-edad').value,
        sexo: document.getElementById('edit-sexo').value,
        peso: document.getElementById('edit-peso').value,
        chip: document.getElementById('edit-chip').value,
        rutCliente: document.getElementById('edit-rutCliente').value,
        dvCliente: document.getElementById('edit-dvCliente').value,
        nombreCliente: document.getElementById('edit-nombreCliente').value,
        telCliente: document.getElementById('edit-telCliente').value,
        emailCliente: document.getElementById('edit-emailCliente').value,
        direccion: document.getElementById('edit-direccion').value
    };

    // Enviar los datos al backend
    fetch(`/hospital/pacientes/${mascotaId}/editar/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Cerrar el modal y recargar la página
            closeEditarMascotaModal();
            location.reload();
        } else {
            alert('Error al guardar los cambios: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al guardar los cambios');
    });
}

// Event listener para el botón de cerrar el modal
document.getElementById('closeEditarMascotaModal').addEventListener('click', function() {
    closeEditarMascotaModal();
});

// Event listener para cerrar el modal al hacer clic fuera de él
document.getElementById('modalEditarMascota').addEventListener('click', function(event) {
    if (event.target === this) {
        closeEditarMascotaModal();
    }
});
