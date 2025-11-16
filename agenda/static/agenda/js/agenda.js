document.addEventListener('DOMContentLoaded', function() {
    // Tabs
    document.querySelectorAll('.agenda-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.agenda-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.agenda-tab').forEach(tab => tab.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
        });
    });

    // Veterinarios y horas de ejemplo
    const vetHours = {
        1: ["09:00", "10:00", "11:00", "12:00"],
        2: ["11:00", "12:00", "13:00", "14:00"]
    };

    document.querySelectorAll('.vet-card').forEach(card => {
        card.addEventListener('click', function() {
            document.querySelectorAll('.vet-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            document.querySelector('.vet-hours-container').classList.remove('hidden');
            document.getElementById('vetSelectedName').textContent = card.querySelector('.vet-name').textContent;
            // Renderizar horas
            const vetId = card.dataset.vetId;
            const hoursGrid = document.querySelector('.hours-grid');
            hoursGrid.innerHTML = '';
            vetHours[vetId].forEach(hour => {
                const slot = document.createElement('div');
                slot.className = 'hour-slot';
                slot.textContent = hour;
                slot.addEventListener('click', function() {
                    document.querySelectorAll('.hour-slot').forEach(s => s.classList.remove('selected'));
                    slot.classList.add('selected');
                    document.getElementById('confirmHourBtn').disabled = false;
                    document.querySelector('.patient-selector-container').classList.remove('hidden');
                });
                hoursGrid.appendChild(slot);
            });
            document.getElementById('confirmHourBtn').disabled = true;
            document.querySelector('.patient-selector-container').classList.add('hidden');
        });
    });

    // Confirmar cita (solo ejemplo)
    document.getElementById('confirmHourBtn').addEventListener('click', function() {
        const vet = document.querySelector('.vet-card.selected .vet-name').textContent;
        const hour = document.querySelector('.hour-slot.selected').textContent;
        const patient = document.getElementById('patientSelect').selectedOptions[0].textContent;
        alert(`Cita agendada:\nVeterinario: ${vet}\nHora: ${hour}\nPaciente: ${patient}`);
    });

    document.addEventListener('click', function(e) {
        // Busca el .quarter-block más cercano al clic, que NO tenga .has-appointment
        const block = e.target.closest('.quarter-block:not(.has-appointment)');
        if (block) {
            const hour = block.getAttribute('data-hour');
            const minute = block.getAttribute('data-minute');
            let fecha = document.getElementById('currentDay')?.dataset?.date;
            if (!fecha) {
                const today = new Date();
                fecha = today.toISOString().slice(0,10);
            }

            // Mostrar el modal
            document.getElementById('agendarCitaModal').classList.remove('hide');

            // Rellenar los campos del formulario
            document.querySelector('#formAgendarCita input[name="fecha"]').value = fecha;
            document.querySelector('#formAgendarCita input[name="hora"]').value = `${hour}:${minute}`;
        }
    });

    // Cerrar modal al hacer clic en la X
    document.getElementById('closeAgendarCitaModal').addEventListener('click', function() {
        document.getElementById('agendarCitaModal').classList.add('hide');
    });
});

