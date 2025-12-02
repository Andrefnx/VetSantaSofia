
function saveNewPaciente() {
    const form = document.getElementById('addPacienteForm');
    const formData = new FormData(form);
    
    const data = {
        nombre: formData.get('nombre'),
        especie: formData.get('especie'),
        raza: formData.get('raza'),
        edad: formData.get('edad'),
        sexo: formData.get('sexo'),
        propietario: formData.get('propietario'),
    };
    
    fetch('{% url "crear_paciente" %}', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('Paciente creado exitosamente');
            // Redirigir a la ficha del paciente
            window.location.href = `/hospital/pacientes/${data.paciente_id}/`;
        } else {
            alert('Error: ' + data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Error al crear el paciente');
    });
}