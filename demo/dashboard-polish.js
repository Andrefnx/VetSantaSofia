window.addEventListener('load',()=>{
  const style=document.createElement('style');
  style.textContent=`
    #dashboard .demo-dashboard-layout{min-height:calc(100vh - 170px)!important;align-items:stretch!important}
    #dashboard .demo-dashboard-main{display:flex!important;min-height:100%!important}
    #dashboard .demo-dashboard-main>.card{display:flex!important;flex:1!important;min-height:100%!important}
    #dashboard .demo-dashboard-main>.card>.card-body{display:flex!important;flex-direction:column!important;width:100%!important}
    #dashboard #upcomingList{display:grid!important;gap:8px!important;flex:1!important;align-content:stretch!important;grid-auto-rows:minmax(64px,1fr)!important}

    #dashboard .demo-consult-row{background:#fff!important;border:1px solid #e1e6e2!important;box-shadow:none!important}
    #dashboard .demo-consult-row.demo-attended-row{background:#f0f4f0!important;border-color:#8fa793!important;box-shadow:inset 4px 0 0 #6f8a73!important}

    #dashboard .demo-status{display:inline-flex!important;align-items:center!important;gap:6px!important;min-height:26px!important;padding:5px 10px!important;border-radius:999px!important;font-size:.72rem!important;font-weight:800!important;line-height:1!important;white-space:nowrap!important;letter-spacing:.01em!important}
    #dashboard .demo-status.pendiente{background:#f8dfcf!important;color:#5b3422!important;border:1px solid #e8bfa8!important}
    #dashboard .demo-status.confirmada{background:#e7f1ff!important;color:#24527a!important;border:1px solid #bfd5ec!important}
    #dashboard .demo-status.completada{background:#d8e5da!important;color:#294b2f!important;border:1px solid #92ac96!important}
    #dashboard .demo-status.cirugia{background:#f3ecfb!important;color:#68408a!important;border:1px solid #d7c3ed!important}
    #dashboard .demo-consult-link{font-weight:800!important;white-space:nowrap!important;color:#315c34!important}

    @media(max-width:1100px){#dashboard .demo-dashboard-layout{min-height:auto!important}}
  `;
  document.head.appendChild(style);

  const markExactCompleted=()=>{
    if(typeof state==='undefined')return;
    document.querySelectorAll('#upcomingList [data-dashboard-patient]').forEach(row=>{
      const pid=Number(row.dataset.dashboardPatient);
      const time=(row.querySelector('time')?.textContent||row.textContent.match(/\b\d{2}:\d{2}\b/)?.[0]||'').trim();
      const attended=state.appointments.some(a=>a.patientId===pid&&a.date===DEFAULT_DATE&&a.time===time&&a.status==='completada');
      row.classList.toggle('demo-attended-row',attended);
    });
  };

  const previous=window.renderDashboard;
  if(typeof previous==='function')window.renderDashboard=function(){previous();markExactCompleted()};
  markExactCompleted();
});
