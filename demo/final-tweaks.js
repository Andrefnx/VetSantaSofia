window.addEventListener('load',()=>{
  const style=document.createElement('style');
  style.textContent=`
    #agenda .agenda-real-layout{align-items:start!important}
    #agenda .agenda-main>div:first-child{margin-left:0!important;padding-left:0!important}
    #agenda .agenda-main>div:first-child h3{margin:0 0 14px 0!important}
    #agenda .agenda-main{padding-top:0!important}
    #agenda .agenda-filter-panel{margin-top:54px!important}

    .vet-sidebar-header{display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:10px!important;padding:14px 12px!important;min-height:94px!important}
    .demo-vet-label{width:100%!important;text-align:center!important;justify-content:center!important}
    .demo-repo-cta{display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:8px 10px;border-radius:8px;background:#f2f3f2;border:1px solid #d9ddda;color:#4d5650!important;text-decoration:none!important;font-size:.7rem;font-weight:700;line-height:1.25;text-align:center;transition:.15s}
    .demo-repo-cta:hover{background:#e8ebe9;border-color:#c7ceca;color:#2f3932!important;text-decoration:none!important}
    .demo-repo-cta i{font-size:.8rem}
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

  const agendaMain=document.querySelector('#agenda .agenda-main');
  const title=document.querySelector('#agenda #agendaTitle')?.closest('h3');
  const vetContainer=document.getElementById('vetAgendas');
  if(agendaMain&&title&&vetContainer){
    const firstCol=vetContainer.querySelector('.agenda-vet-col');
    if(firstCol){
      title.style.marginLeft='0';
    }
  }
});
