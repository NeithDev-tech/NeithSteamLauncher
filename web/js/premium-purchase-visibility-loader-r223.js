(() => {
  'use strict';
  if (location.pathname.includes('/admin/') || location.pathname.includes('/premium/')) return;
  if (document.getElementById('neith-purchase-visibility-r223-css')) return;
  const link=document.createElement('link');
  link.id='neith-purchase-visibility-r223-css';
  link.rel='stylesheet';
  const src=document.currentScript?.src||location.href;
  link.href=new URL('../css/premium-purchase-visibility-r223.css?v=20261021-r223',src).href;
  document.head.appendChild(link);
})();
