window.addEventListener('load',()=>{
  const style=document.createElement('style');
  style.textContent=`
    #dashboard .demo-dashboard-layout{align-items:stretch!important}
    #dashboard .demo-dashboard-main{display:flex!important;min-height:0!important}
    #dashboard .demo-dashboard-main>.card{display:flex!important;flex:1!important;min-height:0!important}
    #dashboard .demo-dashboard-main>.card>.card-body{display:flex!important;flex-direction:column!important;width:100%!important;min-height:0!important}
    #dashboard #upcomingList{display:grid!important;gap:7px!important;flex:1!important;min-height:0!important;align-content:stretch!important;grid-auto-rows:minmax(58px,1fr)!important}

    #dashboard .demo-dashboard-side{display:grid!important;grid-template-rows:auto auto minmax(0,1fr)!important;gap:12px!important;min-height:0!important}
    #dashboard .demo-new-appointment{min-height:72px!important;padding:13px 16px!important;gap:10px!important}
    #dashboard .demo-side-metrics{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:10px!important}
    #dashboard .demo-side-metrics .card-body{padding:12px 14px!important;min-height:72px!important;display:flex!important;flex-direction:column!important;justify-content:center!important}
    #dashboard .demo-dashboard-side>.card:last-child{min-height:0!important;height:100%!important;overflow:hidden!important}
    #dashboard .demo-dashboard-side>.card:last-child .card-body{height:100%!important;overflow:hidden!important;padding:16px!important}
    #recentActivity{display:grid!important;gap:0!important;align-content:start!important}
    #recentActivity .demo-activity-item{padding:9px 0!important}

    #dashboard .demo-consult-row{background:#fff!important;border:1px solid #e1e6e2!important;box-shadow:none!important}
    #dashboard .demo-consult-row.demo-attended-row{background:#eef4ef!important;border-color:#87a08b!important;box-shadow:inset 4px 0 0 #648168!important}

    #dashboard .demo-status{display:inline-flex!important;align-items:center!important;gap:6px!important;min-height:28px!important;padding:6px 11px!important;border-radius:999px!important;font-size:.78rem!important;font-weight:800!important;line-height:1.05!important;white-space:nowrap!important;letter-spacing:.005em!important;text-rendering:optimizeLegibility!important}
    #dashboard .demo-status.pendiente{background:#f8dfcf!important;color:#60351f!important;border:1px solid #dfb399!important}
    #dashboard .demo-status.confirmada{background:#e5f0fb!important;color:#1f4d72!important;border:1px solid #abc9e3!important}
    #dashboard .demo-status.completada{background:#d5e4d7!important;color:#24452b!important;border:1px solid #86a18b!important}
    #dashboard .demo-status.cirugia{background:#eee5f7!important;color:#563475!important;border:1px solid #cbb4df!important}
    #dashboard .demo-status i{font-size:.72rem!important}
    #dashboard .demo-consult-link{font-size:.8rem!important;font-weight:800!important;white-space:nowrap!important;color:#315c34!important}

    @media(min-width:1101px){
      #dashboard .demo-dashboard-layout{height:calc(100vh - 205px)!important;min-height:590px!important;overflow:hidden!important}
      #dashboard .demo-dashboard-main,#dashboard .demo-dashboard-side{height:100%!important}
      #dashboard .demo-dashboard-main>.card{height:100%!important}
      #dashboard .demo-dashboard-main>.card>.card-body{height:100%!important;padding:16px!important}
    }
    @media(max-width:1100px){
      #dashboard .demo-dashboard-layout{height:auto!important;min-height:auto!important;overflow:visible!important}
      #dashboard .demo-side-metrics{grid-template-columns:repeat(3,minmax(0,1fr))!important}
    }
    @media(max-width:760px){
      #dashboard .demo-side-metrics{grid-template-columns:1fr!important}
      #dashboard .demo-status{font-size:.74rem!important}
    }
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
