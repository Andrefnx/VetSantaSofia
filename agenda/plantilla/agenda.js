// Feriados de Chile (se cargarán dinámicamente)
let feriadosChile = [];

// Función para cargar feriados desde la API
async function cargarFeriados(year) {
    try {
        console.log(`Cargando feriados para el año ${year}...`);
        // API pública de feriados de Chile
        const response = await fetch(`https://apis.digital.gob.cl/fl/feriados/${year}`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✓ Feriados ${year} cargados:`, data.length);
        
        // Procesar los feriados
        const feriadosDelAno = data.map(feriado => {
            return {
                date: feriado.fecha,
                name: feriado.nombre,
                irrenunciable: feriado.irrenunciable === '1' || feriado.tipo === 'Irrenunciable'
            };
        });
        
        return feriadosDelAno;
    } catch (error) {
        console.error(`Error al cargar feriados del ${year}:`, error);
        console.log(`Usando feriados de respaldo para ${year}`);
        // Retornar feriados básicos como fallback
        return getFeriadosFallback(year);
    }
}

// Feriados de respaldo en caso de que falle la API
function getFeriadosFallback(year) {
    // Solo tenemos fallback para 2025
    if (year === 2025) {
        console.log(`Usando datos de respaldo para ${year}`);
        return [
            { date: '2025-01-01', name: 'Año Nuevo', irrenunciable: true },
            { date: '2025-04-18', name: 'Viernes Santo', irrenunciable: false },
            { date: '2025-04-19', name: 'Sábado Santo', irrenunciable: false },
            { date: '2025-05-01', name: 'Día del Trabajo', irrenunciable: true },
            { date: '2025-05-21', name: 'Día de las Glorias Navales', irrenunciable: false },
            { date: '2025-06-20', name: 'Día de los Pueblos Indígenas', irrenunciable: false },
            { date: '2025-06-29', name: 'San Pedro y San Pablo', irrenunciable: false },
            { date: '2025-07-16', name: 'Día de la Virgen del Carmen', irrenunciable: false },
            { date: '2025-08-15', name: 'Asunción de la Virgen', irrenunciable: false },
            { date: '2025-09-18', name: 'Independencia Nacional', irrenunciable: true },
            { date: '2025-09-19', name: 'Día de las Glorias del Ejército', irrenunciable: true },
            { date: '2025-10-12', name: 'Encuentro de Dos Mundos', irrenunciable: false },
            { date: '2025-10-31', name: 'Día de las Iglesias Evangélicas', irrenunciable: false },
            { date: '2025-11-01', name: 'Día de Todos los Santos', irrenunciable: false },
            { date: '2025-12-08', name: 'Inmaculada Concepción', irrenunciable: false },
            { date: '2025-12-25', name: 'Navidad', irrenunciable: true }
        ];
    }
    
    if (year === 2026) {
        console.log(`Usando datos de respaldo para ${year}`);
        return [
            { date: '2026-01-01', name: 'Año Nuevo', irrenunciable: true },
            { date: '2026-04-03', name: 'Viernes Santo', irrenunciable: false },
            { date: '2026-04-04', name: 'Sábado Santo', irrenunciable: false },
            { date: '2026-05-01', name: 'Día del Trabajo', irrenunciable: true },
            { date: '2026-05-21', name: 'Día de las Glorias Navales', irrenunciable: false },
            { date: '2026-06-21', name: 'Día de los Pueblos Indígenas', irrenunciable: false },
            { date: '2026-06-29', name: 'San Pedro y San Pablo', irrenunciable: false },
            { date: '2026-07-16', name: 'Día de la Virgen del Carmen', irrenunciable: false },
            { date: '2026-08-15', name: 'Asunción de la Virgen', irrenunciable: false },
            { date: '2026-09-18', name: 'Independencia Nacional', irrenunciable: true },
            { date: '2026-09-19', name: 'Día de las Glorias del Ejército', irrenunciable: true },
            { date: '2026-10-12', name: 'Encuentro de Dos Mundos', irrenunciable: false },
            { date: '2026-10-31', name: 'Día de las Iglesias Evangélicas', irrenunciable: false },
            { date: '2026-11-01', name: 'Día de Todos los Santos', irrenunciable: false },
            { date: '2026-12-08', name: 'Inmaculada Concepción', irrenunciable: false },
            { date: '2026-12-25', name: 'Navidad', irrenunciable: true }
        ];
    }
    
    console.log(`No hay datos de respaldo para ${year}, retornando array vacío`);
    // Para otros años, devolver array vacío (los feriados se obtendrán de la API)
    return [];
}

// Datos falsos de citas veterinarias
const citasVeterinarias = [
    // Luna - Consulta veterinaria (60 min) - 09:00
    {
        date: '2025-12-08',
        nombreMascota: 'Luna',
        tipoMascota: 'Perro',
        raza: 'Golden Retriever',
        tutor: 'María González',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '09:00',
        tipoCita: 'Consulta veterinaria',
        duracionServicio: 60,
        telefono: '+56 9 8765 4321',
        correo: 'maria.gonzalez@email.com',
        esBloqueInicial: true,
        bloquesDeTiempo: 4
    },
    {
        date: '2025-12-08',
        nombreMascota: 'Luna',
        tipoMascota: 'Perro',
        raza: 'Golden Retriever',
        tutor: 'María González',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '09:15',
        tipoCita: 'Consulta veterinaria',
        duracionServicio: 60,
        telefono: '+56 9 8765 4321',
        correo: 'maria.gonzalez@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 4
    },
    {
        date: '2025-12-08',
        nombreMascota: 'Luna',
        tipoMascota: 'Perro',
        raza: 'Golden Retriever',
        tutor: 'María González',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '09:30',
        tipoCita: 'Consulta veterinaria',
        duracionServicio: 60,
        telefono: '+56 9 8765 4321',
        correo: 'maria.gonzalez@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 4
    },
    {
        date: '2025-12-08',
        nombreMascota: 'Luna',
        tipoMascota: 'Perro',
        raza: 'Golden Retriever',
        tutor: 'María González',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '09:45',
        tipoCita: 'Consulta veterinaria',
        duracionServicio: 60,
        telefono: '+56 9 8765 4321',
        correo: 'maria.gonzalez@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 4
    },
    // Thor - Vacuna (10 min) - 09:00
    {
        date: '2025-12-08',
        nombreMascota: 'Thor',
        tipoMascota: 'Perro',
        raza: 'Husky Siberiano',
        tutor: 'Daniela Castro',
        veterinario: 'Dra. Ana López',
        hora: '09:00',
        tipoCita: 'Vacuna',
        duracionServicio: 10,
        telefono: '+56 9 9876 5432',
        correo: 'daniela.castro@email.com',
        esBloqueInicial: true,
        bloquesDeTiempo: 1
    },
    // Michi - Corte de uñas (15 min) - 10:30
    {
        date: '2025-12-08',
        nombreMascota: 'Michi',
        tipoMascota: 'Gato',
        raza: 'Persa',
        tutor: 'Pedro Soto',
        veterinario: 'Dra. Ana López',
        hora: '10:30',
        tipoCita: 'Corte de uñas',
        duracionServicio: 15,
        telefono: '+56 9 7654 3210',
        correo: 'pedro.soto@email.com',
        esBloqueInicial: true,
        bloquesDeTiempo: 1
    },
    // Max - Cirugía menor (120 min) - 14:00
    {
        date: '2025-12-08',
        nombreMascota: 'Max',
        tipoMascota: 'Perro',
        raza: 'Pastor Alemán',
        tutor: 'Carmen Díaz',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '14:00',
        tipoCita: 'Cirugía menor',
        duracionServicio: 120,
        telefono: '+56 9 6543 2109',
        correo: 'carmen.diaz@email.com',
        esBloqueInicial: true,
        bloquesDeTiempo: 8
    },
    {
        date: '2025-12-08',
        nombreMascota: 'Max',
        tipoMascota: 'Perro',
        raza: 'Pastor Alemán',
        tutor: 'Carmen Díaz',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '14:15',
        tipoCita: 'Cirugía menor',
        duracionServicio: 120,
        telefono: '+56 9 6543 2109',
        correo: 'carmen.diaz@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 8
    },
    {
        date: '2025-12-08',
        nombreMascota: 'Max',
        tipoMascota: 'Perro',
        raza: 'Pastor Alemán',
        tutor: 'Carmen Díaz',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '14:30',
        tipoCita: 'Cirugía menor',
        duracionServicio: 120,
        telefono: '+56 9 6543 2109',
        correo: 'carmen.diaz@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 8
    },
    {
        date: '2025-12-08',
        nombreMascota: 'Max',
        tipoMascota: 'Perro',
        raza: 'Pastor Alemán',
        tutor: 'Carmen Díaz',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '14:45',
        tipoCita: 'Cirugía menor',
        duracionServicio: 120,
        telefono: '+56 9 6543 2109',
        correo: 'carmen.diaz@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 8
    },
    {
        date: '2025-12-08',
        nombreMascota: 'Max',
        tipoMascota: 'Perro',
        raza: 'Pastor Alemán',
        tutor: 'Carmen Díaz',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '15:00',
        tipoCita: 'Cirugía menor',
        duracionServicio: 120,
        telefono: '+56 9 6543 2109',
        correo: 'carmen.diaz@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 8
    },
    {
        date: '2025-12-08',
        nombreMascota: 'Max',
        tipoMascota: 'Perro',
        raza: 'Pastor Alemán',
        tutor: 'Carmen Díaz',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '15:15',
        tipoCita: 'Cirugía menor',
        duracionServicio: 120,
        telefono: '+56 9 6543 2109',
        correo: 'carmen.diaz@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 8
    },
    {
        date: '2025-12-08',
        nombreMascota: 'Max',
        tipoMascota: 'Perro',
        raza: 'Pastor Alemán',
        tutor: 'Carmen Díaz',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '15:30',
        tipoCita: 'Cirugía menor',
        duracionServicio: 120,
        telefono: '+56 9 6543 2109',
        correo: 'carmen.diaz@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 8
    },
    {
        date: '2025-12-08',
        nombreMascota: 'Max',
        tipoMascota: 'Perro',
        raza: 'Pastor Alemán',
        tutor: 'Carmen Díaz',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '15:45',
        tipoCita: 'Cirugía menor',
        duracionServicio: 120,
        telefono: '+56 9 6543 2109',
        correo: 'carmen.diaz@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 8
    },
    // Pelusa - Control general (30 min) - 16:30
    {
        date: '2025-12-08',
        nombreMascota: 'Pelusa',
        tipoMascota: 'Gato',
        raza: 'Siamés',
        tutor: 'Jorge Morales',
        veterinario: 'Dra. Ana López',
        hora: '16:30',
        tipoCita: 'Control general',
        duracionServicio: 30,
        telefono: '+56 9 5432 1098',
        correo: 'jorge.morales@email.com',
        esBloqueInicial: true,
        bloquesDeTiempo: 2
    },
    {
        date: '2025-12-08',
        nombreMascota: 'Pelusa',
        tipoMascota: 'Gato',
        raza: 'Siamés',
        tutor: 'Jorge Morales',
        veterinario: 'Dra. Ana López',
        hora: '16:45',
        tipoCita: 'Control general',
        duracionServicio: 30,
        telefono: '+56 9 5432 1098',
        correo: 'jorge.morales@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 2
    },
    // Rocky - Control general (30 min) - 11:00
    {
        date: '2025-12-09',
        nombreMascota: 'Rocky',
        tipoMascota: 'Perro',
        raza: 'Bulldog',
        tutor: 'Sofía Pérez',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '11:00',
        tipoCita: 'Control general',
        duracionServicio: 30,
        telefono: '+56 9 4321 0987',
        correo: 'sofia.perez@email.com',
        esBloqueInicial: true,
        bloquesDeTiempo: 2
    },
    {
        date: '2025-12-09',
        nombreMascota: 'Rocky',
        tipoMascota: 'Perro',
        raza: 'Bulldog',
        tutor: 'Sofía Pérez',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '11:15',
        tipoCita: 'Control general',
        duracionServicio: 30,
        telefono: '+56 9 4321 0987',
        correo: 'sofia.perez@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 2
    },
    // Nala - Desparasitación (15 min) - 15:00
    {
        date: '2025-12-09',
        nombreMascota: 'Nala',
        tipoMascota: 'Gato',
        raza: 'Angora',
        tutor: 'Luis Fernández',
        veterinario: 'Dra. Ana López',
        hora: '15:00',
        tipoCita: 'Desparasitación',
        duracionServicio: 15,
        telefono: '+56 9 3210 9876',
        correo: 'luis.fernandez@email.com',
        esBloqueInicial: true,
        bloquesDeTiempo: 1
    },
    // Toby - Vacuna (10 min) - 09:30
    {
        date: '2025-12-10',
        nombreMascota: 'Toby',
        tipoMascota: 'Perro',
        raza: 'Beagle',
        tutor: 'Andrea Muñoz',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '09:30',
        tipoCita: 'Vacuna',
        duracionServicio: 10,
        telefono: '+56 9 2109 8765',
        correo: 'andrea.munoz@email.com',
        esBloqueInicial: true,
        bloquesDeTiempo: 1
    },
    // Simba - Control general (30 min) - 12:00
    {
        date: '2025-12-10',
        nombreMascota: 'Simba',
        tipoMascota: 'Gato',
        raza: 'Mestizo',
        tutor: 'Roberto Silva',
        veterinario: 'Dra. Ana López',
        hora: '12:00',
        tipoCita: 'Control general',
        duracionServicio: 30,
        telefono: '+56 9 1098 7654',
        correo: 'roberto.silva@email.com',
        esBloqueInicial: true,
        bloquesDeTiempo: 2
    },
    {
        date: '2025-12-10',
        nombreMascota: 'Simba',
        tipoMascota: 'Gato',
        raza: 'Mestizo',
        tutor: 'Roberto Silva',
        veterinario: 'Dra. Ana López',
        hora: '12:15',
        tipoCita: 'Control general',
        duracionServicio: 30,
        telefono: '+56 9 1098 7654',
        correo: 'roberto.silva@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 2
    },
    // Bella - Análisis de sangre (20 min) - 12:00
    {
        date: '2025-12-10',
        nombreMascota: 'Bella',
        tipoMascota: 'Perro',
        raza: 'Labrador',
        tutor: 'Fernanda Ruiz',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '12:00',
        tipoCita: 'Análisis de sangre',
        duracionServicio: 20,
        telefono: '+56 9 8765 4320',
        correo: 'fernanda.ruiz@email.com',
        esBloqueInicial: true,
        bloquesDeTiempo: 2
    },
    {
        date: '2025-12-10',
        nombreMascota: 'Bella',
        tipoMascota: 'Perro',
        raza: 'Labrador',
        tutor: 'Fernanda Ruiz',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '12:15',
        tipoCita: 'Análisis de sangre',
        duracionServicio: 20,
        telefono: '+56 9 8765 4320',
        correo: 'fernanda.ruiz@email.com',
        esBloqueInicial: false,
        bloquesDeTiempo: 2
    },
    // Coco - Desparasitación (15 min) - 17:00
    {
        date: '2025-12-10',
        nombreMascota: 'Coco',
        tipoMascota: 'Perro',
        raza: 'Chihuahua',
        tutor: 'Patricia Rojas',
        veterinario: 'Dr. Carlos Ramírez',
        hora: '17:00',
        tipoCita: 'Desparasitación',
        duracionServicio: 15,
        telefono: '+56 9 0987 6543',
        correo: 'patricia.rojas@email.com',
        esBloqueInicial: true,
        bloquesDeTiempo: 1
    }
];

let currentDate = new Date();
let currentMonth = currentDate.getMonth();
let currentYear = currentDate.getFullYear();

const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

async function renderCalendar(month, year) {
    const calendar = document.getElementById('calendar');
    
    // Cargar feriados del año si no están cargados
    if (!feriadosChile.length || !feriadosChile.some(f => f.date.startsWith(year.toString()))) {
        const feriadosNuevos = await cargarFeriados(year);
        // Agregar solo los feriados del año actual
        feriadosChile = feriadosChile.filter(f => !f.date.startsWith(year.toString()));
        feriadosChile.push(...feriadosNuevos);
    }
    
    // Actualizar selectores
    updateSelectors(month, year);
    
    // Limpiar calendario
    calendar.innerHTML = '';
    
    // Crear grid
    const grid = document.createElement('div');
    grid.className = 'calendar-grid';
    
    // Agregar encabezados de días
    dayNames.forEach(day => {
        const header = document.createElement('div');
        header.className = 'calendar-day-header';
        header.textContent = day;
        grid.appendChild(header);
    });
    
    // Obtener primer día del mes y días totales
    let firstDay = new Date(year, month, 1).getDay();
    // Ajustar para que lunes sea 0 (domingo pasa a ser 6)
    firstDay = firstDay === 0 ? 6 : firstDay - 1;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const today = new Date();
    const todayDate = today.getDate();
    const todayMonth = today.getMonth();
    const todayYear = today.getFullYear();
    
    // Días del mes anterior
    for (let i = firstDay - 1; i >= 0; i--) {
        const dayCell = createDayCell(daysInPrevMonth - i, month - 1, year, true);
        grid.appendChild(dayCell);
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
        const dayCell = createDayCell(day, month, year, false);
        
        // Marcar día de hoy
        if (day === todayDate && month === todayMonth && year === todayYear) {
            dayCell.classList.add('today');
        }
        
        grid.appendChild(dayCell);
    }
    
    // Días del mes siguiente
    const totalCells = grid.children.length - 7; // Restar encabezados
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    
    for (let i = 1; i <= remainingCells; i++) {
        const dayCell = createDayCell(i, month + 1, year, true);
        grid.appendChild(dayCell);
    }
    
    calendar.appendChild(grid);
}

function createDayCell(day, month, year, otherMonth) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day';
    
    if (otherMonth) {
        cell.classList.add('other-month');
    }
    
    // Crear fecha
    const date = new Date(year, month, day);
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Número del día
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);
    
    // Verificar si es domingo
    if (date.getDay() === 0) {
        cell.classList.add('sunday');
    }
    
    // Verificar si es feriado
    const holiday = feriadosChile.find(f => f.date === dateString);
    if (holiday) {
        cell.classList.add('holiday');
        
        // Agregar nombre del feriado
        const holidayName = document.createElement('div');
        holidayName.className = 'holiday-name';
        holidayName.textContent = holiday.name;
        cell.appendChild(holidayName);
        
        // Marcar irrenunciables
        if (holiday.irrenunciable) {
            cell.classList.add('irrenunciable');
        }
    }
    
    // Verificar si hay citas en este día (solo contar bloques iniciales)
    const citasDelDia = citasVeterinarias.filter(c => c.date === dateString && c.esBloqueInicial);
    if (citasDelDia.length > 0) {
        cell.classList.add('has-appointments');
        const appointmentCount = document.createElement('div');
        appointmentCount.className = 'appointment-count';
        appointmentCount.textContent = `${citasDelDia.length} cita${citasDelDia.length > 1 ? 's' : ''}`;
        cell.appendChild(appointmentCount);
    }
    
    // Agregar evento de click para mostrar detalles
    cell.addEventListener('click', () => {
        if (!otherMonth) {
            mostrarDetallesCitas(dateString, day, month, year);
            // Actualizar tabla de disponibilidades
            renderAvailabilityTable(dateString);
            // Quitar selección previa
            document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
            cell.classList.add('selected');
        }
    });
    
    return cell;
}

function mostrarDetallesCitas(dateString, day, month, year) {
    const detailsSection = document.querySelector('.details-section');
    // Filtrar solo los bloques iniciales para evitar duplicados
    const citasDelDia = citasVeterinarias.filter(c => c.date === dateString && c.esBloqueInicial);
    
    // Ordenar por hora
    citasDelDia.sort((a, b) => a.hora.localeCompare(b.hora));
    
    let html = `<h2>Detalles</h2>`;
    html += `<div class="selected-date">${day} de ${monthNames[month]} ${year}</div>`;
    
    if (citasDelDia.length === 0) {
        html += `<p class="no-appointments">No hay citas programadas para este día.</p>`;
    } else {
        html += `<div class="appointments-list">`;
        
        // Agrupar citas por hora
        const citasPorHora = {};
        citasDelDia.forEach(cita => {
            if (!citasPorHora[cita.hora]) {
                citasPorHora[cita.hora] = [];
            }
            citasPorHora[cita.hora].push(cita);
        });
        
        // Renderizar cada grupo de hora
        Object.keys(citasPorHora).sort().forEach(hora => {
            const citas = citasPorHora[hora];
            
            html += `<div class="time-group">`;
            html += `<div class="time-header">${hora}</div>`;
            html += `<div class="appointments-row">`;
            
            citas.forEach(cita => {
                const duracion = cita.duracionServicio || 15;
                const horaFin = calcularHoraFinal(cita.hora, duracion);
                
                html += `
                    <div class="appointment-card">
                        <div class="appointment-info">
                            <div class="appointment-pet">
                                <strong>${cita.nombreMascota}</strong> (${cita.tipoMascota}, ${cita.raza})
                            </div>
                            <div class="appointment-detail">
                                <span class="label">Tutor:</span> ${cita.tutor}
                            </div>
                            <div class="appointment-detail">
                                <span class="label">Veterinario:</span> ${cita.veterinario}
                            </div>
                            <div class="appointment-detail">
                                <span class="label">Servicio:</span> ${cita.tipoCita}
                            </div>
                            <div class="appointment-detail">
                                <span class="label">Duración:</span> ${duracion} min (${cita.hora} - ${horaFin})
                            </div>
                            <div class="appointment-detail">
                                <span class="label">Tel:</span> <a href="tel:${cita.telefono.replace(/\s/g, '')}">${cita.telefono}</a>
                            </div>
                            <div class="appointment-detail">
                                <span class="label">Email:</span> <a href="mailto:${cita.correo}">${cita.correo}</a>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += `</div></div>`;
        });
        
        html += `</div>`;
    }
    
    detailsSection.innerHTML = html;
}

