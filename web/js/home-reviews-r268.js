(() => {
  'use strict';
  const root = document.querySelector('[data-neith-reviews]');
  if (!root) return;
  const q = (s, r=document) => r.querySelector(s);
  const qa = (s, r=document) => Array.from(r.querySelectorAll(s));
  const esc = (v='') => String(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const tx = (en, es) => (window.NeithI18n?.language === 'es' ? es : en);
  const state = { auth:null, client:null, session:null, profile:null, role:'user', isAdmin:false, reviews:[], editing:null, rating:5, channel:null, refreshTimer:0, page:0 };
  const ui = {
    grid:q('[data-reviews-grid]',root), summary:q('[data-reviews-summary]',root), summaryStars:q('[data-reviews-summary-stars]',root),
    summaryText:q('[data-reviews-summary-text]',root), readAll:q('[data-reviews-all]',root), leave:q('[data-reviews-leave]',root),
    allModal:q('[data-reviews-all-modal]'), allGrid:q('[data-reviews-all-grid]'), editor:q('[data-reviews-editor]'),
    editorTitle:q('[data-reviews-editor-title]'), editorText:q('[data-reviews-editor-text]'), editorCount:q('[data-reviews-editor-count]'),
    editorSave:q('[data-reviews-editor-save]'), editorMessage:q('[data-reviews-editor-message]'), nav:q('[data-reviews-nav]',root), prev:q('[data-reviews-prev]',root), next:q('[data-reviews-next]',root), page:q('[data-reviews-page]',root)
  };
  const formatDate = value => {
    try { return new Intl.DateTimeFormat(window.NeithI18n?.language==='es'?'es-ES':'en-GB',{day:'2-digit',month:'short',year:'numeric'}).format(new Date(value)); }
    catch { return ''; }
  };
  const initials = name => String(name||'N').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase() || 'N';
  const stars = rating => `<span class="home268-stars" aria-label="${rating} / 5">${'★'.repeat(Math.max(0,Math.min(5,Number(rating)||0)))}${'☆'.repeat(5-Math.max(0,Math.min(5,Number(rating)||0)))}</span>`;
  function avatar(review){
    const name=esc(review.display_name||'Neith user');
    if(review.avatar_url) return `<span class="home268-review-avatar"><img src="${esc(review.avatar_url)}" alt="${name}" loading="lazy" decoding="async"></span>`;
    return `<span class="home268-review-avatar" aria-hidden="true">${esc(initials(review.display_name))}</span>`;
  }
  function canEdit(review){ return state.isAdmin || (!!state.session?.user?.id && review.user_id===state.session.user.id); }
  function reviewCard(review, compact=false){
    const edited = review.updated_at && review.created_at && Math.abs(new Date(review.updated_at)-new Date(review.created_at)) > 5000;
    const actions = canEdit(review) ? `<div class="home268-review-actions"><button class="home268-review-action" type="button" data-review-edit="${review.id}">${tx('EDIT','EDITAR')}</button><button class="home268-review-action danger" type="button" data-review-delete="${review.id}">${tx('DELETE','BORRAR')}</button></div>` : '';
    return `<article class="home268-review-card" data-review-id="${review.id}">
      <div class="home268-review-top">${avatar(review)}<div class="home268-review-who"><strong>${esc(review.display_name)}</strong>${stars(review.rating)}</div><span class="home268-review-date">${esc(formatDate(review.created_at))}${edited?`<small class="home268-review-edited">${tx('Edited','Editado')}</small>`:''}</span></div>
      <p class="home268-review-body">${esc(review.body)}</p>${actions}
    </article>`;
  }
  function visibleReviews(){ return state.reviews.filter(r=>!r.is_hidden); }

  const pageSize = () => window.innerWidth<=680 ? 1 : (window.innerWidth<=980 ? 2 : 3);
  function renderCarousel(visible){
    if(!visible.length){
      state.page=0;
      ui.grid.innerHTML=`<div class="home268-reviews-empty"><div><strong>${tx('NO REVIEWS YET','TODAVÍA NO HAY REVIEWS')}</strong><span>${tx('Be the first registered Neith user to share a real experience.','Sé el primer usuario registrado de Neith en compartir una experiencia real.')}</span></div></div>`;
      if(ui.nav) ui.nav.hidden=true;
      return;
    }
    const size=pageSize(), pages=Math.max(1,Math.ceil(visible.length/size));
    if(state.page>=pages) state.page=pages-1;
    const start=state.page*size;
    ui.grid.innerHTML=visible.slice(start,start+size).map(r=>reviewCard(r,true)).join('');
    if(ui.nav){
      ui.nav.hidden=pages<=1;
      if(ui.prev) ui.prev.disabled=state.page<=0;
      if(ui.next) ui.next.disabled=state.page>=pages-1;
      if(ui.page) ui.page.textContent=`${String(state.page+1).padStart(2,'0')} / ${String(pages).padStart(2,'0')}`;
    }
  }
  function render(){
    const visible=visibleReviews();
    if(!visible.length){
      renderCarousel(visible);
      ui.summaryStars.textContent='☆☆☆☆☆'; ui.summaryText.textContent=tx('No reviews yet','Sin reviews todavía');
    } else {
      renderCarousel(visible);
      const avg=visible.reduce((a,r)=>a+Number(r.rating||0),0)/visible.length;
      ui.summaryStars.textContent='★'.repeat(Math.round(avg))+'☆'.repeat(5-Math.round(avg));
      ui.summaryText.textContent=`${avg.toFixed(1)}/5 · ${visible.length} ${visible.length===1?tx('review','review'):tx('reviews','reviews')}`;
    }
    if(ui.allGrid){ ui.allGrid.innerHTML=visible.length?visible.map(r=>reviewCard(r)).join(''):`<div class="home268-all-empty">${tx('No reviews have been published yet.','Todavía no se ha publicado ninguna review.')}</div>`; }
    const own=state.session?.user?.id?state.reviews.find(r=>r.user_id===state.session.user.id):null;
    ui.leave.textContent=own?tx('EDIT MY REVIEW','EDITAR MI REVIEW'):tx('LEAVE A REVIEW','DEJAR UNA REVIEW');
  }
  async function waitForAuth(){
    for(let i=0;i<100;i++){
      if(window.NeithAuth?.client){ state.auth=window.NeithAuth; state.client=window.NeithAuth.client; return true; }
      await new Promise(r=>setTimeout(r,60));
    }
    return false;
  }
  async function syncIdentity(force=false){
    if(!window.NeithAuth) return;
    state.auth=window.NeithAuth; state.client=state.auth.client; state.session=state.auth.session; state.profile=state.auth.profile;
    state.role='user'; state.isAdmin=false;
    if(state.session?.user){
      try { state.role=await state.auth.getAdminRole?.({force}) || 'user'; } catch {}
      state.isAdmin=['owner','admin','superadmin'].includes(String(state.role).toLowerCase());
      if(!state.isAdmin){
        try { const {data}=await state.client.rpc('neith_is_owner'); state.isAdmin=data===true; } catch {}
      }
    }
  }
  async function loadReviews(){
    if(!state.client) return;
    const {data,error}=await state.client.from('neith_reviews').select('id,user_id,display_name,avatar_url,rating,body,is_hidden,created_at,updated_at').order('created_at',{ascending:false}).limit(100);
    if(error){ console.warn('[NEITH REVIEWS]',error.message); return; }
    state.reviews=Array.isArray(data)?data:[]; render();
  }
  function scheduleLoad(){ clearTimeout(state.refreshTimer); state.refreshTimer=setTimeout(()=>loadReviews().catch(()=>{}),100); }
  function openModal(el){ if(!el)return; el.hidden=false; el.setAttribute('aria-hidden','false'); document.documentElement.classList.add('home268-modal-open'); document.body.classList.add('home268-modal-open'); const panel=el.querySelector('.home268-modal-panel'); if(panel){panel.scrollTop=0;panel.scrollLeft=0;} setTimeout(()=>el.querySelector('button,textarea')?.focus({preventScroll:true}),40); }
  function closeModal(el){ if(!el)return; el.hidden=true; el.setAttribute('aria-hidden','true'); if(!document.querySelector('.home268-modal:not([hidden])')){document.documentElement.classList.remove('home268-modal-open');document.body.classList.remove('home268-modal-open');} }
  function setRating(value){ state.rating=Math.max(1,Math.min(5,Number(value)||5)); qa('[data-review-star]',ui.editor).forEach(b=>b.classList.toggle('is-on',Number(b.dataset.reviewStar)<=state.rating)); }
  function findReview(id){ return state.reviews.find(r=>String(r.id)===String(id)); }
  async function openEditor(review=null){
    await syncIdentity(true);
    if(!state.session?.user){ state.auth?.open?.('login'); return; }
    state.editing=review; setRating(review?.rating||5); ui.editorText.value=review?.body||''; ui.editorCount.textContent=`${ui.editorText.value.length} / 800`;
    ui.editorTitle.textContent=review ? (state.isAdmin && review.user_id!==state.session.user.id ? tx('EDIT REVIEW · ADMIN','EDITAR REVIEW · ADMIN') : tx('EDIT YOUR REVIEW','EDITAR TU REVIEW')) : tx('LEAVE A REVIEW','DEJAR UNA REVIEW');
    ui.editorMessage.textContent=''; ui.editorMessage.className=''; openModal(ui.editor);
  }
  async function saveReview(){
    await syncIdentity(true); if(!state.session?.user)return;
    const body=ui.editorText.value.trim(); if(body.length<8){ui.editorMessage.textContent=tx('Write at least 8 characters.','Escribe al menos 8 caracteres.');ui.editorMessage.className='home268-review-error';return;}
    if(body.length>800)return;
    ui.editorSave.disabled=true; ui.editorMessage.textContent=tx('Saving…','Guardando…'); ui.editorMessage.className='';
    try{
      let error;
      if(state.editing){
        const patch={rating:state.rating,body,updated_at:new Date().toISOString()};
        if(state.editing.user_id===state.session.user.id){
          const profile=state.auth.profile||{}; const meta=state.session.user.user_metadata||{};
          patch.display_name=profile.display_name||profile.nickname||meta.display_name||meta.full_name||meta.name||state.session.user.email?.split('@')[0]||'Neith user';
          patch.avatar_url=profile.avatar_url||meta.avatar_url||meta.picture||null;
        }
        ({error}=await state.client.from('neith_reviews').update(patch).eq('id',state.editing.id));
      }else{
        const profile=state.auth.profile||{}; const meta=state.session.user.user_metadata||{};
        const payload={user_id:state.session.user.id,display_name:profile.display_name||profile.nickname||meta.display_name||meta.full_name||meta.name||state.session.user.email?.split('@')[0]||'Neith user',avatar_url:profile.avatar_url||meta.avatar_url||meta.picture||null,rating:state.rating,body};
        ({error}=await state.client.from('neith_reviews').insert(payload));
      }
      if(error) throw error;
      ui.editorMessage.textContent=tx('Review saved.','Review guardada.');ui.editorMessage.className='home268-review-success'; await loadReviews(); setTimeout(()=>closeModal(ui.editor),350);
    }catch(e){
      const duplicate=String(e?.message||'').toLowerCase().includes('duplicate');
      ui.editorMessage.textContent=duplicate?tx('You already have a review. Edit your existing review instead.','Ya tienes una review. Edita la que ya existe.'):String(e?.message||tx('Could not save the review.','No se pudo guardar la review.'));
      ui.editorMessage.className='home268-review-error';
    }finally{ui.editorSave.disabled=false;}
  }
  async function deleteReview(review){
    if(!review)return; await syncIdentity(true); if(!canEdit(review))return;
    if(!confirm(tx('Delete this review permanently?','¿Borrar esta review definitivamente?')))return;
    const {error}=await state.client.from('neith_reviews').delete().eq('id',review.id); if(error){alert(error.message);return;} await loadReviews();
  }
  function bindRealtime(){
    if(!state.client||state.channel)return;
    state.channel=state.client.channel('neith-reviews-home-r268').on('postgres_changes',{event:'*',schema:'public',table:'neith_reviews'},scheduleLoad).subscribe();
  }
  document.addEventListener('click',e=>{
    const edit=e.target.closest('[data-review-edit]'); if(edit){openEditor(findReview(edit.dataset.reviewEdit));return;}
    const del=e.target.closest('[data-review-delete]'); if(del){deleteReview(findReview(del.dataset.reviewDelete));return;}

    if(e.target.closest('[data-reviews-prev]')){ if(state.page>0){state.page--;render();} return; }
    if(e.target.closest('[data-reviews-next]')){ const pages=Math.max(1,Math.ceil(visibleReviews().length/pageSize())); if(state.page<pages-1){state.page++;render();} return; }
    if(e.target.closest('[data-reviews-all]')){render();openModal(ui.allModal);return;}
    if(e.target.closest('[data-reviews-leave]')){const own=state.session?.user?.id?state.reviews.find(r=>r.user_id===state.session.user.id):null;openEditor(own||null);return;}
    if(e.target.closest('[data-reviews-close]')){closeModal(e.target.closest('.home268-modal'));return;}
    const star=e.target.closest('[data-review-star]'); if(star){setRating(star.dataset.reviewStar);return;}
    if(e.target.closest('[data-reviews-editor-save]')){saveReview();return;}
  });
  ui.editorText?.addEventListener('input',()=>{ui.editorCount.textContent=`${ui.editorText.value.length} / 800`;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')qa('.home268-modal:not([hidden])').forEach(closeModal);});
  window.addEventListener('neith:authchange',async()=>{await syncIdentity(true);await loadReviews();});
  window.addEventListener('neith:languagechange',()=>render());
  let resizeTimer=0; window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{state.page=0;render();},120);},{passive:true});
  (async()=>{if(!await waitForAuth())return;await syncIdentity(false);await loadReviews();bindRealtime();})();
})();
