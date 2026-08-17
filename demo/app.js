const STORE_KEY = 'vetsantasofia-demo-v3';
const DEFAULT_DATE = '2026-08-17';
const TITLES = { dashboard: 'Panel General', agenda: 'Agenda Veterinaria', pacientes: 'Pacientes', ficha: 'Ficha clínica' };
let selectedPatientId = 1;
let state = loadState();

function $(id) { return document.getElementById(id); }
function cloneSeed() { return JSON.parse(JSON.stringify(window.VET_DEMO_SEED)); }
function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORE_KEY));
    return stored && stored.patients && stored.inventory && stored.hospitalizations ? stored : cloneSeed();
  } catch {
    return cloneSeed();
  }
}
function saveState() { localStorage.setItem(STORE_KEY, JSON.stringify(state)); }
function patient(id = selectedPatientId) { return state.patients.find(x => x.id === Number(id)); }
function fmtDate(value) {
  const raw = String(value || '').slice(0, 10);
  return new Intl.DateTimeFormat('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(raw + 'T12:00:00'));
}
function toast(text) {
  const el = $('toast');
  if (!el) return;
  el.textContent = text;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}
function statusLabel(status) {
  return status === 'confirmada' ? 'Confirmada' : status === 'completada' ? 'Completada' : 'Pendiente';
}
function audit(event) {
  state.audit[selectedPatientId] = state.audit[selectedPatientId] || [];
  state.audit[selectedPatientId].unshift({ date: '2026-08-17 16:00', event, user: 'Camila Vera', severity: 'info' });
}

function go(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.remove('active-view'));
  const target = $(view);
  if (target) target.classList.add('active-view');
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  if ($('viewTitle')) $('viewTitle').textContent = TITLES[view] || 'VetSantaSofia';
  $('vetSidebar')?.classList.remove('open');
  if (view === 'dashboard') renderDashboard();
  if (view === 'agenda') renderAgenda();
  if (view === 'pacientes') renderPatients();
  if (view === 'ficha') renderFicha();
}

function renderDashboard() {
  const apps = state.appointments.filter(a => a.date === DEFAULT_DATE).sort((a, b) => a.time.localeCompare(b.time));
  $('metricCitas').textContent = apps.length;
  $('metricPendientes').textContent = apps.filter(a => a.status !== 'completada').length;
  $('metricPacientes').textContent = state.patients.length;
  $('metricAtendidos').textContent = apps.filter(a => a.status === 'completada').length;
  $('upcomingList').innerHTML = apps.map(a => {
    const p = patient(a.patientId);
    return `<div class="appointment"><time>${a.time}</time><div><strong>${p.name} · ${a.service}</strong><small>${p.owner} · ${a.reason}</small></div><span class="badge ${a.status}">${statusLabel(a.status)}</span></div>`;
  }).join('');
  const events = Object.entries(state.timeline).flatMap(([id, arr]) => arr.map(x => ({ ...x, patientId: Number(id) }))).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);
  $('recentActivity').innerHTML = events.map(e => `<div class="mini-event"><strong>${patient(e.patientId).name} · ${e.title}</strong><small>${fmtDate(e.date)} · ${e.type}</small></div>`).join('');
}

function times() {
  const list = [];
  for (let h = 9; h <= 17; h++) for (const m of [0, 30]) list.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  return list;
}
function renderAgenda() {
  const date = $('agendaDate').value || DEFAULT_DATE;
  const apps = state.appointments.filter(a => a.date === date);
  $('agendaTitle').textContent = `Agenda · ${fmtDate(date)}`;
  $('scheduleGrid').innerHTML = times().map(time => {
    const a = apps.find(x => x.time === time);
    if (!a) return `<button class="slot available-slot" data-slot="${time}"><div class="slot-time">${time}</div><strong>Disponible</strong><small>Seleccionar bloque</small></button>`;
    const cls = a.status === 'completada' ? 'completed-slot' : 'occupied-slot';
    return `<div class="slot ${cls}"><div class="slot-time">${time}</div><strong>${patient(a.patientId).name}</strong><small>${a.service}</small><span class="badge ${a.status}">${statusLabel(a.status)}</span></div>`;
  }).join('');
  document.querySelectorAll('[data-slot]').forEach(el => el.addEventListener('click', () => showBooking(el.dataset.slot)));
}

