window.addEventListener('load',()=>{
  const style=document.createElement('style');
  style.textContent=`
    .demo-topbar .badge{background:#a96532!important;color:#fff!important;border:1px solid #92562a!important}
    .demo-vet-label{font-size:.78rem;font-weight:800;letter-spacing:.08em;color:#315c34;white-space:nowrap}

    #agenda .page-head{margin-bottom:14px}
    #agenda #todayButton{display:none!important}
    #agenda .agenda-filter-panel{margin-top:54px!important;display:flex;flex-direction:column}
    #agenda .agenda-filter-panel #openBooking{order:20;width:100%;margin-top:18px;padding:10px 14px!important;border-radius:8px!important;font-weight:700!important}
    #agenda .agenda-main{min-width:0}
    #agenda .demo-agendas{align-items:start}

    #dashboard .demo-dashboard-layout{display:grid;grid-template-columns:minmax(0,1.65fr) minmax(300px,.75fr);gap:22px;align-items:start}
    #dashboard .demo-dashboard-main,#dashboard .demo-dashboard-side{min-width:0}
    #dashboard .demo-dashboard-side{display:grid;gap:16px}
    #dashboard .demo-side-metrics{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    #dashboard .demo-side-metrics .card{height:100%;margin:0}
    #dashboard .demo-side-metrics .card-body{padding:18px}
    #dashboard .demo-new-appointment{min-height:92px!important;display:grid!important;grid-template-columns:auto 1fr!important;align-items:center!important;text-align:left!important;gap:14px!important;padding:18px!important}
    #dashboard .demo-new-appointment i{margin:0!important;font-size:1.35rem!important}
    #dashboard .demo-new-appointment b,#dashboard .demo-new-appointment small{margin:0!important}
    #dashboard .demo-new-appointment small{grid-column:2}
    #dashboard .demo-dashboard-main .card,#dashboard .demo-dashboard-side .card{margin:0}
    #dashboard .demo-dashboard-main .card-body{padding:18px}
    #dashboard .demo-dashboard-side .mini-event:first-child{padding-top:2px}

    #ficha #openConsultation,#ficha #openHospitalization,#ficha #openHospitalization2,#ficha #addDocument{border-radius:8px!important;font-weight:700!important;box-shadow:none!important;min-height:40px!important}
    #ficha #openConsultation,#ficha #addDocument{background:#6f9874!important;border:1px solid #6f9874!important;color:#fff!important}
    #ficha #openConsultation:hover,#ficha #addDocument:hover{background:#5f8664!important;border-color:#5f8664!important}
    #ficha #openHospitalization,#ficha #openHospitalization2{background:#fff!important;border:1px solid #a96532!important;color:#8d5528!important}
    #ficha #openHospitalization:hover,#ficha #openHospitalization2:hover{background:#fbf4ed!important}
    #ficha .demo-history-sidebar{background:#fafbfa;border-radius:10px;padding:18px!important;border:1px solid #e5e9e6!important}

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
});
