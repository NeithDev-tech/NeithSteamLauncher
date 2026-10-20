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

  const MAX = 50;
  const TTL_MS = 24 * 60 * 60 * 1000;
  const POLL_MS = 3000;

  const state = {
    auth: null,
    client: null,
    session: null,
    profile: null,
    owner: false,
    banned: false,
    messages: [],
    channel: null,
    authSubscription: null,
    posting: false,
    syncing: false,
    pruneBusy: false,
    reconnectTimer: 0,
    pollTimer: 0
  };

  const tx = value => {
    try { return window.NeithI18n?.t?.(value) || value; }
    catch { return value; }
  };

  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const displayName = () => state.profile?.display_name || state.session?.user?.user_metadata?.display_name || state.session?.user?.user_metadata?.full_name || state.session?.user?.email?.split('@')[0] || 'User';
  const avatarUrl = () => state.profile?.avatar_url || state.session?.user?.user_metadata?.avatar_url || state.session?.user?.user_metadata?.picture || null;

  function setStatus(text, cls = '') {
    ui.status.textContent = text;
    ui.status.parentElement.className = `home209-shoutbox-status ${cls}`.trim();
  }

  function isFresh(message) {
    const stamp = new Date(message?.created_at || 0).getTime();
    return Number.isFinite(stamp) && (Date.now() - stamp) <= TTL_MS;
  }

  function normalizeMessages(messages) {
    const map = new Map();
    for (const message of messages || []) {
      if (!message || !isFresh(message)) continue;
      map.set(String(message.id), message);
    }
    return [...map.values()]
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(-MAX);
  }

  function messageFingerprint(messages = state.messages) {
    return messages.map(m => `${m.id}:${m.updated_at || m.created_at || ''}:${m.message || ''}`).join('|');
  }

  function isNearBottom() {
    const el = ui.list;
    return Math.abs((el.scrollHeight - el.scrollTop) - el.clientHeight) < 40;
  }

  function scrollToBottom() {
    ui.list.scrollTop = ui.list.scrollHeight;
  }

  function setInputEnabled(enabled) {
    ui.input.disabled = !enabled;
    ui.input.readOnly = !enabled;
    ui.input.tabIndex = enabled ? 0 : -1;
    ui.send.disabled = !enabled || state.posting || !clean(ui.input.value);
  }

  function updateComposer() {
    const logged = !!state.session?.user;
    ui.counter.textContent = `${ui.input.value.length} / 300`;

    if (state.banned) {
      ui.guest.hidden = false;
      ui.inputRow.hidden = true;
      setInputEnabled(false);
      ui.guest.querySelector('span').textContent = tx('Read only mode · this account is blocked from the shoutbox.');
      ui.meta.textContent = tx('Moderation lock active');
      ui.meta.className = 'home209-shoutbox-meta home209-shoutbox-banned';
      return;
    }

    if (!logged) {
      ui.guest.hidden = false;
      ui.inputRow.hidden = true;
      setInputEnabled(false);
      ui.guest.querySelector('span').textContent = tx('Visible to everyone · only registered website users can write · messages auto-clean after 24 hours.');
      ui.meta.textContent = tx('Live for everyone · posting only for registered users · last 50 messages');
      ui.meta.className = 'home209-shoutbox-meta';
      return;
    }

    ui.guest.hidden = true;
    ui.inputRow.hidden = false;
    setInputEnabled(true);
    ui.meta.textContent = `${tx('Posting as')} ${displayName()} · ${tx('Last 50 messages · auto-clean after 24h')}`;
    ui.meta.className = 'home209-shoutbox-meta home209-shoutbox-ok';
  }

  function formatTime(value) {
    try {
      return new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en-GB' : 'es-ES', {
        hour: '2-digit', minute: '2-digit'
      }).format(new Date(value));
    } catch {
      return '--:--';
    }
  }

  function render({ forceBottom = false } = {}) {
    state.messages = normalizeMessages(state.messages);
    const shouldStayBottom = forceBottom || isNearBottom();
    const previousTop = ui.list.scrollTop;

    ui.list.innerHTML = '';
    ui.empty.hidden = state.messages.length > 0;

    const fragment = document.createDocumentFragment();
    for (const message of state.messages) {
      const row = document.createElement('div');
      row.className = 'home209-msg';

      const time = document.createElement('span');
      time.className = 'home209-msg__time';
      time.textContent = formatTime(message.created_at);

      const content = document.createElement('div');
      content.className = 'home209-msg__content';

      const name = document.createElement('span');
      name.className = 'home209-msg__name' + (message.role === 'admin' ? ' admin' : '');
      name.textContent = message.role === 'admin' ? `♛ ${message.display_name}` : message.display_name;
      content.append(name);

      if (message.role === 'admin') {
        const badge = document.createElement('span');
        badge.className = 'home209-msg__badge';
        badge.textContent = 'ADMIN';
        content.append(badge);
      }

      content.append(document.createTextNode(`: ${message.message}`));
      row.append(time, content);

      if (state.owner && !String(message.id).startsWith('tmp-')) {
        const actions = document.createElement('div');
        actions.className = 'home209-msg__actions';

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'danger';
        remove.textContent = tx('DELETE');
        remove.onclick = () => removeMessage(message);
        actions.append(remove);

        if (message.role !== 'admin') {
          const ban = document.createElement('button');
          ban.type = 'button';
          ban.textContent = tx('BAN');
          ban.onclick = () => banUser(message);
          actions.append(ban);
        }
        row.append(actions);
      }

      fragment.append(row);
    }

    ui.list.append(fragment);
    if (shouldStayBottom) scrollToBottom();
    else ui.list.scrollTop = previousTop;
  }

  function upsert(message) {
    if (!message || !isFresh(message)) return;
    const id = String(message.id);
    const index = state.messages.findIndex(item => String(item.id) === id);
    if (index >= 0) state.messages[index] = message;
    else state.messages.push(message);
    state.messages = normalizeMessages(state.messages);
  }

  function removeLocal(id) {
    state.messages = state.messages.filter(item => String(item.id) !== String(id));
  }

  async function ensureAuth() {
    if (window.NeithLoadAuth) return window.NeithLoadAuth();
    if (window.NeithAuth?.load) return window.NeithAuth.load();
    return window.NeithAuth || null;
  }

  async function getCanonicalSession() {
    if (!state.client?.auth?.getSession) return null;
    try {
      const { data, error } = await state.client.auth.getSession();
      if (error) throw error;
      return data?.session || null;
    } catch (error) {
      console.warn('[NEITH SHOUTBOX SESSION]', error?.message || error);
      return null;
    }
  }

  async function refreshIdentity() {
    state.auth = window.NeithAuth || state.auth;
    state.client = state.auth?.client || state.client;
    if (!state.client) return;

    state.session = await getCanonicalSession();
    state.profile = state.auth?.profile || null;

    if (state.session?.user) {
      try {
        await state.auth?.refreshProfile?.();
        state.profile = state.auth?.profile || state.profile;
      } catch {}

      try {
        const role = await state.auth?.getAdminRole?.({ force: true });
        state.owner = role === 'owner' || role === 'admin';
      } catch {
        state.owner = false;
      }

      if (!state.owner) {
        try {
          const { data } = await state.client.rpc('neith_is_owner');
          state.owner = data === true;
        } catch {}
      }

      try {
        const { data } = await state.client
          .from('neith_shoutbox_bans')
          .select('user_id')
          .eq('user_id', state.session.user.id)
          .maybeSingle();
        state.banned = !!data;
      } catch {
        state.banned = false;
      }
    } else {
      state.profile = null;
      state.owner = false;
      state.banned = false;
    }

    updateComposer();
  }

  function bindDirectAuthSubscription() {
    if (!state.client?.auth?.onAuthStateChange || state.authSubscription) return;
    const result = state.client.auth.onAuthStateChange(async (_event, session) => {
      state.session = session || null;
      await refreshIdentity();
    });
    state.authSubscription = result?.data?.subscription || null;
  }

  async function fetchLatest() {
    const { data, error } = await state.client
      .from('neith_shoutbox_messages')
      .select('id,user_id,display_name,avatar_url,role,message,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(MAX);
    if (error) throw error;
    return normalizeMessages((data || []).reverse());
  }

  async function syncFromServer({ forceRender = false } = {}) {
    if (!state.client || state.syncing || document.hidden) return;
    state.syncing = true;
    try {
      const latest = await fetchLatest();
      const before = messageFingerprint();
      const after = messageFingerprint(latest);
      if (forceRender || before !== after) {
        state.messages = latest;
        render();
      }
    } catch (error) {
      console.warn('[NEITH SHOUTBOX SYNC]', error?.message || error);
    } finally {
      state.syncing = false;
    }
  }

  function scheduleReconnect() {
    if (state.reconnectTimer) return;
    state.reconnectTimer = window.setTimeout(async () => {
      state.reconnectTimer = 0;
      try {
        if (state.channel && state.client) await state.client.removeChannel(state.channel);
      } catch {}
      state.channel = null;
      subscribeRealtime();
      syncFromServer({ forceRender: true });
    }, 1200);
  }

  function subscribeRealtime() {
    if (!state.client || state.channel) return;
    state.channel = state.client
      .channel('neith-home-shoutbox-r211')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'neith_shoutbox_messages'
      }, payload => {
        const wasAtBottom = isNearBottom();
        if (payload.eventType === 'DELETE') removeLocal(payload.old.id);
        else upsert(payload.new);
        render({ forceBottom: wasAtBottom });
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'neith_shoutbox_bans'
      }, async payload => {
        const affected = payload.new?.user_id || payload.old?.user_id;
        if (state.session?.user?.id && String(affected || '') === String(state.session.user.id)) {
          await refreshIdentity();
        }
      })
      .subscribe(status => {
        if (status === 'SUBSCRIBED') {
          setStatus(tx('LIVE'), 'home209-shoutbox-ok');
          syncFromServer();
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setStatus(tx('RECONNECTING'), 'home209-shoutbox-error');
          scheduleReconnect();
        }
      });
  }

  async function pruneRemote() {
    if (!state.client || !state.session?.user || state.pruneBusy) return;
    state.pruneBusy = true;
    try {
      await state.client.rpc('neith_shoutbox_prune_expired');
    } catch (error) {
      console.warn('[NEITH SHOUTBOX PRUNE]', error?.message || error);
    } finally {
      state.pruneBusy = false;
    }
  }

  async function send() {
    const message = clean(ui.input.value);
    if (!message || state.posting || !state.session?.user || ui.input.disabled) return;

    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const temp = {
      id: tempId,
      user_id: state.session.user.id,
      display_name: displayName(),
      avatar_url: avatarUrl(),
      role: state.owner ? 'admin' : 'user',
      message,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    state.posting = true;
    ui.input.value = '';
    upsert(temp);
    render({ forceBottom: true });
    updateComposer();

    try {
      const { data, error } = await state.client
        .from('neith_shoutbox_messages')
        .insert({
          user_id: state.session.user.id,
          display_name: displayName(),
          avatar_url: avatarUrl(),
          message
        })
        .select('id,user_id,display_name,avatar_url,role,message,created_at,updated_at')
        .single();

      if (error) throw error;

      removeLocal(tempId);
      upsert(data);
      render({ forceBottom: true });

      pruneRemote();
      window.setTimeout(() => syncFromServer(), 650);
    } catch (error) {
      removeLocal(tempId);
      render();
      const msg = String(error?.message || '');
      if (/rate|too many/i.test(msg)) alert(tx('Please wait a few seconds before sending another message.'));
      else if (/links are not allowed/i.test(msg)) alert(tx('Links are blocked for non-admin users.'));
      else if (/ban/i.test(msg)) {
        state.banned = true;
        updateComposer();
      } else {
        alert(tx('Message could not be sent.'));
      }
      console.warn('[NEITH SHOUTBOX SEND]', error);
    } finally {
      state.posting = false;
      updateComposer();
      if (!state.banned && state.session?.user) ui.input.focus();
    }
  }

  async function removeMessage(message) {
    if (!confirm(`${tx('Delete message from')} ${message.display_name}?`)) return;
    const { error } = await state.client.from('neith_shoutbox_messages').delete().eq('id', message.id);
    if (error) {
      alert(tx('Message could not be deleted.'));
      return;
    }
    removeLocal(message.id);
    render();
  }

  async function banUser(message) {
    const reason = prompt(tx('Ban reason:'), tx('Breaking the shoutbox rules'));
    if (reason === null) return;
    const { error } = await state.client.from('neith_shoutbox_bans').upsert({
      user_id: message.user_id,
      display_name: message.display_name,
      reason: clean(reason) || 'Breaking the shoutbox rules',
      banned_by: state.session.user.id
    }, { onConflict: 'user_id' });

    if (error) alert(tx('User could not be banned.'));
    else alert(tx('User banned from the shoutbox.'));
  }

  function startPolling() {
    if (state.pollTimer) return;
    state.pollTimer = window.setInterval(() => {
      if (!document.hidden) syncFromServer();
    }, POLL_MS);
  }

  ui.input.addEventListener('input', updateComposer);
  ui.input.addEventListener('keydown', event => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  });
  ui.send.addEventListener('click', send);

  window.addEventListener('neith:authchange', async () => {
    await refreshIdentity();
    syncFromServer();
  });
  window.addEventListener('focus', async () => {
    await refreshIdentity();
    syncFromServer();
  });
  window.addEventListener('pageshow', async () => {
    await refreshIdentity();
    syncFromServer({ forceRender: true });
  });
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden) {
      await refreshIdentity();
      syncFromServer({ forceRender: true });
    }
  });
  window.addEventListener('neith:languagechange', () => {
    render();
    updateComposer();
  });
  window.addEventListener('beforeunload', () => {
    state.authSubscription?.unsubscribe?.();
    if (state.pollTimer) clearInterval(state.pollTimer);
    if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
  }, { once: true });

  async function init() {
    setStatus(tx('Connecting…'));
    setInputEnabled(false);

    try {
      await ensureAuth();
      state.auth = window.NeithAuth || null;
      state.client = state.auth?.client || null;
      if (!state.client) throw new Error('Supabase client unavailable');

      bindDirectAuthSubscription();
      await refreshIdentity();
      state.messages = await fetchLatest();
      render({ forceBottom: true });
      subscribeRealtime();
      startPolling();
      pruneRemote();

      // Covers restored browser sessions after lazy auth bootstrap.
      setTimeout(refreshIdentity, 450);
      setTimeout(refreshIdentity, 1400);
      setTimeout(refreshIdentity, 3200);

      setStatus(tx('LIVE'), 'home209-shoutbox-ok');
    } catch (error) {
      setStatus(tx('OFFLINE'), 'home209-shoutbox-error');
      ui.meta.textContent = tx('Shoutbox connection unavailable.');
      ui.meta.className = 'home209-shoutbox-meta home209-shoutbox-error';
      setInputEnabled(false);
      console.warn('[NEITH SHOUTBOX INIT]', error);
    }
  }

  init();
})();