function renderPatients(query = '') {
  const q = query.toLowerCase();
  const list = state.patients.filter(x => [x.name, x.species, x.owner, x.breed].some(v => v.toLowerCase().includes(q)));
  $('patientRows').innerHTML = list.map(x => `<tr><td><b>${x.name}</b><br><small>${x.breed}</small></td><td>${x.species}</td><td>${x.owner}</td><td>${x.age}</td><td>${fmtDate(x.lastVisit)}</td><td><button class="table-link" data-patient="${x.id}">Ver ficha</button></td></tr>`).join('');
  document.querySelectorAll('[data-patient]').forEach(el => el.addEventListener('click', () => { selectedPatientId = Number(el.dataset.patient); go('ficha'); }));
}

function info(items) {
  return items.map(([label, value]) => `<div class="info-item"><span>${label}</span><strong>${value || 'No registrado'}</strong></div>`).join('');
}
function renderFicha() {
  const x = patient();
  if (!x) return;
  $('fichaTitlePatient').textContent = x.name;
  $('patientSelect').value = String(x.id);
  $('generalInfo').innerHTML = info([['Nombre', x.name], ['Especie', x.species], ['Raza', x.breed], ['Color', x.color], ['Sexo', x.sex], ['Edad', x.age], ['Peso', x.weight], ['Microchip', x.microchip]]);
  $('ownerInfo').innerHTML = info([['Dueño', x.owner], ['Teléfono', x.phone], ['Correo', x.email], ['Dirección', x.address]]);
  $('criticalInfo').innerHTML = info([['Alergias', x.allergies], ['Enfermedades crónicas', x.chronic], ['Medicamentos actuales', x.medications], ['Cirugías previas', x.surgeries]]);
  const timeline = state.timeline[x.id] || [];
  const hospitalizations = state.hospitalizations[x.id] || [];
  const active = hospitalizations.find(h => h.status === 'activa');
  $('clinicalSummary').innerHTML = info([['Último peso', x.weight], ['Último control', fmtDate(x.lastVisit)], ['Consultas registradas', timeline.length], ['Hospitalizaciones', hospitalizations.length]]);
  $('activeHospBanner').classList.toggle('d-none', !active);
  if (active) $('activeHospText').textContent = `Ingreso ${fmtDate(active.admission)} · ${active.reason}`;
  renderTimeline();
  renderHospitalizations();
  renderDocuments();
  renderAudit();
  renderInventories();
}
function renderTimeline() {
  const q = ($('historySearch')?.value || '').toLowerCase();
  const items = [...(state.timeline[selectedPatientId] || [])].filter(e => [e.title, e.text, e.diagnosis, e.vet].join(' ').toLowerCase().includes(q)).sort((a, b) => b.date.localeCompare(a.date));
  $('historyCount').textContent = `Items: ${items.length}`;
  $('timeline').innerHTML = items.length ? items.map(e => {
    const d = new Date(e.date + 'T12:00:00');
    const supplies = (e.supplies || []).map(id => state.inventory.find(i => i.id === id)?.name).filter(Boolean).join(', ');
    return `<div class="real-timeline-item"><div class="timeline-datebox"><span>${d.toLocaleString('es', { month: 'short' }).toUpperCase()}</span><b>${d.getDate()}</b><span>${d.getFullYear()}</span></div><div class="timeline-marker"></div><div class="timeline-card"><h4>${e.title}</h4><div class="timeline-meta"><span><i class="bi bi-person"></i> ${e.vet || 'Camila Vera'}</span><span>${e.type}</span></div><p>${e.text}</p><small><b>Diagnóstico:</b> ${e.diagnosis || '-'} · <b>Tratamiento:</b> ${e.treatment || '-'}</small>${supplies ? `<small class="d-block mt-1"><b>Insumos:</b> ${supplies}</small>` : ''}</div></div>`;
  }).join('') : '<p class="text-muted">Sin registros.</p>';
}
function renderHospitalizations() {
  const items = [...(state.hospitalizations[selectedPatientId] || [])].sort((a, b) => b.admission.localeCompare(a.admission));
  $('hospitalizationsContainer').innerHTML = items.length ? items.map(h => `<article class="hosp-card"><div class="hosp-head"><div><b>${h.reason}</b><small class="d-block text-muted">Ingreso ${fmtDate(h.admission)} · Dra. ${h.vet}</small></div><span class="badge ${h.status === 'activa' ? 'bg-warning' : 'bg-success'}">${h.status.toUpperCase()}</span></div><div class="hosp-body"><div class="hosp-grid"><div class="hosp-subsection"><h5>Diagnóstico y evolución</h5><p>${h.diagnosis || 'Sin diagnóstico inicial'}</p>${(h.daily || []).map(r => `<div class="daily-row"><span>${fmtDate(r.date)} · ${r.temp}°C · FC ${r.hr}</span><span>${r.note}</span></div>`).join('') || '<small>Sin registros diarios</small>'}${h.status === 'activa' ? `<button class="btn btn-sm btn-primary mt-2" data-daily="${h.id}">+ Registro diario</button>` : ''}</div><div class="hosp-subsection"><h5>Cirugías</h5>${(h.surgeries || []).map(s => `<p><b>${s.type}</b><br><small>${fmtDate(s.date)} · ${s.result} · ${s.duration} min · ${s.anesthesia}</small></p>`).join('') || '<small>Sin cirugías</small>'}<h5 class="mt-3">Insumos</h5>${(h.supplies || []).map(id => state.inventory.find(i => i.id === id)).filter(Boolean).map(i => `<div class="inventory-row"><span>${i.name}</span><b>Stock ${i.stock}</b></div>`).join('')}</div></div>${h.alta ? `<div class="alert alert-success mt-3 mb-0"><b>Alta médica:</b> ${h.alta.diagnosis}. ${h.alta.recommendations}</div>` : ''}${h.status === 'activa' ? `<button class="btn btn-success btn-sm mt-3" data-discharge="${h.id}">Dar alta y descontar insumos</button>` : ''}</div></article>`).join('') : '<div class="alert alert-light border">No hay hospitalizaciones registradas.</div>';
  document.querySelectorAll('[data-daily]').forEach(el => el.addEventListener('click', () => { $('dailyHospId').value = el.dataset.daily; $('dailyWeight').value = parseFloat(patient().weight) || ''; $('dailyModal').showModal(); }));
  document.querySelectorAll('[data-discharge]').forEach(el => el.addEventListener('click', () => discharge(Number(el.dataset.discharge))));
}
function renderDocuments() {
  const items = state.documents[selectedPatientId] || [];
  $('documentsList').innerHTML = items.length ? items.map(d => `<div class="doc-row"><div><b>${d.name}</b><small class="d-block text-muted">${d.description || ''}</small></div><span>${fmtDate(d.date)}</span></div>`).join('') : '<p class="text-muted">No hay documentos adjuntos.</p>';
}
function renderAudit() {
  const items = state.audit[selectedPatientId] || [];
  $('auditList').innerHTML = items.length ? items.map(e => `<div class="audit-row"><div><b>${e.event}</b><small class="d-block text-muted">${e.user}</small></div><span>${e.date}</span></div>`).join('') : '<p class="text-muted">Sin cambios registrados.</p>';
}
function renderInventories() {
  const rows = state.inventory.map(i => `<label class="inventory-select-row"><input type="checkbox" value="${i.id}"><span><b>${i.name}</b><small class="d-block">${i.category}</small></span><small>Stock: ${i.stock}</small></label>`).join('');
  $('consultInventory').innerHTML = rows;
  $('hospitalInventory').innerHTML = rows;
}
function populatePatientSelects() {
  const options = state.patients.map(x => `<option value="${x.id}">${x.name} · ${x.owner}</option>`).join('');
  $('patientSelect').innerHTML = options;
  $('bookingPatient').innerHTML = options;
  $('patientSelect').value = String(selectedPatientId);
}

