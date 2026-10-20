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
    pruneBusy: false,
    authRetryTimer: null
  };

  const MAX = 50;
  const TTL_MS = 24 * 60 * 60 * 1000;
  const tx = s => { try { return window.NeithI18n?.t?.(s) || s; } catch { return s; } };
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim();
  const displayName = () => state.profile?.display_name || state.session?.user?.user_metadata?.display_name || state.session?.user?.user_metadata?.full_name || state.session?.user?.email?.split('@')[0] || 'User';
  const avatarUrl = () => state.profile?.avatar_url || state.session?.user?.user_metadata?.avatar_url || state.session?.user?.user_metadata?.picture || null;

  function setStatus(text, cls = '') {
    ui.status.textContent = text;
    ui.status.parentElement.className = `home209-shoutbox-status ${cls}`.trim();
  }

  function isFresh(msg) {
    const ts = new Date(msg?.created_at || 0).getTime();
    return Number.isFinite(ts) && (Date.now() - ts) <= TTL_MS;
  }

  function pruneLocal() {
    state.messages = state.messages.filter(isFresh);
    if (state.messages.length > MAX) state.messages = state.messages.slice(-MAX);
  }

  function isNearBottom() {
    const el = ui.list;
    return Math.abs((el.scrollHeight - el.scrollTop) - el.clientHeight) < 36;
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
      ui.guest.querySelector('span').textContent = tx('Read only mode · this account is blocked from the shoutbox.');
      ui.meta.textContent = tx('Moderation lock active');
      ui.meta.className = 'home209-shoutbox-meta home209-shoutbox-banned';
      return;
    }

    if (!logged) {
      ui.guest.querySelector('span').textContent = tx('Visible to everyone · only registered website users can write · messages auto-clean after 24 hours.');
      ui.meta.textContent = tx('Live for everyone · posting only for registered users · last 50 messages');
      ui.meta.className = 'home209-shoutbox-meta';
      return;
    }

    ui.meta.textContent = `${tx('Posting as')} ${displayName()} · ${tx('Last 50 messages · auto-clean after 24h')}`;
    ui.meta.className = 'home209-shoutbox-meta home209-shoutbox-ok';
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
    const preserveTop = !isNearBottom();
    const prevTop = ui.list.scrollTop;
    ui.list.innerHTML = '';
    ui.empty.hidden = state.messages.length > 0;

    const frag = document.createDocumentFragment();
    for (const m of state.messages) {
      const row = document.createElement('div');
      row.className = 'home209-msg';

      const time = document.createElement('span');
      time.className = 'home209-msg__time';
      time.textContent = fmt(m.created_at);

      const content = document.createElement('div');
      content.className = 'home209-msg__content';

      const name = document.createElement('span');
      name.className = 'home209-msg__name' + (m.role === 'admin' ? ' admin' : '');
      name.textContent = m.role === 'admin' ? `♛ ${m.display_name}` : m.display_name;
      content.append(name);

      if (m.role === 'admin') {
        const badge = document.createElement('span');
        badge.className = 'home209-msg__badge';
        badge.textContent = 'ADMIN';
        content.append(badge);
      }

      content.append(document.createTextNode(`: ${m.message}`));
      row.append(time, content);

      if (state.owner) {
        const actions = document.createElement('div');
        actions.className = 'home209-msg__actions';
        const del = document.createElement('button');
        del.type = 'button';
        del.className = 'danger';
        del.textContent = tx('DELETE');
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
    if (preserveTop) ui.list.scrollTop = prevTop;
    else scrollToBottom();
  }

  function upsert(m) {
    if (!isFresh(m)) return;
    const i = state.messages.findIndex(x => String(x.id) === String(m.id));
    if (i >= 0) state.messages[i] = m;
    else state.messages.push(m);
    state.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    pruneLocal();
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
    pruneLocal();
    render();
  }

  function subscribe() {
    if (state.channel) return;
    state.channel = state.client
      .channel('neith-home-shoutbox-r209')
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
      .subscribe(s => { if (s === 'SUBSCRIBED') setStatus(tx('LIVE'), 'home209-shoutbox-ok'); });
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
      await pruneRemote();
    } catch (e) {
      const msg = String(e?.message || '');
      if (/rate|too many/i.test(msg)) alert(tx('Please wait a few seconds before sending another message.'));
      else if (/links are not allowed/i.test(msg)) alert(tx('Links are blocked for non-admin users.'));
      else if (/ban/i.test(msg)) { state.banned = true; updateComposer(); }
      else alert(tx('Message could not be sent.'));
      console.warn('[NEITH SHOUTBOX]', e);
    } finally {
      state.posting = false;
      updateComposer();
    }
  }

  async function removeMessage(m) {
    if (!confirm(`${tx('Delete message from')} ${m.display_name}?`)) return;
    const { error } = await state.client.from('neith_shoutbox_messages').delete().eq('id', m.id);
    if (error) alert(tx('Message could not be deleted.'));
  }

  async function banUser(m) {
    const reason = prompt(tx('Ban reason:'), tx('Breaking the shoutbox rules'));
    if (reason === null) return;
    const { error } = await state.client.from('neith_shoutbox_bans').upsert({
      user_id: m.user_id,
      display_name: m.display_name,
      reason: clean(reason) || 'Breaking the shoutbox rules',
      banned_by: state.session.user.id
    }, { onConflict: 'user_id' });
    if (error) alert(tx('User could not be banned.'));
    else alert(tx('User banned from the shoutbox.'));
  }

  ui.input.addEventListener('input', updateComposer);
  ui.input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  });
  ui.send.addEventListener('click', send);
  window.addEventListener('neith:authchange', () => syncAuth());
  window.addEventListener('neith:languagechange', () => { render(); updateComposer(); });

  async function bootAuthReliability() {
    clearTimeout(state.authRetryTimer);
    const checkpoints = [600, 1800, 3800];
    checkpoints.forEach(delay => {
      state.authRetryTimer = setTimeout(() => { syncAuth(); }, delay);
    });
  }

  async function init() {
    setStatus(tx('Connecting…'));
    try {
      await ensureAuth();
      await syncAuth();
      await bootAuthReliability();
      if (!state.client) throw new Error('Supabase client unavailable');
      await loadMessages();
      subscribe();
      await pruneRemote();
      setInterval(() => { pruneLocal(); render(); pruneRemote(); }, 60000);
      setStatus(tx('LIVE'), 'home209-shoutbox-ok');
    } catch (e) {
      setStatus(tx('OFFLINE'), 'home209-shoutbox-error');
      ui.meta.textContent = tx('Shoutbox connection unavailable.');
      ui.meta.className = 'home209-shoutbox-meta home209-shoutbox-error';
      console.warn('[NEITH SHOUTBOX INIT]', e);
    }
  }

  init();
})();
