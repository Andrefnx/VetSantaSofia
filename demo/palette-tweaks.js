window.addEventListener('load',()=>{
  const style=document.createElement('style');
  style.textContent=`
    #agenda .agenda-block.surgery,
    #dashboard .demo-status.pendiente,
    .badge-warning,
    .bg-warning,
    .alert-warning,
    .btn-warning{
      background:#f8dfcf!important;
      color:#2f241f!important;
      border-color:#e8bfa8!important;
    }
    #agenda .agenda-block.surgery *,
    #dashboard .demo-status.pendiente *,
    .badge-warning *,
    .bg-warning *,
    .alert-warning *,
    .btn-warning *{color:#2f241f!important}
    .btn-warning:hover{background:#f3d2bf!important;color:#2f241f!important;border-color:#dda98e!important}

    #agenda .legend .dot.attended{background:#c9d8cb!important;border-color:#718d75!important}
    #agenda .legend .dot.surgery{background:#f8dfcf!important;border-color:#e8bfa8!important}
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
