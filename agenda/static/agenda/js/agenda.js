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