// Función para poblar los selectores personalizados de mes y año
function populateSelectors() {
    const monthOptions = document.getElementById('monthOptions');
    const yearOptions = document.getElementById('yearOptions');
    
    // Poblar selector de meses
    monthOptions.innerHTML = '';
    monthNames.forEach((month, index) => {
        const option = document.createElement('div');
        option.className = 'select-option';
        option.dataset.value = index;
        option.textContent = month;
        option.addEventListener('click', async () => {
            currentMonth = index;
            document.getElementById('selectedMonth').textContent = month;
            closeAllSelects();
            await renderCalendar(currentMonth, currentYear);
        });
        monthOptions.appendChild(option);
    });
    
    // Poblar selector de años (solo año actual y siguiente)
    const currentYearNow = new Date().getFullYear();
    yearOptions.innerHTML = '';
    [currentYearNow, currentYearNow + 1].forEach(year => {
        const option = document.createElement('div');
        option.className = 'select-option';
        option.dataset.value = year;
        option.textContent = year;
        option.addEventListener('click', async () => {
            currentYear = year;
            document.getElementById('selectedYear').textContent = year;
            closeAllSelects();
            await renderCalendar(currentMonth, currentYear);
        });
        yearOptions.appendChild(option);
    });
}

// Función para actualizar los selectores
function updateSelectors(month, year) {
    document.getElementById('selectedMonth').textContent = monthNames[month];
    document.getElementById('selectedYear').textContent = year;
}

