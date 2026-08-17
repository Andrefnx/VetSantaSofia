window.addEventListener('load',()=>{
  const style=document.createElement('style');
  style.textContent=`
    #agenda .page-head{display:grid!important;grid-template-columns:300px minmax(0,1fr)!important;gap:24px!important;align-items:center!important;margin-bottom:18px!important}
    #agenda .page-head .page-title,#agenda .agenda-date-heading{margin:0!important;transform:none!important;display:flex!important;align-items:center!important;min-height:34px!important}
    #agenda .agenda-real-layout{grid-template-columns:300px minmax(0,1fr)!important;gap:24px!important;align-items:start!important}
    #agenda .agenda-filter-panel{margin-top:0!important}
    #agenda .agenda-main{padding-top:0!important;min-width:0!important}

    #agenda .agenda-block.surgery,
    #dashboard .demo-status.pendiente,
    .badge-warning,
    .bg-warning,
    .alert-warning,
    .btn-warning{
      background:#f7c98b!important;
      color:#000!important;
      border-color:#e6a85a!important;
    }
    #agenda .agenda-block.surgery *,
    #dashboard .demo-status.pendiente *,
    .badge-warning *,
    .bg-warning *,
    .alert-warning *,
    .btn-warning *{color:#000!important}
    .btn-warning:hover{background:#f2bb73!important;color:#000!important;border-color:#da9848!important}

    #agenda .legend .dot.available{background:#e8f1e8!important;border-color:#a8c5aa!important}
    #agenda .legend .dot.occupied{background:#f6dddd!important;border-color:#dba4a4!important}
    #agenda .legend .dot.attended{background:#d5dfd6!important;border-color:#6f8a73!important}
    #agenda .legend .dot.surgery{background:#f7c98b!important;border-color:#e6a85a!important}
    #agenda .legend .dot.unavailable{background:#f4f4f4!important;border-color:#cfd3d7!important}

    .vet-sidebar-header{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:10px!important;padding:14px 12px!important;min-height:94px!important}
    .demo-vet-label{width:100%!important;text-align:center!important;justify-content:center!important}
    .demo-repo-cta{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:8px 10px;border-radius:8px;background:#f2f3f2;border:1px solid #d9ddda;color:#4d5650!important;text-decoration:none!important;font-size:.7rem;font-weight:700;line-height:1.25;text-align:center;transition:.15s}
    .demo-repo-cta:hover{background:#e8ebe9;border-color:#c7ceca;color:#2f3932!important;text-decoration:none!important}
    .demo-repo-cta i{font-size:.8rem}

    @media(max-width:991px){
      #agenda .page-head,#agenda .agenda-real-layout{grid-template-columns:1fr!important}
      #agenda .page-head{gap:8px!important}
    }
  `;
  document.head.appendChild(style);

  const sidebarHeader=document.querySelector('.vet-sidebar-header');
  if(sidebarHeader&&!sidebarHeader.querySelector('.demo-repo-cta')){
    const link=document.createElement('a');
    link.className='demo-repo-cta';
    link.href='https://github.com/Andrefnx/VetSantaSofia';
    link.target='_blank';
    link.rel='noopener noreferrer';
    link.innerHTML='<i class="fab fa-github"></i><span>¿Te gusta este proyecto?<br>Revisa el repositorio</span>';
    sidebarHeader.appendChild(link);
  }

  const agenda=document.getElementById('agenda');
  const pageHead=agenda?.querySelector('.page-head');
  const agendaMain=agenda?.querySelector('.agenda-main');
  const dateHeading=agenda?.querySelector('#agendaTitle')?.closest('h3');
  if(pageHead&&agendaMain&&dateHeading){
    dateHeading.classList.add('agenda-date-heading');
    pageHead.appendChild(dateHeading);
  }

  const legend=agenda?.querySelector('.legend');
  if(legend){
    legend.innerHTML=`
      <span><i class="dot available"></i>Disponible</span>
      <span><i class="dot occupied"></i>Ocupado</span>
      <span><i class="dot attended"></i>Atendido</span>
      <span><i class="dot surgery"></i>Cirugía</span>
      <span><i class="dot unavailable"></i>No disponible</span>
    `;
  }
});
