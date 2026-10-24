(() => {
  'use strict';
  const t = text => window.NeithI18n?.t?.(text) || text;
  const cfg = window.NEITH_CONFIG || {};
  const configured = Boolean(window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey && !String(cfg.supabaseUrl).includes('YOUR_PROJECT') && !String(cfg.supabaseAnonKey).includes('YOUR_SUPABASE_ANON_KEY'));
  const client = configured ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }) : null;
  const form = document.querySelector('[data-reset-form]');
  const message = document.querySelector('[data-reset-message]');
  const submit = form?.querySelector('button[type="submit"]');
  const RECOVERY_VERIFIED_KEY = 'neith_password_recovery_verified';
  const recoveryHintInUrl = () => /(?:[?#&](?:type|flow)=recovery(?:[&#]|$))/i.test(String(location.href));
  let recoveryReady = false;
  let recoveryConsumed = false;
  let recoveryEvidence = recoveryHintInUrl();
  try { recoveryEvidence = recoveryEvidence || sessionStorage.getItem(RECOVERY_VERIFIED_KEY) === '1'; } catch {}

  const setMessage = (text, type = '') => { if (message) { message.textContent = t(text); message.dataset.type = type; } };
  const setReady = ready => { recoveryReady = Boolean(ready); if (submit) submit.disabled = !recoveryReady || recoveryConsumed; };

  function togglePassword(button) {
    const input = button.closest('.password-field')?.querySelector('input[type="password"],input[type="text"]');
    if (!input) return;
    const reveal = input.type === 'password';
    input.type = reveal ? 'text' : 'password';
    button.setAttribute('aria-pressed', String(reveal));
    button.setAttribute('aria-label', (reveal ? 'Hide password' : 'Show password'));
    button.classList.toggle('is-visible', reveal);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-password-toggle]');
    if (button) togglePassword(button);
  });

  async function bootstrapRecovery() {
    if (!client) { setReady(false); setMessage('The secure Neith connection is not configured.', 'error'); return; }
    setReady(false);
    setMessage('Verifying secure recovery link…', '');
    if (!recoveryEvidence) {
      setMessage('Open this page from the recovery link sent to your email.', 'error');
      return;
    }
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (data?.session?.user) {
        setReady(true);
        setMessage('Link verified. You can now create your new password.', 'success');
        return;
      }
      // detectSessionInUrl may finish just after DOM ready; give Supabase a short grace period.
      let attempts = 0;
      const timer = setInterval(async () => {
        attempts += 1;
        const { data: retry } = await client.auth.getSession();
        if (retry?.session?.user) {
          clearInterval(timer); setReady(true); setMessage('Link verified. You can now create your new password.', 'success');
        } else if (attempts >= 10) {
          clearInterval(timer); setReady(false); setMessage('This recovery link is invalid or has expired. Request a new one from Sign in.', 'error');
        }
      }, 180);
    } catch (error) { setReady(false); setMessage(error?.message || 'The recovery link could not be verified.', 'error'); }
  }

  client?.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryEvidence = true;
      try { sessionStorage.setItem(RECOVERY_VERIFIED_KEY, '1'); } catch {}
    }
    if (recoveryEvidence && session?.user) {
      setReady(true);
      setMessage('Link verified. You can now create your new password.', 'success');
    }
  });

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const password = String(values.password || '');
    const confirm = String(values.password_confirm || '');
    if (password.length < 8) return setMessage('The password must be at least 8 characters long.', 'error');
    if (password !== confirm) return setMessage('The two passwords do not match.', 'error');
    if (!client || !recoveryReady || recoveryConsumed) return setMessage('The recovery link is not active. Request a new one.', 'error');
    const original = submit?.textContent || '';
    if (submit) { submit.disabled = true; submit.textContent = t('GUARDANDO…'); }
    setMessage('Updating your password securely…', '');
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      recoveryConsumed = true;
      setReady(false);
      form.reset();
      setMessage('Password updated successfully. Closing the recovery session…', 'success');
      await client.auth.signOut({ scope: 'local' });
      try { sessionStorage.removeItem(RECOVERY_VERIFIED_KEY); } catch {}
      history.replaceState(null, '', location.pathname);
      setTimeout(() => { location.replace('../?login=1&password=updated'); }, 1300);
    } catch (error) {
      setMessage(error?.message || 'The password could not be updated.', 'error');
      if (submit) { submit.disabled = false; submit.textContent = original; }
    }
  });

  bootstrapRecovery();
})();