// Función para cerrar todos los selectores
function closeAllSelects() {
    document.querySelectorAll('.custom-select').forEach(select => {
        select.classList.remove('active');
    });
}

// Event listeners para los selectores personalizados
function setupSelectors() {
    const monthSelectWrapper = document.getElementById('monthSelectWrapper');
    const yearSelectWrapper = document.getElementById('yearSelectWrapper');
    
    // Toggle month selector
    monthSelectWrapper.querySelector('.select-trigger').addEventListener('click', (e) => {
        e.stopPropagation();
        yearSelectWrapper.classList.remove('active');
        monthSelectWrapper.classList.toggle('active');
    });
    
    // Toggle year selector
    yearSelectWrapper.querySelector('.select-trigger').addEventListener('click', (e) => {
        e.stopPropagation();
        monthSelectWrapper.classList.remove('active');
        yearSelectWrapper.classList.toggle('active');
    });
    
    // Cerrar al hacer click fuera
    document.addEventListener('click', () => {
        closeAllSelects();
    });
}

async function previousMonth() {
    currentMonth--;
    if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
    }
    await renderCalendar(currentMonth, currentYear);
}

async function nextMonth() {
    currentMonth++;
    if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
    }
    await renderCalendar(currentMonth, currentYear);
}

async function goToToday() {
    const today = new Date();
    currentMonth = today.getMonth();
    currentYear = today.getFullYear();
    await renderCalendar(currentMonth, currentYear);
    
    // Mostrar detalles del día actual
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    mostrarDetallesCitas(todayString, today.getDate(), today.getMonth(), today.getFullYear());
    
    // Marcar el día como seleccionado
    setTimeout(() => {
        document.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
        const todayCell = document.querySelector('.calendar-day.today');
        if (todayCell) {
            todayCell.classList.add('selected');
        }
    }, 100);
}

