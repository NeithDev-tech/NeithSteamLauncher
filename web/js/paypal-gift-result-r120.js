(() => {
  'use strict';
  let value='';
  try{value=new URL(location.href).searchParams.get('gift')||'';}catch{}
  if(!value)return;
  const copy={
    success:['GIFT KEY CONFIRMED','PayPal confirmed the payment. The key is now available in Neith Keys inside the launcher.','ok'],
    cancelled:['PURCHASE CANCELLED','No gift key was issued. You can try again whenever you want.','warn'],
    invalid:['PAYMENT NOT VERIFIED','Neith could not validate this operation as a gift-key purchase.','error'],
    error:['COULD NOT COMPLETE','The operation was not completed. If PayPal shows a charge, contact support before trying again.','error']
  }[value];
  if(!copy)return;
  const mount=document.querySelector('.private-hub-shell')||document.querySelector('main')||document.body;
  const box=document.createElement('section');box.className=`neith-gift-result ${copy[2]}`;box.innerHTML=`<div><small>PAYPAL LIVE // GIFT KEY</small><h2>${copy[0]}</h2><p>${copy[1]}</p></div><button type="button" aria-label="Close">×</button>`;
  mount.prepend(box);box.querySelector('button')?.addEventListener('click',()=>box.remove());
  try{const u=new URL(location.href);u.searchParams.delete('gift');history.replaceState({},'',u.pathname+u.search+u.hash);}catch{}
})();
