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
    clean: root.querySelector('[data-shoutbox-clean]'),
    bans: root.querySelector('[data-shoutbox-bans]'),
    counter: root.querySelector('[data-shoutbox-counter]'),
    meta: root.querySelector('[data-shoutbox-meta]')
  };

  const MAX = 50;
  const TTL_MS = 24 * 60 * 60 * 1000;
  const POLL_MS = 3000;
  const SEND_COOLDOWN_MS = 3000;

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
    pollTimer: 0,
    cooldownUntil: 0,
    cooldownTimer: 0,
    inlineNoticeTimer: 0
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
    return messages.map(m => `${m.id}:${m.created_at || ''}:${m.message || ''}`).join('|');
  }

  function isNearBottom() {
    const el = ui.list;
    return Math.abs((el.scrollHeight - el.scrollTop) - el.clientHeight) < 40;
  }

  function scrollToBottom() {
    ui.list.scrollTop = ui.list.scrollHeight;
  }

  function cooldownRemainingMs() {
    if (state.owner) return 0;
    return Math.max(0, state.cooldownUntil - Date.now());
  }

  function cooldownActive() {
    return cooldownRemainingMs() > 0;
  }

  function clearCooldownTimer() {
    if (state.cooldownTimer) {
      clearInterval(state.cooldownTimer);
      state.cooldownTimer = 0;
    }
  }

  function clearInlineNoticeTimer() {
    if (state.inlineNoticeTimer) {
      clearTimeout(state.inlineNoticeTimer);
      state.inlineNoticeTimer = 0;
    }
  }

  function showInlineNotice(text, kind = 'error', duration = 2600) {
    clearInlineNoticeTimer();
    ui.meta.textContent = text;
    ui.meta.className = `home209-shoutbox-meta ${kind === 'error' ? 'home209-shoutbox-error' : 'home209-shoutbox-ok'}`;
    if (duration > 0) {
      state.inlineNoticeTimer = window.setTimeout(() => {
        state.inlineNoticeTimer = 0;
        updateComposer();
      }, duration);
    }
  }

  function startCooldown(durationMs = SEND_COOLDOWN_MS, fromTimestamp = Date.now()) {
    if (state.owner) {
      state.cooldownUntil = 0;
      clearCooldownTimer();
      updateComposer();
      return;
    }
    const nextUntil = Number(fromTimestamp) + durationMs;
    state.cooldownUntil = Math.max(state.cooldownUntil || 0, nextUntil);
    clearCooldownTimer();
    updateComposer();
    state.cooldownTimer = window.setInterval(() => {
      if (!cooldownActive()) {
        clearCooldownTimer();
        state.cooldownUntil = 0;
        updateComposer();
        if (state.session?.user && !state.banned) ui.input.focus({ preventScroll: true });
        return;
      }
      updateComposer();
    }, 100);
  }

  function syncCooldownFromMessages() {
    if (state.owner) {
      state.cooldownUntil = 0;
      clearCooldownTimer();
      return;
    }
    if (!state.session?.user) {
      state.cooldownUntil = 0;
      clearCooldownTimer();
      return;
    }
    const ownLatest = [...state.messages]
      .filter(message => String(message.user_id || '') === String(state.session.user.id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    if (!ownLatest?.created_at) return;
    const sentAt = new Date(ownLatest.created_at).getTime();
    if (Number.isFinite(sentAt) && sentAt + SEND_COOLDOWN_MS > Date.now()) {
      startCooldown(SEND_COOLDOWN_MS, sentAt);
    }
  }

  function setInputEnabled(enabled) {
    const interactive = enabled && !state.posting && (state.owner || !cooldownActive());
    ui.input.disabled = !interactive;
    ui.input.readOnly = !interactive;
    ui.input.tabIndex = interactive ? 0 : -1;
    ui.send.disabled = !interactive || !clean(ui.input.value);
    ui.inputRow?.classList.toggle('is-cooldown', enabled && !state.owner && cooldownActive());
  }

  function updateComposer() {
    const logged = !!state.session?.user;
    ui.counter.textContent = `${ui.input.value.length} / 300`;
    if (ui.clean) ui.clean.hidden = !state.owner;
    if (ui.bans) ui.bans.hidden = !state.owner;

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

    if (!state.owner && cooldownActive()) {
      const seconds = Math.max(1, Math.ceil(cooldownRemainingMs() / 1000));
      ui.input.placeholder = `${tx('You can write again in')} ${seconds}s`;
      ui.meta.textContent = `${tx('Message sent')} · ${tx('next message in')} ${seconds}s`;
      ui.meta.className = 'home209-shoutbox-meta home209-shoutbox-ok';
      return;
    }

    ui.input.placeholder = tx('Type your message...');
    ui.meta.textContent = state.owner
      ? `${tx('Posting as')} ${displayName()} · ${tx('ADMIN UNLIMITED')} · ${tx('Last 50 messages · auto-clean after 24h')}`
      : `${tx('Posting as')} ${displayName()} · ${tx('3 second send delay')} · ${tx('Last 50 messages · auto-clean after 24h')}`;
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

      if (state.owner) {
        state.banned = false;
      } else {
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
      }
    } else {
      state.profile = null;
      state.owner = false;
      state.banned = false;
      state.cooldownUntil = 0;
      clearCooldownTimer();
    }

    updateComposer();
    if (!state.owner && bansModal && !bansModal.hidden) closeBansModal();
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
      .select('id,user_id,display_name,avatar_url,role,message,created_at')
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
        syncCooldownFromMessages();
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
        else {
          upsert(payload.new);
          if (!state.owner && String(payload.new?.user_id || '') === String(state.session?.user?.id || '')) {
            const sentAt = new Date(payload.new.created_at).getTime();
            if (Number.isFinite(sentAt)) startCooldown(SEND_COOLDOWN_MS, sentAt);
          }
        }
        render({ forceBottom: wasAtBottom });
      })
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'neith_shoutbox_bans'
      }, async payload => {
        const affected = payload.new?.user_id || payload.old?.user_id;
        if (state.session?.user?.id && String(affected || '') === String(state.session.user.id)) {
          await refreshIdentity();
        }
        if (state.owner && bansModal && !bansModal.hidden) {
          try { await loadBans(); } catch {}
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
    if (!message || state.posting || (!state.owner && cooldownActive()) || !state.session?.user || ui.input.disabled) return;

    const tempId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const temp = {
      id: tempId,
      user_id: state.session.user.id,
      display_name: displayName(),
      avatar_url: avatarUrl(),
      role: state.owner ? 'admin' : 'user',
      message,
      created_at: new Date().toISOString(),
    };

    state.posting = true;
    ui.input.value = '';
    if (!state.owner) startCooldown(SEND_COOLDOWN_MS);
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
        .select('id,user_id,display_name,avatar_url,role,message,created_at')
        .single();

      if (error) throw error;

      removeLocal(tempId);
      upsert(data);
      const confirmedSentAt = new Date(data.created_at).getTime();
      if (!state.owner && Number.isFinite(confirmedSentAt)) startCooldown(SEND_COOLDOWN_MS, confirmedSentAt);
      render({ forceBottom: true });

      pruneRemote();
      window.setTimeout(() => syncFromServer(), 650);
    } catch (error) {
      removeLocal(tempId);
      render();
      const msg = String(error?.message || '');
      if (/rate|too many/i.test(msg)) {
        if (!state.owner) {
          startCooldown(SEND_COOLDOWN_MS);
          showInlineNotice(tx('Please wait 3 seconds between messages.'), 'ok', 1200);
        }
      } else if (/links are not allowed/i.test(msg)) {
        showInlineNotice(tx('Links are blocked for non-admin users.'), 'error');
      } else if (/ban/i.test(msg)) {
        state.banned = true;
        updateComposer();
      } else {
        showInlineNotice(tx('Message could not be sent. Please try again.'), 'error');
      }
      console.warn('[NEITH SHOUTBOX SEND]', error);
    } finally {
      state.posting = false;
      updateComposer();
      if (!state.banned && state.session?.user && !cooldownActive()) ui.input.focus({ preventScroll: true });
    }
  }

  async function removeMessage(message) {
    if (!state.owner || !state.client) return;
    const { data, error } = await state.client.rpc('neith_shoutbox_owner_delete_message', {
      p_message_id: message.id
    });
    if (error || data !== true) {
      showInlineNotice(tx('Message could not be deleted.'), 'error');
      return;
    }
    removeLocal(message.id);
    render();
  }

  async function cleanAllMessages() {
    if (!state.owner || !state.client || !ui.clean) return;

    ui.clean.disabled = true;
    ui.send.disabled = true;
    const previousText = ui.clean.textContent;
    ui.clean.textContent = tx('CLEANING...');
    showInlineNotice(tx('Cleaning chat...'), 'ok', 0);

    // Clear immediately in the UI so the action feels instant.
    const previousMessages = state.messages.slice();
    state.messages = [];
    render({ forceBottom: true });

    try {
      // Primary path: dedicated owner-only server function.
      let deletedCount = 0;
      let { data, error } = await state.client.rpc('neith_shoutbox_owner_clean_all_v3');

      // Fallback: owner RLS direct delete, useful if PostgREST is briefly using an old RPC cache.
      if (error) {
        const fallback = await state.client
          .from('neith_shoutbox_messages')
          .delete()
          .gte('id', 0)
          .select('id');
        if (fallback.error) throw error;
        deletedCount = Array.isArray(fallback.data) ? fallback.data.length : 0;
      } else {
        deletedCount = Number(data || 0);
      }

      // Hard verification against the database.
      const verified = await fetchLatest();
      if (verified.length !== 0) {
        // One final fallback delete, then verify again.
        const retry = await state.client
          .from('neith_shoutbox_messages')
          .delete()
          .gte('id', 0)
          .select('id');
        if (retry.error) throw retry.error;
        const finalCheck = await fetchLatest();
        if (finalCheck.length !== 0) {
          state.messages = finalCheck;
          render({ forceBottom: true });
          throw new Error(`Clean verification failed: ${finalCheck.length} messages remain`);
        }
      }

      state.messages = [];
      render({ forceBottom: true });
      showInlineNotice(`${tx('Chat cleaned')} · ${deletedCount} ${tx('messages removed')}`, 'ok', 1800);
    } catch (error) {
      // Restore the last known state only when the server truly refused the clean operation.
      state.messages = previousMessages;
      render({ forceBottom: true });
      showInlineNotice(tx('Chat could not be cleaned. Please try again.'), 'error', 2600);
      console.warn('[NEITH SHOUTBOX CLEAN]', error?.message || error);
    } finally {
      ui.clean.textContent = previousText || 'CLEAN';
      ui.clean.disabled = false;
      updateComposer();
    }
  }

  const bansModal = document.querySelector('[data-shoutbox-bans-modal]');
  const bansList = bansModal?.querySelector('[data-shoutbox-bans-list]');
  const bansEmpty = bansModal?.querySelector('[data-shoutbox-bans-empty]');
  const banCreate = bansModal?.querySelector('[data-shoutbox-ban-create]');
  const banTargetName = bansModal?.querySelector('[data-shoutbox-ban-target-name]');
  const banReason = bansModal?.querySelector('[data-shoutbox-ban-reason]');
  const banConfirm = bansModal?.querySelector('[data-shoutbox-ban-confirm]');
  const banCancel = bansModal?.querySelector('[data-shoutbox-ban-cancel]');

  function formatBanDate(value) {
    try {
      return new Intl.DateTimeFormat(document.documentElement.lang === 'en' ? 'en-GB' : 'es-ES', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
      }).format(new Date(value));
    } catch {
      return '';
    }
  }

  function closeBansModal() {
    if (!bansModal) return;
    bansModal.hidden = true;
    bansModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('home218-modal-open');
    state.banTarget = null;
    if (banCreate) banCreate.hidden = true;
  }

  function renderBans() {
    if (!bansList || !bansEmpty) return;
    bansList.innerHTML = '';
    bansEmpty.hidden = state.banRows.length > 0;

    const fragment = document.createDocumentFragment();
    state.banRows.forEach(item => {
      const row = document.createElement('div');
      row.className = 'home218-ban-row';

      const main = document.createElement('div');
      main.className = 'home218-ban-row__main';

      const name = document.createElement('strong');
      name.className = 'home218-ban-row__name';
      name.textContent = item.display_name || 'User';

      const reason = document.createElement('span');
      reason.className = 'home218-ban-row__reason';
      reason.textContent = item.reason || 'Shoutbox moderation';
      reason.title = reason.textContent;

      const date = document.createElement('span');
      date.className = 'home218-ban-row__date';
      date.textContent = item.created_at ? `Banned ${formatBanDate(item.created_at)}` : 'Banned';

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'UNBAN';
      remove.addEventListener('click', async () => {
        remove.disabled = true;
        try {
          const { data, error } = await state.client.rpc('neith_shoutbox_owner_unban_user', { p_user_id: item.user_id });
          if (error || data !== true) throw error || new Error('Unban failed');
          state.banRows = state.banRows.filter(b => String(b.user_id) !== String(item.user_id));
          renderBans();
          showInlineNotice(`${item.display_name || 'User'} unbanned from shoutbox.`, 'ok', 1800);
        } catch (error) {
          remove.disabled = false;
          showInlineNotice(tx('Ban could not be removed.'), 'error');
          console.warn('[NEITH SHOUTBOX UNBAN]', error?.message || error);
        }
      });

      main.append(name, reason, date);
      row.append(main, remove);
      fragment.append(row);
    });
    bansList.append(fragment);
  }

  async function loadBans() {
    if (!state.owner || !state.client) return;
    const { data, error } = await state.client.rpc('neith_shoutbox_owner_list_bans');
    if (error) throw error;
    state.banRows = Array.isArray(data) ? data : [];
    renderBans();
  }

  async function openBansModal() {
    if (!state.owner || !bansModal) return;
    bansModal.hidden = false;
    bansModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('home218-modal-open');
    if (banCreate) banCreate.hidden = true;
    try {
      await loadBans();
    } catch (error) {
      showInlineNotice(tx('Bans could not be loaded.'), 'error');
      console.warn('[NEITH SHOUTBOX BANS]', error?.message || error);
    }
  }

  async function banUser(message) {
    if (!state.owner || !bansModal || !message?.user_id) return;
    state.banTarget = {
      user_id: message.user_id,
      display_name: message.display_name || 'User'
    };
    bansModal.hidden = false;
    bansModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('home218-modal-open');
    if (banTargetName) banTargetName.textContent = state.banTarget.display_name;
    if (banReason) banReason.value = 'Shoutbox moderation';
    if (banCreate) banCreate.hidden = false;
    try { await loadBans(); } catch {}
    setTimeout(() => banReason?.focus({ preventScroll: true }), 60);
  }

  async function confirmBan() {
    if (!state.owner || !state.client || !state.banTarget) return;
    banConfirm.disabled = true;
    try {
      const { data, error } = await state.client.rpc('neith_shoutbox_owner_ban_user', {
        p_user_id: state.banTarget.user_id,
        p_display_name: state.banTarget.display_name,
        p_reason: clean(banReason?.value) || 'Shoutbox moderation'
      });
      if (error || data !== true) throw error || new Error('Ban failed');
      const bannedName = state.banTarget.display_name;
      state.banTarget = null;
      if (banCreate) banCreate.hidden = true;
      await loadBans();
      showInlineNotice(`${bannedName} banned from shoutbox only.`, 'ok', 1800);
    } catch (error) {
      showInlineNotice(tx('User could not be banned.'), 'error');
      console.warn('[NEITH SHOUTBOX BAN]', error?.message || error);
    } finally {
      banConfirm.disabled = false;
    }
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
  ui.clean?.addEventListener('click', cleanAllMessages);
  ui.bans?.addEventListener('click', openBansModal);
  bansModal?.querySelectorAll('[data-shoutbox-bans-close]').forEach(el => el.addEventListener('click', closeBansModal));
  banCancel?.addEventListener('click', () => { state.banTarget = null; if (banCreate) banCreate.hidden = true; });
  banConfirm?.addEventListener('click', confirmBan);
  banReason?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); confirmBan(); } });
  window.addEventListener('keydown', event => { if (event.key === 'Escape' && bansModal && !bansModal.hidden) closeBansModal(); });

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
    clearCooldownTimer();
    clearInlineNoticeTimer();
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
      syncCooldownFromMessages();
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
