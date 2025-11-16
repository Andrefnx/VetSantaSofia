function getMonthName(month, year) {
    const date = new Date(year, month);
    return date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
}

function renderCalendar(month, year, selectedDay = null) {
    const daysGrid = document.getElementById('calendarDaysGrid');
    daysGrid.innerHTML = '';
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay() - 1; // Lunes = 0
    if (startDay < 0) startDay = 6;
    // Fill empty slots before first day
    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement('span');
        empty.className = 'calendar-day-empty';
        daysGrid.appendChild(empty);
    }
    // Fill days
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const dayBtn = document.createElement('button');
        dayBtn.className = 'calendar-day-btn';
        dayBtn.textContent = d;
        if (
            selectedDay &&
            selectedDay.day === d &&
            selectedDay.month === month &&
            selectedDay.year === year
        ) {
            dayBtn.classList.add('selected');
        }
        dayBtn.addEventListener('click', function () {
            renderCalendar(month, year, { day: d, month, year });
        });
        daysGrid.appendChild(dayBtn);
    }
    document.getElementById('calendarMonthYear').textContent = getMonthName(month, year).replace(/^\w/, c => c.toUpperCase());
}

let today = new Date();
let currentMonth = today.getMonth();
let currentYear = today.getFullYear();
let selectedDay = { day: today.getDate(), month: currentMonth, year: currentYear };

function updateCalendar() {
    renderCalendar(currentMonth, currentYear, selectedDay);
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('prevMonthBtn').onclick = function () {
        currentMonth--;
        if (currentMonth < 0) {
            currentMonth = 11;
            currentYear--;
        }
        updateCalendar();
    };
    document.getElementById('nextMonthBtn').onclick = function () {
        currentMonth++;
        if (currentMonth > 11) {
            currentMonth = 0;
            currentYear++;
        }
        updateCalendar();
    };
    updateCalendar();
});




const monthlyEvents = {
    // month: 0-based, e.g. 7 = August
    // Example events for demo
    "2025-11-03": [
        { type: "consulta", label: "Max - Consulta", time: "10:00" },
        { type: "vacunacion", label: "Luna - Vacuna", time: "12:00" }
    ],
    "2025-11-10": [
        { type: "control", label: "Rocky - Control", time: "09:00" }
    ],
    "2025-11-15": [
        { type: "nota", label: "Revisión de análisis", time: "" }
    ],
    "2025-11-20": [
        { type: "consulta", label: "Luna - Consulta", time: "11:00" }
    ]
};

function getMonthNameMensual(month, year) {
    const date = new Date(year, month);
    return date.toLocaleString('es-ES', { month: 'long', year: 'numeric' });
}

function renderMonthlyCalendar(month, year) {
    const grid = document.getElementById('monthlyCalendarGrid');
    grid.innerHTML = '';
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDay = firstDay.getDay() - 1; // Lunes = 0
    if (startDay < 0) startDay = 6;
    // Fill empty slots before first day
    for (let i = 0; i < startDay; i++) {
        const empty = document.createElement('div');
        empty.className = 'monthly-calendar-cell';
        grid.appendChild(empty);
    }
    // Fill days
    const today = new Date();
    for (let d = 1; d <= lastDay.getDate(); d++) {
        const cell = document.createElement('div');
        cell.className = 'monthly-calendar-cell';
        const isToday = (
            d === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear()
        );
        if (isToday) cell.classList.add('today');
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        cell.innerHTML = `<span class="cell-date">${d}</span>`;
        // Render events
        if (monthlyEvents[dateStr]) {
            monthlyEvents[dateStr].forEach(ev => {
                const evDiv = document.createElement('div');
                evDiv.className = `monthly-calendar-event ${ev.type}`;
                evDiv.innerHTML = `${ev.time ? `<b>${ev.time}</b> - ` : ''}${ev.label}`;
                cell.appendChild(evDiv);
            });
        }
        grid.appendChild(cell);
    }
    document.getElementById('mensualMonthYearLabel').textContent = getMonthNameMensual(month, year).replace(/^\w/, c => c.toUpperCase());
}

let mensualMonth = new Date().getMonth();
let mensualYear = new Date().getFullYear();

function updateMonthlyCalendar() {
    renderMonthlyCalendar(mensualMonth, mensualYear);
}

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('mensualPrevBtn').onclick = function () {
        mensualMonth--;
        if (mensualMonth < 0) {
            mensualMonth = 11;
            mensualYear--;
        }
        updateMonthlyCalendar();
    };
    document.getElementById('mensualNextBtn').onclick = function () {
        mensualMonth++;
        if (mensualMonth > 11) {
            mensualMonth = 0;
            mensualYear++;
        }
        updateMonthlyCalendar();
    };
    updateMonthlyCalendar();
});