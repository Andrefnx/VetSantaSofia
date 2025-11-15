// Datos de ejemplo, agrega los reales desde backend si es necesario
const consultas = [
    {
        titulo: "Depresión",
        medico: "Kathleen Curie-Galen, MD",
        fecha: "05/26/2012 – Presente",
        notas: "Duis sed odio sit amet nibh vulputate cursus a sit amet mauris. Nam nec tellus a odio tincidunt auctor a ornare odio.",
        diagnostico: "Depresión crónica",
        tratamiento: "Medicamentos y terapia",
        examenes: [
            { nombre: "Hemograma", url: "#" },
            { nombre: "Perfil Bioquímico", url: "#" }
        ],
        recomendaciones: "Control mensual",
        temp: "38.5°C",
        peso: "12.3 kg",
        fc: "90 lpm",
        fr: "22 rpm",
        otros: "Sin observaciones"
    },
    {
        titulo: "Fractura de pata",
        medico: "Dr. Martínez",
        fecha: "07/08/2011 – 08/30/2011",
        notas: "Proin gravida nibh vel velit auctor aliquet. Aenean sollicitudin lorem quis bibendum auctor nisi elit consequat.",
        diagnostico: "Fractura tibia derecha",
        tratamiento: "Inmovilización, analgésicos",
        examenes: [
            { nombre: "Radiografía", url: "#" }
        ],
        recomendaciones: "Reposo absoluto",
        temp: "38.1°C",
        peso: "11.8 kg",
        fc: "88 lpm",
        fr: "20 rpm",
        otros: "Vendaje controlado"
    }
    // ...agrega más si es necesario
];

// Mostrar modal de detalle
document.querySelectorAll('.timeline-btn').forEach((btn, idx) => {
    btn.addEventListener('click', () => {
        const consulta = consultas[idx] || consultas[0];
        document.getElementById('detalleTemp').textContent = consulta.temp || '-';
        document.getElementById('detallePeso').textContent = consulta.peso || '-';
        document.getElementById('detalleFC').textContent = consulta.fc || '-';
        document.getElementById('detalleFR').textContent = consulta.fr || '-';
        document.getElementById('detalleOtros').textContent = consulta.otros || '-';
        document.getElementById('detalleTitulo').innerHTML = `<i class="bi bi-clipboard2-pulse"></i> ${consulta.titulo}`;
        document.getElementById('detalleContenido').innerHTML = `
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-person-badge"></i> Médico Tratante</div>
                    <p>${consulta.medico}</p>
                </div>
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-calendar-event"></i> Fecha</div>
                    <p>${consulta.fecha}</p>
                </div>
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-clipboard2-check"></i> Diagnóstico</div>
                    <p>${consulta.diagnostico}</p>
                </div>
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-capsule"></i> Tratamiento</div>
                    <p>${consulta.tratamiento}</p>
                </div>
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-file-earmark-medical"></i> Exámenes</div>
                    <ul style="padding-left:1.2em;">
                        ${consulta.examenes.map(exam => `
                            <li>
                                <a href="${exam.url}" target="_blank" class="vet-link-exam">
                                    <i class="bi bi-file-earmark-text"></i> ${exam.nombre}
                                </a>
                            </li>
                        `).join('')}
                    </ul>
                </div>
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-journal-text"></i> Notas</div>
                    <p>${consulta.notas}</p>
                </div>
                <div class="detail-section">
                    <div class="detail-section-title"><i class="bi bi-lightbulb"></i> Recomendaciones</div>
                    <p>${consulta.recomendaciones}</p>
                </div>
            `;
        openVetModal('detalleConsultaModal');
    });
});

// Modal Nueva Consulta
document.getElementById('btnNuevaConsulta').onclick = function () {
    openVetModal('nuevaConsultaModal');
};
document.getElementById('closeNuevaConsultaModal').onclick = function () {
    closeVetModal('nuevaConsultaModal');
};
document.getElementById('closeNuevaConsultaModal').onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") closeVetModal('nuevaConsultaModal');
};

