window.addEventListener('load',()=>{
  const style=document.createElement('style');
  style.textContent=`
    .demo-topbar .badge{background:#b67845!important;color:#fff!important;border:1px solid #9f6537!important}
    .demo-vet-label{display:flex;align-items:center;justify-content:center;width:100%;text-align:center;font-size:.78rem;font-weight:800;letter-spacing:.08em;color:#315c34;white-space:nowrap}
    .vet-sidebar-header{justify-content:center!important}

    #agenda .page-head{margin-bottom:14px}
    #agenda #todayButton{display:none!important}
    #agenda .agenda-filter-panel{margin-top:54px!important;display:flex;flex-direction:column}
    #agenda .agenda-filter-panel #openBooking{order:20;width:100%;margin-top:18px;padding:10px 14px!important;border-radius:8px!important;font-weight:700!important;background:#6f8f73!important;border-color:#6f8f73!important}
    #agenda .agenda-filter-panel #openBooking:hover{background:#607d64!important;border-color:#607d64!important}
    #agenda .agenda-main{min-width:0}
    #agenda .demo-agendas{align-items:start}
    #agenda .agenda-block.available{background:#e8f1e8!important;border-color:#a8c5aa!important}
    #agenda .agenda-block.occupied{background:#f6dddd!important;border-color:#dba4a4!important}
    #agenda .agenda-block.surgery{background:#f4e7d4!important;border-color:#d3ad76!important}
    #agenda .agenda-block.demo-attended{background:#d5dfd6!important;border-color:#6f8a73!important;box-shadow:inset 0 0 0 1px #6f8a73!important}
    #agenda .agenda-block.demo-attended b,#agenda .agenda-block.demo-attended span{font-weight:800!important;color:#263a29!important}

    #dashboard .demo-dashboard-layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(300px,.75fr);gap:22px;align-items:start}
    #dashboard .demo-dashboard-main,#dashboard .demo-dashboard-side{min-width:0}
    #dashboard .demo-dashboard-side{display:grid;gap:16px}
    #dashboard .demo-side-metrics{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    #dashboard .demo-side-metrics .card{height:100%;margin:0}
    #dashboard .demo-side-metrics .card-body{padding:18px}
    #dashboard .demo-new-appointment{min-height:92px!important;display:grid!important;grid-template-columns:auto 1fr!important;align-items:center!important;text-align:left!important;gap:14px!important;padding:18px!important;background:#f6f9f6!important;border-color:#dce6dd!important}
    #dashboard .demo-new-appointment i{margin:0!important;font-size:1.35rem!important;color:#667f69!important}
    #dashboard .demo-new-appointment b,#dashboard .demo-new-appointment small{margin:0!important}
    #dashboard .demo-new-appointment small{grid-column:2}
    #dashboard .demo-dashboard-main .card,#dashboard .demo-dashboard-side .card{margin:0}
    #dashboard .demo-dashboard-main .card-body{padding:18px}
    #dashboard .demo-dashboard-side .mini-event:first-child{padding-top:2px}
    #dashboard .demo-status.completada{background:#d8e5da!important;border-color:#92ac96!important;color:#34563a!important}
    #dashboard .demo-consult-row.demo-attended-row{background:#f0f4f0!important;border-color:#8fa793!important;box-shadow:inset 4px 0 0 #6f8a73!important}
    #dashboard .demo-consult-row.demo-attended-row .demo-consult-main strong{color:#243728!important}
    #recentActivity{display:grid;gap:10px}
    #recentActivity .demo-activity-item{padding:10px 0;border-bottom:1px solid #e6ebe6}
    #recentActivity .demo-activity-item:last-child{border-bottom:0}
    #recentActivity .demo-activity-item strong{display:block;color:#26372a;font-size:.9rem}
    #recentActivity .demo-activity-item small{display:block;color:#6d756f;margin-top:2px}

    #ficha #openConsultation,#ficha #openHospitalization,#ficha #openHospitalization2,#ficha #addDocument{border-radius:8px!important;font-weight:700!important;box-shadow:none!important;min-height:40px!important}
    #ficha #openConsultation,#ficha #addDocument{background:#6f8f73!important;border:1px solid #6f8f73!important;color:#fff!important}
    #ficha #openConsultation:hover,#ficha #addDocument:hover{background:#607d64!important;border-color:#607d64!important}
    #ficha #openHospitalization,#ficha #openHospitalization2{background:#fff!important;border:1px solid #a96532!important;color:#8d5528!important}
    #ficha #openHospitalization:hover,#ficha #openHospitalization2:hover{background:#fbf4ed!important}
    #ficha .demo-history-sidebar{background:#fafbfa;border-radius:10px;padding:18px!important;border:1px solid #e5e9e6!important}
    .demo-dialog .btn-success,.demo-dialog .btn-primary{background:#6f8f73!important;border-color:#6f8f73!important;color:#fff!important}
    .demo-dialog .btn-success:hover,.demo-dialog .btn-primary:hover{background:#607d64!important;border-color:#607d64!important}

    @media(max-width:1100px){#dashboard .demo-dashboard-layout{grid-template-columns:1fr}#dashboard .demo-dashboard-side{grid-template-columns:1fr 1fr}#dashboard .demo-side-metrics{grid-column:1/-1}}
    @media(max-width:760px){#dashboard .demo-dashboard-side{grid-template-columns:1fr}#dashboard .demo-side-metrics{grid-template-columns:1fr 1fr}#agenda .agenda-filter-panel{margin-top:0!important}}
  `;
  document.head.appendChild(style);

  const menuToggle=document.getElementById('menuToggle');
  if(menuToggle){
    const label=document.createElement('span');
    label.className='demo-vet-label';
    label.textContent='DEMO VET';
    menuToggle.replaceWith(label);
  }

  const filterPanel=document.querySelector('#agenda .agenda-filter-panel');
  const bookingButton=document.getElementById('openBooking');
  if(filterPanel&&bookingButton){
    bookingButton.classList.remove('btn-sm');
    bookingButton.classList.add('w-100');
    filterPanel.appendChild(bookingButton);
  }

  const dashboard=document.getElementById('dashboard');
  if(dashboard&&!dashboard.querySelector('.demo-dashboard-layout')){
    const rows=[...dashboard.children].filter(el=>el.classList?.contains('row'));
    const quickRow=rows[0],metricRow=rows[1],contentRow=rows[2];
    if(quickRow&&metricRow&&contentRow){
      const quickCols=[...quickRow.children];
      const metricCols=[...metricRow.children];
      const contentCols=[...contentRow.children];
      const newAppointment=quickCols[0]?.querySelector('.quick-action-card');
      const upcoming=contentCols[0]?.querySelector('.card');
      const recent=contentCols[1]?.querySelector('.card');
      const metricCitas=metricCols[0]?.querySelector('.card');
      const metricPendientes=metricCols[1]?.querySelector('.card');
      const metricAtendidos=metricCols[3]?.querySelector('.card');

      if(newAppointment&&upcoming&&recent&&metricCitas&&metricPendientes&&metricAtendidos){
        newAppointment.classList.add('demo-new-appointment');
        const layout=document.createElement('div');
        layout.className='demo-dashboard-layout';
        const main=document.createElement('div');
        main.className='demo-dashboard-main';
        const side=document.createElement('div');
        side.className='demo-dashboard-side';
        const metrics=document.createElement('div');
        metrics.className='demo-side-metrics';
        main.appendChild(upcoming);
        metrics.append(metricCitas,metricPendientes,metricAtendidos);
        side.append(newAppointment,metrics,recent);
        layout.append(main,side);
        quickRow.remove();
        metricRow.remove();
        contentRow.remove();
        dashboard.appendChild(layout);
      }
    }
  }

  const renderRecentActivity=()=>{
    const target=document.getElementById('recentActivity');
    if(!target||typeof state==='undefined')return;
    const items=[
      {title:'Luna · Consulta finalizada',meta:'09:18 · Camila Vera · Control dermatológico'},
      {title:'Milo · Vacunación registrada',meta:'10:48 · Camila Vera · Vacuna triple felina'},
      {title:'Nala · Cirugía preparada',meta:'11:20 · Ignacio Rojas · Cirugía abdominal'},
      {title:'Simón · Ficha clínica revisada',meta:'12:05 · Camila Vera · Evaluación digestiva'}
    ];
    target.innerHTML=items.map(x=>`<div class="demo-activity-item"><strong>${x.title}</strong><small>${x.meta}</small></div>`).join('');
  };

  const markCompletedDashboard=()=>{
    if(typeof state==='undefined')return;
    document.querySelectorAll('#upcomingList [data-dashboard-patient]').forEach(row=>{
      const pid=Number(row.dataset.dashboardPatient);
      const attended=state.appointments.some(a=>a.patientId===pid&&a.date===DEFAULT_DATE&&a.status==='completada');
      row.classList.toggle('demo-attended-row',attended);
    });
  };

  const markCompletedAgenda=()=>{
    if(typeof state==='undefined')return;
    const date=document.getElementById('agendaDate')?.value||DEFAULT_DATE;
    const completed=state.appointments.filter(a=>a.date===date&&a.status==='completada');
    const cols=[...document.querySelectorAll('#vetAgendas .agenda-vet-col')];
    cols.forEach((col,index)=>{
      const vetObj=(document.getElementById('vetFilter')?.value?state.vets.filter(v=>String(v.id)===document.getElementById('vetFilter').value):state.vets)[index];
      if(!vetObj)return;
      const blocks=[...col.querySelectorAll('.agenda-block')];
      completed.filter(a=>a.vetId===vetObj.id).forEach(a=>{
        const times=appointmentBlocks(a);
        times.forEach(t=>{
          const block=blocks.find(b=>b.querySelector('b')?.textContent.trim()===t);
          if(block)block.classList.add('demo-attended');
        });
      });
    });
  };

  const baseDashboard=window.renderDashboard;
  if(typeof baseDashboard==='function')window.renderDashboard=function(){baseDashboard();renderRecentActivity();markCompletedDashboard()};
  const baseAgenda=window.renderAgenda;
  if(typeof baseAgenda==='function')window.renderAgenda=function(){baseAgenda();markCompletedAgenda()};

  renderRecentActivity();
  markCompletedDashboard();
  markCompletedAgenda();
});
