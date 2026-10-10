(() => {
  'use strict';
  let value='';
  try{value=new URL(location.href).searchParams.get('gift')||'';}catch{}
  if(!value)return;
  const copy={
    success:['CLAVE REGALO CONFIRMADA','PayPal ha confirmado el pago. La clave ya está disponible en Claves Neith dentro del launcher.','ok'],
    cancelled:['COMPRA CANCELADA','No se ha emitido ninguna clave regalo. Puedes volver a intentarlo cuando quieras.','warn'],
    invalid:['PAGO NO VALIDADO','Neith no pudo validar esta operación como una compra de clave regalo.','error'],
    error:['NO SE PUDO COMPLETAR','La operación no se completó. Si PayPal muestra un cargo, contacta con soporte antes de repetir el pago.','error']
  }[value];
  if(!copy)return;
  const mount=document.querySelector('.private-hub-shell')||document.querySelector('main')||document.body;
  const box=document.createElement('section');box.className=`neith-gift-result ${copy[2]}`;box.innerHTML=`<div><small>PAYPAL LIVE // GIFT KEY</small><h2>${copy[0]}</h2><p>${copy[1]}</p></div><button type="button" aria-label="Cerrar">×</button>`;
  mount.prepend(box);box.querySelector('button')?.addEventListener('click',()=>box.remove());
  try{const u=new URL(location.href);u.searchParams.delete('gift');history.replaceState({},'',u.pathname+u.search+u.hash);}catch{}
})();