// Abrir modal de agendar cita
document.getElementById('btnAgendarCitaModal').onclick = function () {
    openVetModal('agendarCitaModal');
};
document.getElementById('closeAgendarCitaModal').onclick = function () {
    closeVetModal('agendarCitaModal');
};
document.getElementById('closeAgendarCitaModal').onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") closeVetModal('agendarCitaModal');
};

// Guardar cita agendada en gris
document.getElementById('formAgendarCita').onsubmit = function (e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());
    // Formatea fecha y hora
    const fecha = data.fecha ? data.fecha.split('-').reverse().join('/') : '-';
    const hora = data.hora || '-';
    const tipo = {
        hospitalizacion: 'Hospitalización',
        consulta: 'Consulta general',
        control: 'Control',
        vacunacion: 'Vacunación'
    }[data.tipo] || '-';
    const nuevaCitaHTML = `
            <div class="timeline-item nueva-consulta-agendada">
                <div class="timeline-content">
                    <h3 class="event-title" style="color:#555;"><i class="bi bi-calendar-plus"></i> Cita Agendada</h3>
                    <p class="event-subtitle" style="color:#888;">
                        Tipo: ${tipo}<br>
                        Fecha: ${fecha} ${hora ? 'a las ' + hora : ''}
                    </p>
                    <p class="event-notes" style="color:#888;">
                        ${data.notas || ''}
                    </p>
                </div>
            </div>
        `;
    document.getElementById('nuevasConsultas').insertAdjacentHTML('beforeend', nuevaCitaHTML);
    closeVetModal('agendarCitaModal');
    form.reset();
};

// Guardar nueva consulta en historial (blanca)
document.getElementById('formNuevaConsulta').onsubmit = function (e) {
    e.preventDefault();
    const form = e.target;
    const data = Object.fromEntries(new FormData(form).entries());

    // Obtener fecha del input (ya viene en formato dd/mm/yyyy)
    const fecha = data.fecha || new Date().toLocaleDateString('es-CL');
    // Extraer mes y año para la barra de la izquierda
    let mes = '', anio = '';
    if (fecha.includes('/')) {
        const partes = fecha.split('/');
        mes = new Date(`${partes[2]}-${partes[1]}-${partes[0]}`).toLocaleString('es-CL', { month: 'short' });
        anio = partes[2];
    } else {
        mes = new Date().toLocaleString('es-CL', { month: 'short' });
        anio = new Date().getFullYear();
    }

    const nuevaConsultaHTML = `
        <div class="timeline-item">
            <div class="timeline-date">
                <span class="month">${mes.charAt(0).toUpperCase() + mes.slice(1)}</span>
                <span class="year">${anio}</span>
            </div>
            <div class="timeline-marker"></div>
            <div class="timeline-content">
                <h3 class="event-title">${data.diagnostico || 'Consulta'}</h3>
                <p class="event-subtitle">
                    Médico Tratante: ${data.medico} <br>
                    ${fecha}
                </p>
                <p class="event-notes">
                    ${data.notas || ''}
                </p>
                <button class="timeline-btn">Ver detalle</button>
            </div>
        </div>
    `;
    document.getElementById('timeline').insertAdjacentHTML('beforeend', nuevaConsultaHTML);
    closeVetModal('nuevaConsultaModal');
    form.reset();
};

// Modal detalle: cerrar y editar
document.getElementById('closeDetalleModal').onclick = function () {
    closeVetModal('detalleConsultaModal');
};
document.getElementById('closeDetalleModal').onkeydown = function (e) {
    if (e.key === "Enter" || e.key === " ") closeVetModal('detalleConsultaModal');
};
document.getElementById('btnAgendarCita').onclick = function () {
    alert('Funcionalidad para agendar próxima cita');
};
document.getElementById('editarConsultaBtn').onclick = function () {
    alert('Funcionalidad para editar consulta');
};
window.onclick = function (event) {
    const modalDetalle = document.getElementById('detalleConsultaModal');
    const modalNueva = document.getElementById('nuevaConsultaModal');
    if (event.target === modalDetalle) closeVetModal('detalleConsultaModal');
    if (event.target === modalNueva) closeVetModal('nuevaConsultaModal');
};