// Event listeners
document.getElementById('prevMonth').addEventListener('click', previousMonth);
document.getElementById('nextMonth').addEventListener('click', nextMonth);
document.getElementById('todayBtn').addEventListener('click', goToToday);

// Inicializar aplicación
async function init() {
    // Poblar selectores de mes y año
    populateSelectors();
    
    // Configurar event listeners de los selectores
    setupSelectors();
    
    // Cargar feriados del año actual
    await cargarFeriados(currentYear);
    
    // Renderizar calendario inicial
    await renderCalendar(currentMonth, currentYear);
    
    // Actualizar el número del día en el botón de hoy
    const today = new Date();
    document.querySelector('.today-day').textContent = today.getDate();
    
    // Mostrar citas del día actual
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    mostrarDetallesCitas(todayString, today.getDate(), today.getMonth(), today.getFullYear());
}

// Iniciar la aplicación
init();

// ========== TABLA DE DISPONIBILIDADES ==========

// Base de datos de servicios (simulando tabla futura)
const serviciosVeterinarios = [
    { id: 1, nombre: 'Corte de uñas', duracion: 15 }, // en minutos
    { id: 2, nombre: 'Vacuna', duracion: 10 },
    { id: 3, nombre: 'Consulta veterinaria', duracion: 60 },
    { id: 4, nombre: 'Desparasitación', duracion: 15 },
    { id: 5, nombre: 'Baño y peluquería', duracion: 90 },
    { id: 6, nombre: 'Cirugía menor', duracion: 120 },
    { id: 7, nombre: 'Control general', duracion: 30 },
    { id: 8, nombre: 'Emergencia', duracion: 60 },
    { id: 9, nombre: 'Radiografía', duracion: 45 },
    { id: 10, nombre: 'Análisis de sangre', duracion: 20 }
];

