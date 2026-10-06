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
    button.setAttribute('aria-label', t(reveal ? 'Ocultar contraseña' : 'Mostrar contraseña'));
    button.classList.toggle('is-visible', reveal);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-password-toggle]');
    if (button) togglePassword(button);
  });

  async function bootstrapRecovery() {
    if (!client) { setReady(false); setMessage('La conexión segura con Neith no está configurada.', 'error'); return; }
    setReady(false);
    setMessage('Verificando enlace seguro de recuperación…', '');
    if (!recoveryEvidence) {
      setMessage('Abre esta pantalla desde el enlace de recuperación enviado a tu correo.', 'error');
      return;
    }
    try {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;
      if (data?.session?.user) {
        setReady(true);
        setMessage('Enlace verificado. Ya puedes crear tu nueva contraseña.', 'success');
        return;
      }
      // detectSessionInUrl may finish just after DOM ready; give Supabase a short grace period.
      let attempts = 0;
      const timer = setInterval(async () => {
        attempts += 1;
        const { data: retry } = await client.auth.getSession();
        if (retry?.session?.user) {
          clearInterval(timer); setReady(true); setMessage('Enlace verificado. Ya puedes crear tu nueva contraseña.', 'success');
        } else if (attempts >= 10) {
          clearInterval(timer); setReady(false); setMessage('Este enlace de recuperación no es válido o ha caducado. Solicita uno nuevo desde Iniciar sesión.', 'error');
        }
      }, 180);
    } catch (error) { setReady(false); setMessage(error?.message || 'No se pudo verificar el enlace de recuperación.', 'error'); }
  }

  client?.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryEvidence = true;
      try { sessionStorage.setItem(RECOVERY_VERIFIED_KEY, '1'); } catch {}
    }
    if (recoveryEvidence && session?.user) {
      setReady(true);
      setMessage('Enlace verificado. Ya puedes crear tu nueva contraseña.', 'success');
    }
  });

  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const password = String(values.password || '');
    const confirm = String(values.password_confirm || '');
    if (password.length < 8) return setMessage('La contraseña debe tener al menos 8 caracteres.', 'error');
    if (password !== confirm) return setMessage('Las dos contraseñas no coinciden.', 'error');
    if (!client || !recoveryReady || recoveryConsumed) return setMessage('El enlace de recuperación no está activo. Solicita uno nuevo.', 'error');
    const original = submit?.textContent || '';
    if (submit) { submit.disabled = true; submit.textContent = t('GUARDANDO…'); }
    setMessage('Actualizando tu contraseña de forma segura…', '');
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      recoveryConsumed = true;
      setReady(false);
      form.reset();
      setMessage('Contraseña actualizada correctamente. Cerrando la sesión de recuperación…', 'success');
      await client.auth.signOut({ scope: 'local' });
      try { sessionStorage.removeItem(RECOVERY_VERIFIED_KEY); } catch {}
      history.replaceState(null, '', location.pathname);
      setTimeout(() => { location.replace('../?login=1&password=updated'); }, 1300);
    } catch (error) {
      setMessage(error?.message || 'No se pudo actualizar la contraseña.', 'error');
      if (submit) { submit.disabled = false; submit.textContent = original; }
    }
  });

  bootstrapRecovery();
})();
