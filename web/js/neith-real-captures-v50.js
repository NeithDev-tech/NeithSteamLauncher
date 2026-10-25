(() => {
  'use strict';
  const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const state=new WeakMap();

  function setupCarousel(root){
    const track=qs('.neith-v50-track',root), slides=qsa('.neith-v50-slide',root), dots=qsa('.neith-v50-dot',root), prev=qs('[data-v50-prev]',root), next=qs('[data-v50-next]',root), caption=qs('[data-v50-caption-current]',root);
    if(!track || slides.length<1) return;
    let index=0;
    const render=()=>{
      track.style.transform=`translate3d(${-index*100}%,0,0)`;
      dots.forEach((d,i)=>d.classList.toggle('is-active',i===index));
      slides.forEach((s,i)=>s.setAttribute('aria-hidden',i===index?'false':'true'));
      const link=qs('.neith-v50-shot-link',slides[index]);
      if(caption) caption.textContent=link?.dataset.caption||`Capture ${index+1}`;
      root.dispatchEvent(new CustomEvent('neith:v50change',{detail:{index,slide:slides[index],link,length:slides.length}}));
    };
    const move=(step)=>{index=(index+step+slides.length)%slides.length;render();};
    prev?.addEventListener('click',e=>{e.preventDefault();move(-1)});
    next?.addEventListener('click',e=>{e.preventDefault();move(1)});
    dots.forEach((d,i)=>d.addEventListener('click',e=>{e.preventDefault();index=i;render()}));
    let startX=null;
    root.addEventListener('pointerdown',e=>{if(e.target.closest('button,a'))return;startX=e.clientX},{passive:true});
    root.addEventListener('pointerup',e=>{if(startX==null)return;const dx=e.clientX-startX;startX=null;if(Math.abs(dx)>45)move(dx<0?1:-1)},{passive:true});
    state.set(root,{move});render();
  }

  function ensureLightbox(){
    let modal=qs('[data-v50-lightbox]');
    if(modal)return modal;
    modal=document.createElement('div');modal.className='neith-v50-lightbox';modal.hidden=true;modal.dataset.v50Lightbox='1';modal.innerHTML=`<div class="neith-v50-lightbox-dialog" role="dialog" aria-modal="true" aria-label="Neith real screenshot viewer"><div class="neith-v50-lightbox-bar"><b data-v50-lightbox-title>REAL LAUNCHER CAPTURE</b><div class="neith-v50-lightbox-actions"><button type="button" data-v50-lb-prev aria-label="Previous capture">‹</button><button type="button" data-v50-lb-next aria-label="Next capture">›</button><button type="button" data-v50-lb-close aria-label="Close">×</button></div></div><div class="neith-v50-lightbox-stage"><img data-v50-lb-image alt="Expanded Neith launcher capture"></div><div class="neith-v50-lightbox-foot">ORIGINAL CAPTURE · NO CROPPING · ESC TO CLOSE</div></div>`;document.body.appendChild(modal);return modal;
  }

  function setupLightbox(){
    const allLinks=qsa('.neith-v50-shot-link');if(!allLinks.length)return;
    const modal=ensureLightbox(), img=qs('[data-v50-lb-image]',modal), title=qs('[data-v50-lightbox-title]',modal);let currentLinks=[],index=0,lastFocus=null;
    const applySizing=(a)=>{
      modal.classList.toggle('is-vac-mode', (a?.dataset.v50Group||'')==='vac-live');
      img.style.maxWidth=''; img.style.maxHeight='';
      const natural=a?.dataset.v50Natural==='1';
      const src=a?.dataset.full||a?.href;
      if(!src) return;
      const temp=new Image();
      temp.onload=()=>{
        if(!natural) return;
        const vw=Math.max(document.documentElement.clientWidth||0, window.innerWidth||0);
        const vh=Math.max(document.documentElement.clientHeight||0, window.innerHeight||0);
        const chrome=((a?.dataset.v50Group||'')==='vac-live') ? 32 : 110;
        const maxW=Math.min(temp.naturalWidth||vw, Math.floor(vw*0.96));
        const maxH=Math.min(temp.naturalHeight||vh, Math.floor(vh*0.96)-chrome);
        img.style.maxWidth=maxW+'px';
        img.style.maxHeight=maxH+'px';
      };
      temp.src=src;
    };
    const render=()=>{const a=currentLinks[index];if(!a)return;img.src=a.dataset.full||a.href;img.alt=a.dataset.caption||a.querySelector('img')?.alt||'Neith launcher capture';title.textContent=a.dataset.caption||'REAL LAUNCHER CAPTURE';applySizing(a)};
    const open=(links,i)=>{currentLinks=links;index=i;lastFocus=document.activeElement;render();modal.hidden=false;document.body.classList.add('neith-v50-lightbox-open');qs('[data-v50-lb-close]',modal)?.focus({preventScroll:true})};
    const close=()=>{modal.hidden=true;modal.classList.remove('is-vac-mode');document.body.classList.remove('neith-v50-lightbox-open');img.removeAttribute('src');img.style.maxWidth='';img.style.maxHeight='';lastFocus?.focus?.({preventScroll:true})};
    const move=s=>{if(!currentLinks.length)return;index=(index+s+currentLinks.length)%currentLinks.length;render()};
    document.addEventListener('click',e=>{const a=e.target.closest?.('.neith-v50-shot-link');if(!a)return;const group=a.dataset.v50Group||'';let links=allLinks; if(group){ const root=a.closest('.neith-v50-carousel')||document; links=qsa(`.neith-v50-shot-link[data-v50-group="${group}"]`, root); if(!links.length) links=allLinks.filter(x=>x.dataset.v50Group===group); } const i=links.indexOf(a); if(i<0)return; e.preventDefault();e.stopPropagation();e.stopImmediatePropagation?.();open(links,i)},true);
    qs('[data-v50-lb-close]',modal)?.addEventListener('click',close);qs('[data-v50-lb-prev]',modal)?.addEventListener('click',()=>move(-1));qs('[data-v50-lb-next]',modal)?.addEventListener('click',()=>move(1));
    modal.addEventListener('click',e=>{if(e.target===modal)close()});document.addEventListener('keydown',e=>{if(modal.hidden)return;if(e.key==='Escape')close();else if(e.key==='ArrowLeft')move(-1);else if(e.key==='ArrowRight')move(1)});
    window.addEventListener('resize',()=>{ if(!modal.hidden) render(); },{passive:true});
  }
  function initHBAdvancedInfo(){
    qsa('.hb-advanced-stack').forEach(root=>{
      const title=qs('[data-hb-title]',root), desc=qs('[data-hb-desc]',root), current=qs('[data-hb-current]',root), pillsWrap=qs('[data-hb-pills]',root);
      if(!title || !desc || !current || !pillsWrap) return;
      const update=(detail={})=>{
        const activeLink=detail.link || qs('.neith-v50-slide[aria-hidden="false"] .neith-v50-shot-link',root) || qs('.neith-v50-shot-link',root);
        if(!activeLink) return;
        title.textContent=activeLink.dataset.hbTitle || activeLink.dataset.caption || 'Hour Boost';
        desc.textContent=activeLink.dataset.hbDesc || '';
        const idx=(typeof detail.index==='number'?detail.index:qsa('.neith-v50-slide',root).findIndex(slide=>slide.getAttribute('aria-hidden')==='false'));
        current.textContent=String((idx<0?0:idx)+1).padStart(2,'0');
        const pills=(activeLink.dataset.hbPills||'').split('|').map(v=>v.trim()).filter(Boolean);
        pillsWrap.innerHTML=pills.map((pill,i)=>`<span${i===0?' class="is-accent"':''}>${pill}</span>`).join('');
      };
      root.addEventListener('neith:v50change',e=>update(e.detail));
      update();
    });
  }
  const init=()=>{qsa('.neith-v50-carousel').forEach(setupCarousel);setupLightbox();initHBAdvancedInfo()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
;(() => {
  'use strict';
  const initHB3 = () => document.querySelectorAll('[data-hb3]').forEach(root => {
    if (root.dataset.hb3Ready === '1') return; root.dataset.hb3Ready = '1';
    const slides=[...root.querySelectorAll('[data-hb3-slide]')]; if(!slides.length)return;
    let index=0; const current=root.querySelector('[data-hb3-current]'),title=root.querySelector('[data-hb3-title]'),desc=root.querySelector('[data-hb3-desc]'),pills=root.querySelector('[data-hb3-pills]'),dotsHost=root.querySelector('[data-hb3-dots]');
    const dots=slides.map((_,i)=>{const b=document.createElement('button');b.type='button';b.className='hb3-dot'+(i===0?' is-active':'');b.setAttribute('aria-label',`Go to Hour Boost slide ${i+1}`);b.addEventListener('click',()=>{index=i;render()});dotsHost?.appendChild(b);return b});
    const render=()=>{slides.forEach((s,i)=>{const a=i===index;s.classList.toggle('is-active',a);s.setAttribute('aria-hidden',a?'false':'true')});dots.forEach((d,i)=>d.classList.toggle('is-active',i===index));const s=slides[index];if(current)current.textContent=String(index+1).padStart(2,'0');if(title)title.textContent=s.dataset.title||'Hour Boost';if(desc)desc.textContent=s.dataset.desc||'';if(pills){const arr=(s.dataset.pills||'').split('|').map(x=>x.trim()).filter(Boolean);pills.innerHTML=arr.map((x,i)=>`<span${i===0?' class="is-accent"':''}>${x}</span>`).join('')}};
    root.querySelector('[data-hb3-prev]')?.addEventListener('click',()=>{index=(index-1+slides.length)%slides.length;render()});root.querySelector('[data-hb3-next]')?.addEventListener('click',()=>{index=(index+1)%slides.length;render()});
    let sx=null;const stage=root.querySelector('.hb3-stage');stage?.addEventListener('pointerdown',e=>{if(e.target.closest('a,button'))return;sx=e.clientX},{passive:true});stage?.addEventListener('pointerup',e=>{if(sx==null)return;const dx=e.clientX-sx;sx=null;if(Math.abs(dx)>45){index=(index+(dx<0?1:-1)+slides.length)%slides.length;render()}},{passive:true});render();
  });
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initHB3,{once:true});else initHB3();
})();