const veterinarios = ['Dr. Carlos Ramírez', 'Dra. Ana López'];
const horarios = ['09:00', '09:15', '09:30', '09:45', '10:00', '10:15', '10:30', '10:45', '11:00', '11:15', '11:30', '11:45', '12:00', '14:00', '14:15', '14:30', '14:45', '15:00', '15:15', '15:30', '15:45', '16:00', '16:15', '16:30', '16:45', '17:00'];

// Datos de mascotas existentes
const mascotasRegistradas = [
    { id: 1, nombre: 'Luna', tipo: 'Perro', raza: 'Golden Retriever', tutor: 'María González', telefono: '+56 9 8765 4321', correo: 'maria.gonzalez@email.com' },
    { id: 2, nombre: 'Michi', tipo: 'Gato', raza: 'Persa', tutor: 'Pedro Soto', telefono: '+56 9 7654 3210', correo: 'pedro.soto@email.com' },
    { id: 3, nombre: 'Max', tipo: 'Perro', raza: 'Pastor Alemán', tutor: 'Carmen Díaz', telefono: '+56 9 6543 2109', correo: 'carmen.diaz@email.com' },
    { id: 4, nombre: 'Pelusa', tipo: 'Gato', raza: 'Siamés', tutor: 'Jorge Morales', telefono: '+56 9 5432 1098', correo: 'jorge.morales@email.com' },
    { id: 5, nombre: 'Rocky', tipo: 'Perro', raza: 'Bulldog', tutor: 'Sofía Pérez', telefono: '+56 9 4321 0987', correo: 'sofia.perez@email.com' },
    { id: 6, nombre: 'Nala', tipo: 'Gato', raza: 'Angora', tutor: 'Luis Fernández', telefono: '+56 9 3210 9876', correo: 'luis.fernandez@email.com' },
    { id: 7, nombre: 'Toby', tipo: 'Perro', raza: 'Beagle', tutor: 'Andrea Muñoz', telefono: '+56 9 2109 8765', correo: 'andrea.munoz@email.com' },
    { id: 8, nombre: 'Simba', tipo: 'Gato', raza: 'Mestizo', tutor: 'Roberto Silva', telefono: '+56 9 1098 7654', correo: 'roberto.silva@email.com' }
];

