window.addEventListener('load',()=>{
  const style=document.createElement('style');
  style.textContent=`
    #agenda .agenda-block.surgery,
    #dashboard .demo-status.pendiente,
    .badge-warning,
    .bg-warning,
    .alert-warning,
    .btn-warning{
      background:#f3b57a!important;
      color:#000!important;
      border-color:#df9652!important;
    }
    #agenda .agenda-block.surgery *,
    #dashboard .demo-status.pendiente *,
    .badge-warning *,
    .bg-warning *,
    .alert-warning *,
    .btn-warning *{color:#000!important}
    .btn-warning:hover{background:#edaa69!important;color:#000!important;border-color:#d88943!important}

    #agenda .legend .dot.attended{background:#c9d8cb!important;border-color:#718d75!important}
    #agenda .legend .dot.surgery{background:#f3b57a!important;border-color:#df9652!important}
    #agenda .legend .dot.unavailable{background:#eceeef!important;border-color:#cbd0d4!important}
  `;
  document.head.appendChild(style);

  const legend=document.querySelector('#agenda .legend');
  if(legend){
    legend.innerHTML=`
      <span><i class="dot attended"></i>Atendido</span>
      <span><i class="dot available"></i>Disponible</span>
      <span><i class="dot occupied"></i>Ocupado</span>
      <span><i class="dot surgery"></i>Cirugía / procedimiento</span>
      <span><i class="dot unavailable"></i>No disponible</span>
    `;
  }
});