function showBooking(slot) {
  $('bookingDate').value = $('agendaDate').value || DEFAULT_DATE;
  $('bookingTime').innerHTML = times().map(t => `<option value="${t}">${t}</option>`).join('');
  if (slot) $('bookingTime').value = slot;
  $('bookingModal').showModal();
}
function saveBooking(e) {
  e.preventDefault();
  const date = $('bookingDate').value, time = $('bookingTime').value;
  if (state.appointments.some(a => a.date === date && a.time === time)) return toast('Ese bloque ya está ocupado.');
  state.appointments.push({ id: Date.now(), patientId: Number($('bookingPatient').value), date, time, service: $('bookingService').value, reason: $('bookingReason').value || 'Consulta demostrativa', status: 'pendiente' });
  saveState(); $('bookingModal').close(); $('agendaDate').value = date; renderAgenda(); renderDashboard(); toast('Cita ficticia agregada.');
}
function saveConsultation(e) {
  e.preventDefault();
  const ids = [...$('consultInventory').querySelectorAll('input:checked')].map(x => Number(x.value));
  for (const id of ids) { const item = state.inventory.find(i => i.id === id); if (item.stock <= 0) return toast(`Sin stock de ${item.name}`); }
  ids.forEach(id => state.inventory.find(i => i.id === id).stock--);
  const x = patient();
  state.timeline[x.id] = state.timeline[x.id] || [];
  state.timeline[x.id].push({ id: 'c' + Date.now(), date: DEFAULT_DATE, type: $('consultService').value, title: $('consultService').value, text: $('consultNotes').value || 'Consulta clínica ficticia finalizada.', vet: 'Camila Vera', diagnosis: $('consultDiagnosis').value, treatment: $('consultTreatment').value, supplies: ids });
  x.lastVisit = DEFAULT_DATE;
  if ($('consultWeight').value) x.weight = `${$('consultWeight').value} kg`;
  audit('Consulta finalizada e inventario actualizado');
  saveState(); $('consultationModal').close(); renderFicha(); renderDashboard(); toast('Consulta finalizada; inventario demo actualizado.');
}
function saveHospital(e) {
  e.preventDefault();
  const list = state.hospitalizations[selectedPatientId] = state.hospitalizations[selectedPatientId] || [];
  if (list.some(h => h.status === 'activa')) return toast('El paciente ya tiene una hospitalización activa.');
  const ids = [...$('hospitalInventory').querySelectorAll('input:checked')].map(x => Number(x.value));
  list.push({ id: Date.now(), status: 'activa', admission: '2026-08-17T16:00', discharge: null, reason: $('hospReason').value, diagnosis: $('hospDiagnosis').value, notes: $('hospNotes').value, vet: 'Camila Vera', supplies: ids, daily: [], surgeries: [] });
  audit('Hospitalización iniciada'); saveState(); $('hospitalModal').close(); renderFicha(); toast('Hospitalización ficticia iniciada.');
}
function saveDaily(e) {
  e.preventDefault();
  const h = (state.hospitalizations[selectedPatientId] || []).find(x => x.id === Number($('dailyHospId').value));
  if (!h) return;
  h.daily.push({ date: DEFAULT_DATE, temp: $('dailyTemp').value, weight: $('dailyWeight').value, hr: Number($('dailyHr').value), rr: Number($('dailyRr').value), note: $('dailyNote').value || 'Evolución estable.' });
  audit('Registro diario de hospitalización agregado'); saveState(); $('dailyModal').close(); renderHospitalizations(); renderAudit(); toast('Registro diario agregado.');
}
function discharge(id) {
  const h = state.hospitalizations[selectedPatientId].find(x => x.id === id);
  if (!h || !confirm('Finalizar hospitalización ficticia y descontar sus insumos del stock demo?')) return;
  for (const sid of h.supplies || []) { const item = state.inventory.find(x => x.id === sid); if (item && item.stock > 0) item.stock--; }
  h.status = 'alta'; h.discharge = '2026-08-17T18:00'; h.alta = { diagnosis: h.diagnosis || 'Evolución favorable', treatment: 'Indicaciones ficticias post alta', recommendations: 'Control en 7 días', next: '2026-08-24' };
  audit('Alta médica registrada e inventario actualizado'); saveState(); renderFicha(); toast('Alta registrada.');
}

