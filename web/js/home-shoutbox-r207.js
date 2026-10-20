(() => {
  'use strict';
  const root = document.querySelector('[data-neith-shoutbox]');
  if (!root) return;

  const ui = {
    list: root.querySelector('[data-shoutbox-list]'),
    empty: root.querySelector('[data-shoutbox-empty]'),
    status: root.querySelector('[data-shoutbox-status]'),
    guest: root.querySelector('[data-shoutbox-guest]'),
    inputRow: root.querySelector('[data-shoutbox-inputrow]'),
    input: root.querySelector('[data-shoutbox-input]'),
    send: root.querySelector('[data-shoutbox-send]'),
    counter: root.querySelector('[data-shoutbox-counter]'),
    meta: root.querySelector('[data-shoutbox-meta]')
  };

  const state = {
    client: null,
    session: null,
    profile: null,
    owner: false,
    banned: false,
    messages: [],
    channel: null,
    posting: false,
    pruneBusy: false
  };

  const MAX = 80;
  const TTL_MS = 5 * 60 * 1000;
  const tx = s => { try { return window.NeithI18n?.t?.(s) || s; } catch { return s; } };
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const displayName = () => state.profile?.display_name || state.session?.user?.user_metadata?.display_name || state.session?.user?.user_metadata?.full_name || state.session?.user?.email?.split('@')[0] || 'Usuario';
  const avatarUrl = () => state.profile?.avatar_url || state.session?.user?.user_metadata?.avatar_url || state.session?.user?.user_metadata?.picture || null;

  function setStatus(text, cls = '') {
    ui.status.textContent = text;
    ui.status.className = cls;
  }

  function isFresh(msg) {
    const ts = new Date(msg?.created_at || 0).getTime();
    return Number.isFinite(ts) && (Date.now() - ts) <= TTL_MS;
  }

  function pruneLocal() {
    state.messages = state.messages.filter(isFresh);
  }

  function isNearBottom() {
    const el = ui.list;
    return Math.abs((el.scrollHeight - el.scrollTop) - el.clientHeight) < 40;
  }

  function scrollToBottom() {
    ui.list.scrollTop = ui.list.scrollHeight;
  }

  function updateComposer() {
    const logged = !!state.session?.user;
    ui.counter.textContent = `${ui.input?.value.length || 0} / 300`;
    ui.guest.hidden = logged && !state.banned;
    ui.inputRow.hidden = !logged || state.banned;

    if (state.banned) {
      ui.guest.querySelector('span').textContent = tx('Tu cuenta está bloqueada en el shoutbox. Puedes seguir leyendo.');
      ui.meta.textContent = tx('Modo lectura por moderación');
      ui.meta.className = 'home207-shoutbox-banned';
      return;
    }

    if (!logged) {
      ui.guest.querySelector('span').textContent = tx('Solo los usuarios registrados en la web pueden escribir. Los mensajes se eliminan automáticamente a los 5 minutos.');
      ui.meta.textContent = tx('Visible para todos · escritura para usuarios registrados');
      ui.meta.className = '';
      return;
    }

    ui.meta.textContent = `${tx('Escribiendo como')} ${displayName()} · ${tx('Mensajes visibles durante 5 minutos')}`;
    ui.meta.className = 'home207-shoutbox-ok';
    ui.send.disabled = state.posting || !clean(ui.input.value);
  }

  function fmt(ts) {
    try {
      return new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en-GB' : 'es-ES', { hour: '2-digit', minute: '2-digit' }).format(new Date(ts));
    } catch {
      return '--:--';
    }
  }

  function render() {
    pruneLocal();
    const preserve = !isNearBottom();
    const top = ui.list.scrollTop;
    ui.list.innerHTML = '';
    ui.empty.hidden = state.messages.length > 0;

    const frag = document.createDocumentFragment();
    for (const m of state.messages) {
      const row = document.createElement('div');
      row.className = 'home207-msg';

      const time = document.createElement('span');
      time.className = 'home207-msg__time';
      time.textContent = fmt(m.created_at);

      const content = document.createElement('div');
      content.className = 'home207-msg__content';

      const name = document.createElement('span');
      name.className = 'home207-msg__name' + (m.role === 'admin' ? ' admin' : '');
      name.textContent = m.role === 'admin' ? `♛ ${m.display_name}` : m.display_name;
      content.append(name);

      if (m.role === 'admin') {
        const badge = document.createElement('span');
        badge.className = 'home207-msg__badge';
        badge.textContent = 'ADMIN';
        content.append(badge);
      }

      content.append(document.createTextNode(`: ${m.message}`));
      row.append(time, content);

      if (state.owner) {
        const actions = document.createElement('div');
        actions.className = 'home207-msg__actions';
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'danger';
        del.textContent = tx('BORRAR');
        del.onclick = () => removeMessage(m);
        actions.append(del);
        if (m.role !== 'admin') {
          const ban = document.createElement('button');
          ban.type = 'button';
          ban.textContent = tx('BAN');
          ban.onclick = () => banUser(m);
          actions.append(ban);
        }
        row.append(actions);
      }
      frag.append(row);
    }
    ui.list.append(frag);

    if (preserve) ui.list.scrollTop = top;
    else scrollToBottom();
  }

  function upsert(m) {
    if (!isFresh(m)) return;
    const i = state.messages.findIndex(x => String(x.id) === String(m.id));
    if (i >= 0) state.messages[i] = m;
    else state.messages.push(m);
    state.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    if (state.messages.length > MAX) state.messages = state.messages.slice(-MAX);
  }

  async function ensureAuth() {
    if (window.NeithLoadAuth) return window.NeithLoadAuth();
    if (window.NeithAuth?.load) return window.NeithAuth.load();
    return window.NeithAuth || null;
  }

  async function syncAuth() {
    const auth = window.NeithAuth;
    state.client = auth?.client || state.client;
    state.session = auth?.session || null;
    state.profile = auth?.profile || null;

    if (state.session?.user) {
      try { await auth?.refreshProfile?.(); state.profile = auth?.profile || state.profile; } catch {}
      try { state.owner = (await auth?.getAdminRole?.({ force: true })) === 'owner'; } catch { state.owner = false; }
      if (!state.owner && state.client) {
        try { const { data } = await state.client.rpc('neith_is_owner'); state.owner = data === true; } catch {}
      }
      try {
        const { data } = await state.client.from('neith_shoutbox_bans').select('user_id').eq('user_id', state.session.user.id).maybeSingle();
        state.banned = !!data;
      } catch { state.banned = false; }
    } else {
      state.owner = false;
      state.banned = false;
    }
    updateComposer();
  }

  async function loadMessages() {
    const { data, error } = await state.client
      .from('neith_shoutbox_messages')
      .select('id,user_id,display_name,avatar_url,role,message,created_at')
      .order('created_at', { ascending: false })
      .limit(MAX);
    if (error) throw error;
    state.messages = (data || []).filter(isFresh).reverse();
    render();
  }

  function subscribe() {
    if (state.channel) return;
    state.channel = state.client
      .channel('neith-home-shoutbox-r208')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'neith_shoutbox_messages' }, payload => {
        if (payload.eventType === 'DELETE') {
          state.messages = state.messages.filter(x => String(x.id) !== String(payload.old.id));
        } else {
          upsert(payload.new);
        }
        render();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'neith_shoutbox_bans' }, async payload => {
        const currentUser = state.session?.user?.id;
        const affected = payload.new?.user_id || payload.old?.user_id;
        if (currentUser && String(currentUser) === String(affected)) {
          await syncAuth();
        }
      })
      .subscribe(s => { if (s === 'SUBSCRIBED') setStatus(tx('EN VIVO'), 'home207-shoutbox-ok'); });
  }

  async function pruneRemote() {
    if (!state.client || !state.session?.user || state.pruneBusy) return;
    state.pruneBusy = true;
    try {
      await state.client.rpc('neith_shoutbox_prune_expired');
    } catch (e) {
      console.warn('[NEITH SHOUTBOX PRUNE]', e?.message || e);
    } finally {
      state.pruneBusy = false;
    }
  }

  async function send() {
    const message = clean(ui.input.value);
    if (!message || state.posting || !state.session?.user) return;
    state.posting = true;
    updateComposer();
    try {
      const { error } = await state.client.from('neith_shoutbox_messages').insert({
        user_id: state.session.user.id,
        display_name: displayName(),
        avatar_url: avatarUrl(),
        message
      });
      if (error) throw error;
      ui.input.value = '';
      pruneRemote();
    } catch (e) {
      const msg = String(e?.message || '');
      if (/Rate limit/i.test(msg)) alert(tx('Espera unos segundos antes de enviar otro mensaje.'));
      else if (/Links are not allowed/i.test(msg)) alert(tx('Los enlaces están bloqueados para usuarios normales.'));
      else if (/Banned/i.test(msg)) { state.banned = true; updateComposer(); }
      else alert(tx('No se pudo enviar el mensaje.'));
      console.warn('[NEITH SHOUTBOX]', e);
    } finally {
      state.posting = false;
      updateComposer();
    }
  }

  async function removeMessage(m) {
    if (!confirm(`${tx('¿Borrar el mensaje de')} ${m.display_name}?`)) return;
    const { error } = await state.client.from('neith_shoutbox_messages').delete().eq('id', m.id);
    if (error) alert(tx('No se pudo borrar el mensaje.'));
  }

  async function banUser(m) {
    const reason = prompt(tx('Motivo del baneo:'), tx('Incumplimiento de las normas del shoutbox'));
    if (reason === null) return;
    const { error } = await state.client.from('neith_shoutbox_bans').upsert({
      user_id: m.user_id,
      display_name: m.display_name,
      reason: clean(reason) || 'Incumplimiento de las normas del shoutbox',
      banned_by: state.session.user.id
    }, { onConflict: 'user_id' });
    if (error) alert(tx('No se pudo banear al usuario.'));
    else alert(tx('Usuario baneado del shoutbox.'));
  }

  ui.input.addEventListener('input', updateComposer);
  ui.input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
  ui.send.addEventListener('click', send);
  window.addEventListener('neith:authchange', () => syncAuth());
  window.addEventListener('neith:languagechange', () => { render(); updateComposer(); });

  async function init() {
    setStatus(tx('Conectando…'));
    try {
      await ensureAuth();
      await syncAuth();
      setTimeout(syncAuth, 700);
      setTimeout(syncAuth, 2200);
      if (!state.client) throw new Error('Supabase client unavailable');
      await loadMessages();
      subscribe();
      pruneRemote();
      setInterval(() => { pruneLocal(); render(); pruneRemote(); }, 30000);
      setStatus(tx('EN VIVO'), 'home207-shoutbox-ok');
    } catch (e) {
      setStatus(tx('SIN CONEXIÓN'), 'home207-shoutbox-error');
      ui.meta.textContent = tx('No se pudo conectar al shoutbox.');
      ui.meta.className = 'home207-shoutbox-error';
      console.warn('[NEITH SHOUTBOX INIT]', e);
    }
  }

  init();
})();
