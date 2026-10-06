(()=>{
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const fine=window.matchMedia?.('(pointer:fine)').matches;
  if(reduced||!fine)return;

  document.querySelectorAll('.neith-cinematic-surface').forEach(surface=>{
    let raf=0;
    let rect=null;
    let latestX=0;
    let latestY=0;
    let dirtyRect=true;

    const readRect=()=>{
      if(!dirtyRect&&rect)return rect;
      rect=surface.getBoundingClientRect();
      dirtyRect=false;
      return rect;
    };

    const reset=()=>{
      surface.classList.remove('neith-cinematic-active');
      surface.style.setProperty('--neith-cap-rx','0deg');
      surface.style.setProperty('--neith-cap-ry','0deg');
      surface.style.setProperty('--neith-cap-mx','50%');
      surface.style.setProperty('--neith-cap-my','50%');
    };

    const render=()=>{
      raf=0;
      const r=readRect();
      if(!r.width||!r.height)return;

      const x=Math.max(0,Math.min(1,(latestX-r.left)/r.width));
      const y=Math.max(0,Math.min(1,(latestY-r.top)/r.height));

      surface.style.setProperty('--neith-cap-rx',`${((.5-y)*1.55).toFixed(2)}deg`);
      surface.style.setProperty('--neith-cap-ry',`${((x-.5)*2.2).toFixed(2)}deg`);
      surface.style.setProperty('--neith-cap-mx',`${(x*100).toFixed(1)}%`);
      surface.style.setProperty('--neith-cap-my',`${(y*100).toFixed(1)}%`);
    };

    surface.addEventListener('pointerenter',ev=>{
      dirtyRect=true;
      latestX=ev.clientX;
      latestY=ev.clientY;
      surface.classList.add('neith-cinematic-active');
      if(!raf)raf=requestAnimationFrame(render);
    },{passive:true});

    surface.addEventListener('pointermove',ev=>{
      latestX=ev.clientX;
      latestY=ev.clientY;
      if(!raf)raf=requestAnimationFrame(render);
    },{passive:true});

    surface.addEventListener('pointerleave',()=>{
      if(raf){
        cancelAnimationFrame(raf);
        raf=0;
      }
      reset();
    },{passive:true});

    const invalidate=()=>{dirtyRect=true};
    window.addEventListener('resize',invalidate,{passive:true});
    window.addEventListener('scroll',invalidate,{passive:true});
  });
})();