function init() {
  $('agendaDate').value = DEFAULT_DATE;
  $('todayLabel').textContent = fmtDate(DEFAULT_DATE);
  populatePatientSelects();

  $('loginForm').addEventListener('submit', e => {
    e.preventDefault();
    const rut = $('rut').value.replace(/\./g, '').trim();
    const password = $('password').value;
    if (rut !== '22222222-2' || password !== 'DemoVet2026!') return toast('Usa las credenciales demo precargadas.');
    $('loginScreen').classList.add('hidden');
    $('app').classList.remove('hidden');
    go('dashboard');
  });

  document.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => go(el.dataset.view)));
  document.querySelectorAll('[data-go]').forEach(el => el.addEventListener('click', () => go(el.dataset.go)));
  $('menuToggle').addEventListener('click', () => $('vetSidebar').classList.toggle('open'));
  $('agendaDate').addEventListener('change', renderAgenda);
  $('todayButton').addEventListener('click', () => { $('agendaDate').value = DEFAULT_DATE; renderAgenda(); });
  $('openBooking').addEventListener('click', () => showBooking());
  $('patientSearch').addEventListener('input', e => renderPatients(e.target.value));
  $('patientSelect').addEventListener('change', e => { selectedPatientId = Number(e.target.value); renderFicha(); });
  $('historySearch').addEventListener('input', renderTimeline);
  document.querySelectorAll('[data-clinical-tab]').forEach(el => el.addEventListener('click', () => {
    document.querySelectorAll('[data-clinical-tab]').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.clinical-tab').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    $(`clinical-${el.dataset.clinicalTab}`).classList.add('active');
  }));
  document.querySelectorAll('.close-dialog').forEach(el => el.addEventListener('click', () => el.closest('dialog').close()));
  $('bookingForm').addEventListener('submit', saveBooking);
  $('consultationForm').addEventListener('submit', saveConsultation);
  $('hospitalForm').addEventListener('submit', saveHospital);
  $('dailyForm').addEventListener('submit', saveDaily);
  $('openConsultation').addEventListener('click', () => $('consultationModal').showModal());
  $('openHospitalization').addEventListener('click', () => $('hospitalModal').showModal());
  $('openHospitalization2').addEventListener('click', () => $('hospitalModal').showModal());
  $('addDocument').addEventListener('click', () => {
    const name = prompt('Nombre del documento ficticio:', 'Informe clínico demo.pdf');
    if (!name) return;
    state.documents[selectedPatientId] = state.documents[selectedPatientId] || [];
    state.documents[selectedPatientId].unshift({ id: Date.now(), name, date: DEFAULT_DATE, description: 'Documento ficticio' });
    audit('Documento ficticio adjuntado'); saveState(); renderDocuments(); renderAudit();
  });
  $('completeNext').addEventListener('click', () => {
    const a = state.appointments.find(x => x.date === DEFAULT_DATE && x.status !== 'completada');
    if (!a) return toast('No hay citas pendientes.');
    a.status = 'completada'; saveState(); renderDashboard(); renderAgenda(); toast('Cita completada.');
  });
  $('resetDemo').addEventListener('click', () => {
    localStorage.removeItem(STORE_KEY); state = cloneSeed(); selectedPatientId = 1; populatePatientSelects(); renderDashboard(); renderAgenda(); renderPatients(); renderFicha(); toast('Datos restablecidos.');
  });

  renderAgenda();
  renderPatients();
  renderFicha();
}

document.addEventListener('DOMContentLoaded', () => {
  try { init(); }
  catch (error) {
    console.error('Demo init error:', error);
    localStorage.removeItem(STORE_KEY);
    state = cloneSeed();
    toast('La demo se reinició para corregir datos locales incompatibles. Recarga la página.');
  }
});