let selectedSlot = null;
let selectedDateForAvailability = null; // Fecha seleccionada para la tabla

function renderAvailabilityTable(dateStr = null) {
    const container = document.getElementById('availabilityTable');
    
    // Si no se proporciona fecha, usar la fecha actual
    if (!dateStr) {
        const today = new Date();
        dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }
    
    selectedDateForAvailability = dateStr;
    
    // Extraer fecha para mostrar en el título
    const [year, month, day] = dateStr.split('-');
    const dateObj = new Date(year, month - 1, day);
    const dateTitle = `${day} de ${monthNames[dateObj.getMonth()]} ${year}`;
    
    let html = `<h3 style="background-color: white; color: var(--secondary-color); margin-bottom: 15px;">Disponibilidad del ${dateTitle}</h3>`;
    html += '<table class="availability-table"><thead><tr>';
    html += '<th>Hora</th>';
    veterinarios.forEach(vet => {
        html += `<th>${vet}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    // Crear un mapa para rastrear qué celdas ya fueron renderizadas con rowspan
    const cellsRendered = new Set();
    
    horarios.forEach((hora, horaIndex) => {
        html += '<tr>';
        html += `<td class="time-cell">${hora}</td>`;
        
        veterinarios.forEach((vet, vetIndex) => {
            const cellKey = `${horaIndex}-${vetIndex}`;
            
            // Si esta celda ya fue renderizada como parte de un rowspan, saltarla
            if (cellsRendered.has(cellKey)) {
                return;
            }
            
            // Verificar si hay cita agendada
            const citaExistente = citasVeterinarias.find(c => 
                c.date === dateStr && c.hora === hora && c.veterinario === vet
            );
            
            if (citaExistente && citaExistente.esBloqueInicial) {
                const duracion = citaExistente.duracionServicio || 15;
                const bloques = citaExistente.bloquesDeTiempo || Math.ceil(duracion / 15);
                const horaFin = calcularHoraFinal(hora, duracion);
                
                // Marcar todas las celdas que serán cubiertas por este rowspan
                for (let i = 1; i < bloques; i++) {
                    cellsRendered.add(`${horaIndex + i}-${vetIndex}`);
                }
                
                // Para bloques de 1 slot (15 min o menos), mostrar versión compacta
                if (bloques === 1) {
                    html += `<td class="appointment-cell">
                        <div class="availability-slot occupied-compact" title="${citaExistente.tipoCita} - ${duracion} min (${hora} - ${horaFin})">
                            <strong>${citaExistente.nombreMascota}</strong><br>
                            <small>${citaExistente.tipoCita}</small>
                        </div>
                    </td>`;
                } else {
                    // Para bloques múltiples, mostrar versión completa con horas
                    html += `<td rowspan="${bloques}" class="appointment-cell">
                        <div class="availability-slot occupied-block" title="${citaExistente.tipoCita} - ${duracion} min">
                            <strong>${citaExistente.nombreMascota}</strong>
                            <small>${citaExistente.tipoCita}</small>
                            <div class="duration-info">${duracion} min</div>
                            <div class="time-range">${hora} - ${horaFin}</div>
                        </div>
                    </td>`;
                }
            } else if (!citaExistente) {
                html += `<td><div class="availability-slot" onclick="openModal('${hora}', '${vet}')">Disponible</div></td>`;
            }
        });
        
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// ========== MODAL ==========

function openModal(hora, veterinario) {
    const fechaCita = selectedDateForAvailability || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`;
    
    // Verificar si la fecha es pasada
    const fechaCitaObj = new Date(fechaCita + 'T' + hora);
    const ahora = new Date();
    
    if (fechaCitaObj < ahora) {
        alert('No se pueden agendar citas en fechas u horarios pasados.');
        return;
    }
    
    selectedSlot = { 
        hora, 
        veterinario, 
        fecha: fechaCita
    };
    document.getElementById('selectedTime').textContent = hora;
    document.getElementById('selectedVet').textContent = veterinario;
    
    // Poblar selector de servicios
    const serviceSelect = document.getElementById('serviceType');
    serviceSelect.innerHTML = '<option value="">Seleccionar servicio...</option>';
    serviciosVeterinarios.forEach(servicio => {
        const option = document.createElement('option');
        option.value = servicio.id;
        option.textContent = servicio.nombre;
        option.dataset.duracion = servicio.duracion;
        serviceSelect.appendChild(option);
    });
    
    document.getElementById('appointmentModal').style.display = 'block';
    showStep('modalStep1');
}

// Mostrar duración del servicio seleccionado
document.addEventListener('DOMContentLoaded', () => {
    const serviceSelect = document.getElementById('serviceType');
    const durationDisplay = document.getElementById('serviceDuration');
    
    serviceSelect.addEventListener('change', (e) => {
        const selectedOption = e.target.options[e.target.selectedIndex];
        if (selectedOption.dataset.duracion) {
            const duracion = parseInt(selectedOption.dataset.duracion);
            durationDisplay.textContent = `⏱️ Duración: ${duracion} minutos`;
            
            // Guardar el servicio seleccionado
            if (selectedSlot) {
                const servicio = serviciosVeterinarios.find(s => s.id == e.target.value);
                selectedSlot.servicio = servicio;
            }
        } else {
            durationDisplay.textContent = '';
        }
    });
});

function closeModal() {
    document.getElementById('appointmentModal').style.display = 'none';
    selectedSlot = null;
}

function showStep(stepId) {
    document.querySelectorAll('.modal-step').forEach(step => {
        step.style.display = 'none';
    });
    document.getElementById(stepId).style.display = 'block';
}

// Event listeners del modal
document.querySelector('.close').addEventListener('click', closeModal);

window.addEventListener('click', (e) => {
    const modal = document.getElementById('appointmentModal');
    if (e.target === modal) {
        closeModal();
    }
});

document.getElementById('btnExistingPatient').addEventListener('click', () => {
    if (!selectedSlot.servicio) {
        alert('Por favor seleccione un servicio primero');
        return;
    }
    showStep('modalStep2Existing');
    renderPetList(mascotasRegistradas);
});

document.getElementById('btnNewPatient').addEventListener('click', () => {
    if (!selectedSlot.servicio) {
        alert('Por favor seleccione un servicio primero');
        return;
    }
    showStep('modalStep2New');
});

document.getElementById('btnBackFromExisting').addEventListener('click', () => {
    showStep('modalStep1');
});

document.getElementById('btnBackFromNew').addEventListener('click', () => {
    showStep('modalStep1');
});

document.getElementById('btnCloseModal').addEventListener('click', closeModal);

// Búsqueda de mascotas
document.getElementById('searchPet').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const filtered = mascotasRegistradas.filter(pet => 
        pet.nombre.toLowerCase().includes(searchTerm) ||
        pet.tutor.toLowerCase().includes(searchTerm)
    );
    renderPetList(filtered);
});

