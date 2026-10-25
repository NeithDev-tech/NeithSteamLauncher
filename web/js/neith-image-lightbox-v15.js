(function(){
  'use strict';
  if(window.__NEITH_IMAGE_LIGHTBOX_V15__) return;
  window.__NEITH_IMAGE_LIGHTBOX_V15__=true;

  function isContentImage(img){
    if(!(img instanceof HTMLImageElement)) return false;
    if(img.closest('.neith-v50-carousel')) return false;
    if(img.closest('#neith-v4-header,#neith-v4-footer,.topbar,footer,.auth-modal')) return false;
    if(img.matches('.avatar,[data-no-lightbox]')) return false;
    var src=(img.currentSrc||img.src||'').toLowerCase();
    if(!src) return false;
    if(/avatar|favicon|logo|icon|badge/.test(src)) return false;
    var r=img.getBoundingClientRect();
    var nw=img.naturalWidth||0, nh=img.naturalHeight||0;
    // Skip tiny decorative/interface assets, keep screenshots/photos.
    if((nw && nw<280) || (nh && nh<160)) return false;
    if(r.width<120 && r.height<90) return false;
    return true;
  }

  var box=document.createElement('div');
  box.className='neith-lightbox-v15';
  box.setAttribute('aria-hidden','true');
  box.innerHTML='<div class="neith-lightbox-v15__stage" role="dialog" aria-modal="true" aria-label="Image preview"><button class="neith-lightbox-v15__close" type="button" aria-label="Close image">×</button><img class="neith-lightbox-v15__img" alt=""><div class="neith-lightbox-v15__caption" hidden></div></div>';
  document.body.appendChild(box);
  var view=box.querySelector('.neith-lightbox-v15__img');
  var cap=box.querySelector('.neith-lightbox-v15__caption');
  var closeBtn=box.querySelector('.neith-lightbox-v15__close');

  function close(){
    box.classList.remove('is-open');box.setAttribute('aria-hidden','true');
    document.documentElement.classList.remove('neith-lightbox-open');
    setTimeout(function(){if(!box.classList.contains('is-open')){view.removeAttribute('src');view.alt='';}},190);
  }
  function open(img){
    var src=img.getAttribute('data-full')||img.closest('a')?.getAttribute('data-full')||img.closest('a')?.getAttribute('href')||img.currentSrc||img.src;
    if(!src) return;
    view.src=src; view.alt=img.alt||'Neith screenshot';
    var txt=img.getAttribute('data-caption')||img.closest('[data-caption]')?.getAttribute('data-caption')||img.alt||'';
    cap.textContent=txt; cap.hidden=!txt;
    box.classList.add('is-open');box.setAttribute('aria-hidden','false');
    document.documentElement.classList.add('neith-lightbox-open');
    closeBtn.focus({preventScroll:true});
  }

  document.addEventListener('click',function(e){
    var img=e.target.closest&&e.target.closest('img');
    if(!img||!isContentImage(img)) return;
    e.preventDefault();e.stopPropagation();
    open(img);
  },true);
  closeBtn.addEventListener('click',close);
  box.addEventListener('click',function(e){if(e.target===box) close();});
  document.addEventListener('keydown',function(e){if(e.key==='Escape'&&box.classList.contains('is-open')) close();});

  function mark(root){
    (root||document).querySelectorAll('main img,.product-shot img,.screen-frame img,.neith-approved-poster-link img').forEach(function(img){
      if(isContentImage(img)){img.setAttribute('data-neith-lightbox','1');img.title=img.title||'Click to enlarge';}
    });
  }
  mark();
  new MutationObserver(function(ms){for(var m of ms){for(var n of m.addedNodes){if(n.nodeType===1){if(n.matches?.('img')&&isContentImage(n)){n.setAttribute('data-neith-lightbox','1');n.title=n.title||'Click to enlarge';}mark(n);}}}}).observe(document.body,{childList:true,subtree:true});
})();