function renderPetList(pets) {
    const container = document.getElementById('petList');
    let html = '';
    
    pets.forEach(pet => {
        html += `
            <div class="pet-item" onclick="selectPet(${pet.id})">
                <h4>${pet.nombre}</h4>
                <p>${pet.tipo} - ${pet.raza}</p>
                <p>Tutor: ${pet.tutor}</p>
            </div>
        `;
    });
    
    container.innerHTML = html || '<p style="background-color: white; text-align: center; color: #666;">No se encontraron mascotas</p>';
}

function selectPet(petId) {
    const pet = mascotasRegistradas.find(p => p.id === petId);
    if (pet && selectedSlot.servicio) {
        // Agendar cita con mascota existente
        agendarCita(pet);
    } else if (!selectedSlot.servicio) {
        alert('Por favor seleccione un servicio primero');
        showStep('modalStep1');
    }
}

// Formulario de nueva mascota
document.getElementById('newPetForm').addEventListener('submit', (e) => {
    e.preventDefault();
    
    if (!selectedSlot.servicio) {
        alert('Por favor seleccione un servicio primero');
        showStep('modalStep1');
        return;
    }
    
    const newPet = {
        id: mascotasRegistradas.length + 1,
        nombre: document.getElementById('petName').value,
        tipo: document.getElementById('petType').value,
        raza: document.getElementById('petBreed').value,
        tutor: document.getElementById('ownerName').value,
        telefono: document.getElementById('ownerPhone').value,
        correo: document.getElementById('ownerEmail').value
    };
    
    // Agregar a la lista de mascotas
    mascotasRegistradas.push(newPet);
    
    // Agendar cita
    agendarCita(newPet);
});

// Función para calcular hora final según duración
function calcularHoraFinal(horaInicio, duracionMinutos) {
    const [hora, minutos] = horaInicio.split(':').map(Number);
    const totalMinutos = hora * 60 + minutos + duracionMinutos;
    const nuevaHora = Math.floor(totalMinutos / 60);
    const nuevosMinutos = totalMinutos % 60;
    return `${String(nuevaHora).padStart(2, '0')}:${String(nuevosMinutos).padStart(2, '0')}`;
}

// Función para obtener todos los bloques de tiempo necesarios
function obtenerBloquesDetiempo(horaInicio, duracionMinutos) {
    const bloques = [];
    let horaActual = horaInicio;
    let minutosRestantes = duracionMinutos;
    
    while (minutosRestantes > 0) {
        bloques.push(horaActual);
        // Calcular siguiente bloque (incremento de 15 minutos)
        const [hora, minutos] = horaActual.split(':').map(Number);
        const totalMinutos = hora * 60 + minutos + 15;
        const nuevaHora = Math.floor(totalMinutos / 60);
        const nuevosMinutos = totalMinutos % 60;
        horaActual = `${String(nuevaHora).padStart(2, '0')}:${String(nuevosMinutos).padStart(2, '0')}`;
        minutosRestantes -= 15;
    }
    
    return bloques;
}

// Función para validar disponibilidad de todos los bloques
function validarDisponibilidad(fecha, veterinario, bloques) {
    for (const bloque of bloques) {
        const citaExistente = citasVeterinarias.find(c => 
            c.date === fecha && 
            c.veterinario === veterinario && 
            c.hora === bloque
        );
        if (citaExistente) {
            return { disponible: false, bloqueOcupado: bloque };
        }
    }
    return { disponible: true };
}

function agendarCita(pet) {
    const servicio = selectedSlot.servicio;
    const fecha = selectedSlot.fecha;
    const veterinario = selectedSlot.veterinario;
    const horaInicio = selectedSlot.hora;
    
    // Calcular todos los bloques de tiempo necesarios
    const bloques = obtenerBloquesDetiempo(horaInicio, servicio.duracion);
    
    // Validar que todos los bloques estén disponibles
    const validacion = validarDisponibilidad(fecha, veterinario, bloques);
    
    if (!validacion.disponible) {
        alert(`No se puede agendar la cita. El bloque de ${validacion.bloqueOcupado} ya está ocupado. Por favor seleccione otra hora.`);
        closeModal();
        return;
    }
    
    // Crear una cita por cada bloque de tiempo necesario
    bloques.forEach((bloque, index) => {
        const newAppointment = {
            date: fecha,
            nombreMascota: pet.nombre,
            tipoMascota: pet.tipo,
            raza: pet.raza,
            tutor: pet.tutor,
            veterinario: veterinario,
            hora: bloque,
            tipoCita: servicio.nombre,
            duracionServicio: servicio.duracion,
            telefono: pet.telefono,
            correo: pet.correo,
            // Marcar el bloque principal y los bloques adicionales
            esBloqueInicial: index === 0,
            bloquesDeTiempo: bloques.length
        };
        
        citasVeterinarias.push(newAppointment);
    });
    
    // Mostrar confirmación
    const [year, month, day] = fecha.split('-');
    const dateObj = new Date(year, month - 1, day);
    const horaFinal = calcularHoraFinal(horaInicio, servicio.duracion);
    
    document.getElementById('confirmationMessage').innerHTML = `
        <strong>${pet.nombre}</strong> tiene una cita de <strong>${servicio.nombre}</strong><br>
        ${day} de ${monthNames[dateObj.getMonth()]} de ${year}<br>
        ${horaInicio} - ${horaFinal} (${servicio.duracion} min)<br>
        con ${veterinario}
    `;
    
    showStep('modalStep3');
    
    // Actualizar tabla y calendario
    renderAvailabilityTable(fecha);
    renderCalendar(currentMonth, currentYear);
    mostrarDetallesCitas(fecha, parseInt(day), dateObj.getMonth(), parseInt(year));
    
    // Limpiar formulario
    document.getElementById('newPetForm').reset();
}

// Inicializar tabla de disponibilidades
renderAvailabilityTable();
